/**
 * Google Gemini Web Client Constants & gRPC Configuration
 * Updated to match the latest 2026 Google Gemini Web interface
 */

export const Endpoints = {
  INIT: 'https://gemini.google.com/app',
  GENERATE: 'https://gemini.google.com/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate',
  BATCH_EXEC: 'https://gemini.google.com/_/BardChatUi/data/batchexecute',
  UPLOAD: 'https://content-push.googleapis.com/upload',
  ROTATE_COOKIES: 'https://accounts.google.com/RotateCookies',
};

export const Models = {
  // --- GOOGLE GEMINI 2026 WEB MODELS (Khớp 100% giao diện thực tế của Google) ---
  GEMINI_3_8_FLASH: {
    id: '3.8-flash',
    name: '3.8 Flash (Trợ giúp toàn diện - Mới)',
    modelNumber: 1,
    thinking: false,
  },
  GEMINI_3_1_PRO: {
    id: '3.1-pro',
    name: '3.1 Pro (Suy luận nâng cao)',
    modelNumber: 3,
    thinking: false,
  },
  GEMINI_3_5_LITE: {
    id: '3.5-flash-lite',
    name: '3.5 Flash-Lite (Câu trả lời nhanh nhất)',
    modelNumber: 6,
    thinking: false,
  },
  GEMINI_THINKING: {
    id: 'thinking',
    name: 'Tư duy mở rộng (Giải quyết vấn đề phức tạp)',
    modelNumber: 1,
    thinking: true,
  },

  // --- GOOGLE BANANA IMAGE ENGINE ---
  BANANA_IMAGEN_3: {
    id: 'banana-imagen-3',
    name: 'Google Banana (Imagen 3 Chuẩn)',
    quality: 'standard',
  },
  BANANA_IMAGEN_3_PRO: {
    id: 'banana-imagen-3-pro',
    name: 'Google Banana Pro (Studio 8K Siêu Thực)',
    quality: 'ultra',
  },
};

export const GRPC = {
  STREAM_GENERATE: 'StreamGenerate',
  LIST_CONVERSATIONS: 'vv5hEc',
  GET_CONVERSATION: 'hNvQHb',
  DELETE_CONVERSATION: 'GzWevd',
  DOWNLOAD_GENERATED_IMAGE: 's0L98e',
};

export const Fields = {
  METADATA: 1,
  CONVERSATION_ID: 0,
  RESPONSE_ID: 1,
  CHOICE_ID: 0,
  CANDIDATES: 4,
  TEXT: 0,
  THOUGHTS: 1,
  GENERATED_IMAGES: 7,
  WEB_IMAGES: 0,
};

export const BANANA_IMAGE_TAG = 'image_generation_content';
export const DEFAULT_LANGUAGE = 'vi';
