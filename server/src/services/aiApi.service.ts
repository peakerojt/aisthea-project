import { logger } from '../lib/logger';

interface ChatCompletionResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export const callAiModel = async ({
  apiKey,
  prompt,
  model = 'gpt-4o-mini',
  timeoutMs = 12000,
  mockMode = false,
}: {
  apiKey?: string;
  prompt: string;
  model?: string;
  timeoutMs?: number;
  mockMode?: boolean;
}): Promise<string> => {
  if (mockMode || !apiKey) {
    logger.warn('OpenAI API key missing or mock mode enabled. Returning mock response.');
    return JSON.stringify({
      summary: 'Trang phục tối giản với áo sơ mi linen thoáng mát và quần chinos sáng màu.',
      items: {
        top: 'Áo sơ mi linen màu trắng, tay ngắn',
        bottom: 'Quần chinos beige dáng slim',
        shoes: 'Giày sneakers trắng hoặc loafers vải',
        accessories: ['Kính râm', 'Túi tote canvas', 'Đồng hồ dây da nâu'],
      },
      tips: ['Chọn chất liệu thoáng khí như linen hoặc cotton', 'Mang theo nước uống vì thời tiết nóng'],
      warnings: ['UV cao vào buổi trưa, nên bôi kem chống nắng'],
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are a fashion assistant that outputs only valid JSON based on the provided schema.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.6,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${text}`);
    }

    const data = (await response.json()) as ChatCompletionResponse;
    return data.choices[0]?.message?.content || '';
  } catch (error) {
    logger.error('Failed to call AI model', { error });
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};
