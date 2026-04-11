import { env } from '../../lib/env';
import { logger } from '../../lib/logger';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middlewares/error.middleware';
import { productRepository } from '../products/product.repository';
import { resolveProductSizeGuide } from '../products/size-guide';
import type {
  ChatAction,
  ChatHistoryMessage,
  ChatIntent,
  ChatPage,
  ChatProductRecommendation,
  ChatRequestDto,
  ChatResponseDto,
  ChatTelemetryByPageDto,
  ChatTelemetryDailyTrendDto,
  ChatTelemetryEventDto,
  ChatTelemetryInternalByPageDto,
  ChatTelemetryInternalEventDto,
  ChatTelemetryInternalMetricDto,
  ChatTelemetryInternalTrendDto,
  ChatTelemetryOverviewDto,
  ChatTelemetrySummaryDto,
  ChatTelemetryTargetDto,
} from './chat.types';

type CloudflareMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type ProductContext = Awaited<ReturnType<typeof productRepository.findById>>;
type ChatRecommendationRecord = Awaited<ReturnType<typeof productRepository.findChatRecommendations>>[number];
type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const CLOUDFLARE_TIMEOUT_MS = 12_000;
const CHAT_CACHE_TTL_MS = 45_000;
const MAX_RECOMMENDATIONS = 4;
const MAX_HISTORY_ITEMS = 6;
const MAX_RESPONSE_SENTENCES = 2;
const MAX_RESPONSE_WORDS = 60;
const CHAT_TELEMETRY_TABLE = 'ChatTelemetryEvents';
const OUT_OF_SCOPE_REPLY = 'Mình chỉ hỗ trợ câu hỏi liên quan sản phẩm AISTHEA.';
const SUPPORT_REPLY =
  'Mình hỗ trợ tư vấn sản phẩm. Nếu bạn cần hỗ trợ đơn hàng hoặc chính sách, vui lòng xem mục hỗ trợ của shop.';
const NEED_MORE_INFO_REPLY = 'Bạn muốn mình tư vấn theo mẫu nào hoặc nhu cầu nào?';
const INTERNAL_SIGNAL_EVENTS: ChatTelemetryInternalEventDto[] = [
  'chat_out_of_scope_blocked',
  'chat_support_redirected',
  'chat_clarification_asked',
  'chat_short_answer_returned',
];

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
  'mẫu',
  'form',
  'material',
  'chất liệu',
  'màu',
  'color',
  'giá',
  'price',
  'available',
  'còn hàng',
  'đen',
  'trắng',
  'be',
  'kem',
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
  'form',
  'rộng',
  'ôm',
  'đi làm',
  'đi chơi',
  'occasion',
  'layer',
  'hợp',
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

const SUPPORT_HINTS = [
  'return',
  'refund',
  'exchange',
  'policy',
  'privacy',
  'faq',
  'support',
  'contact',
  'shipping',
  'delivery',
  'payment',
  'order',
  'đơn hàng',
  'giao hàng',
  'thanh toán',
  'đổi trả',
  'hoàn tiền',
  'chính sách',
  'bảo mật',
  'hỗ trợ',
  'liên hệ',
];

const PRODUCT_CONTEXT_HINTS = [
  'mẫu này',
  'sản phẩm này',
  'item này',
  'áo này',
  'quần này',
  'váy này',
  'đầm này',
  'cái này',
  'this product',
  'this item',
  'this one',
];

const SHOPPING_INTENT_HINTS = ['mua', 'tìm', 'tim', 'shop', 'shopping', 'browse', 'xem', 'gợi ý', 'goi y', 'kiếm', 'kiem'];

const GENERIC_ADVICE_PATTERNS = [
  /^(tư vấn|tu van)( giúp mình| giúp em| cho mình| cho em)?[.!?]*$/iu,
  /^(giúp mình|giúp em|help me|recommend|suggest)[.!?]*$/iu,
  /^(mình cần tư vấn|mình muốn tư vấn|tôi cần tư vấn|toi can tu van)[.!?]*$/iu,
];

const PRODUCT_QUERY_NOISE_PATTERNS = [
  /\b(làm sao|thế nào|vì sao|bao giờ|ở đâu)\b/giu,
  /\b(giúp mình|giúp em|cho mình hỏi|cho em hỏi|mình cần|mình muốn|tôi cần|tôi muốn|toi can|toi muon)\b/giu,
  /\b(tư vấn|tu van|find|show|tim|tìm|please|can you|giup|mua|shop|shopping)\b/giu,
];

const PRODUCT_QUERY_STOP_WORDS = new Set([
  'cách',
  'cach',
  'gì',
  'gi',
  'để',
  'de',
  'như',
  'nào',
  'nao',
  'nên',
  'nen',
  'mặc',
  'mac',
  'này',
  'nay',
  'kia',
  'đó',
  'do',
  'thời',
  'tiết',
  'weather',
]);

const MEN_COLLECTION_HINTS = ['nam', 'men', 'male', 'boy'];
const WOMEN_COLLECTION_HINTS = ['nữ', 'nu', 'women', 'woman', 'female', 'girl', 'váy', 'vay', 'đầm', 'dam'];

const COLLECTION_ROUTE_HINTS: Array<{ route: 'outerwear' | 'tops' | 'bottoms' | 'dresses' | 'shoes' | 'accessories'; hints: string[] }> = [
  { route: 'outerwear', hints: ['áo khoác', 'ao khoac', 'khoác', 'khoac', 'jacket', 'blazer', 'hoodie', 'coat'] },
  { route: 'tops', hints: ['áo sơ mi', 'ao so mi', 'sơ mi', 'so mi', 'shirt', 'tee', 't shirt', 'thun', 'polo', 'áo', 'ao', 'top'] },
  { route: 'bottoms', hints: ['quần', 'quan', 'pants', 'trousers', 'jeans', 'skirt', 'chân váy', 'chan vay'] },
  { route: 'dresses', hints: ['váy', 'vay', 'đầm', 'dam', 'dress'] },
  { route: 'shoes', hints: ['giày', 'giay', 'shoes', 'sneaker', 'boots', 'boot', 'loafer', 'sandal', 'heels'] },
  { route: 'accessories', hints: ['phụ kiện', 'phu kien', 'accessory', 'accessories', 'belt', 'thắt lưng', 'that lung', 'bag', 'túi', 'tui', 'mũ', 'mu', 'cap', 'kính', 'kinh', 'watch', 'đồng hồ', 'dong ho', 'jewelry', 'trang sức', 'trang suc'] },
];

