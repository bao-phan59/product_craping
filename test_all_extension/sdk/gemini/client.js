/**
 * Gemini Extension SDK — Core Client Interface
 * Designed with modern AI SDK standards (modular, maintainable namespaces: models, chats, tools, auth)
 * Features Content-Driven Streaming Watchdog (Only completes after content is received)
 */

import { Endpoints, DEFAULT_LANGUAGE, Models } from './constants.js';
import { GeminiAuthManager } from './auth.js';
import { GeminiMediaUploader } from './media.js';
import { GeminiPayloadBuilder } from './payload.js';
import { GeminiStreamParser } from './parser.js';
import { ChatSession } from './chat.js';

export class GeminiExtensionSDK {
  constructor(options = {}) {
    this.options = {
      autoRefresh: true,
      jitterDelay: [0, 0],
      streamTimeout: 45000,
      language: DEFAULT_LANGUAGE,
      defaultModel: '3.1-pro',
      ...options,
    };

    this.authManager = new GeminiAuthManager();
    this.media = new GeminiMediaUploader(this.authManager);
    this.reqId = Math.floor(Math.random() * 90000) + 10000;

    this.auth = {
      initialize: () => this.init(),
      getStatus: () => this.isAuthenticated(),
      getTokens: () => ({
        secure1PSID: this.authManager.secure1PSID,
        actionToken: this.authManager.actionToken,
        buildLabel: this.authManager.buildLabel,
        sessionId: this.authManager.sessionId,
      }),
    };

    this.models = {
      list: () => Object.values(Models),
      generateContent: (args) => {
        if (typeof args === 'string') return this.generateText(args);
        if (args.images && args.images.length > 0) {
          return this.generateMultimodal(args.prompt, args.images, args);
        }
        return this.generateText(args.prompt, args);
      },
      generateImages: (args) => {
        if (typeof args === 'string') return this.generateImage(args);
        return this.generateImage(args.prompt, args);
      },
    };

    this.chats = {
      create: (chatOptions = {}) => new ChatSession(this, chatOptions),
    };

    this.tools = {
      visualQC: async ({ referenceImage, candidateImage, criteria = '', model = '3.1-pro' }) => {
        const defaultCriteria = `
          Bạn là Chuyên gia Kiểm định Chất lượng Hình ảnh Sản phẩm Thương mại (Visual QC Inspector).
          Hãy so sánh ẢNH 1 (Sản phẩm gốc Reference) và ẢNH 2 (Ảnh candidate vừa được sinh ra).
          
          Kiểm tra nghiêm ngặt:
          1. Sản phẩm trong ảnh 2 có bị méo mó, biến dạng kết cấu, sai tỷ lệ không?
          2. Có bị mọc thêm chi tiết lạ, logo lạ, hoặc thiếu phụ kiện không?
          3. Nếu có người mẫu hoặc tay người, bàn tay có chuẩn giải phẫu 5 ngón không?
          4. Chất liệu và màu sắc có khớp với ảnh 1 không?
          
          ${criteria}
          
          Hãy đưa ra quyết định ngắn gọn:
          - KẾT LUẬN: PASS hoặc FAIL
          - ĐIỂM SỐ FIDELITY: (0 - 100)
          - LÝ DO CHI TIẾT:
          - KHUYẾN NGHỊ SỬA PROMPT (nếu Fail):
        `;
        return await this.generateMultimodal(defaultCriteria, [referenceImage, candidateImage], { model });
      },
    };
  }

  async init() {
    const status = await this.authManager.initialize();
    if (!status.authenticated) {
      throw new Error(status.error || 'Khởi tạo session Gemini thất bại.');
    }
    return status;
  }

  async isAuthenticated() {
    try {
      const cookieCheck = await this.authManager.extractCookies();
      return cookieCheck.authenticated;
    } catch {
      return false;
    }
  }

  async generateText(prompt, options = {}) {
    await this._ensureSession();

    return await this.sendStreamGenerate({
      prompt: prompt,
      attachments: [],
      isImageGen: false,
      model: options.model || this.options.defaultModel,
      ...options,
    });
  }

  async generateMultimodal(prompt, images = [], options = {}) {
    await this._ensureSession();

    const uploadedAttachments = [];
    for (let i = 0; i < images.length; i++) {
      try {
        const uploaded = await this.media.uploadImage(images[i], `input_image_${i + 1}.jpg`);
        if (uploaded) uploadedAttachments.push(uploaded);
      } catch (imgErr) {
        console.warn(`GeminiSDK: Bỏ qua ảnh #${i + 1} do lỗi nạp hình ảnh:`, imgErr.message);
      }
    }

    return await this.sendStreamGenerate({
      prompt: prompt,
      attachments: uploadedAttachments,
      isImageGen: false,
      model: options.model || this.options.defaultModel,
      ...options,
    });
  }

  async generateImage(prompt, options = {}) {
    await this._ensureSession();

    let attachments = [];
    if (options.referenceImage) {
      const refUploaded = await this.media.uploadImage(options.referenceImage, 'ref_image.jpg');
      attachments.push(refUploaded);
    }

    let studioPrompt = prompt;
    if (options.aspectRatio) {
      studioPrompt += ` --ar ${options.aspectRatio}`;
    }

    const result = await this.sendStreamGenerate({
      prompt: studioPrompt,
      attachments: attachments,
      isImageGen: true,
      model: options.model || 'banana-imagen-3',
      ...options,
    });

    return {
      text: result.text,
      images: result.images,
      prompt: prompt,
      thoughts: result.thoughts,
    };
  }

  createChat(options = {}) {
    return this.chats.create(options);
  }

