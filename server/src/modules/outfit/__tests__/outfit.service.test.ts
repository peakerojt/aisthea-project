jest.mock('../../../services/aiApi.service', () => ({
  callAiModel: jest.fn(),
}));

import { recommendOutfit } from '../outfit.service';
import { callAiModel } from '../../../services/aiApi.service';

const mockedCallAiModel = callAiModel as jest.MockedFunction<typeof callAiModel>;

const payload = {
  weather: {
    locationName: 'Ho Chi Minh, VN',
    temperatureC: 31,
    humidity: 78,
    windSpeedKph: 18,
    description: 'shower rain',
    icon: 'https://example.com/icon.png',
    weatherCode: 1240,
    timezone: 'Asia/Ho_Chi_Minh',
    localTime: '2026-03-16 16:00',
    lat: 10.8231,
    lon: 106.6297,
  },
  seasonContext: 'summer/rainy',
  profile: {
    gender: 'female',
    style: 'minimal',
    tolerance: 'medium' as const,
    occasion: 'travel',
  },
};

describe('recommendOutfit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns parsed AI recommendation when model responds with valid JSON', async () => {
    mockedCallAiModel.mockResolvedValueOnce(JSON.stringify({
      summary: 'Test summary',
      items: {
        top: 'Top',
        bottom: 'Bottom',
        shoes: 'Shoes',
        accessories: ['Accessory'],
      },
      tips: ['Tip 1', 'Tip 2'],
      warnings: [],
    }));

    const result = await recommendOutfit(payload);

    expect(result.summary).toBe('Test summary');
    expect(result.items.top).toBe('Top');
    expect(result.tips).toEqual(['Tip 1', 'Tip 2']);
  });

  it('returns fallback recommendation when AI request aborts', async () => {
    mockedCallAiModel.mockRejectedValueOnce(new Error('AI request timed out'));

    const result = await recommendOutfit(payload);

    expect(result.summary).toContain('Ho Chi Minh, VN');
    expect(result.items.top).toContain('Áo');
    expect(result.items.accessories.length).toBeGreaterThan(0);
    expect(result.tips.length).toBeGreaterThanOrEqual(2);
  });
});
