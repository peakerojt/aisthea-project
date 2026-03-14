import { env } from '../../lib/env';
import { logger } from '../../lib/logger';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middlewares/error.middleware';
import { productRepository } from '../products/product.repository';
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
  ChatTelemetryOverviewDto,
  ChatTelemetrySummaryDto,
  ChatTelemetryTargetDto,
} from './chat.types';

type CloudflareMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type ProductContext = Awaited<ReturnType<typeof productRepository.findById>>;

const CLOUDFLARE_TIMEOUT_MS = 12_000;
const MAX_RECOMMENDATIONS = 4;
const MAX_HISTORY_ITEMS = 8;
const CHAT_TELEMETRY_TABLE = 'ChatTelemetryEvents';

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

const SUPPORT_HINTS = [
  'return',
  'refund',
  'exchange',
  'policy',
  'privacy',
  'faq',
  'support',
  'help',
  'contact',
  'đổi trả',
  'hoàn tiền',
  'chính sách',
  'bảo mật',
  'hỗ trợ',
  'liên hệ',
];

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

const normalizeAssistantPage = (page: ChatPage): Exclude<ChatPage, 'weather'> => {
  if (page === 'weather') return 'stylist';
  return page;
};

const keywordIntentFallback = (message: string, page: ChatPage): ChatIntent => {
  const assistantPage = normalizeAssistantPage(page);
  const normalized = message.toLowerCase();

  if (assistantPage === 'support' && SUPPORT_HINTS.some((hint) => normalized.includes(hint))) return 'GENERAL';
  if (STYLE_HINTS.some((hint) => normalized.includes(hint))) return 'STYLE';
  if (PRODUCT_DISCOVERY_HINTS.some((hint) => normalized.includes(hint))) return 'PRODUCT';
  if (assistantPage === 'product' || assistantPage === 'stylist') return 'STYLE';
  return 'GENERAL';
};

