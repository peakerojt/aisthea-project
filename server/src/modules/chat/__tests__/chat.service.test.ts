jest.mock('../../../lib/env', () => ({
  env: {
    cloudflareAccountId: 'acct',
    cloudflareApiToken: 'token',
    cloudflareAiModel: '@cf/meta/llama-3-8b-instruct',
  },
}));

import { AppError } from '../../../middlewares/error.middleware';
import { productRepository } from '../../products/product.repository';
import { chatService } from '../chat.service';

const OUT_OF_SCOPE_REPLY = 'Mình chỉ hỗ trợ câu hỏi liên quan sản phẩm AISTHEA.';
const SUPPORT_REPLY =
  'Mình hỗ trợ tư vấn sản phẩm. Nếu bạn cần hỗ trợ đơn hàng hoặc chính sách, vui lòng xem mục hỗ trợ của shop.';
const NEED_MORE_INFO_REPLY = 'Bạn muốn mình tư vấn theo mẫu nào hoặc nhu cầu nào?';

const createFetchResponse = (body: unknown, ok = true, status = 200) =>
  ({
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  }) as Response;

const getCollectionSearch = (actions: Array<{ to: string; label: string }>) => {
  const collectionAction = actions.find((action) => action.label === 'Xem bộ sưu tập');
  expect(collectionAction).toBeDefined();

  const target = collectionAction?.to || '/collection';
  return new URL(target, 'https://aisthea.local').searchParams.get('search');
};

const getCollectionTarget = (actions: Array<{ to: string; label: string }>) => {
  const collectionAction = actions.find((action) => action.label === 'Xem bộ sưu tập');
  expect(collectionAction).toBeDefined();
  return collectionAction?.to || '/collection';
};

