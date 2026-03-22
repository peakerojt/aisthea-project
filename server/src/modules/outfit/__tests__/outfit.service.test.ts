jest.mock('../../../services/aiApi.service', () => ({
  callAiModel: jest.fn(),
}));

import { recommendOutfit } from '../outfit.service';
import { callAiModel } from '../../../services/aiApi.service';

const mockedCallAiModel = callAiModel as jest.MockedFunction<typeof callAiModel>;

const baseWeather = {
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
  seasonContext: 'summer/rainy',
};

describe('recommendOutfit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns parsed AI recommendation when model responds with valid JSON', async () => {
    mockedCallAiModel.mockResolvedValueOnce(JSON.stringify({
      summary: 'Outfit phù hợp cho thời tiết mưa nhẹ và nóng ẩm.',
      items: {
        top: 'Áo blouse linen sáng màu',
        bottom: 'Quần suông nhẹ',
        shoes: 'Sneakers trắng',
        accessories: ['Ô gấp gọn'],
      },
      tips: ['Ưu tiên chất liệu mỏng nhẹ.', 'Mang theo ô nhỏ.'],
      warnings: [],
    }));

    const result = await recommendOutfit({
      weather: baseWeather,
      profile: {
        gender: 'female',
        style: 'minimal',
        tolerance: 'medium',
        occasion: 'travel',
      },
    });

    expect(result.summary).toContain('Outfit');
    expect(result.items.top).toContain('Áo');
    expect(result.tips).toHaveLength(2);
  });

  it('returns fallback recommendation when AI response is malformed JSON', async () => {
    mockedCallAiModel.mockResolvedValueOnce('not-json');

    const result = await recommendOutfit({
      weather: baseWeather,
      profile: {
        gender: 'female',
        style: 'minimal',
        tolerance: 'medium',
        occasion: 'travel',
      },
    });

    expect(result.summary).toContain('Ho Chi Minh, VN');
    expect(result.items.top).toContain('Áo');
    expect(result.tips.length).toBeGreaterThanOrEqual(2);
  });

  it('falls back when AI suggests womenswear for a male profile', async () => {
    mockedCallAiModel.mockResolvedValueOnce(JSON.stringify({
      summary: 'Một outfit nam nhưng có váy.',
      items: {
        top: 'Áo sơ mi trắng',
        bottom: 'Chân váy midi',
        shoes: 'Sneakers trắng',
        accessories: ['Đồng hồ'],
      },
      tips: ['Giữ màu trung tính.', 'Ưu tiên form gọn.'],
      warnings: [],
    }));

    const result = await recommendOutfit({
      weather: baseWeather,
      profile: {
        gender: 'male',
        style: 'classic',
        tolerance: 'medium',
        occasion: 'work',
      },
    });

    expect(result.items.bottom).not.toContain('Chân váy');
    expect(result.items.bottom).toContain('Quần');
  });

  it('falls back when AI suggests menswear-only phrasing for a female profile', async () => {
    mockedCallAiModel.mockResolvedValueOnce(JSON.stringify({
      summary: 'Outfit công sở cho nữ.',
      items: {
        top: 'Áo polo nam',
        bottom: 'Quần chino nam',
        shoes: 'Loafers',
        accessories: ['Túi tote'],
      },
      tips: ['Giữ màu trung tính.', 'Ưu tiên chất liệu thoáng.'],
      warnings: [],
    }));

    const result = await recommendOutfit({
      weather: baseWeather,
      profile: {
        gender: 'female',
        style: 'classic',
        tolerance: 'medium',
        occasion: 'work',
      },
    });

    expect(result.items.top).not.toContain('Áo polo nam');
    expect(result.items.top).toContain('Áo');
  });
});
