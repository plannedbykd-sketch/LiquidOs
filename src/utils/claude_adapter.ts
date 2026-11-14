/**
 * Anthropic Claude 3.5 Messages API Replication & Compatibility Adapter
 * Implements full specification matching POST /v1/messages for Claude 3.5 Sonnet / Haiku.
 */

export interface AnthropicContentTextPart {
  type: 'text';
  text: string;
}

export interface AnthropicContentImagePart {
  type: 'image';
  source: {
    type: 'base64';
    media_type: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
    data: string;
  };
}

export interface AnthropicContentToolUsePart {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface AnthropicContentToolResultPart {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

export type AnthropicContentPart =
  | AnthropicContentTextPart
  | AnthropicContentImagePart
  | AnthropicContentToolUsePart
  | AnthropicContentToolResultPart;

export interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | AnthropicContentPart[];
}

export interface AnthropicTool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface AnthropicMessageRequest {
  model: string;
  messages: AnthropicMessage[];
  max_tokens: number;
  system?: string | AnthropicContentTextPart[];
  temperature?: number;
  top_p?: number;
  top_k?: number;
  stream?: boolean;
  tools?: AnthropicTool[];
}

export interface AnthropicMessageResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  model: string;
  content: AnthropicContentPart[];
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use';
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export class Claude35Adapter {
  /**
   * Fast character-to-token ratio approximation (average ~3.8 characters per BPE token)
   */
  public static estimateTokens(text: string): number {
    if (!text || text.length === 0) return 0;
    const wordCount = text.trim().split(/\s+/).length;
    const charEstimate = Math.ceil(text.length / 3.8);
    return Math.max(wordCount, charEstimate);
  }

  /**
   * Validates an incoming Claude 3.5 API request payload
   */
  public static validateRequest(payload: unknown): { isValid: boolean; error?: string; request?: AnthropicMessageRequest } {
    if (!payload || typeof payload !== 'object') {
      return { isValid: false, error: 'Request body must be a valid JSON object' };
    }

    const req = payload as Partial<AnthropicMessageRequest>;

    if (!req.model || typeof req.model !== 'string') {
      return { isValid: false, error: "Missing required parameter 'model'" };
    }

    if (!Array.isArray(req.messages) || req.messages.length === 0) {
      return { isValid: false, error: "Parameter 'messages' must be a non-empty array" };
    }

    if (typeof req.max_tokens !== 'number' || req.max_tokens <= 0) {
      return { isValid: false, error: "Parameter 'max_tokens' must be a positive integer" };
    }

    for (let i = 0; i < req.messages.length; i++) {
      const msg = req.messages[i];
      if (!msg.role || !['user', 'assistant'].includes(msg.role)) {
        return { isValid: false, error: `Invalid role at messages[${i}]. Must be 'user' or 'assistant'` };
      }
      if (typeof msg.content !== 'string' && !Array.isArray(msg.content)) {
        return { isValid: false, error: `Invalid content at messages[${i}]. Must be a string or array of parts` };
      }
    }

    return { isValid: true, request: req as AnthropicMessageRequest };
  }

  /**
   * Extracts clean text representation of an Anthropic message
   */
  public static extractMessageText(msg: AnthropicMessage): string {
    if (typeof msg.content === 'string') {
      return msg.content;
    }
    return msg.content
      .filter((part): part is AnthropicContentTextPart => part.type === 'text')
      .map(part => part.text)
      .join('\n');
  }

  /**
   * Converts Claude 3.5 format into unified prompt context
   */
  public static toUnifiedPrompt(req: AnthropicMessageRequest): {
    systemPrompt: string;
    conversationText: string;
    totalInputTokens: number;
  } {
    let systemPrompt = '';
    if (typeof req.system === 'string') {
      systemPrompt = req.system;
    } else if (Array.isArray(req.system)) {
      systemPrompt = req.system.map(p => p.text).join('\n');
    }

    const conversationSegments = req.messages.map(m => {
      const text = this.extractMessageText(m);
      return `${m.role === 'user' ? 'Human' : 'Assistant'}: ${text}`;
    });

    const conversationText = conversationSegments.join('\n\n');
    const totalInputTokens = this.estimateTokens(systemPrompt) + this.estimateTokens(conversationText);

    return {
      systemPrompt,
      conversationText,
      totalInputTokens,
    };
  }

  /**
   * Generates a fully conformant Anthropic Claude 3.5 response
   */
  public static formatResponse(params: {
    model: string;
    generatedText: string;
    inputTokens: number;
    outputTokens?: number;
    stopReason?: 'end_turn' | 'max_tokens' | 'tool_use';
    toolsUsed?: Array<{ id: string; name: string; input: Record<string, unknown> }>;
  }): AnthropicMessageResponse {
    const randomHex = Math.random().toString(36).substring(2, 12);
    const id = `msg_01${randomHex}Claude35`;
    const outputTokens = params.outputTokens ?? this.estimateTokens(params.generatedText);

    const content: AnthropicContentPart[] = [
      {
        type: 'text',
        text: params.generatedText,
      },
    ];

    if (params.toolsUsed && params.toolsUsed.length > 0) {
      for (const tool of params.toolsUsed) {
        content.push({
          type: 'tool_use',
          id: tool.id,
          name: tool.name,
          input: tool.input,
        });
      }
    }

    return {
      id,
      type: 'message',
      role: 'assistant',
      model: params.model,
      content,
      stop_reason: params.stopReason || (params.toolsUsed && params.toolsUsed.length > 0 ? 'tool_use' : 'end_turn'),
      stop_sequence: null,
      usage: {
        input_tokens: params.inputTokens,
        output_tokens: outputTokens,
      },
    };
  }
}
