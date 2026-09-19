// ─── Shared Types ────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export interface ChatResponse {
  message: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  model: string;
  provider: string;
}

export interface AIProviderConfig {
  apiKey?: string;
  model?: string;
  baseURL?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface IAIProvider {
  name: string;
  chat(request: ChatRequest): Promise<ChatResponse>;
  streamChat?(request: ChatRequest): AsyncGenerator<string, void, unknown>;
  isAvailable(): Promise<boolean>;
}

export type ProviderType = 'claude' | 'openai' | 'gemini' | 'ollama' | 'deepseek';

// ─── Abstract Base ────────────────────────────────────────────────────────────

abstract class BaseProvider implements IAIProvider {
  abstract name: string;

  protected apiKey: string;
  protected model: string;
  protected baseURL: string;

  constructor(config: AIProviderConfig, defaultModel: string, defaultBaseURL: string) {
    this.apiKey = config.apiKey ?? '';
    this.model = config.model ?? defaultModel;
    this.baseURL = config.baseURL ?? defaultBaseURL;
  }

  abstract chat(request: ChatRequest): Promise<ChatResponse>;

  protected abstract probeURL(): string;
  protected abstract probeOptions(): RequestInit;

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(this.probeURL(), this.probeOptions());
      // 400 with valid auth still means the server is reachable
      return res.ok || res.status === 400;
    } catch {
      return false;
    }
  }
}

// ─── Claude ───────────────────────────────────────────────────────────────────

export class ClaudeProvider extends BaseProvider {
  name = 'Claude';

  constructor(config: AIProviderConfig) {
    super(config, 'claude-sonnet-4-5-20250929', 'https://api.anthropic.com/v1');
  }

  private get headers() {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      'anthropic-version': '2023-06-01',
    };
  }

  protected probeURL() {
    return `${this.baseURL}/messages`;
  }

  protected probeOptions(): RequestInit {
    return {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        model: this.model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'test' }],
      }),
    };
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const systemMessages = request.messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n\n');

    const conversationMessages = request.messages
      .filter((m) => m.role !== 'system')
      .map(({ role, content }) => ({ role, content }));

    const systemPrompt = [request.systemPrompt, systemMessages].filter(Boolean).join('\n\n');

    const res = await fetch(`${this.baseURL}/messages`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        model: request.model ?? this.model,
        max_tokens: request.maxTokens ?? 1024,
        temperature: request.temperature ?? 0.7,
        system: systemPrompt || undefined,
        messages: conversationMessages,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(`Claude API error: ${err.error?.message ?? res.statusText}`);
    }

    const data = await res.json();
    return {
      message: data.content[0].text,
      usage: {
        inputTokens: data.usage.input_tokens,
        outputTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      },
      model: data.model,
      provider: this.name,
    };
  }
}

// ─── OpenAI ───────────────────────────────────────────────────────────────────

export class OpenAIProvider extends BaseProvider {
  name = 'OpenAI';

  constructor(config: AIProviderConfig) {
    super(config, 'gpt-4-turbo-preview', 'https://api.openai.com/v1');
  }

  private get headers() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  protected probeURL() {
    return `${this.baseURL}/models`;
  }

  protected probeOptions(): RequestInit {
    return { headers: this.headers };
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const messages = [
      ...(request.systemPrompt ? [{ role: 'system' as const, content: request.systemPrompt }] : []),
      ...request.messages,
    ];

    const res = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        model: request.model ?? this.model,
        messages,
        max_tokens: request.maxTokens ?? 1024,
        temperature: request.temperature ?? 0.7,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(`OpenAI API error: ${err.error?.message ?? res.statusText}`);
    }

    const data = await res.json();
    return {
      message: data.choices[0].message.content,
      usage: {
        inputTokens: data.usage.prompt_tokens,
        outputTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
      model: data.model,
      provider: this.name,
    };
  }
}

// ─── Gemini ───────────────────────────────────────────────────────────────────

export class GeminiProvider extends BaseProvider {
  name = 'Gemini';

  constructor(config: AIProviderConfig) {
    super(config, 'gemini-pro', 'https://generativelanguage.googleapis.com/v1');
  }

  protected probeURL() {
    return `${this.baseURL}/models?key=${this.apiKey}`;
  }

