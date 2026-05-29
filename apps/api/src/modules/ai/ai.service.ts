import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import { AiProvider } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type Provider = 'openai' | 'gemini' | 'claude';
type CallResult = { text: string; promptTokens: number; completionTokens: number };

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly provider: Provider;

  private readonly openai: OpenAI;
  private readonly openaiCategorizationModel: string;

  private readonly gemini: GoogleGenerativeAI | null = null;
  private readonly geminiModel: string;

  private readonly anthropic: Anthropic | null = null;
  private readonly claudeModel: string;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    this.provider = (config.get<string>('ai.provider') ?? 'gemini') as Provider;

    this.openai = new OpenAI({ apiKey: config.get('openai.apiKey') });
    this.openaiCategorizationModel = config.get('openai.modelCategorization') ?? 'gpt-4o-mini';

    const geminiKey = config.get<string>('gemini.apiKey');
    if (geminiKey) {
      this.gemini = new GoogleGenerativeAI(geminiKey);
      this.geminiModel = config.get('gemini.model') ?? 'gemini-2.0-flash';
    } else {
      this.geminiModel = 'gemini-2.0-flash';
    }

    const anthropicKey = config.get<string>('anthropic.apiKey');
    if (anthropicKey) {
      this.anthropic = new Anthropic({ apiKey: anthropicKey });
      this.claudeModel = config.get('anthropic.model') ?? 'claude-sonnet-4-6';
    } else {
      this.claudeModel = 'claude-sonnet-4-6';
    }

    this.logger.log(`AI provider: ${this.provider}`);
  }

  async chat(
    systemPrompt: string,
    userPrompt: string,
    model: 'generation' | 'categorization' = 'generation',
    userId?: string,
    purpose = 'generation',
    maxTokens?: number,
  ): Promise<string> {
    let result: CallResult;
    let aiProvider: AiProvider;
    let modelName: string;

    if (this.provider === 'claude' && this.anthropic) {
      result = await this.chatWithClaude(systemPrompt, userPrompt, maxTokens);
      aiProvider = AiProvider.CLAUDE;
      modelName = this.claudeModel;
    } else if (this.provider === 'gemini' && this.gemini) {
      result = await this.chatWithGemini(systemPrompt, userPrompt, maxTokens);
      aiProvider = AiProvider.GEMINI;
      modelName = this.geminiModel;
    } else {
      result = await this.chatWithOpenAI(systemPrompt, userPrompt, model, maxTokens);
      aiProvider = AiProvider.OPENAI;
      modelName = model === 'categorization'
        ? this.openaiCategorizationModel
        : (this.config.get('openai.modelGeneration') ?? 'gpt-4o-mini');
    }

    this.logUsage(userId, aiProvider, modelName, result.promptTokens, result.completionTokens, purpose)
      .catch((err) => this.logger.warn(`Token log failed: ${err instanceof Error ? err.message : err}`));

    return result.text;
  }

  private async logUsage(
    userId: string | undefined,
    provider: AiProvider,
    model: string,
    promptTokens: number,
    completionTokens: number,
    purpose: string,
  ): Promise<void> {
    await this.prisma.tokenUsageLog.create({
      data: {
        userId: userId ?? null,
        provider,
        model,
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        purpose,
      },
    });
  }

  async generateImage(prompt: string, userId?: string): Promise<Buffer> {
    const response = await this.openai.images.generate({
      model: 'gpt-image-1',
      prompt,
      n: 1,
      size: '1024x1024',
    });
    const b64 = response.data?.[0]?.b64_json;
    if (!b64) throw new Error('gpt-image-1 returned no image data');

    this.logUsage(userId, AiProvider.OPENAI, 'gpt-image-1', 0, 0, 'image_generation')
      .catch((err) => this.logger.warn(`Image token log failed: ${err instanceof Error ? err.message : err}`));

    return Buffer.from(b64, 'base64');
  }

  private async chatWithClaude(systemPrompt: string, userPrompt: string, maxTokens = 2000): Promise<CallResult> {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const message = await this.anthropic!.messages.create({
          model: this.claudeModel,
          max_tokens: maxTokens,
          system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
          messages: [{ role: 'user', content: userPrompt }],
        });
        const block = message.content[0];
        return {
          text: block.type === 'text' ? block.text : '',
          promptTokens: message.usage.input_tokens,
          completionTokens: message.usage.output_tokens,
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        const isRetryable = msg.includes('429') || msg.includes('529') || msg.includes('503');
        if (attempt === 3 || !isRetryable) {
          this.logger.error(`Claude failed after ${attempt} attempt(s): ${msg}`);
          throw err;
        }
        const delay = Math.pow(2, attempt) * 1000;
        this.logger.warn(`Claude rate limit, retrying in ${delay}ms`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    throw new Error('Claude request failed after all retries');
  }

  private async chatWithGemini(systemPrompt: string, userPrompt: string, maxTokens?: number): Promise<CallResult> {
    const generativeModel = this.gemini!.getGenerativeModel({
      model: this.geminiModel,
      generationConfig: { maxOutputTokens: maxTokens ?? 1800 },
    });
    const fullPrompt = `${systemPrompt}\n\n---\n\n${userPrompt}`;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const result = await generativeModel.generateContent(fullPrompt);
        const text = result.response.text();
        return {
          text,
          promptTokens: result.response.usageMetadata?.promptTokenCount ?? 0,
          completionTokens: result.response.usageMetadata?.candidatesTokenCount ?? 0,
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        const isRetryable = msg.includes('429') || msg.includes('503') || msg.includes('500');
        if (attempt === 3 || !isRetryable) {
          this.logger.error(`Gemini failed after ${attempt} attempt(s): ${msg}`);
          throw err;
        }
        const delay = Math.pow(2, attempt) * 1000;
        this.logger.warn(`Gemini rate limit, retrying in ${delay}ms`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    throw new Error('Gemini request failed after all retries');
  }

  private async chatWithOpenAI(
    systemPrompt: string,
    userPrompt: string,
    model: 'generation' | 'categorization',
    maxTokens?: number,
  ): Promise<CallResult> {
    const modelId = model === 'generation'
      ? (this.config.get('openai.modelGeneration') ?? 'gpt-4o-mini')
      : this.openaiCategorizationModel;
    const tokens = maxTokens ?? (model === 'generation' ? 2000 : 4000);

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const completion = await this.openai.chat.completions.create({
          model: modelId,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: model === 'generation' ? 0.8 : 0.2,
          max_tokens: tokens,
        });
        return {
          text: completion.choices[0]?.message?.content ?? '',
          promptTokens: completion.usage?.prompt_tokens ?? 0,
          completionTokens: completion.usage?.completion_tokens ?? 0,
        };
      } catch (error: unknown) {
        const isRateLimitOrServer =
          error instanceof OpenAI.APIError && (error.status === 429 || error.status >= 500);
        if (attempt === 3 || !isRateLimitOrServer) {
          this.logger.error(`OpenAI call failed after ${attempt} attempt(s)`, error);
          throw error;
        }
        const delay = Math.pow(2, attempt) * 1000;
        this.logger.warn(`OpenAI rate limit, retrying in ${delay}ms`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    throw new Error('OpenAI request failed after all retries');
  }
}
