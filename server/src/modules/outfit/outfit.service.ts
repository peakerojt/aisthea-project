import { callAiModel } from '../../services/aiApi.service';
import { buildOutfitPrompt } from './outfit.prompt';
import { OutfitRecommendInput, OutfitRecommendation } from '../../types/outfit.types';
import { env } from '../../lib/env';
import { logger } from '../../lib/logger';

const buildFallbackOutfitRecommendation = (payload: OutfitRecommendInput): OutfitRecommendation => {
  const { weather, profile } = payload;
  const lowerDescription = weather.description.toLowerCase();
  const lowerOccasion = profile?.occasion?.toLowerCase() || '';
  const isRainy = lowerDescription.includes('rain') || lowerDescription.includes('mua');
  const isHot = weather.temperatureC >= 30;
  const isCool = weather.temperatureC <= 22;
  const isWork = ['work', 'office', 'cong viec', 'đi làm', 'di lam'].some((keyword) => lowerOccasion.includes(keyword));
  const isTravel = ['travel', 'du lich', 'du lịch'].some((keyword) => lowerOccasion.includes(keyword));
  const isEvening = ['evening', 'toi', 'tối', 'party'].some((keyword) => lowerOccasion.includes(keyword));

  const top = isCool
    ? 'Áo khoác nhẹ phối cùng áo thun hoặc sơ mi mềm'
    : isHot
      ? 'Áo sơ mi linen hoặc áo thun cotton thoáng khí'
      : 'Áo sơ mi tay ngắn hoặc áo knit mỏng dễ phối';

  const bottom = isWork
    ? 'Quần chinos hoặc quần tây dáng gọn'
    : isTravel
      ? 'Quần cargo hoặc quần short chất liệu nhẹ'
      : isEvening
        ? 'Quần tối màu hoặc chân váy dáng gọn'
        : 'Quần denim sáng màu hoặc quần suông thoải mái';

  const shoes = isRainy
    ? 'Sneakers chống trơn hoặc giày da đế bám tốt'
    : isEvening
      ? 'Loafers hoặc giày tối giản sạch form'
      : 'Sneakers trắng hoặc loafers nhẹ';

  const accessories = [
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

    return JSON.parse(response) as OutfitRecommendation;
  } catch (error) {
    logger.warn('Using fallback outfit recommendation', {
      error: error instanceof Error ? error.message : String(error),
      location: payload.weather.locationName,
      temperatureC: payload.weather.temperatureC,
    });
    return buildFallbackOutfitRecommendation(payload);
  }
};
