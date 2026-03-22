jest.mock('../outfit.service', () => ({
  recommendOutfit: jest.fn(),
}));

jest.mock('../../weather/weather.service', () => ({
  getWeatherWithSeason: jest.fn(),
}));

import { recommendOutfitHandler } from '../outfit.controller';
import { recommendOutfit } from '../outfit.service';
import { getWeatherWithSeason } from '../../weather/weather.service';

const mockedRecommendOutfit = recommendOutfit as jest.MockedFunction<typeof recommendOutfit>;
const mockedGetWeatherWithSeason = getWeatherWithSeason as jest.MockedFunction<typeof getWeatherWithSeason>;

const createMockRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('recommendOutfitHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches weather on the server from city payload before generating outfit', async () => {
    mockedGetWeatherWithSeason.mockResolvedValueOnce({
      locationName: 'Da Nang, VN',
      temperatureC: 28,
      humidity: 80,
      windSpeedKph: 15,
      description: 'light rain',
      icon: 'https://example.com/icon.png',
      weatherCode: 500,
      timezone: 'UTC+7',
      localTime: '2026-03-22T09:00:00.000Z',
      lat: 16.0471,
      lon: 108.2068,
      seasonContext: 'summer/rainy',
    });
    mockedRecommendOutfit.mockResolvedValueOnce({
      summary: 'Test summary',
      items: {
        top: 'Áo khoác nhẹ',
        bottom: 'Quần suông',
        shoes: 'Sneakers',
        accessories: ['Ô gấp'],
      },
      tips: ['Tip 1', 'Tip 2'],
      warnings: [],
    });

    const req: any = {
      body: {
        location: { city: 'Da Nang, VN', hemisphere: 'north' },
        profile: { gender: 'female', style: 'minimal', tolerance: 'medium', occasion: 'travel' },
      },
    };
    const res = createMockRes();

    await recommendOutfitHandler(req, res);

    expect(mockedGetWeatherWithSeason).toHaveBeenCalledWith({
      city: 'Da Nang, VN',
      lat: undefined,
      lon: undefined,
      hemisphere: 'north',
    });
    expect(mockedRecommendOutfit).toHaveBeenCalledWith({
      weather: expect.objectContaining({ locationName: 'Da Nang, VN', seasonContext: 'summer/rainy' }),
      profile: expect.objectContaining({ gender: 'female' }),
    });
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        weather: expect.objectContaining({ locationName: 'Da Nang, VN' }),
        recommendation: expect.objectContaining({ summary: 'Test summary' }),
      },
    });
  });

  it('rejects requests without city or coordinates', async () => {
    const req: any = {
      body: {
        location: {},
      },
    };
    const res = createMockRes();

    await recommendOutfitHandler(req, res);

    expect(mockedGetWeatherWithSeason).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