const CANNED_REPLIES = new Set([OUT_OF_SCOPE_REPLY, SUPPORT_REPLY, NEED_MORE_INFO_REPLY]);
const intentCache = new Map<string, CacheEntry<ChatIntent>>();
const recommendationCache = new Map<string, CacheEntry<ChatProductRecommendation[]>>();

const trimText = (value: string, maxLength = 600) => value.trim().slice(0, maxLength);

const roundRate = (value: number) => Number(value.toFixed(2));

const parseDate = (value: string | undefined, fallback: Date) => {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
};

const startOfMonth = (value: Date) => new Date(value.getFullYear(), value.getMonth(), 1, 0, 0, 0, 0);
const endOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate(), 23, 59, 59, 999);

const toLoggableError = (error: unknown) => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    message: String(error),
  };
};

const buildChatSessionId = (value?: string | null) => {
  const trimmed = value?.trim();
  if (trimmed) return trimText(trimmed, 64);
  return `internal-${Date.now().toString(36)}`;
};

const isCannedReply = (content: string) => CANNED_REPLIES.has(content.trim());

const readTimedCache = <T>(cache: Map<string, CacheEntry<T>>, key: string): T | null => {
  const cached = cache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }

  return cached.value;
};

const writeTimedCache = <T>(cache: Map<string, CacheEntry<T>>, key: string, value: T) => {
  cache.set(key, {
    expiresAt: Date.now() + CHAT_CACHE_TTL_MS,
    value,
  });
};

const clearChatPerformanceCaches = () => {
  intentCache.clear();
  recommendationCache.clear();
};

const filterRelevantHistory = (history: ChatHistoryMessage[]) => {
  const filtered: ChatHistoryMessage[] = [];

  for (let index = 0; index < history.length; index += 1) {
    const message = history[index];
    const next = history[index + 1];

    if (message.role === 'assistant' && isCannedReply(message.content)) continue;
    if (message.role === 'user' && next?.role === 'assistant' && isCannedReply(next.content)) continue;

    filtered.push(message);
  }

  return filtered.slice(-MAX_HISTORY_ITEMS);
};

const toCloudflareHistory = (history: ChatHistoryMessage[]): CloudflareMessage[] =>
  filterRelevantHistory(history).map((message) => ({
    role: message.role,
    content: trimText(message.content),
  }));

const normalizeIntent = (raw: string): ChatIntent | null => {
  const value = raw.trim().toUpperCase();
  if (value.includes('OUT_OF_SCOPE')) return 'OUT_OF_SCOPE';
  if (value.includes('SUPPORT')) return 'SUPPORT';
  if (value.includes('STYLE')) return 'STYLE';
  if (value.includes('PRODUCT')) return 'PRODUCT';
  return null;
};

const normalizeAssistantPage = (page: ChatPage): Exclude<ChatPage, 'weather'> => {
  if (page === 'weather') return 'stylist';
  return page;
};

const inferCollectionGender = (message: string): 'men' | 'women' | null => {
  if (hasAnyHint(message, MEN_COLLECTION_HINTS)) return 'men';
  if (hasAnyHint(message, WOMEN_COLLECTION_HINTS)) return 'women';
  return null;
};

const inferCollectionRoute = (message: string): 'outerwear' | 'tops' | 'bottoms' | 'dresses' | 'shoes' | 'accessories' | null => {
  const match = COLLECTION_ROUTE_HINTS.find((entry) => hasAnyHint(message, entry.hints));
  return match?.route ?? null;
};

const buildCollectionTarget = (message: string) => {
  const normalizedQuery = normalizeProductQuery(message);
  const inferredRoute = inferCollectionRoute(message);
  const inferredGender = inferCollectionGender(message) ?? (inferredRoute === 'dresses' ? 'women' : null);
  const basePath = inferredGender && inferredRoute ? `/collection/${inferredGender}/${inferredRoute}` : '/collection';

  if (!normalizedQuery) return basePath;

  const params = new URLSearchParams({ search: normalizedQuery });
  return `${basePath}?${params.toString()}`;
};

const keywordIntentFallback = (
  message: string,
  page: ChatPage,
  currentProduct?: NonNullable<ProductContext>,
): ChatIntent => {
  const assistantPage = normalizeAssistantPage(page);
  const normalized = message.toLowerCase();

  if (SUPPORT_HINTS.some((hint) => normalized.includes(hint))) return 'SUPPORT';
  if (STYLE_HINTS.some((hint) => normalized.includes(hint))) return 'STYLE';
  if (PRODUCT_DISCOVERY_HINTS.some((hint) => normalized.includes(hint))) return 'PRODUCT';
  if (assistantPage === 'product' && currentProduct && PRODUCT_CONTEXT_HINTS.some((hint) => normalized.includes(hint))) {
    return 'PRODUCT';
  }

  return 'OUT_OF_SCOPE';
};

const shouldRecommendProducts = (page: ChatPage, intent: ChatIntent, message: string): boolean => {
  const assistantPage = normalizeAssistantPage(page);
  const normalized = message.toLowerCase();
  const isExploreMore = EXPLORE_MORE_HINTS.some((hint) => normalized.includes(hint));

  if (assistantPage === 'support') return false;
  if (intent !== 'PRODUCT') return false;
  if (assistantPage === 'product') return true;
  if (assistantPage === 'home' || assistantPage === 'stylist') return true;
  return isExploreMore;
};

const normalizeProductQuery = (input: string): string => {
  let normalized = input.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ');

  for (const pattern of PRODUCT_QUERY_NOISE_PATTERNS) {
    normalized = normalized.replace(pattern, ' ');
  }

  return normalized
    .split(/\s+/)
    .filter((token) => token && !PRODUCT_QUERY_STOP_WORDS.has(token))
    .join(' ')
    .trim();
};