describe('chatService', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    chatService.__resetCachesForTests();
  });

  it('throws 400 when product page request is missing productId', async () => {
    await expect(
      chatService.chat({
        message: 'Size này có rộng không?',
        page: 'product',
        history: [],
      }),
    ).rejects.toMatchObject<Partial<AppError>>({
      statusCode: 400,
      errorCode: 'VALIDATION_ERROR',
    });
  });

  it('returns fallback reply and recommendations when Cloudflare fails', async () => {
    jest.spyOn(productRepository, 'findChatRecommendations').mockResolvedValue([
      {
        productId: 12,
        name: 'Urban Jacket',
        basePrice: 1290000,
        category: { slug: 'outerwear' },
        images: [{ imageUrl: 'https://cdn.example.com/jacket.jpg', thumbnailUrl: null, isPrimary: true }],
      },
    ] as never[]);

    global.fetch = jest.fn().mockRejectedValue(new Error('network down'));

    const result = await chatService.chat({
      message: 'Tôi muốn tìm jacket đen',
      page: 'home',
      history: [],
    });

    expect(result.intent).toBe('PRODUCT');
    expect(result.products).toEqual([
      {
        productId: 12,
        name: 'Urban Jacket',
        basePrice: 1290000,
        primaryImageUrl: 'https://cdn.example.com/jacket.jpg',
      },
    ]);
    expect(result.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Xem bộ sưu tập' }),
      ]),
    );
    expect(getCollectionSearch(result.actions)).toContain('jacket');
    expect(getCollectionSearch(result.actions)).toContain('đen');
    expect(result.reply).toContain('Cloudflare AI');
  });

  it('includes current product context when generating a product-page reply', async () => {
    jest.spyOn(productRepository, 'findById').mockResolvedValue({
      productId: 8,
      name: 'Minimal Linen Shirt',
      basePrice: 890000,
      description: 'Breathable linen shirt for warm weather.',
      category: { categoryId: 4, name: 'Shirts', slug: 'shirts' },
      variants: [
        {
          variantId: 1,
          variantAttributes: [
            { value: { value: 'M', attribute: { name: 'Size' } } },
            { value: { value: 'White', attribute: { name: 'Color' } } },
          ],
        },
      ],
      images: [{ imageUrl: 'https://cdn.example.com/shirt.jpg', isPrimary: true }],
    } as never);
    const fetchMock = jest.fn().mockResolvedValue(createFetchResponse({ result: { response: 'Áo này hợp form slim.' } }));
    global.fetch = fetchMock as typeof fetch;

    const result = await chatService.chat({
      message: 'Áo này mặc fit như thế nào?',
      page: 'product',
      productId: 8,
      history: [],
    });

    const promptCall = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
    const promptBody = JSON.parse(promptCall?.[1].body as string) as {
      messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    };

    expect(promptBody.messages[0].content).toContain("You are AISTHEA's product assistant.");
    expect(promptBody.messages[0].content).toContain('Minimal Linen Shirt');
    expect(promptBody.messages[0].content).toContain('Shirts');
    expect(promptBody.messages[0].content).toContain('Maximum 2 sentences');
    expect(result.reply).toBe('Áo này hợp form slim.');
    expect(getCollectionSearch(result.actions)).toContain('áo');
    expect(getCollectionSearch(result.actions)).toContain('fit');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('uses the strict styling prompt and weather context for weather requests', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      createFetchResponse({
        result: {
          response:
            'Nên ưu tiên áo khoác mỏng chống gió. Chọn thêm chân váy hoặc quần nhẹ để dễ di chuyển. Câu này không nên còn ở đây.',
        },
      }),
    );
    global.fetch = fetchMock as typeof fetch;

    const result = await chatService.chat({
      message: 'Thời tiết này nên mặc gì để đi làm?',
      page: 'weather',
      history: [],
      contextSummary: 'Ho Chi Minh City · 31.5°C · mây rải rác · summer/humid',
    });

    const promptCall = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
    const promptBody = JSON.parse(promptCall?.[1].body as string) as {
      messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    };

    expect(promptBody.messages[0].content).toContain("You are AISTHEA's product assistant.");
    expect(promptBody.messages[0].content).toContain('This request is a styling request tied to AISTHEA products.');
    expect(promptBody.messages[0].content).toContain('Ho Chi Minh City');
    expect(result.intent).toBe('STYLE');
    expect(result.reply).toBe('Nên ưu tiên áo khoác mỏng chống gió. Chọn thêm chân váy hoặc quần nhẹ để dễ di chuyển.');
    expect(getCollectionSearch(result.actions)).toContain('đi làm');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('blocks out-of-scope requests immediately', async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce(createFetchResponse({ result: { response: 'OUT_OF_SCOPE' } }));
    global.fetch = fetchMock as typeof fetch;

    const findManySpy = jest.spyOn(productRepository, 'findMany');

    const result = await chatService.chat({
      message: 'Ai là tổng thống Mỹ?',
      page: 'home',
      history: [],
    });

    expect(result.intent).toBe('OUT_OF_SCOPE');
    expect(result.reply).toBe(OUT_OF_SCOPE_REPLY);
    expect(result.products).toEqual([]);
    expect(result.actions).toEqual([]);
    expect(findManySpy).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('redirects support requests without generating a second LLM reply', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as typeof fetch;

    const result = await chatService.chat({
      message: 'Tôi muốn hỏi chính sách đổi trả',
      page: 'support',
      history: [],
    });

    expect(result.intent).toBe('SUPPORT');
    expect(result.products).toEqual([]);
    expect(result.reply).toBe(SUPPORT_REPLY);
    expect(result.actions).toEqual(
      expect.arrayContaining([expect.objectContaining({ to: '/support?section=returns' })]),
    );
    expect(result.actions).toEqual(expect.arrayContaining([expect.objectContaining({ to: '/support?section=faq' })]));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('normalizes the user query before searching products', async () => {
    jest.spyOn(productRepository, 'findChatRecommendations').mockResolvedValue([] as never[]);

    const fetchMock = jest.fn().mockResolvedValue(
      createFetchResponse({ result: { response: 'Mình đã tìm vài mẫu jacket đen để bạn xem.' } }),
    );
    global.fetch = fetchMock as typeof fetch;

    const recommendationSpy = jest.spyOn(productRepository, 'findChatRecommendations');

    const result = await chatService.chat({
      message: 'Cho mình hỏi, tìm jacket đen thế nào?',
      page: 'home',
      history: [],
    });

    expect(result.intent).toBe('PRODUCT');
    expect(recommendationSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'jacket đen',
        limit: 6,
      }),
    );
    expect(result.reply).toBe('Mình đã tìm vài mẫu jacket đen để bạn xem.');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('filters canned history before building the reply prompt', async () => {
    jest.spyOn(productRepository, 'findById').mockResolvedValue({
      productId: 8,
      name: 'Minimal Linen Shirt',
      basePrice: 890000,
      description: 'Breathable linen shirt for warm weather.',
      category: { categoryId: 4, name: 'Shirts', slug: 'shirts' },
      variants: [],
      images: [{ imageUrl: 'https://cdn.example.com/shirt.jpg', isPrimary: true }],
    } as never);

    const fetchMock = jest.fn().mockResolvedValue(
      createFetchResponse({ result: { response: 'Mẫu này hợp đi làm với blazer nhẹ.' } }),
    );
    global.fetch = fetchMock as typeof fetch;

    await chatService.chat({
      message: 'Mẫu này hợp đi làm không?',
      page: 'product',
      productId: 8,
      history: [
        { role: 'user', content: 'Thời tiết hôm nay thế nào?' },
        { role: 'assistant', content: OUT_OF_SCOPE_REPLY },
        { role: 'user', content: 'Áo này có form rộng không?' },
      ],
    });

    const promptCall = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
    const promptBody = JSON.parse(promptCall?.[1].body as string) as {
      messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    };
    const conversationOnly = promptBody.messages.filter((message) => message.role !== 'system');
    const serialized = JSON.stringify(conversationOnly);

    expect(serialized).not.toContain('Thời tiết hôm nay thế nào?');
    expect(serialized).not.toContain(OUT_OF_SCOPE_REPLY);
    expect(serialized).toContain('Áo này có form rộng không?');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('asks for one short clarification when the request is too broad', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as typeof fetch;

    const recommendationSpy = jest.spyOn(productRepository, 'findChatRecommendations');

    const result = await chatService.chat({
      message: 'Tư vấn giúp mình',
      page: 'home',
      history: [],
    });

    expect(result.intent).toBe('PRODUCT');
    expect(result.reply).toBe(NEED_MORE_INFO_REPLY);
    expect(result.products).toEqual([]);
    expect(result.actions).toEqual([]);
    expect(recommendationSpy).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps recent product context for short follow-up fragments', async () => {
    jest.spyOn(productRepository, 'findChatRecommendations').mockResolvedValue([] as never[]);

    const fetchMock = jest.fn().mockResolvedValue(
      createFetchResponse({ result: { response: 'Mình có vài mẫu sơ mi nam để bạn xem.' } }),
    );
    global.fetch = fetchMock as typeof fetch;

    const recommendationSpy = jest.spyOn(productRepository, 'findChatRecommendations');

    const result = await chatService.chat({
      message: 'Nam',
      page: 'home',
      history: [
        { role: 'user', content: 'Tôi muốn mua áo sơ mi' },
        { role: 'assistant', content: 'AISTHEA có áo sơ mi nam và nữ, bạn muốn mình tư vấn theo mẫu nào hoặc nhu cầu nào?' },
      ],
    });

    const promptCall = fetchMock.mock.calls[0];
    const promptBody = JSON.parse(promptCall[1].body as string) as {
      messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    };
    const lastMessage = promptBody.messages[promptBody.messages.length - 1];

    expect(result.intent).toBe('PRODUCT');
    expect(result.reply).toBe('Mình có vài mẫu sơ mi nam để bạn xem.');
    expect(lastMessage?.content).toContain('Tôi muốn mua áo sơ mi Nam');
    expect(recommendationSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'áo sơ mi nam',
        limit: 6,
      }),
    );
    expect(getCollectionTarget(result.actions)).toContain('/collection/men/tops');
    expect(getCollectionSearch(result.actions)).toBe('áo sơ mi nam');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('routes explicit womenswear requests to a narrower collection path', async () => {
    jest.spyOn(productRepository, 'findChatRecommendations').mockResolvedValue([] as never[]);

    const fetchMock = jest.fn().mockResolvedValue(
      createFetchResponse({ result: { response: 'Mình sẽ mở đúng bộ sưu tập váy cho bạn.' } }),
    );
    global.fetch = fetchMock as typeof fetch;

    const result = await chatService.chat({
      message: 'Tôi muốn mua váy nữ đi làm',
      page: 'home',
      history: [],
    });

    expect(result.intent).toBe('PRODUCT');
    expect(getCollectionTarget(result.actions)).toContain('/collection/women/dresses');
    expect(getCollectionSearch(result.actions)).toBe('váy nữ đi làm');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
