/**
 * Type Definitions for Gemini Extension SDK
 * Modern Namespaced AI Architecture with 1K/2K Resolution, 2026 Google Models & Real-time Live Streaming
 */

export interface InitResult {
  authenticated: boolean;
  actionToken?: string;
  buildLabel?: string;
  sessionId?: string;
  secure1PSID?: string;
  error?: string;
}

export interface GeneratedImageItem {
  url: string;
  url1k: string;
  url2k: string;
  urlOriginal: string;
  baseUrl: string;
  toString(): string;
}

export interface ModelResponse {
  text: string;
  thoughts?: string | null;
  images?: GeneratedImageItem[];
  conversationId?: string | null;
  responseId?: string | null;
  choiceId?: string | null;
  errorCode?: string | number | null;
  rawText?: string;
  framesCount?: number;
}

export interface ImageGenResult {
  text: string;
  images: GeneratedImageItem[];
  prompt: string;
  thoughts?: string | null;
}

export type GeminiModelId = 
  | '3.1-pro' 
  | '3.8-flash' 
  | '3.5-flash-lite' 
  | 'thinking'
  | string;

export type BananaModelId = 
  | 'banana-imagen-3' 
  | 'banana-imagen-3-pro'
  | string;

export interface GeminiOptions {
  autoRefresh?: boolean;
  jitterDelay?: [number, number];
  language?: string;
  defaultModel?: GeminiModelId;
  streamTimeout?: number;
}

export interface GenerateContentParams {
  prompt: string;
  images?: (Blob | File | string)[];
  model?: GeminiModelId;
  onStream?: (streamText: string, thoughts?: string | null) => void;
}

export interface GenerateImagesParams {
  prompt: string;
  referenceImage?: Blob | File | string;
  aspectRatio?: '1:1' | '4:3' | '16:9' | '9:16';
  model?: BananaModelId;
}

export interface VisualQCParams {
  referenceImage: Blob | File | string;
  candidateImage: Blob | File | string;
  criteria?: string;
  model?: GeminiModelId;
}

export interface SendMessageOptions {
  model?: GeminiModelId;
  onStream?: (streamText: string, thoughts?: string | null) => void;
}

export declare class ChatSession {
  constructor(client: GeminiExtensionSDK, options?: { model?: GeminiModelId });
  conversationId: string | null;
  responseId: string | null;
  choiceId: string | null;
  metadata: any;
  history: Array<{ role: 'user' | 'model'; parts: string }>;

  sendMessage(
    prompt: string, 
    attachments?: (Blob | File | string)[], 
    callOptions?: SendMessageOptions
  ): Promise<ModelResponse>;

  reset(): void;
}

export declare class GeminiExtensionSDK {
  constructor(options?: GeminiOptions);

  auth: {
    initialize(): Promise<InitResult>;
    getStatus(): Promise<boolean>;
    getTokens(): {
      secure1PSID: string | null;
      actionToken: string | null;
      buildLabel: string | null;
      sessionId: string | null;
    };
  };

  models: {
    list(): Array<{ id: string; name: string; modelNumber?: number; thinking?: boolean }>;
    generateContent(params: string | GenerateContentParams): Promise<ModelResponse>;
    generateImages(params: string | GenerateImagesParams): Promise<ImageGenResult>;
  };

  chats: {
    create(options?: { model?: GeminiModelId }): ChatSession;
  };

  tools: {
    visualQC(params: VisualQCParams): Promise<ModelResponse>;
  };

  init(): Promise<InitResult>;
  isAuthenticated(): Promise<boolean>;
  generateText(prompt: string, options?: { model?: GeminiModelId; onStream?: (text: string) => void }): Promise<ModelResponse>;
  generateMultimodal(prompt: string, images?: (Blob | File | string)[], options?: { model?: GeminiModelId }): Promise<ModelResponse>;
  generateImage(prompt: string, options?: GenerateImagesParams): Promise<ImageGenResult>;
  createChat(options?: { model?: GeminiModelId }): ChatSession;
}