const getRecentUserContext = (history: ChatHistoryMessage[]) => {
  const filtered = filterRelevantHistory(history);

  for (let index = filtered.length - 1; index >= 0; index -= 1) {
    const message = filtered[index];
    if (message.role !== 'user') continue;
    if (normalizeProductQuery(message.content).length < 3) continue;
    return trimText(message.content, 120);
  }

  return undefined;
};

const isShortFollowUpFragment = (message: string) => {
  const normalized = normalizeProductQuery(message);
  if (!normalized) return false;

  const words = normalized.split(/\s+/).filter(Boolean);
  return words.length <= 4 && normalized.length <= 24;
};

const buildContextualUserMessage = (message: string, history: ChatHistoryMessage[]) => {
  const trimmed = trimText(message, 160);
  const recentUserContext = getRecentUserContext(history);

  if (!recentUserContext || !isShortFollowUpFragment(trimmed)) {
    return trimmed;
  }

  const normalizedCurrent = normalizeProductQuery(trimmed);
  const normalizedContext = normalizeProductQuery(recentUserContext);

  if (!normalizedCurrent || !normalizedContext || normalizedContext.includes(normalizedCurrent)) {
    return trimmed;
  }

  return trimText(`${recentUserContext} ${trimmed}`, 160);
};

const inferIntentFastPath = ({
  message,
  page,
  history,
  currentProduct,
}: {
  message: string;
  page: ChatPage;
  history: ChatHistoryMessage[];
  currentProduct?: NonNullable<ProductContext>;
}): ChatIntent | null => {
  const rawMessage = trimText(message, 160);
  const contextualMessage = buildContextualUserMessage(message, history);
  const hasStyleHints = hasAnyHint(contextualMessage, STYLE_HINTS);
  const hasDiscoveryHints =
    hasAnyHint(contextualMessage, PRODUCT_DISCOVERY_HINTS) ||
    Boolean(inferCollectionGender(contextualMessage)) ||
    Boolean(inferCollectionRoute(contextualMessage));
  const hasProductContextHints = hasAnyHint(contextualMessage, PRODUCT_CONTEXT_HINTS);
  const hasShoppingIntent = hasAnyHint(contextualMessage, SHOPPING_INTENT_HINTS);

  if (SUPPORT_HINTS.some((hint) => rawMessage.toLowerCase().includes(hint))) {
    return 'SUPPORT';
  }

  if (GENERIC_ADVICE_PATTERNS.some((pattern) => pattern.test(rawMessage))) {
    return 'PRODUCT';
  }

  if (hasDiscoveryHints && hasShoppingIntent) {
    return 'PRODUCT';
  }

  if (hasStyleHints) {
    return 'STYLE';
  }

  if (hasDiscoveryHints || hasProductContextHints) {
    return 'PRODUCT';
  }

  if (isShortFollowUpFragment(rawMessage) && getRecentUserContext(history)) {
    const inferredIntent = keywordIntentFallback(contextualMessage, page, currentProduct);
    return inferredIntent === 'OUT_OF_SCOPE' ? null : inferredIntent;
  }

  return null;
};

const shouldAskForClarification = ({
  message,
  intent,
  currentProduct,
}: {
  message: string;
  intent: ChatIntent;
  currentProduct?: NonNullable<ProductContext>;
}) => {
  if (intent !== 'PRODUCT' && intent !== 'STYLE') return false;
  if (currentProduct) return false;

  const trimmed = message.trim();
  if (GENERIC_ADVICE_PATTERNS.some((pattern) => pattern.test(trimmed))) return true;

  return normalizeProductQuery(trimmed).length < 3;
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
  const sizeGuide = resolveProductSizeGuide(product);
  const modelInfo = sizeGuide
    ? [
        sizeGuide.modelInfo.heightCm ? `Height ${sizeGuide.modelInfo.heightCm}cm` : null,
        sizeGuide.modelInfo.weightKg ? `Weight ${sizeGuide.modelInfo.weightKg}kg` : null,
        sizeGuide.modelInfo.wearSize ? `Wears ${sizeGuide.modelInfo.wearSize}` : null,
      ]
        .filter(Boolean)
        .join(', ')
    : null;

  return [
    `Name: ${product.name}`,
    `Category: ${product.category?.name || 'Unknown'}`,
    `Price: ${product.basePrice}`,
    `Description: ${trimText(product.description || 'No description available.', 280)}`,
    `Sizes: ${sizes.length > 0 ? sizes.join(', ') : 'Unknown'}`,
    `Colors: ${colors.length > 0 ? colors.join(', ') : 'Unknown'}`,
    sizeGuide?.summary ? `Size guide: ${trimText(sizeGuide.summary, 220)}` : null,
    modelInfo ? `Model info: ${modelInfo}` : null,
  ].filter(Boolean).join('\n');
};

