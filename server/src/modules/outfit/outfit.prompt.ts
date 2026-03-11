import { NormalizedWeather } from '../../types/weather.types';
import { OutfitProfileInput } from '../../types/outfit.types';

export const buildOutfitPrompt = ({
  weather,
  seasonContext,
  profile,
}: {
  weather: NormalizedWeather;
  seasonContext: string;
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

  return `Bạn là stylist AI. Hãy tạo gợi ý outfit theo JSON schema bên dưới, chỉ trả về JSON hợp lệ.

Weather:
- Location: ${weather.locationName}
- Temperature (C): ${weather.temperatureC}
- Humidity: ${weather.humidity}
- Wind (kph): ${weather.windSpeedKph}
- Condition: ${weather.description}
- SeasonContext: ${seasonContext}

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
- Items should be practical with weather conditions.
- Provide at least 2 tips.
- Provide warnings if rainy, stormy, very hot, or very cold.
- Output valid JSON only.`;
};
