import { env } from '../../lib/env';
import { logger } from '../../lib/logger';
import { AppError } from '../../middlewares/error.middleware';
import { productRepository } from '../products/product.repository';
import type {
  ChatHistoryMessage,
  ChatIntent,
  ChatPage,
  ChatProductRecommendation,
  ChatRequestDto,
  ChatResponseDto,
} from './chat.types';

type CloudflareMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type ProductContext = Awaited<ReturnType<typeof productRepository.findById>>;

const CLOUDFLARE_TIMEOUT_MS = 12_000;
const MAX_RECOMMENDATIONS = 4;
const MAX_HISTORY_ITEMS = 8;

const PRODUCT_DISCOVERY_HINTS = [
  'product',
  'products',
  'item',
  'items',
  'buy',
  'shop',
  'shirt',
  'hoodie',
  'jacket',
  'pants',
  'dress',
  'tee',
  'quần',
  'áo',
  'dam',
  'váy',
  'mua',
  'san pham',
  'sản phẩm',
];

const STYLE_HINTS = [
  'style',
  'styling',
  'outfit',
  'match',
  'pair',
  'wear',
  'size',
  'fit',
  'mặc',
  'phối',
  'phong cách',
  'kích thước',
  'vừa',
];

const EXPLORE_MORE_HINTS = [
  'alternative',
  'alternatives',
  'similar',
  'another',
  'other',
  'compare',
  'comparison',
  'more',
  'else',
  'gợi ý thêm',
  'so sánh',
  'tương tự',
  'khác',
  'thêm',
  'phối cùng',
  'phối với',
  'kết hợp',
  'match',
  'pair',
];

const trimText = (value: string, maxLength = 600) => value.trim().slice(0, maxLength);

const toCloudflareHistory = (history: ChatHistoryMessage[]): CloudflareMessage[] =>
  history.slice(-MAX_HISTORY_ITEMS).map((message) => ({
    role: message.role,
    content: trimText(message.content),
  }));

const normalizeIntent = (raw: string): ChatIntent => {
  const value = raw.trim().toUpperCase();
  if (value.includes('STYLE')) return 'STYLE';
  if (value.includes('PRODUCT')) return 'PRODUCT';
  return 'GENERAL';
};

const keywordIntentFallback = (message: string, page: ChatPage): ChatIntent => {
  const normalized = message.toLowerCase();

  if (STYLE_HINTS.some((hint) => normalized.includes(hint))) return 'STYLE';
  if (PRODUCT_DISCOVERY_HINTS.some((hint) => normalized.includes(hint))) return 'PRODUCT';
  if (page === 'product') return 'STYLE';
  return 'GENERAL';
};

const shouldRecommendProducts = (page: ChatPage, intent: ChatIntent, message: string): boolean => {
  const normalized = message.toLowerCase();

  if (page === 'home') {
    return intent === 'PRODUCT' || EXPLORE_MORE_HINTS.some((hint) => normalized.includes(hint));
  }

  return EXPLORE_MORE_HINTS.some((hint) => normalized.includes(hint));
};

const getPrimaryImageUrl = (product: {
  images?: Array<{ imageUrl: string; thumbnailUrl?: string | null; isPrimary?: boolean | null }>;
}) => {
  const primary = product.images?.find((image) => image.isPrimary) ?? product.images?.[0];
  return primary?.thumbnailUrl || primary?.imageUrl || null;
};

const extractVariantValues = (product: NonNullable<ProductContext>, attributeNames: string[]) => {
  const values = new Set<string>();

  for (const variant of product.variants ?? []) {
    for (const attribute of variant.variantAttributes ?? []) {
      const name = attribute.value?.attribute?.name?.toLowerCase?.() ?? '';
      if (!attributeNames.some((candidate) => name.includes(candidate))) continue;
      if (attribute.value?.value) values.add(attribute.value.value);
    }
  }

  return Array.from(values);
};