const buildReplyPrompt = ({
  page,
  message,
  history,
  intent,
  product,
  hasRecommendations,
  contextSummary,
}: {
  page: ChatPage;
  message: string;
  history: ChatHistoryMessage[];
  intent: Extract<ChatIntent, 'PRODUCT' | 'STYLE'>;
  product?: NonNullable<ProductContext>;
  hasRecommendations: boolean;
  contextSummary?: string;
}): CloudflareMessage[] => {
  const assistantPage = normalizeAssistantPage(page);
  const baseSystemPrompt = [
    "You are AISTHEA's product assistant.",
    'Answer in the same language as the user.',
    'Your job is ONLY to answer questions related to:',
    '1. product details',
    '2. size and fit',
    '3. outfit pairing tied to AISTHEA products',
    '4. product discovery and shopping guidance',
    intent === 'STYLE'
      ? 'This request is a styling request tied to AISTHEA products.'
      : 'This request is a product detail or product discovery request tied to AISTHEA products.',
    assistantPage === 'product'
      ? 'Prioritize the current product before suggesting anything else.'
      : 'Stay anchored to AISTHEA products and shopping guidance.',
    contextSummary ? `Use this context when relevant:\n${trimText(contextSummary, 500)}` : null,
    product ? `Current product context:\n${buildProductSummary(product)}` : null,
    hasRecommendations
      ? 'Recommendation cards are shown separately. Mention them briefly only when helpful.'
      : 'Do not invent product recommendations that are not supplied.',
    'Rules:',
    '- If the question is outside these topics, do NOT answer it.',
    `- Instead reply with exactly one short sentence: "${OUT_OF_SCOPE_REPLY}"`,
    '- Keep every valid answer short, direct, and specific.',
    `- Maximum ${MAX_RESPONSE_SENTENCES} sentences.`,
    `- Maximum ${MAX_RESPONSE_WORDS} words.`,
    '- No long explanations.',
    '- No generic knowledge.',
    '- No off-topic conversation.',
    '- Do not restate the user question.',
    '- Do not make up product facts not present in the provided context.',
    `- If information is missing, ask exactly one short follow-up question, like: "${NEED_MORE_INFO_REPLY}"`,
    'Response style:',
    '- Answer directly.',
    '- Prefer short phrases.',
    '- No introduction.',
    '- No conclusion.',
    '- No emojis.',
    '- No markdown list unless absolutely necessary.',
  ]
    .filter(Boolean)
    .join('\n');

  return [
    { role: 'system', content: baseSystemPrompt },
    ...toCloudflareHistory(history),
    { role: 'user', content: trimText(message) },
  ];
};

const buildIntentPrompt = (
  message: string,
  page: ChatPage,
  currentProduct?: NonNullable<ProductContext>,
): CloudflareMessage[] => [
  {
    role: 'system',
    content: [
      'Classify the user message into exactly one label: PRODUCT, STYLE, SUPPORT, or OUT_OF_SCOPE.',
      `Current page context: ${page}.`,
      currentProduct ? `Current product: ${currentProduct.name} (${currentProduct.category?.name || 'Unknown category'}).` : null,
      'PRODUCT: asks about product details, price, color, material, size, fit, availability, or finding products.',
      'STYLE: asks how to style, pair, wear, fit, or evaluate suitability, but still related to AISTHEA products.',
      'SUPPORT: asks about shipping, orders, returns, payment, policy, or customer support.',
      'OUT_OF_SCOPE: anything not related to AISTHEA products, styling with AISTHEA products, or shopping with AISTHEA.',
      'Return only one label.',
    ].join('\n'),
  },
  {
    role: 'user',
    content: trimText(message),
  },
];