  async sendStreamGenerate({
    prompt,
    conversationId = null,
    responseId = null,
    choiceId = null,
    metadata = null,
    attachments = [],
    isImageGen = false,
    model = null,
    onStream = null,
    retryCount = 0,
  }) {
    this.reqId += 10000;

    const uuidVal = GeminiPayloadBuilder.generateUUID();

    const { fReq } = GeminiPayloadBuilder.buildStreamGeneratePayload({
      prompt,
      conversationId,
      responseId,
      choiceId,
      metadata,
      attachments,
      isImageGen,
      uuidVal,
      language: this.authManager.language || this.options.language || 'vi',
      model: model || this.options.defaultModel,
      sessionId: this.authManager.sessionId,
    });

    const formBody = GeminiPayloadBuilder.buildFormBody(fReq, this.authManager.actionToken);

    const queryParams = new URLSearchParams({
      hl: this.authManager.language || this.options.language || 'vi',
      _reqid: this.reqId.toString(),
      rt: 'c',
    });

    if (this.authManager.buildLabel) {
      queryParams.append('bl', this.authManager.buildLabel);
    }
    if (this.authManager.sessionId) {
      queryParams.append('f.sid', this.authManager.sessionId);
    }

    const generateUrl = `${Endpoints.GENERATE}?${queryParams.toString()}`;

    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      'X-Same-Domain': '1',
      'Referer': 'https://gemini.google.com/',
      'x-goog-ext-525005358-jspb': JSON.stringify([uuidVal, 1]),
    };

    const controller = new AbortController();
    const timeoutTimer = setTimeout(() => {
      controller.abort();
    }, this.options.streamTimeout);

    try {
      console.log('GeminiSDK: Gửi StreamGenerate...', { prompt: prompt.substring(0, 30), model, isImageGen });

      const response = await fetch(generateUrl, {
        method: 'POST',
        credentials: 'include',
        headers: headers,
        body: formBody,
        signal: controller.signal,
      });

      if (!response.ok) {
        if ((response.status === 401 || response.status === 403) && retryCount < 2) {
          console.log('GeminiSDK: Token hết hạn, tự động refresh session...');
          await this.init();
          return await this.sendStreamGenerate({
            prompt,
            conversationId,
            responseId,
            choiceId,
            metadata,
            attachments,
            isImageGen,
            model,
            onStream,
            retryCount: retryCount + 1,
          });
        }
        throw new Error(`Google RPC error: HTTP ${response.status} ${response.statusText}`);
      }

      const rawResponse = await this._readStreamWithWatchdog(response, controller, isImageGen, onStream);
      clearTimeout(timeoutTimer);

      const parsed = GeminiStreamParser.parse(rawResponse);
      console.log('GeminiSDK: Kết quả parse nhận được:', { 
        textLength: parsed.text ? parsed.text.length : 0, 
        imageCount: parsed.images ? parsed.images.length : 0,
        textPreview: parsed.text ? parsed.text.substring(0, 40) : 'RỖNG'
      });

      return parsed;
    } catch (err) {
      clearTimeout(timeoutTimer);

      if (err.name === 'AbortError') {
        if (retryCount < 1) {
          console.log('GeminiSDK: Timeout, thử lại 1 lần sau khi làm mới session...');
          await this.init();
          return await this.sendStreamGenerate({
            prompt,
            conversationId,
            responseId,
            choiceId,
            metadata,
            attachments,
            isImageGen,
            model,
            onStream,
            retryCount: retryCount + 1,
          });
        }
        throw new Error('Yêu cầu tới Google Gemini bị quá thời gian (Timeout). Vui lòng thử lại.');
      }

      throw err;
    }
  }

  async _readStreamWithWatchdog(response, controller, isImageGen = false, onStream = null) {
    if (!response.body || !response.body.getReader) {
      return await response.text();
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let accumulatedText = '';
    let socketTimeoutTimer = null;

    return new Promise(async (resolve, reject) => {
      // Bộ bảo vệ đứt kết nối mạng: Chỉ kích hoạt nếu đường truyền ngưng truyền byte quá 15s
      const resetSocketTimeout = (timeoutMs = 15000) => {
        if (socketTimeoutTimer) clearTimeout(socketTimeoutTimer);
        socketTimeoutTimer = setTimeout(() => {
          console.log(`GeminiSDK: Mạng im lặng quá ${timeoutMs}ms, đóng stream.`);
          reader.cancel().catch(() => {});
          resolve(accumulatedText);
        }, timeoutMs);
      };

      try {
        resetSocketTimeout(isImageGen ? 30000 : 20000);

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            if (socketTimeoutTimer) clearTimeout(socketTimeoutTimer);
            resolve(accumulatedText);
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          accumulatedText += chunk;

          // Cập nhật câu trả lời theo thời gian thực (Live Stream)
          try {
            const parsed = GeminiStreamParser.parse(accumulatedText);
            if (onStream && parsed.text && parsed.text.trim().length > 0) {
              onStream(parsed.text, parsed.thoughts);
            }

            // CƠ CHẾ HOÀN TẤT: Khi phát hiện cờ FINISH_REASON_STOP (indicator = 2) từ Protobuf
            const status = GeminiStreamParser.checkStreamStatus(accumulatedText);
            if (status.isComplete) {
              // Rút ngắn timeout socket xuống 1.5s để chờ byte đóng hoặc đón nốt chunk cuối
              resetSocketTimeout(1500);
            }
          } catch {}

          // Gia hạn thời gian chờ mạng cho chunk tiếp theo
          resetSocketTimeout(isImageGen ? 25000 : 15000);
        }
      } catch (err) {
        if (accumulatedText.length > 50) {
          resolve(accumulatedText);
        } else {
          reject(err);
        }
      }
    });
  }

  async _ensureSession() {
    if (!this.authManager.isSessionValid()) {
      await this.init();
    }
  }
}
