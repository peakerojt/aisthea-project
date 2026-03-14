import { getSeasonContext } from '../season.util';

describe('getSeasonContext', () => {
  it('returns summer-hot for high temperature', () => {
    const result = getSeasonContext({ temperatureC: 32, humidity: 60, month: 7, hemisphere: 'north' });
    expect(result).toBe('summer-hot');
  });

  it('returns rainy-humid when humidity is high', () => {
    const result = getSeasonContext({ temperatureC: 28, humidity: 85, month: 6, hemisphere: 'north' });
    expect(result).toBe('rainy-humid');
  });

  it('returns winter-cold for low temperature', () => {
    const result = getSeasonContext({ temperatureC: 8, humidity: 50, month: 1, hemisphere: 'north' });
    expect(result).toBe('winter-cold');
  });

  it('returns spring-mild in shoulder season', () => {
    const result = getSeasonContext({ temperatureC: 18, humidity: 60, month: 4, hemisphere: 'north' });
    expect(result).toBe('spring-mild');
  });
});