const trimAnswer = (value: string) => {
  const sanitized = value
    .replace(/\r?\n+/g, ' ')
    .replace(/^[*-]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();

  const sentenceMatches = sanitized.match(/[^.!?。！？]+[.!?。！？]?/g) ?? [sanitized];
  const limitedSentences = sentenceMatches
    .slice(0, MAX_RESPONSE_SENTENCES)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .join(' ')
    .trim();

  const words = limitedSentences.split(/\s+/).filter(Boolean);
  if (words.length <= MAX_RESPONSE_WORDS) return limitedSentences;

  return words.slice(0, MAX_RESPONSE_WORDS).join(' ').trim();
};

const buildFallbackReply = (page: ChatPage, hasRecommendations: boolean, productName?: string) => {
  const assistantPage = normalizeAssistantPage(page);

  if (assistantPage === 'product') {
    if (hasRecommendations) {
      return 'Mình chưa kết nối được Cloudflare AI lúc này, nhưng đã lấy một vài sản phẩm liên quan để bạn xem thêm.';
    }

    return productName
      ? `Mình chưa kết nối được Cloudflare AI lúc này. Bạn vẫn có thể xem tiếp thông tin của ${productName} và thử gửi lại sau.`
      : 'Mình chưa kết nối được Cloudflare AI lúc này. Bạn thử gửi lại sau nhé.';
  }

  if (assistantPage === 'stylist') {
    if (hasRecommendations) {
      return 'Mình chưa kết nối được Cloudflare AI lúc này, nhưng đã lấy sẵn vài sản phẩm phù hợp để bạn tham khảo thêm.';
    }

    return 'Mình chưa kết nối được Cloudflare AI lúc này. Bạn có thể thử lại sau với câu hỏi về phối đồ hoặc thời tiết.';
  }

  if (assistantPage === 'support') {
    return 'Mình chưa kết nối được Cloudflare AI lúc này. Bạn có thể xem mục Support hoặc liên hệ kênh hỗ trợ của AISTHEA để được xử lý nhanh hơn.';
  }

  if (hasRecommendations) {
    return 'Mình chưa kết nối được Cloudflare AI lúc này, nhưng đã tìm sẵn một vài sản phẩm để bạn tham khảo.';
  }

  return 'Mình chưa kết nối được Cloudflare AI lúc này. Bạn thử hỏi lại sau nhé.';
};

const hasAnyHint = (message: string, hints: string[]) => {
  const normalized = message.toLowerCase();
  return hints.some((hint) => normalized.includes(hint));
};

const WEATHER_HINTS = [
  'weather',
  'temperature',
  'rain',
  'sun',
  'hot',
  'cold',
  'humid',
  'nóng',
  'lạnh',
  'mưa',
  'thời tiết',
  'nhiệt độ',
];

const PRIVACY_HINTS = ['privacy', 'data', 'bảo mật', 'dữ liệu'];
const RETURN_HINTS = ['return', 'refund', 'exchange', 'đổi trả', 'hoàn tiền'];
const FAQ_HINTS = ['faq', 'how', 'guide', 'help', 'hướng dẫn', 'mua hàng'];

const uniqueActions = (actions: ChatAction[]): ChatAction[] => {
  const seen = new Set<string>();
  const result: ChatAction[] = [];

  for (const action of actions) {
    const key = `${action.type}:${action.to}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(action);
  }

  return result.slice(0, 3);
};

const isRedundantActionForPage = (page: ChatPage, to: string) => {
  if (page === 'support' && to === '/support') return true;
  if (page === 'stylist' && to === '/stylist') return true;
  if (page === 'weather' && to === '/weather-outfit') return true;
  return false;
};

const buildSmartActions = ({
  page,
  message,
  intent,
  products,
}: {
  page: ChatPage;
  message: string;
  intent: ChatIntent;
  products: ChatProductRecommendation[];
}): ChatAction[] => {
  const assistantPage = normalizeAssistantPage(page);
  const actions: ChatAction[] = [];
  const collectionTarget = buildCollectionTarget(message);
  const pushAction = (action: ChatAction) => {
    if (isRedundantActionForPage(page, action.to)) return;
    actions.push(action);
  };

  if (assistantPage === 'support' || hasAnyHint(message, SUPPORT_HINTS)) {
    if (hasAnyHint(message, RETURN_HINTS)) {
      pushAction({ type: 'navigate', label: 'Xem đổi trả', to: '/support?section=returns' });
    } else if (hasAnyHint(message, PRIVACY_HINTS)) {
      pushAction({ type: 'navigate', label: 'Xem bảo mật', to: '/support?section=privacy' });
    } else {
      pushAction({ type: 'navigate', label: 'Mở Support', to: '/support' });
    }

    if (hasAnyHint(message, FAQ_HINTS) || page === 'support') {
      pushAction({ type: 'navigate', label: 'Xem FAQ', to: '/support?section=faq' });
    }

    return uniqueActions(actions);
  }

  if (intent === 'PRODUCT' || intent === 'STYLE') {
    pushAction({
      type: 'navigate',
      label: 'Xem bộ sưu tập',
      to: collectionTarget,
    });
  }

  return uniqueActions(actions);
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

const classifyIntent = async ({
  message,
  page,
  history,
  currentProduct,
}: {
  message: string;
  page: ChatPage;
  history: ChatHistoryMessage[];
  currentProduct?: NonNullable<ProductContext>;
}): Promise<ChatIntent> => {
  const rawMessage = trimText(message, 160);
  const contextualMessage = buildContextualUserMessage(message, history);
  const fastPathIntent = inferIntentFastPath({
    message,
    page,
    history,
    currentProduct,
  });

  if (fastPathIntent) {
    return fastPathIntent;
  }

  const cacheKey = [
    page,
    currentProduct?.productId ?? 'none',
    contextualMessage.toLowerCase(),
  ].join('::');
  const cachedIntent = readTimedCache(intentCache, cacheKey);

  if (cachedIntent) {
    return cachedIntent;
  }

  try {
    const response = await callCloudflare(buildIntentPrompt(contextualMessage, page, currentProduct));
    const normalizedIntent = normalizeIntent(response);
    const resolvedIntent =
      normalizedIntent === 'OUT_OF_SCOPE' && contextualMessage !== rawMessage
        ? keywordIntentFallback(contextualMessage, page, currentProduct)
        : normalizedIntent ?? keywordIntentFallback(contextualMessage, page, currentProduct);

    writeTimedCache(intentCache, cacheKey, resolvedIntent);
    return resolvedIntent;
  } catch (error) {
    logger.warn('[chatService] Intent classification fallback engaged', { error: toLoggableError(error) });
    const fallbackIntent = keywordIntentFallback(contextualMessage, page, currentProduct);
    writeTimedCache(intentCache, cacheKey, fallbackIntent);
    return fallbackIntent;
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
  const normalizedQuery = normalizeProductQuery(message);
  const cacheKey = [
    page,
    currentProduct?.productId ?? 'none',
    currentProduct?.category?.slug ?? 'none',
    normalizedQuery || 'none',
  ].join('::');
  const cachedRecommendations = readTimedCache(recommendationCache, cacheKey);

  if (cachedRecommendations) {
    return cachedRecommendations;
  }

  const searchTerms = Array.from(
    new Set(
      [
        normalizedQuery ? trimText(normalizedQuery, 80) : undefined,
        page === 'product' ? currentProduct?.category?.name : undefined,
      ].filter((value): value is string => Boolean(value)),
    ),
  );

  const found = new Map<number, ChatProductRecommendation>();
  const mapRecommendationRecord = (product: ChatRecommendationRecord): ChatProductRecommendation => ({
    productId: product.productId,
    name: product.name,
    basePrice: Number(product.basePrice),
    primaryImageUrl: getPrimaryImageUrl(product),
  });

  const searchResults = await Promise.all(
    searchTerms.map((term) =>
      productRepository.findChatRecommendations({
        search: term,
        limit: MAX_RECOMMENDATIONS + 2,
        excludeProductId: page === 'product' ? currentProduct?.productId : undefined,
      }),
    ),
  );

  for (const result of searchResults) {
    for (const product of result) {
      found.set(product.productId, mapRecommendationRecord(product));
      if (found.size >= MAX_RECOMMENDATIONS) {
        const recommendations = Array.from(found.values());
        writeTimedCache(recommendationCache, cacheKey, recommendations);
        return recommendations;
      }
    }
  }

  if (page === 'product' && currentProduct?.category?.slug) {
    const result = await productRepository.findChatRecommendations({
      categorySlug: currentProduct.category.slug,
      limit: MAX_RECOMMENDATIONS + 1,
      excludeProductId: currentProduct.productId,
    });

    for (const product of result) {
      found.set(product.productId, mapRecommendationRecord(product));
      if (found.size >= MAX_RECOMMENDATIONS) break;
    }
  }

  const recommendations = Array.from(found.values()).slice(0, MAX_RECOMMENDATIONS);
  writeTimedCache(recommendationCache, cacheKey, recommendations);
  return recommendations;
};

const logInternalChatEvent = (
  event: 'chat_out_of_scope_blocked' | 'chat_support_redirected' | 'chat_short_answer_returned' | 'chat_clarification_asked',
  meta: Record<string, unknown>,
) => {
  logger.info('[chatService] Internal chat event', {
    event,
    ...meta,
  });
};

const trackInternalChatEvent = async ({
  event,
  payload,
  target,
  label,
}: {
  event: 'chat_out_of_scope_blocked' | 'chat_support_redirected' | 'chat_short_answer_returned' | 'chat_clarification_asked';
  payload: ChatRequestDto;
  target?: string;
  label?: string;
}) => {
  logInternalChatEvent(event, {
    page: payload.page,
    target,
    label,
    hasContextSummary: Boolean(payload.contextSummary),
  });

  if (!payload.sessionId) return;

  try {
    await persistTelemetryEvent({
      event,
      page: payload.page,
      sessionId: payload.sessionId,
      productId: payload.page === 'product' ? payload.productId ?? null : null,
      messageLength: payload.message.length,
      conversationLength: payload.history.length + 1,
      target: target ?? null,
      label: label ?? null,
      placement: 'reply_actions',
      hasContextSummary: Boolean(payload.contextSummary),
    });
  } catch (error) {
    logger.warn('[chatTelemetry] Failed to persist internal chat event', {
      error: toLoggableError(error),
      event,
    });
  }
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

let telemetryTableReady: Promise<void> | null = null;

const ensureTelemetryTable = async () => {
  if (!telemetryTableReady) {
    telemetryTableReady = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS ${CHAT_TELEMETRY_TABLE} (
          ChatTelemetryEventId BIGINT NOT NULL AUTO_INCREMENT,
          Event VARCHAR(40) NOT NULL,
          Page VARCHAR(20) NOT NULL,
          SessionId VARCHAR(64) NOT NULL,
          ProductId INT NULL,
          MessageLength INT NULL,
          ConversationLength INT NULL,
          Target VARCHAR(200) NULL,
          Label VARCHAR(80) NULL,
          Placement VARCHAR(30) NULL,
          HasContextSummary BOOLEAN NOT NULL DEFAULT FALSE,
          IpAddress VARCHAR(64) NULL,
          UserAgent VARCHAR(200) NULL,
          CreatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          PRIMARY KEY (ChatTelemetryEventId),
          INDEX IX_${CHAT_TELEMETRY_TABLE}_CreatedAt (CreatedAt),
          INDEX IX_${CHAT_TELEMETRY_TABLE}_EventPage (Event, Page)
        );
      `);
    })().catch((error) => {
      telemetryTableReady = null;
      throw error;
    });
  }

  await telemetryTableReady;
};

