import { callAiModel } from '../../services/aiApi.service';
import { buildOutfitPrompt } from './outfit.prompt';
import { OutfitRecommendInput, OutfitRecommendation } from '../../types/outfit.types';
import { env } from '../../lib/env';
import { logger } from '../../lib/logger';
import { z } from 'zod';

const outfitRecommendationSchema = z.object({
  summary: z.string().trim().min(10),
  items: z.object({
    top: z.string().trim().min(2),
    bottom: z.string().trim().min(2),
    shoes: z.string().trim().min(2),
    accessories: z.array(z.string().trim().min(1)).min(1),
  }),
  tips: z.array(z.string().trim().min(1)).min(2),
  warnings: z.array(z.string().trim().min(1)).default([]),
});

const AUDIENCE_RESTRICTIONS: Record<'male' | 'female', string[]> = {
  male: ['dress', 'dam', 'đầm', 'skirt', 'chan vay', 'chân váy', 'blouse', 'legging', 'heel', 'giày cao gót'],
  female: ['ao polo nam', 'ao so mi nam', 'quan chino nam', 'menswear', 'male only', 'do nam'],
};

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

const getProfileAudience = (gender?: string): 'male' | 'female' | 'unisex' => {
  const normalized = normalizeProfileValue(gender);

  if (matchesAnyGenderKeyword(normalized, ['nu', 'female', 'women', 'woman', 'girl'])) {
    return 'female';
  }

  if (matchesAnyGenderKeyword(normalized, ['nam', 'male', 'men', 'man', 'boy'])) {
    return 'male';
  }

  return 'unisex';
};

const collectRecommendationText = (recommendation: OutfitRecommendation) =>
  normalizeProfileValue([
    recommendation.summary,
    recommendation.items.top,
    recommendation.items.bottom,
    recommendation.items.shoes,
    ...recommendation.items.accessories,
    ...recommendation.tips,
    ...recommendation.warnings,
  ].join(' '));

const ensureRecommendationMatchesAudience = (recommendation: OutfitRecommendation, gender?: string) => {
  const audience = getProfileAudience(gender);

  if (audience === 'unisex') {
    return recommendation;
  }

  const normalizedText = collectRecommendationText(recommendation);
  const forbiddenKeywords = AUDIENCE_RESTRICTIONS[audience];

  if (forbiddenKeywords.some((keyword) => normalizedText.includes(normalizeProfileValue(keyword)))) {
    throw new Error(`AI recommendation violated ${audience} outfit constraints.`);
  }

  return recommendation;
};

const parseAndValidateRecommendation = (response: string, gender?: string): OutfitRecommendation => {
  const parsedJson = JSON.parse(response);
  const recommendation = outfitRecommendationSchema.parse(parsedJson) as OutfitRecommendation;
  return ensureRecommendationMatchesAudience(recommendation, gender);
};

