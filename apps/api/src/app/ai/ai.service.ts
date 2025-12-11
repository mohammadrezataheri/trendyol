import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly openai;

  constructor(private readonly configService: ConfigService) {
    // Initialize OpenAI provider with AI SDK
    this.openai = createOpenAI({
      apiKey: this.configService.get<string>('AI_GATEWAY_API_KEY'),
      baseURL: this.configService.get<string>(
        'OPENAI_BASE_URL',
        'https://ai-gateway.vercel.sh/v1'
      ),
    });

    this.logger.log('AI Service initialized with AI SDK');
  }

  /**
   * Translate text using AI SDK and return translated text with token count
   */
  async translateText(
    text: string,
    targetLanguage: string = 'fa'
  ): Promise<{ translatedText: string; tokensUsed: number }> {
    if (!text || text.trim().length === 0) {
      return { translatedText: text, tokensUsed: 0 };
    }

    try {
      this.logger.debug(
        `Translating text (${text.length} chars) to ${targetLanguage}`
      );

      const { text: translatedText, usage } = await generateText({
        model: this.openai('gpt-4o-mini', {
          maxTokens: 4000,
        }),
        system: `You are a professional translator. Translate the given text to ${
          targetLanguage === 'fa' ? 'Persian (Farsi)' : targetLanguage
        }. Preserve HTML structure if present. Only return the translated text, nothing else.`,
        prompt: text,
        temperature: 0.3,
      });

      // Get token usage from response
      const tokensUsed = usage?.totalTokens || 0;

      this.logger.debug(
        `Translation completed (${translatedText.length} chars), tokens used: ${tokensUsed}`
      );
      return { translatedText: translatedText.trim(), tokensUsed };
    } catch (error) {
      this.logger.error(
        `Error translating text: ${error.message}`,
        error.stack
      );
      return { translatedText: text, tokensUsed: 0 }; // Return original text on error
    }
  }

  /**
   * Translate batch of texts (title, description, slug, colors, sizes) using AI SDK
   */
  async translateBatch(
    texts: {
      title?: string;
      description?: string;
      slug?: string;
      colors?: string[];
      sizes?: string[];
    },
    targetLanguage: string = 'fa'
  ): Promise<{
    title?: string;
    description?: string;
    slug?: string;
    colors?: string[];
    sizes?: string[];
    tokensUsed: number;
  }> {
    try {
      // Build structured prompt
      const translationRequest: any = {};
      if (texts.title) translationRequest.title = texts.title;
      if (texts.description) translationRequest.description = texts.description;
      if (texts.slug) translationRequest.slug = texts.slug;
      if (texts.colors && texts.colors.length > 0) {
        translationRequest.colors = texts.colors;
      }
      if (texts.sizes && texts.sizes.length > 0) {
        translationRequest.sizes = texts.sizes;
      }

      const prompt = `Translate the following Turkish product information to Persian (Farsi). 
Preserve the structure and return ONLY a valid JSON object with the same keys.
For colors and sizes arrays, return them as arrays with the same order.
For description, preserve HTML structure but translate the text content.
Do not add any explanations, only return the JSON object.

Input JSON:
${JSON.stringify(translationRequest, null, 2)}

Return only the translated JSON object:`;

      const { text: responseText, usage } = await generateText({
        model: this.openai('gpt-4o-mini', {
          maxTokens: 8000, // Increased for batch translation of all content (title, description, slug, variants)
        }),
        system:
          'You are a professional translator. Translate Turkish text to Persian (Farsi) while preserving structure and formatting.',
        prompt: prompt,
        temperature: 0.3,
      });

      // Extract JSON from response (handle cases where response might have markdown code blocks)
      let jsonText = responseText.trim();
      const jsonMatch =
        jsonText.match(/```json\s*([\s\S]*?)\s*```/) ||
        jsonText.match(/```\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }

      const translated = JSON.parse(jsonText);

      const tokensUsed = usage?.totalTokens || 0;

      this.logger.debug(
        `Batch translation completed, tokens used: ${tokensUsed}`
      );

      return {
        title: translated.title,
        description: translated.description,
        slug: translated.slug,
        colors: translated.colors,
        sizes: translated.sizes,
        tokensUsed,
      };
    } catch (error) {
      this.logger.error(
        `Error in batch translation: ${error.message}`,
        error.stack
      );
      // Fallback: return original texts
      return {
        title: texts.title,
        description: texts.description,
        slug: texts.slug,
        colors: texts.colors,
        sizes: texts.sizes,
        tokensUsed: 0,
      };
    }
  }
}