const persistTelemetryEvent = async (payload: {
  event: string;
  page: ChatPage;
  sessionId?: string | null;
  productId?: number | null;
  messageLength?: number | null;
  conversationLength?: number | null;
  target?: string | null;
  label?: string | null;
  placement?: string | null;
  hasContextSummary?: boolean;
  ip?: string | null;
  userAgent?: string | null;
}) => {
  const normalized = {
    event: trimText(payload.event, 40),
    page: payload.page,
    sessionId: buildChatSessionId(payload.sessionId),
    productId: payload.productId ?? null,
    messageLength: payload.messageLength ?? null,
    conversationLength: payload.conversationLength ?? null,
    target: payload.target ? trimText(payload.target, 200) : null,
    label: payload.label ? trimText(payload.label, 80) : null,
    placement: payload.placement ?? null,
    hasContextSummary: payload.hasContextSummary ?? false,
    ip: payload.ip ? trimText(payload.ip, 64) : null,
    userAgent: payload.userAgent ? trimText(payload.userAgent, 200) : null,
  };

  await ensureTelemetryTable();
  await prisma.$executeRaw`
    INSERT INTO ChatTelemetryEvents (
      Event,
      Page,
      SessionId,
      ProductId,
      MessageLength,
      ConversationLength,
      Target,
      Label,
      Placement,
      HasContextSummary,
      IpAddress,
      UserAgent
    )
    VALUES (
      ${normalized.event},
      ${normalized.page},
      ${normalized.sessionId},
      ${normalized.productId},
      ${normalized.messageLength},
      ${normalized.conversationLength},
      ${normalized.target},
      ${normalized.label},
      ${normalized.placement},
      ${normalized.hasContextSummary},
      ${normalized.ip},
      ${normalized.userAgent}
    )
  `;
};

