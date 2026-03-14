import { callAiModel } from '../../services/aiApi.service';
import { buildOutfitPrompt } from './outfit.prompt';
import { OutfitRecommendInput, OutfitRecommendation } from '../../types/outfit.types';
import { env } from '../../lib/env';
import { logger } from '../../lib/logger';

export const recommendOutfit = async (payload: OutfitRecommendInput): Promise<OutfitRecommendation> => {
  const prompt = buildOutfitPrompt(payload);
  const response = await callAiModel({
    accountId: env.cloudflareAccountId,
    apiToken: env.cloudflareApiToken,
    prompt,
    model: env.cloudflareAiModel,
    mockMode: env.mockAi,
  });

  try {
    return JSON.parse(response) as OutfitRecommendation;
  } catch (error) {
    logger.error('Failed to parse AI response', { error, response });
    throw new Error('AI response is not valid JSON');
  }
};