const buildProductSummary = (product: NonNullable<ProductContext>) => {
  const sizes = extractVariantValues(product, ['size', 'kích', 'kich']);
  const colors = extractVariantValues(product, ['color', 'màu', 'mau']);

  return [
    `Name: ${product.name}`,
    `Category: ${product.category?.name || 'Unknown'}`,
    `Price: ${product.basePrice}`,
    `Description: ${trimText(product.description || 'No description available.', 280)}`,
    `Sizes: ${sizes.length > 0 ? sizes.join(', ') : 'Unknown'}`,
    `Colors: ${colors.length > 0 ? colors.join(', ') : 'Unknown'}`,
  ].join('\n');
};

const buildReplyPrompt = ({
  page,
  message,
  history,
  product,
  hasRecommendations,
}: {
  page: ChatPage;
  message: string;
  history: ChatHistoryMessage[];
  product?: NonNullable<ProductContext>;
  hasRecommendations: boolean;
}): CloudflareMessage[] => {
  const baseSystemPrompt =
    page === 'product'
      ? [
          'You are AISTHEA product assistant.',
          'Answer in the same language as the user.',
          'Prioritize the current product first: fit, styling, quality, and whether it suits the request.',
          'Only suggest alternative products if the user explicitly asks to compare, explore more, or pair with other items.',
          hasRecommendations
            ? 'If recommendation cards are shown separately, mention them briefly without listing a full catalog.'
            : 'Do not invent product recommendations that are not supplied.',
          'Keep the reply concise: at most 3 short paragraphs.',
          product ? `Current product context:\n${buildProductSummary(product)}` : '',
        ].filter(Boolean).join('\n')
      : [
          'You are AISTHEA storefront assistant.',
          'Answer in the same language as the user.',
          'Help with product discovery, styling, and shopping guidance.',
          hasRecommendations
            ? 'If recommendation cards are shown separately, mention them briefly without listing a full catalog.'
            : 'Do not invent unavailable products.',
          'Keep the reply concise: at most 3 short paragraphs.',
        ].join('\n');

  return [
    { role: 'system', content: baseSystemPrompt },
    ...toCloudflareHistory(history),
    { role: 'user', content: trimText(message) },
  ];
};

const buildIntentPrompt = (message: string, page: ChatPage): CloudflareMessage[] => [
  {
    role: 'system',
    content: [
      'You classify messages for a fashion ecommerce chatbot.',
      'Only answer with exactly one word: STYLE, PRODUCT, or GENERAL.',
      `Current page context: ${page}.`,
      'STYLE is for sizing, fit, styling, outfit, and pairing questions.',
      'PRODUCT is for product discovery, finding alternatives, or browsing catalog items.',
      'GENERAL is for everything else.',
    ].join('\n'),
  },
  {
    role: 'user',
    content: trimText(message),
  },
];

const buildFallbackReply = (page: ChatPage, hasRecommendations: boolean, productName?: string) => {
  if (page === 'product') {
    if (hasRecommendations) {
      return 'Mình chưa kết nối được Cloudflare AI lúc này, nhưng đã lấy một vài sản phẩm liên quan để bạn xem thêm.';
    }

    return productName
      ? `Mình chưa kết nối được Cloudflare AI lúc này. Bạn vẫn có thể xem tiếp thông tin của ${productName} và thử gửi lại sau.`
      : 'Mình chưa kết nối được Cloudflare AI lúc này. Bạn thử gửi lại sau nhé.';
  }

  if (hasRecommendations) {
    return 'Mình chưa kết nối được Cloudflare AI lúc này, nhưng đã tìm sẵn một vài sản phẩm để bạn tham khảo.';
  }

  return 'Mình chưa kết nối được Cloudflare AI lúc này. Bạn thử hỏi lại sau nhé.';
};

const buildCloudflareUrl = () =>
  `https://api.cloudflare.com/client/v4/accounts/${env.cloudflareAccountId}/ai/run/${env.cloudflareAiModel}`;