const shouldRecommendProducts = (page: ChatPage, intent: ChatIntent, message: string): boolean => {
  const assistantPage = normalizeAssistantPage(page);
  const normalized = message.toLowerCase();
  const isExploreMore = EXPLORE_MORE_HINTS.some((hint) => normalized.includes(hint));

  if (assistantPage === 'support') {
    return false;
  }

  if (assistantPage === 'home') {
    return intent === 'PRODUCT' || isExploreMore;
  }

  if (assistantPage === 'stylist') {
    return intent === 'PRODUCT' || intent === 'STYLE' || isExploreMore;
  }

  return isExploreMore;
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
  contextSummary,
}: {
  page: ChatPage;
  message: string;
  history: ChatHistoryMessage[];
  product?: NonNullable<ProductContext>;
  hasRecommendations: boolean;
  contextSummary?: string;
}): CloudflareMessage[] => {
  const assistantPage = normalizeAssistantPage(page);
  const baseSystemPrompt = (() => {
    if (assistantPage === 'product') {
      return [
        'You are AISTHEA product assistant.',
        'Answer in the same language as the user.',
        'Prioritize the current product first: fit, styling, quality, and whether it suits the request.',
        'Only suggest alternative products if the user explicitly asks to compare, explore more, or pair with other items.',
        hasRecommendations
          ? 'If recommendation cards are shown separately, mention them briefly without listing a full catalog.'
          : 'Do not invent product recommendations that are not supplied.',
        'Keep the reply concise: at most 3 short paragraphs.',
        product ? `Current product context:\n${buildProductSummary(product)}` : '',
      ].filter(Boolean).join('\n');
    }

    if (assistantPage === 'stylist') {
      return [
        'You are AISTHEA stylist assistant.',
        'Answer in the same language as the user.',
        'Help with outfit ideas, pairing, silhouette, comfort, and weather-aware shopping suggestions.',
        contextSummary
          ? `Current styling context:\n${trimText(contextSummary, 500)}`
          : 'If the user mentions weather, use practical styling guidance for the described conditions.',
        hasRecommendations
          ? 'If recommendation cards are shown separately, mention them briefly without listing a full catalog.'
          : 'Do not invent unavailable products.',
        'Keep the reply concise: at most 3 short paragraphs.',
      ].join('\n');
    }

    if (assistantPage === 'support') {
      return [
        'You are AISTHEA support assistant.',
        'Answer in the same language as the user.',
        'Help with FAQ topics such as how to buy, returns, privacy, and support navigation.',
        'Do not invent company policies, order data, or promises that are not provided.',
        'If the answer depends on official policy details, tell the user to check the Support page or contact support directly.',
        'Keep the reply concise: at most 3 short paragraphs.',
      ].join('\n');
    }

    return [
      'You are AISTHEA storefront assistant.',
      'Answer in the same language as the user.',
      'Help with product discovery, styling, and shopping guidance.',
      hasRecommendations
        ? 'If recommendation cards are shown separately, mention them briefly without listing a full catalog.'
        : 'Do not invent unavailable products.',
      'Keep the reply concise: at most 3 short paragraphs.',
    ].join('\n');
  })();

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
      'GENERAL is for everything else, including support, FAQ, returns, privacy, and help requests.',
    ].join('\n'),
  },
  {
    role: 'user',
    content: trimText(message),
  },
];

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
  const pushAction = (action: ChatAction) => {
    if (isRedundantActionForPage(page, action.to)) return;
    actions.push(action);
  };

  if (products.length > 0) {
    pushAction({
      type: 'navigate',
      label: 'Mở sản phẩm phù hợp',
      to: `/product/${products[0].productId}`,
    });
  }

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
  }

  if (page === 'weather' || hasAnyHint(message, WEATHER_HINTS)) {
    pushAction({ type: 'navigate', label: 'Mở Stylist', to: '/stylist' });
  }

  if (assistantPage === 'product') {
    pushAction({ type: 'navigate', label: 'Nhờ Stylist tư vấn', to: '/stylist' });
  }

  if (assistantPage === 'home' && intent === 'PRODUCT') {
    pushAction({ type: 'navigate', label: 'Xem bộ sưu tập', to: '/collection' });
  }

  if (assistantPage === 'stylist' && products.length === 0) {
    pushAction({ type: 'navigate', label: 'Xem bộ sưu tập', to: '/collection' });
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

const classifyIntent = async (message: string, page: ChatPage): Promise<ChatIntent> => {
  try {
    const response = await callCloudflare(buildIntentPrompt(message, page));
    return normalizeIntent(response);
  } catch (error) {
    logger.warn('[chatService] Intent classification fallback engaged', { error: toLoggableError(error) });
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

let telemetryTableReady: Promise<void> | null = null;

const ensureTelemetryTable = async () => {
  if (!telemetryTableReady) {
    telemetryTableReady = (async () => {
      await prisma.$executeRawUnsafe(`
        IF OBJECT_ID(N'dbo.${CHAT_TELEMETRY_TABLE}', N'U') IS NULL
        BEGIN
          CREATE TABLE dbo.${CHAT_TELEMETRY_TABLE} (
            ChatTelemetryEventId INT IDENTITY(1,1) PRIMARY KEY,
            Event NVARCHAR(40) NOT NULL,
            Page NVARCHAR(20) NOT NULL,
            SessionId NVARCHAR(64) NOT NULL,
            ProductId INT NULL,
            MessageLength INT NULL,
            ConversationLength INT NULL,
            Target NVARCHAR(200) NULL,
            Label NVARCHAR(80) NULL,
            Placement NVARCHAR(30) NULL,
            HasContextSummary BIT NOT NULL CONSTRAINT DF_${CHAT_TELEMETRY_TABLE}_HasContextSummary DEFAULT 0,
            IpAddress NVARCHAR(64) NULL,
            UserAgent NVARCHAR(200) NULL,
            CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_${CHAT_TELEMETRY_TABLE}_CreatedAt DEFAULT SYSUTCDATETIME()
          );
        END;

        IF NOT EXISTS (
          SELECT 1
          FROM sys.indexes
          WHERE name = N'IX_${CHAT_TELEMETRY_TABLE}_CreatedAt'
            AND object_id = OBJECT_ID(N'dbo.${CHAT_TELEMETRY_TABLE}')
        )
        BEGIN
          CREATE INDEX IX_${CHAT_TELEMETRY_TABLE}_CreatedAt
          ON dbo.${CHAT_TELEMETRY_TABLE}(CreatedAt);
        END;

        IF NOT EXISTS (
          SELECT 1
          FROM sys.indexes
          WHERE name = N'IX_${CHAT_TELEMETRY_TABLE}_EventPage'
            AND object_id = OBJECT_ID(N'dbo.${CHAT_TELEMETRY_TABLE}')
        )
        BEGIN
          CREATE INDEX IX_${CHAT_TELEMETRY_TABLE}_EventPage
          ON dbo.${CHAT_TELEMETRY_TABLE}(Event, Page);
        END;
      `);
    })().catch((error) => {
      telemetryTableReady = null;
      throw error;
    });
  }

  await telemetryTableReady;
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
    const actions = buildSmartActions({
      page: payload.page,
      message: payload.message,
      intent,
      products,
    });

    try {
      const reply = await callCloudflare(
        buildReplyPrompt({
          page: payload.page,
          message: payload.message,
          history: payload.history,
          product: currentProduct ?? undefined,
          hasRecommendations: products.length > 0,
          contextSummary: payload.contextSummary,
        }),
      );

      return {
        reply,
        intent,
        products,
        actions,
      };
    } catch (error) {
      logger.error('[chatService] Reply generation fallback engaged', { error: toLoggableError(error) });
      return {
        reply: buildFallbackReply(payload.page, products.length > 0, currentProduct?.name),
        intent,
        products,
        actions,
      };
    }
  },

  async trackEvent(
    payload: ChatTelemetryEventDto,
    requestMeta?: { ip?: string; userAgent?: string },
  ): Promise<void> {
    const normalized = {
      event: payload.event,
      page: payload.page,
      sessionId: trimText(payload.sessionId, 64),
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
      await ensureTelemetryTable();
      await prisma.$executeRaw`
        INSERT INTO dbo.ChatTelemetryEvents (
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
          ${normalized.productId ?? null},
          ${normalized.messageLength ?? null},
          ${normalized.conversationLength ?? null},
          ${normalized.target},
          ${normalized.label},
          ${normalized.placement},
          ${normalized.hasContextSummary},
          ${normalized.ip},
          ${normalized.userAgent}
        )
      `;
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

    const [overviewRows, byPageRows, topTargetRows, dailyTrendRows] = await Promise.all([
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
        FROM dbo.ChatTelemetryEvents
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
        FROM dbo.ChatTelemetryEvents
        WHERE CreatedAt >= ${start} AND CreatedAt <= ${end}
        GROUP BY Page
        ORDER BY Page ASC
      `,
      prisma.$queryRaw<Array<{
        target: string;
        label: string | null;
        clicks: number | bigint | null;
      }>>`
        SELECT TOP 6
          Target AS target,
          MAX(Label) AS label,
          COUNT(*) AS clicks
        FROM dbo.ChatTelemetryEvents
        WHERE CreatedAt >= ${start}
          AND CreatedAt <= ${end}
          AND Event IN ('chat_cta_click', 'chat_product_click')
          AND Target IS NOT NULL
        GROUP BY Target
        ORDER BY clicks DESC, target ASC
      `,
      prisma.$queryRaw<Array<{
        label: string;
        opens: number | bigint | null;
        sends: number | bigint | null;
        clicks: number | bigint | null;
      }>>`
        SELECT
          CONVERT(VARCHAR(10), CreatedAt, 23) AS label,
          SUM(CASE WHEN Event = 'chat_open' THEN 1 ELSE 0 END) AS opens,
          SUM(CASE WHEN Event = 'chat_send' THEN 1 ELSE 0 END) AS sends,
          SUM(CASE WHEN Event IN ('chat_cta_click', 'chat_product_click') THEN 1 ELSE 0 END) AS clicks
        FROM dbo.ChatTelemetryEvents
        WHERE CreatedAt >= ${start} AND CreatedAt <= ${end}
        GROUP BY CONVERT(VARCHAR(10), CreatedAt, 23)
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

    return {
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      overview,
      byPage,
      topTargets,
      dailyTrend,
    };
  },
};
