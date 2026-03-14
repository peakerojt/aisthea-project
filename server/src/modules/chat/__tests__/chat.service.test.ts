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

const createFetchResponse = (body: unknown, ok = true, status = 200) =>
  ({
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  }) as Response;

describe('chatService', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
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
    jest.spyOn(productRepository, 'findMany').mockResolvedValue({
      data: [
        {
          productId: 12,
          name: 'Urban Jacket',
          basePrice: 1290000,
          images: [{ imageUrl: 'https://cdn.example.com/jacket.jpg', isPrimary: true }],
        },
      ] as never[],
      meta: { total: 1, page: 1, limit: 4, totalPages: 1 },
    });

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
        expect.objectContaining({ to: '/product/12' }),
        expect.objectContaining({ to: '/collection' }),
      ]),
    );
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
    jest.spyOn(productRepository, 'findMany').mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 4, totalPages: 0 },
    });

    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(createFetchResponse({ result: { response: 'STYLE' } }))
      .mockResolvedValueOnce(createFetchResponse({ result: { response: 'Áo này hợp form slim.' } }));
    global.fetch = fetchMock as typeof fetch;

    const result = await chatService.chat({
      message: 'Áo này mặc fit như thế nào?',
      page: 'product',
      productId: 8,
      history: [],
    });

    const secondCall = fetchMock.mock.calls[1];
    const secondBody = JSON.parse(secondCall[1].body as string) as { messages: Array<{ content: string }> };

    expect(secondBody.messages[0].content).toContain('Minimal Linen Shirt');
    expect(secondBody.messages[0].content).toContain('Shirts');
    expect(result.reply).toBe('Áo này hợp form slim.');
    expect(result.actions).toEqual(
      expect.arrayContaining([expect.objectContaining({ to: '/stylist' })]),
    );
  });

  it('uses stylist assistant prompt for stylist page requests', async () => {
    jest.spyOn(productRepository, 'findMany').mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 4, totalPages: 0 },
    });

    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(createFetchResponse({ result: { response: 'STYLE' } }))
      .mockResolvedValueOnce(createFetchResponse({ result: { response: 'Bạn nên phối thêm áo khoác nhẹ.' } }));
    global.fetch = fetchMock as typeof fetch;

    const result = await chatService.chat({
      message: 'Phối đồ đi làm trời mát như thế nào?',
      page: 'stylist',
      history: [],
    });

    const secondCall = fetchMock.mock.calls[1];
    const secondBody = JSON.parse(secondCall[1].body as string) as { messages: Array<{ content: string }> };

    expect(secondBody.messages[0].content).toContain('AISTHEA stylist assistant');
    expect(result.intent).toBe('STYLE');
    expect(result.reply).toBe('Bạn nên phối thêm áo khoác nhẹ.');
    expect(result.actions).toEqual(
      expect.arrayContaining([expect.objectContaining({ to: '/collection' })]),
    );
  });

  it('uses support fallback reply for support page requests', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'));

    const result = await chatService.chat({
      message: 'Tôi muốn hỏi chính sách đổi trả',
      page: 'support',
      history: [],
    });

    expect(result.intent).toBe('GENERAL');
    expect(result.products).toEqual([]);
    expect(result.reply).toContain('Support');
    expect(result.actions).toEqual(
      expect.arrayContaining([expect.objectContaining({ to: '/support?section=returns' })]),
    );
    expect(result.actions).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ to: '/support' })]),
    );
  });

  it('includes weather context when generating a weather-page reply', async () => {
    jest.spyOn(productRepository, 'findMany').mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 4, totalPages: 0 },
    });

    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(createFetchResponse({ result: { response: 'STYLE' } }))
      .mockResolvedValueOnce(createFetchResponse({ result: { response: 'Nên ưu tiên áo khoác mỏng chống gió.' } }));
    global.fetch = fetchMock as typeof fetch;

    const result = await chatService.chat({
      message: 'Thời tiết này nên mặc gì?',
      page: 'weather',
      history: [],
      contextSummary: 'Ho Chi Minh City · 31.5°C · mây rải rác · summer/humid',
    });

    const secondCall = fetchMock.mock.calls[1];
    const secondBody = JSON.parse(secondCall[1].body as string) as { messages: Array<{ content: string }> };

    expect(secondBody.messages[0].content).toContain('AISTHEA stylist assistant');
    expect(secondBody.messages[0].content).toContain('Ho Chi Minh City');
    expect(result.reply).toBe('Nên ưu tiên áo khoác mỏng chống gió.');
    expect(result.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ to: '/stylist' }),
        expect.objectContaining({ to: '/collection' }),
      ]),
    );
    expect(result.actions).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ to: '/weather-outfit' })]),
    );
  });
});