export const chatService = {
  async chat(payload: ChatRequestDto): Promise<ChatResponseDto> {
    const currentProduct = await resolveCurrentProduct(payload.page, payload.productId);
    const contextualMessage = buildContextualUserMessage(payload.message, payload.history);
    const intent = await classifyIntent({
      message: payload.message,
      page: payload.page,
      history: payload.history,
      currentProduct: currentProduct ?? undefined,
    });

    if (intent === 'OUT_OF_SCOPE') {
      void trackInternalChatEvent({
        event: 'chat_out_of_scope_blocked',
        payload,
        label: intent,
      });

      return {
        reply: OUT_OF_SCOPE_REPLY,
        intent,
        products: [],
        actions: [],
      };
    }

    if (intent === 'SUPPORT') {
      const actions = buildSmartActions({
        page: payload.page,
        message: payload.message,
        intent,
        products: [],
      });

      void trackInternalChatEvent({
        event: 'chat_support_redirected',
        payload,
        target: actions[0]?.to,
        label: actions[0]?.label ?? intent,
      });

      return {
        reply: SUPPORT_REPLY,
        intent,
        products: [],
        actions,
      };
    }

    if (shouldAskForClarification({
      message: contextualMessage,
      intent,
      currentProduct: currentProduct ?? undefined,
    })) {
      void trackInternalChatEvent({
        event: 'chat_clarification_asked',
        payload,
        label: intent,
      });

      return {
        reply: NEED_MORE_INFO_REPLY,
        intent,
        products: [],
        actions: [],
      };
    }

    const shouldFetchRecommendations = shouldRecommendProducts(payload.page, intent, contextualMessage);
    const productsPromise = shouldFetchRecommendations
      ? searchProducts({
          message: contextualMessage,
          page: payload.page,
          currentProduct: currentProduct ?? undefined,
        }).catch((error) => {
          logger.warn('[chatService] Recommendation fallback engaged', { error: toLoggableError(error) });
          return [] as ChatProductRecommendation[];
        })
      : Promise.resolve([] as ChatProductRecommendation[]);

    try {
      const replyPromise = callCloudflare(
        buildReplyPrompt({
          page: payload.page,
          message: contextualMessage,
          history: payload.history,
          intent,
          product: currentProduct ?? undefined,
          hasRecommendations: shouldFetchRecommendations,
          contextSummary: payload.contextSummary,
        }),
      ).then(trimAnswer);

      const [products, reply] = await Promise.all([productsPromise, replyPromise]);
      const actions = buildSmartActions({
        page: payload.page,
        message: contextualMessage,
        intent,
        products,
      });

      void trackInternalChatEvent({
        event: 'chat_short_answer_returned',
        payload,
        target: products[0] ? `/product/${products[0].productId}` : undefined,
        label: intent,
      });

      return {
        reply,
        intent,
        products,
        actions,
      };
    } catch (error) {
      const products = await productsPromise;
      const actions = buildSmartActions({
        page: payload.page,
        message: contextualMessage,
        intent,
        products,
      });
      logger.error('[chatService] Reply generation fallback engaged', { error: toLoggableError(error) });
      return {
        reply: buildFallbackReply(payload.page, products.length > 0, currentProduct?.name),
        intent,
        products,
        actions,
      };
    }
  },

  __resetCachesForTests() {
    clearChatPerformanceCaches();
  },

  async trackEvent(
    payload: ChatTelemetryEventDto,
    requestMeta?: { ip?: string; userAgent?: string },
  ): Promise<void> {
    const normalized = {
      event: payload.event,
      page: payload.page,
      sessionId: buildChatSessionId(payload.sessionId),
      productId: payload.productId,
      messageLength: payload.messageLength,
      conversationLength: payload.conversationLength,
      target: payload.target ? trimText(payload.target, 200) : null,
      label: payload.label ? trimText(payload.label, 80) : null,
      placement: payload.placement ?? null,
      hasContextSummary: payload.hasContextSummary ?? false,
      ip: requestMeta?.ip ? trimText(requestMeta.ip, 64) : null,
      userAgent: requestMeta?.userAgent ? trimText(requestMeta.userAgent, 200) : null,
    };

      try {
      await persistTelemetryEvent(normalized);
    } catch (error) {
      logger.warn('[chatTelemetry] Failed to persist event', { error: toLoggableError(error), event: normalized.event });
    }

    logger.info('[chatTelemetry] Event captured', normalized);
  },

  async getTelemetrySummary({
    startDate,
    endDate,
  }: {
    startDate?: string;
    endDate?: string;
  }): Promise<ChatTelemetrySummaryDto> {
    await ensureTelemetryTable();

    const now = new Date();
    const start = parseDate(startDate, startOfMonth(now));
    const end = endOfDay(parseDate(endDate, now));

    const [overviewRows, byPageRows, topTargetRows, dailyTrendRows, internalSignalRows, internalByPageRows, internalTrendRows] =
      await Promise.all([
      prisma.$queryRaw<Array<{
        opens: number | bigint | null;
        sends: number | bigint | null;
        ctaClicks: number | bigint | null;
        productClicks: number | bigint | null;
        uniqueSessions: number | bigint | null;
      }>>`
        SELECT
          SUM(CASE WHEN Event = 'chat_open' THEN 1 ELSE 0 END) AS opens,
          SUM(CASE WHEN Event = 'chat_send' THEN 1 ELSE 0 END) AS sends,
          SUM(CASE WHEN Event = 'chat_cta_click' THEN 1 ELSE 0 END) AS ctaClicks,
          SUM(CASE WHEN Event = 'chat_product_click' THEN 1 ELSE 0 END) AS productClicks,
          COUNT(DISTINCT SessionId) AS uniqueSessions
        FROM ChatTelemetryEvents
        WHERE CreatedAt >= ${start} AND CreatedAt <= ${end}
      `,
      prisma.$queryRaw<Array<{
        page: string;
        opens: number | bigint | null;
        sends: number | bigint | null;
        ctaClicks: number | bigint | null;
        productClicks: number | bigint | null;
      }>>`
        SELECT
          Page AS page,
          SUM(CASE WHEN Event = 'chat_open' THEN 1 ELSE 0 END) AS opens,
          SUM(CASE WHEN Event = 'chat_send' THEN 1 ELSE 0 END) AS sends,
          SUM(CASE WHEN Event = 'chat_cta_click' THEN 1 ELSE 0 END) AS ctaClicks,
          SUM(CASE WHEN Event = 'chat_product_click' THEN 1 ELSE 0 END) AS productClicks
        FROM ChatTelemetryEvents
        WHERE CreatedAt >= ${start} AND CreatedAt <= ${end}
        GROUP BY Page
        ORDER BY Page ASC
      `,
      prisma.$queryRaw<Array<{
        target: string;
        label: string | null;
        clicks: number | bigint | null;
      }>>`
        SELECT
          Target AS target,
          MAX(Label) AS label,
          COUNT(*) AS clicks
        FROM ChatTelemetryEvents
        WHERE CreatedAt >= ${start}
          AND CreatedAt <= ${end}
          AND Event IN ('chat_cta_click', 'chat_product_click')
          AND Target IS NOT NULL
        GROUP BY Target
        ORDER BY clicks DESC, target ASC
        LIMIT 6
      `,
      prisma.$queryRaw<Array<{
        label: string;
        opens: number | bigint | null;
        sends: number | bigint | null;
        clicks: number | bigint | null;
      }>>`
        SELECT
          DATE_FORMAT(CreatedAt, '%Y-%m-%d') AS label,
          SUM(CASE WHEN Event = 'chat_open' THEN 1 ELSE 0 END) AS opens,
          SUM(CASE WHEN Event = 'chat_send' THEN 1 ELSE 0 END) AS sends,
          SUM(CASE WHEN Event IN ('chat_cta_click', 'chat_product_click') THEN 1 ELSE 0 END) AS clicks
        FROM ChatTelemetryEvents
        WHERE CreatedAt >= ${start} AND CreatedAt <= ${end}
        GROUP BY DATE_FORMAT(CreatedAt, '%Y-%m-%d')
        ORDER BY label ASC
      `,
      prisma.$queryRaw<Array<{
        event: string;
        total: number | bigint | null;
      }>>`
        SELECT
          Event AS event,
          COUNT(*) AS total
        FROM ChatTelemetryEvents
        WHERE CreatedAt >= ${start}
          AND CreatedAt <= ${end}
          AND Event IN (
            'chat_out_of_scope_blocked',
            'chat_support_redirected',
            'chat_short_answer_returned',
            'chat_clarification_asked'
          )
        GROUP BY Event
      `,
      prisma.$queryRaw<Array<{
        page: string;
        outOfScopeBlocked: number | bigint | null;
        supportRedirected: number | bigint | null;
        clarificationAsked: number | bigint | null;
        shortAnswerReturned: number | bigint | null;
      }>>`
        SELECT
          Page AS page,
          SUM(CASE WHEN Event = 'chat_out_of_scope_blocked' THEN 1 ELSE 0 END) AS outOfScopeBlocked,
          SUM(CASE WHEN Event = 'chat_support_redirected' THEN 1 ELSE 0 END) AS supportRedirected,
          SUM(CASE WHEN Event = 'chat_clarification_asked' THEN 1 ELSE 0 END) AS clarificationAsked,
          SUM(CASE WHEN Event = 'chat_short_answer_returned' THEN 1 ELSE 0 END) AS shortAnswerReturned
        FROM ChatTelemetryEvents
        WHERE CreatedAt >= ${start}
          AND CreatedAt <= ${end}
          AND Event IN (
            'chat_out_of_scope_blocked',
            'chat_support_redirected',
            'chat_short_answer_returned',
            'chat_clarification_asked'
          )
        GROUP BY Page
        ORDER BY Page ASC
      `,
      prisma.$queryRaw<Array<{
        label: string;
        outOfScopeBlocked: number | bigint | null;
        supportRedirected: number | bigint | null;
        clarificationAsked: number | bigint | null;
        shortAnswerReturned: number | bigint | null;
      }>>`
        SELECT
          DATE_FORMAT(CreatedAt, '%Y-%m-%d') AS label,
          SUM(CASE WHEN Event = 'chat_out_of_scope_blocked' THEN 1 ELSE 0 END) AS outOfScopeBlocked,
          SUM(CASE WHEN Event = 'chat_support_redirected' THEN 1 ELSE 0 END) AS supportRedirected,
          SUM(CASE WHEN Event = 'chat_clarification_asked' THEN 1 ELSE 0 END) AS clarificationAsked,
          SUM(CASE WHEN Event = 'chat_short_answer_returned' THEN 1 ELSE 0 END) AS shortAnswerReturned
        FROM ChatTelemetryEvents
        WHERE CreatedAt >= ${start}
          AND CreatedAt <= ${end}
          AND Event IN (
            'chat_out_of_scope_blocked',
            'chat_support_redirected',
            'chat_short_answer_returned',
            'chat_clarification_asked'
          )
        GROUP BY DATE_FORMAT(CreatedAt, '%Y-%m-%d')
        ORDER BY label ASC
      `,
    ]);

    const overviewRow = overviewRows[0] ?? {
      opens: 0,
      sends: 0,
      ctaClicks: 0,
      productClicks: 0,
      uniqueSessions: 0,
    };

    const overview: ChatTelemetryOverviewDto = {
      opens: Number(overviewRow.opens ?? 0),
      sends: Number(overviewRow.sends ?? 0),
      ctaClicks: Number(overviewRow.ctaClicks ?? 0),
      productClicks: Number(overviewRow.productClicks ?? 0),
      uniqueSessions: Number(overviewRow.uniqueSessions ?? 0),
      sendRate: overviewRow.opens ? roundRate((Number(overviewRow.sends ?? 0) / Number(overviewRow.opens)) * 100) : 0,
      clickRate: overviewRow.sends
        ? roundRate(((Number(overviewRow.ctaClicks ?? 0) + Number(overviewRow.productClicks ?? 0)) / Number(overviewRow.sends)) * 100)
        : 0,
    };

    const byPage: ChatTelemetryByPageDto[] = byPageRows.map((row) => ({
      page: row.page as ChatPage,
      opens: Number(row.opens ?? 0),
      sends: Number(row.sends ?? 0),
      ctaClicks: Number(row.ctaClicks ?? 0),
      productClicks: Number(row.productClicks ?? 0),
    }));

    const topTargets: ChatTelemetryTargetDto[] = topTargetRows.map((row) => ({
      target: row.target,
      label: row.label,
      clicks: Number(row.clicks ?? 0),
    }));

    const dailyTrend: ChatTelemetryDailyTrendDto[] = dailyTrendRows.map((row) => ({
      label: row.label,
      opens: Number(row.opens ?? 0),
      sends: Number(row.sends ?? 0),
      clicks: Number(row.clicks ?? 0),
    }));

    const internalSignalLookup = new Map(
      internalSignalRows.map((row) => [row.event as ChatTelemetryInternalEventDto, Number(row.total ?? 0)]),
    );

    const internalSignals: ChatTelemetryInternalMetricDto[] = INTERNAL_SIGNAL_EVENTS.map((event) => {
      const total = internalSignalLookup.get(event) ?? 0;

      return {
        event,
        total,
        rate: overview.sends ? roundRate((total / overview.sends) * 100) : 0,
      };
    });

    const internalSignalsByPage: ChatTelemetryInternalByPageDto[] = internalByPageRows.map((row) => ({
      page: row.page as ChatPage,
      outOfScopeBlocked: Number(row.outOfScopeBlocked ?? 0),
      supportRedirected: Number(row.supportRedirected ?? 0),
      clarificationAsked: Number(row.clarificationAsked ?? 0),
      shortAnswerReturned: Number(row.shortAnswerReturned ?? 0),
    }));

    const internalSignalsTrend: ChatTelemetryInternalTrendDto[] = internalTrendRows.map((row) => ({
      label: row.label,
      outOfScopeBlocked: Number(row.outOfScopeBlocked ?? 0),
      supportRedirected: Number(row.supportRedirected ?? 0),
      clarificationAsked: Number(row.clarificationAsked ?? 0),
      shortAnswerReturned: Number(row.shortAnswerReturned ?? 0),
    }));

    return {
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      overview,
      byPage,
      topTargets,
      dailyTrend,
      internalSignals,
      internalSignalsByPage,
      internalSignalsTrend,
    };
  },
};
