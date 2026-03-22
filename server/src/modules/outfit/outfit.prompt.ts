import { OutfitProfileInput } from '../../types/outfit.types';
import { WeatherWithSeason } from '../../types/weather.types';

const normalizeProfileValue = (value?: string) =>
  (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();

const matchesAnyGenderKeyword = (value: string, keywords: string[]) => {
  const normalizedValue = normalizeProfileValue(value);
  const tokens = normalizedValue.split(/\s+/).filter(Boolean);

  return keywords.some((keyword) => {
    const normalizedKeyword = normalizeProfileValue(keyword);
    return normalizedValue === normalizedKeyword || tokens.includes(normalizedKeyword);
  });
};

const getGenderRule = (gender?: string) => {
  const normalized = normalizeProfileValue(gender);

  if (matchesAnyGenderKeyword(normalized, ['nu', 'female', 'women', 'woman', 'girl'])) {
    return 'Only recommend womenswear pieces. Do not include menswear-only items unless they are clearly unisex.';
  }

  if (matchesAnyGenderKeyword(normalized, ['nam', 'male', 'men', 'man', 'boy'])) {
    return 'Only recommend menswear pieces. Do not include womenswear items such as dresses, skirts, blouses, or heels.';
  }

  if (normalized.includes('unisex')) {
    return 'Prefer gender-neutral or unisex pieces.';
  }

  return 'Do not mix clearly male-only and female-only clothing in the same outfit.';
};

export const buildOutfitPrompt = ({
  weather,
  profile,
}: {
  weather: WeatherWithSeason;
  profile?: OutfitProfileInput;
}) => {
  const profileLines = profile
    ? [
        profile.gender ? `Gender: ${profile.gender}` : null,
        profile.style ? `Style: ${profile.style}` : null,
        profile.tolerance ? `Temperature tolerance: ${profile.tolerance}` : null,
        profile.occasion ? `Occasion: ${profile.occasion}` : null,
      ].filter(Boolean)
    : [];

  const genderRule = getGenderRule(profile?.gender);

  return `Bạn là stylist AI. Hãy tạo gợi ý outfit theo JSON schema bên dưới, chỉ trả về JSON hợp lệ.

Weather:
- Location: ${weather.locationName}
- Temperature (C): ${weather.temperatureC}
- Humidity: ${weather.humidity}
- Wind (kph): ${weather.windSpeedKph}
- Condition: ${weather.description}
- SeasonContext: ${weather.seasonContext}

User profile:
${profileLines.length ? profileLines.join('\n') : 'No specific preferences'}

Return JSON with structure:
{
  "summary": "...",
  "items": {
    "top": "...",
    "bottom": "...",
    "shoes": "...",
    "accessories": ["...", "..."]
  },
  "tips": ["..."],
  "warnings": ["..."]
}

Rules:
- Summary in Vietnamese, 1-2 sentences.
- Use the location, temperature, weather condition, and season context above as the primary basis for the outfit.
- Items should be practical with weather conditions.
- Respect the selected style, occasion, and temperature tolerance when they are provided.
- ${genderRule}
- Do not mix menswear and womenswear in the same outfit.
- Provide at least 2 tips.
- Provide warnings if rainy, stormy, very hot, or very cold.
- Output valid JSON only.`;
};
