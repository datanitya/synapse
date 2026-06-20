import { HttpException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import { AiProvider } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CryptoService } from '../../common/crypto/crypto.service';

type Provider = 'openai' | 'gemini' | 'claude';
type CallResult = { text: string; promptTokens: number; completionTokens: number };

interface ResolvedProvider {
  provider: Provider;
  openai?: OpenAI;
  gemini?: GoogleGenerativeAI;
  anthropic?: Anthropic;
  generationModel: string;
  categorizationModel: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  // Global (platform-level) clients — used when user has no personal key
  private readonly globalProvider: Provider;
  private readonly globalOpenai: OpenAI;
  private readonly globalOpenaiCategorizationModel: string;
  private readonly globalGemini: GoogleGenerativeAI | null = null;
  private readonly globalGeminiModel: string;
  private readonly globalAnthropic: Anthropic | null = null;
  private readonly globalClaudeModel: string;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private cryptoService: CryptoService,
  ) {
    this.globalProvider = (config.get<string>('ai.provider') ?? 'gemini') as Provider;

    this.globalOpenai = new OpenAI({ apiKey: config.get('openai.apiKey') });
    this.globalOpenaiCategorizationModel = config.get('openai.modelCategorization') ?? 'gpt-4o-mini';

    const geminiKey = config.get<string>('gemini.apiKey');
    if (geminiKey) {
      this.globalGemini = new GoogleGenerativeAI(geminiKey);
      this.globalGeminiModel = config.get('gemini.model') ?? 'gemini-2.0-flash';
    } else {
      this.globalGeminiModel = 'gemini-2.0-flash';
    }

    const anthropicKey = config.get<string>('anthropic.apiKey');
    if (anthropicKey) {
      this.globalAnthropic = new Anthropic({ apiKey: anthropicKey });
      this.globalClaudeModel = config.get('anthropic.model') ?? 'claude-sonnet-4-6';
    } else {
      this.globalClaudeModel = 'claude-sonnet-4-6';
    }

    this.logger.log(`AI global provider: ${this.globalProvider}`);
  }

  private async resolveProvider(userId?: string): Promise<ResolvedProvider> {
    if (userId) {
      const prefs = await this.prisma.userPreferences.findUnique({ where: { userId } });
      const p = prefs as unknown as Record<string, string | null> | null;

      if (p?.aiProvider === 'OPENAI' && p?.openaiApiKey) {
        const key = this.decrypt(p.openaiApiKey);
        return {
          provider: 'openai',
          openai: new OpenAI({ apiKey: key }),
          generationModel: p.aiModel ?? (this.config.get('openai.modelGeneration') ?? 'gpt-4o-mini'),
          categorizationModel: this.globalOpenaiCategorizationModel,
        };
      }
      if (p?.aiProvider === 'GEMINI' && p?.geminiApiKey) {
        const key = this.decrypt(p.geminiApiKey);
        return {
          provider: 'gemini',
          gemini: new GoogleGenerativeAI(key),
          generationModel: p.aiModel ?? this.globalGeminiModel,
          categorizationModel: p.aiModel ?? this.globalGeminiModel,
        };
      }
      if (p?.aiProvider === 'CLAUDE' && p?.anthropicApiKey) {
        const key = this.decrypt(p.anthropicApiKey);
        return {
          provider: 'claude',
          anthropic: new Anthropic({ apiKey: key }),
          generationModel: p.aiModel ?? this.globalClaudeModel,
          categorizationModel: p.aiModel ?? this.globalClaudeModel,
        };
      }
      // User has no personal key — check if admin has granted platform key access
      const userRecord = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { usePlatformKey: true } as object,
      });
      if (!(userRecord as unknown as { usePlatformKey?: boolean })?.usePlatformKey) {
        throw new HttpException(
          { statusCode: 403, error: 'NO_API_KEY', message: 'Add your API key in Settings → AI Provider to use this feature.' },
          403,
        );
      }
    }

    // Fall back to global platform config — select model names based on provider
    const provider = this.globalProvider;
    let generationModel: string;
    let categorizationModel: string;
    if (provider === 'gemini') {
      generationModel = this.globalGeminiModel;
      categorizationModel = this.globalGeminiModel;
    } else if (provider === 'claude') {
      generationModel = this.globalClaudeModel;
      categorizationModel = this.globalClaudeModel;
    } else {
      generationModel = this.config.get('openai.modelGeneration') ?? 'gpt-4o-mini';
      categorizationModel = this.globalOpenaiCategorizationModel;
    }
    return {
      provider,
      openai: this.globalOpenai,
      gemini: this.globalGemini ?? undefined,
      anthropic: this.globalAnthropic ?? undefined,
      generationModel,
      categorizationModel,
    };
  }

  async chat(
    systemPrompt: string,
    userPrompt: string,
    model: 'generation' | 'categorization' = 'generation',
    userId?: string,
    purpose = 'generation',
    maxTokens?: number,
  ): Promise<string> {
    await this.enforceTokenLimit(userId);
    const resolved = await this.resolveProvider(userId);
    let result: CallResult;
    let aiProvider: AiProvider;
    let modelName: string;

    if (resolved.provider === 'claude' && resolved.anthropic) {
      const modelId = model === 'categorization' ? resolved.categorizationModel : resolved.generationModel;
      result = await this.chatWithClaude(systemPrompt, userPrompt, maxTokens, resolved.anthropic, modelId);
      aiProvider = AiProvider.CLAUDE;
      modelName = modelId;
    } else if (resolved.provider === 'gemini' && resolved.gemini) {
      const modelId = model === 'categorization' ? resolved.categorizationModel : resolved.generationModel;
      result = await this.chatWithGemini(systemPrompt, userPrompt, maxTokens, resolved.gemini, modelId);
      aiProvider = AiProvider.GEMINI;
      modelName = modelId;
    } else {
      const openaiModel = model === 'categorization' ? resolved.categorizationModel : resolved.generationModel;
      result = await this.chatWithOpenAI(systemPrompt, userPrompt, openaiModel, maxTokens, resolved.openai ?? this.globalOpenai, model);
      aiProvider = AiProvider.OPENAI;
      modelName = openaiModel;
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
    await this.enforceTokenLimit(userId);
    const response = await this.globalOpenai.images.generate({
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

  private async chatWithClaude(
    systemPrompt: string,
    userPrompt: string,
    maxTokens = 2000,
    client: Anthropic = this.globalAnthropic!,
    model: string = this.globalClaudeModel,
  ): Promise<CallResult> {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const message = await client.messages.create({
          model,
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

  private async chatWithGemini(
    systemPrompt: string,
    userPrompt: string,
    maxTokens?: number,
    client: GoogleGenerativeAI = this.globalGemini!,
    model: string = this.globalGeminiModel,
  ): Promise<CallResult> {
    const generativeModel = client.getGenerativeModel({
      model,
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
    modelId: string,
    maxTokens?: number,
    client: OpenAI = this.globalOpenai,
    modelHint: 'generation' | 'categorization' = 'generation',
  ): Promise<CallResult> {
    const tokens = maxTokens ?? 2000;
    const temperature = modelHint === 'categorization' ? 0.2 : 0.8;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const completion = await client.chat.completions.create({
          model: modelId,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature,
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

  private async enforceTokenLimit(userId?: string): Promise<void> {
    if (!userId) return;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { plan: true },
    });
    const plan = (user as unknown as { plan?: { monthlyTokenLimit: number } | null })?.plan;
    const limit = plan?.monthlyTokenLimit ?? 50_000; // matches FREE plan seed; 0 = unlimited
    if (limit === 0) return;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const { _sum } = await this.prisma.tokenUsageLog.aggregate({
      where: { userId, createdAt: { gte: monthStart } },
      _sum: { totalTokens: true },
    });
    const used = _sum.totalTokens ?? 0;
    if (used >= limit) {
      throw new HttpException(
        `Monthly token limit reached (${limit.toLocaleString()} tokens). Upgrade your plan to continue.`,
        429,
      );
    }
  }

  private decrypt(encrypted: string): string { return this.cryptoService.decrypt(encrypted); }
}
