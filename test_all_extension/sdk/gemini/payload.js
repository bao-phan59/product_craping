/**
 * Payload Builder for Gemini StreamGenerate & Banana Image Generation
 * Clean, rock-solid JSPB-compliant 81-element nested arrays
 * Dynamically maps to Google Gemini 2026 models: 3.1 Pro, 3.8 Flash, 3.5 Flash-Lite, Extended Thinking
 */

import { Models } from './constants.js';

export class GeminiPayloadBuilder {
  static buildStreamGeneratePayload({
    prompt,
    conversationId = null,
    responseId = null,
    choiceId = null,
    metadata = null,
    attachments = [],
    isImageGen = false,
    uuidVal = null,
    language = 'vi',
    model = '3.1-pro',
  }) {
    let finalPrompt = prompt;

    const isBananaPro = (typeof model === 'string' && model.includes('pro'));

    if (isImageGen) {
      const hasPrefix = finalPrompt.toLowerCase().includes('generate an image') || finalPrompt.toLowerCase().includes('create an image');
      if (!hasPrefix) {
        if (isBananaPro) {
          finalPrompt = `Please generate an ultra-realistic, award-winning 8k commercial photography studio shot of: ${prompt} --quality 2`;
        } else {
          finalPrompt = `Please generate an image of: ${prompt}`;
        }
      }
    }

    const formattedAttachments = attachments.map((att) => {
      if (att.mediaToken) {
        return [[att.mediaToken], att.filename || 'image.jpg'];
      }
      if (att.base64) {
        return [[null, att.base64, att.mimeType], att.filename || 'image.jpg'];
      }
      return null;
    }).filter(Boolean);

    // Chuẩn ngữ cảnh hội thoại đa lượt của Google Gemini
    const sessionContext = (metadata && Array.isArray(metadata))
      ? metadata
      : (conversationId
          ? [conversationId, responseId, choiceId, null, null, null, null, null, null, '']
          : ['', '', '', null, null, null, null, null, null, '']);

    const messageContent = [
      finalPrompt,
      0,
      null,
      formattedAttachments.length > 0 ? formattedAttachments : null,
      null,
      null,
      0,
    ];

    // Xác định Model Number (1: Flash, 3: Pro, 6: Lite) và Thinking (2: Bật tư duy mở rộng)
    let resolvedModel = Object.values(Models).find(m => m.id === model);
    if (!resolvedModel) {
      if (typeof model === 'string' && (model.includes('flash-lite') || model.includes('3.5'))) {
        resolvedModel = Models.GEMINI_3_5_LITE;
      } else if (typeof model === 'string' && (model.includes('flash') || model.includes('3.8'))) {
        resolvedModel = Models.GEMINI_3_8_FLASH;
      } else if (typeof model === 'string' && model.includes('thinking')) {
        resolvedModel = Models.GEMINI_THINKING;
      } else {
        resolvedModel = Models.GEMINI_3_1_PRO;
      }
    }

    const modelNumber = resolvedModel.modelNumber || 3;
    const isThinking = Boolean(resolvedModel.thinking);

    const innerReq = new Array(81).fill(null);
    innerReq[0] = messageContent;
    innerReq[1] = [language];
    innerReq[2] = sessionContext;
    innerReq[6] = [1];
    innerReq[7] = 1;
    innerReq[10] = 1;
    innerReq[11] = 0;
    innerReq[17] = [[0]];
    innerReq[18] = 0;
    innerReq[27] = 1;
    innerReq[30] = [4];
    innerReq[41] = [1];
    innerReq[53] = 0;
    innerReq[59] = uuidVal || this.generateUUID();
    innerReq[61] = [];
    innerReq[68] = 1;
    innerReq[79] = modelNumber;
    innerReq[80] = isThinking ? 2 : 1;

    const fReq = JSON.stringify([null, JSON.stringify(innerReq)]);

    return {
      fReq,
      uuidVal: innerReq[59],
    };
  }

  static generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16).toUpperCase();
    });
  }

  static buildFormBody(fReq, actionToken) {
    const params = new URLSearchParams();
    params.append('f.req', fReq);
    params.append('at', actionToken || '');
    return params.toString();
  }
}