const buildFallbackOutfitRecommendation = (payload: OutfitRecommendInput): OutfitRecommendation => {
  const { weather, profile } = payload;
  const lowerDescription = normalizeProfileValue(weather.description);
  const lowerOccasion = normalizeProfileValue(profile?.occasion);
  const audience = getProfileAudience(profile?.gender);
  const isRainy = lowerDescription.includes('rain') || lowerDescription.includes('mua');
  const isHot = weather.temperatureC >= 30;
  const isCool = weather.temperatureC <= 22;
  const isWork = ['work', 'office', 'cong viec', 'di lam'].some((keyword) => lowerOccasion.includes(keyword));
  const isTravel = ['travel', 'du lich', 'du lịch'].some((keyword) => lowerOccasion.includes(keyword));
  const isEvening = ['evening', 'toi', 'party', 'hen ho'].some((keyword) => lowerOccasion.includes(keyword));
  const isFemale = audience === 'female';
  const isMale = audience === 'male';

  const top = isFemale
    ? isCool
      ? 'Áo cardigan mỏng phối cùng áo blouse hoặc áo len mảnh'
      : isHot
        ? 'Áo blouse tay ngắn, áo kiểu linen hoặc áo thun cotton thoáng khí'
        : 'Áo sơ mi mềm hoặc áo knit mỏng nữ tính, dễ phối'
    : isMale
      ? isCool
        ? 'Áo khoác nhẹ phối cùng áo thun hoặc sơ mi mềm'
        : isHot
          ? 'Áo sơ mi linen hoặc áo thun cotton thoáng khí'
          : 'Áo sơ mi tay ngắn hoặc áo knit mỏng dễ phối'
      : isCool
        ? 'Áo khoác nhẹ phối cùng áo thun hoặc sơ mi mềm'
        : isHot
          ? 'Áo linen hoặc áo thun cotton thoáng khí'
          : 'Áo sơ mi tay ngắn hoặc áo knit mỏng dễ phối';

  const bottom = isFemale
    ? isWork
      ? 'Quần suông cạp cao hoặc chân váy midi gọn gàng'
      : isTravel
        ? 'Quần short nữ dáng gọn hoặc quần suông chất liệu nhẹ'
        : isEvening
          ? 'Chân váy chữ A hoặc quần tối màu dáng thanh lịch'
          : 'Quần jean nữ ống thẳng hoặc chân váy midi thoải mái'
    : isMale
      ? isWork
        ? 'Quần chinos hoặc quần tây dáng gọn'
        : isTravel
          ? 'Quần cargo hoặc quần short chất liệu nhẹ'
          : isEvening
            ? 'Quần tối màu hoặc quần âu dáng gọn'
            : 'Quần denim sáng màu hoặc quần suông thoải mái'
      : isWork
        ? 'Quần suông hoặc quần tây dáng gọn'
        : isTravel
          ? 'Quần cargo hoặc quần short chất liệu nhẹ'
          : isEvening
            ? 'Quần tối màu hoặc chân váy dáng gọn'
            : 'Quần denim sáng màu hoặc quần suông thoải mái';

  const shoes = isFemale
    ? isRainy
      ? 'Sneakers chống trơn hoặc ankle boots đế bám tốt'
      : isEvening
        ? 'Giày búp bê, loafers hoặc sneakers tối giản sạch form'
        : 'Sneakers trắng hoặc loafers nhẹ'
    : isRainy
      ? 'Sneakers chống trơn hoặc giày da đế bám tốt'
      : isEvening
        ? 'Loafers hoặc giày tối giản sạch form'
        : 'Sneakers trắng hoặc loafers nhẹ';

  const accessories = isFemale
    ? [
        isRainy ? 'Ô gấp gọn' : 'Kính mát',
        isWork ? 'Túi xách cỡ vừa hoặc tote gọn' : 'Túi đeo vai nhỏ hoặc túi đeo chéo',
        isHot ? 'Đồng hồ mảnh hoặc kính mắt' : 'Đồng hồ nhỏ hoặc thắt lưng tối giản',
      ]
    : [
        isRainy ? 'Ô gấp gọn' : 'Kính mát',
        isWork ? 'Túi tote hoặc cặp gọn' : 'Túi đeo chéo hoặc tote canvas',
        isHot ? 'Đồng hồ dây kim loại nhẹ' : 'Đồng hồ hoặc thắt lưng tối giản',
      ];

  const tips = [
    isHot
      ? 'Ưu tiên linen hoặc cotton để giữ cảm giác thoáng và dễ chịu.'
      : 'Chọn lớp đồ mỏng, dễ cởi để thích ứng khi nhiệt độ thay đổi.',
    isRainy
      ? 'Mang thêm áo khoác mỏng hoặc ô gấp để tránh bị động khi trời mưa.'
      : 'Giữ bảng màu gọn để outfit trông đồng bộ và dễ mặc hằng ngày.',
  ];

  const warnings = [
    ...(isRainy ? ['Đường trơn và độ ẩm cao, nên tránh chất liệu quá dày hoặc lâu khô.'] : []),
    ...(isHot ? ['Nhiệt độ cao, nên hạn chế layering dày và nhớ chống nắng.'] : []),
    ...(isCool ? ['Nếu ra ngoài buổi tối, nên mang thêm một lớp khoác nhẹ.'] : []),
  ];

  return {
    summary: `Gợi ý phối đồ an toàn cho ${weather.locationName}: ${top.toLowerCase()}, ${bottom.toLowerCase()} và ${shoes.toLowerCase()} để hợp thời tiết ${weather.description}.`,
    items: {
      top,
      bottom,
      shoes,
      accessories,
    },
    tips,
    warnings,
  };
};

export const recommendOutfit = async (payload: OutfitRecommendInput): Promise<OutfitRecommendation> => {
  try {
    const prompt = buildOutfitPrompt(payload);
    const response = await callAiModel({
      accountId: env.cloudflareAccountId,
      apiToken: env.cloudflareApiToken,
      prompt,
      model: env.cloudflareAiModel,
      mockMode: env.mockAi,
    });

    return parseAndValidateRecommendation(response, payload.profile?.gender);
  } catch (error) {
    logger.warn('Using fallback outfit recommendation', {
      error: error instanceof Error ? error.message : String(error),
      location: payload.weather.locationName,
      temperatureC: payload.weather.temperatureC,
    });
    return buildFallbackOutfitRecommendation(payload);
  }
};