  protected probeOptions(): RequestInit {
    return {};
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const contents = request.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const systemText = [
      request.systemPrompt,
      ...request.messages.filter((m) => m.role === 'system').map((m) => m.content),
    ]
      .filter(Boolean)
      .join('\n');

    const res = await fetch(
      `${this.baseURL}/models/${request.model ?? this.model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: systemText ? { parts: [{ text: systemText }] } : undefined,
          generationConfig: {
            temperature: request.temperature ?? 0.7,
            maxOutputTokens: request.maxTokens ?? 1024,
          },
        }),
      },
    );

    if (!res.ok) {
      const err = await res.json();
      throw new Error(`Gemini API error: ${err.error?.message ?? res.statusText}`);
    }

    const data = await res.json();
    return {
      message: data.candidates[0].content.parts[0].text,
      usage: {
        inputTokens: data.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
        totalTokens: data.usageMetadata?.totalTokenCount ?? 0,
      },
      model: request.model ?? this.model,
      provider: this.name,
    };
  }
}

// ─── Ollama ───────────────────────────────────────────────────────────────────

export class OllamaProvider extends BaseProvider {
  name = 'Ollama';

  constructor(config: AIProviderConfig) {
    // ponytail: no apiKey needed for local Ollama
    super(config, 'llama3.1', 'http://localhost:11434');
  }

  protected probeURL() {
    return `${this.baseURL}/api/tags`;
  }

  protected probeOptions(): RequestInit {
    return {};
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const messages = [
      ...(request.systemPrompt ? [{ role: 'system' as const, content: request.systemPrompt }] : []),
      ...request.messages,
    ];

    const res = await fetch(`${this.baseURL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: request.model ?? this.model,
        messages,
        stream: false,
        options: {
          temperature: request.temperature ?? 0.7,
          num_predict: request.maxTokens ?? 1024,
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`Ollama API error: ${res.statusText}`);
    }

    const data = await res.json();
    return {
      message: data.message.content,
      usage: {
        inputTokens: data.prompt_eval_count ?? 0,
        outputTokens: data.eval_count ?? 0,
        totalTokens: (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0),
      },
      model: data.model,
      provider: this.name,
    };
  }
}

// ─── DeepSeek ─────────────────────────────────────────────────────────────────

export class DeepSeekProvider extends BaseProvider {
  name = 'DeepSeek';

  constructor(config: AIProviderConfig) {
    super(config, 'deepseek-chat', 'https://api.deepseek.com/v1');
  }

  private get headers() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  protected probeURL() {
    return `${this.baseURL}/models`;
  }

  protected probeOptions(): RequestInit {
    return { headers: this.headers };
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    // DeepSeek is OpenAI-compatible
    const messages = [
      ...(request.systemPrompt ? [{ role: 'system' as const, content: request.systemPrompt }] : []),
      ...request.messages,
    ];

    const res = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        model: request.model ?? this.model,
        messages,
        max_tokens: request.maxTokens ?? 1024,
        temperature: request.temperature ?? 0.7,
        stream: false,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`DeepSeek API error: ${err}`);
    }

    const data = await res.json();
    return {
      message: data.choices[0].message.content,
      usage: {
        inputTokens: data.usage?.prompt_tokens ?? 0,
        outputTokens: data.usage?.completion_tokens ?? 0,
        totalTokens: data.usage?.total_tokens ?? 0,
      },
      model: data.model,
      provider: this.name,
    };
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export class AIProviderFactory {
  static create(type: ProviderType, config: AIProviderConfig): IAIProvider {
    switch (type) {
      case 'claude':    return new ClaudeProvider(config);
      case 'openai':    return new OpenAIProvider(config);
      case 'gemini':    return new GeminiProvider(config);
      case 'ollama':    return new OllamaProvider(config);
      case 'deepseek':  return new DeepSeekProvider(config);
      default:
        throw new Error(`Unknown provider type: ${type}`);
    }
  }

  static async detectAvailableProviders(
    configs: Partial<Record<ProviderType, AIProviderConfig>>,
  ): Promise<ProviderType[]> {
    const results = await Promise.allSettled(
      (Object.entries(configs) as [ProviderType, AIProviderConfig][]).map(async ([type, config]) => {
        const provider = this.create(type, config);
        return (await provider.isAvailable()) ? type : null;
      }),
    );

    return results
      .filter((r): r is PromiseFulfilledResult<ProviderType> => r.status === 'fulfilled' && r.value !== null)
      .map((r) => r.value);
  }
}

// ─── Chat Service ─────────────────────────────────────────────────────────────

export class AIChatService {
  private provider: IAIProvider;

  constructor(providerType: ProviderType, config: AIProviderConfig) {
    this.provider = AIProviderFactory.create(providerType, config);
  }

  async chat(messages: ChatMessage[], systemPrompt?: string): Promise<ChatResponse> {
    return this.provider.chat({ messages, systemPrompt });
  }

  async switchProvider(providerType: ProviderType, config: AIProviderConfig): Promise<void> {
    const next = AIProviderFactory.create(providerType, config);
    if (!(await next.isAvailable())) {
      throw new Error(`Provider ${providerType} is not available`);
    }
    this.provider = next;
  }

  getCurrentProvider(): string {
    return this.provider.name;
  }

  async isHealthy(): Promise<boolean> {
    return this.provider.isAvailable();
  }
}