const callCloudflare = async (messages: CloudflareMessage[]): Promise<string> => {
  if (!env.cloudflareAccountId || !env.cloudflareApiToken) {
    throw new Error('Cloudflare AI credentials are not configured.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CLOUDFLARE_TIMEOUT_MS);

  try {
    const response = await fetch(buildCloudflareUrl(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.cloudflareApiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Cloudflare AI error: ${response.status} ${text}`);
    }

    const payload = (await response.json()) as { result?: { response?: string } };
    const content = payload.result?.response?.trim();

    if (!content) {
      throw new Error('Cloudflare AI returned an empty response.');
    }

    return content;
  } finally {
    clearTimeout(timeout);
  }
};

const classifyIntent = async (message: string, page: ChatPage): Promise<ChatIntent> => {
  try {
    const response = await callCloudflare(buildIntentPrompt(message, page));
    return normalizeIntent(response);
  } catch (error) {
    logger.warn('[chatService] Intent classification fallback engaged', { error });
    return keywordIntentFallback(message, page);
  }
};

const searchProducts = async ({
  message,
  page,
  currentProduct,
}: {
  message: string;
  page: ChatPage;
  currentProduct?: NonNullable<ProductContext>;
}): Promise<ChatProductRecommendation[]> => {
  const searchTerms = Array.from(
    new Set(
      [
        trimText(message, 80),
        page === 'product' ? currentProduct?.category?.name : undefined,
      ].filter((value): value is string => Boolean(value)),
    ),
  );

  const found = new Map<number, ChatProductRecommendation>();

  for (const term of searchTerms) {
    const result = await productRepository.findMany({
      search: term,
      limit: MAX_RECOMMENDATIONS + 2,
      status: 'Active',
    });

    for (const product of result.data) {
      if (page === 'product' && product.productId === currentProduct?.productId) continue;
      found.set(product.productId, {
        productId: product.productId,
        name: product.name,
        basePrice: Number(product.basePrice),
        primaryImageUrl: getPrimaryImageUrl(product),
      });
      if (found.size >= MAX_RECOMMENDATIONS) return Array.from(found.values());
    }
  }

  if (page === 'product' && currentProduct?.category?.slug) {
    const result = await productRepository.findMany({
      categorySlug: currentProduct.category.slug,
      limit: MAX_RECOMMENDATIONS + 1,
      status: 'Active',
    });

    for (const product of result.data) {
      if (product.productId === currentProduct.productId) continue;
      found.set(product.productId, {
        productId: product.productId,
        name: product.name,
        basePrice: Number(product.basePrice),
        primaryImageUrl: getPrimaryImageUrl(product),
      });
      if (found.size >= MAX_RECOMMENDATIONS) break;
    }
  }

  return Array.from(found.values()).slice(0, MAX_RECOMMENDATIONS);
};

const resolveCurrentProduct = async (page: ChatPage, productId?: number) => {
  if (page !== 'product') return null;
  if (!productId) {
    throw new AppError(400, 'VALIDATION_ERROR', 'common:errors.validation');
  }

  const product = await productRepository.findById(productId);
  if (!product) {
    throw new AppError(404, 'PRODUCT_NOT_FOUND', 'products:errors.notFound');
  }

  return product;
};

export const chatService = {
  async chat(payload: ChatRequestDto): Promise<ChatResponseDto> {
    const currentProduct = await resolveCurrentProduct(payload.page, payload.productId);
    const intent = await classifyIntent(payload.message, payload.page);
    const products = shouldRecommendProducts(payload.page, intent, payload.message)
      ? await searchProducts({
          message: payload.message,
          page: payload.page,
          currentProduct: currentProduct ?? undefined,
        })
      : [];

    try {
      const reply = await callCloudflare(
        buildReplyPrompt({
          page: payload.page,
          message: payload.message,
          history: payload.history,
          product: currentProduct ?? undefined,
          hasRecommendations: products.length > 0,
        }),
      );

      return {
        reply,
        intent,
        products,
      };
    } catch (error) {
      logger.error('[chatService] Reply generation fallback engaged', { error });
      return {
        reply: buildFallbackReply(payload.page, products.length > 0, currentProduct?.name),
        intent,
        products,
      };
    }
  },
};
