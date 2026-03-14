export const getSeasonContext = ({
  temperatureC,
  humidity,
  month,
  hemisphere = 'north',
}: {
  temperatureC: number;
  humidity?: number;
  month: number;
  hemisphere?: 'north' | 'south';
}): string => {
  const normalizedMonth = Math.min(Math.max(month, 1), 12);
  const isRainy = humidity !== undefined && humidity >= 78;

  if (temperatureC >= 30) {
    return isRainy ? 'rainy-humid' : 'summer-hot';
  }

  if (temperatureC >= 24) {
    return isRainy ? 'rainy-humid' : 'summer-warm';
  }

  if (temperatureC <= 12) {
    return isRainy ? 'winter-wet' : 'winter-cold';
  }

  const isShoulder = temperatureC > 12 && temperatureC < 24;
  if (isShoulder) {
    const seasonalLabel = getSeasonFromMonth(normalizedMonth, hemisphere);
    if (isRainy) {
      return 'rainy-mild';
    }
    return seasonalLabel === 'spring' ? 'spring-mild' : 'autumn-cool';
  }

  return 'mild';
};

const getSeasonFromMonth = (month: number, hemisphere: 'north' | 'south') => {
  const map = hemisphere === 'north'
    ? {
        winter: [12, 1, 2],
        spring: [3, 4, 5],
        summer: [6, 7, 8],
        autumn: [9, 10, 11],
      }
    : {
        winter: [6, 7, 8],
        spring: [9, 10, 11],
        summer: [12, 1, 2],
        autumn: [3, 4, 5],
      };

  if (map.winter.includes(month)) return 'winter';
  if (map.spring.includes(month)) return 'spring';
  if (map.summer.includes(month)) return 'summer';
  return 'autumn';
};
