/**
 * Multi-turn Chat Session with Memory
 * Preserves Google Gemini metadata and context_str across turns
 * Gracefully recovers from expired conversations
 */

export class ChatSession {
  constructor(client, options = {}) {
    this.client = client;
    this.options = options;
    this.conversationId = null;
    this.responseId = null;
    this.choiceId = null;
    this.metadata = null;
    this.history = [];
  }

  async sendMessage(prompt, attachments = [], callOptions = {}) {
    let result;
    const model = callOptions.model || this.options.model;
    const onStream = callOptions.onStream || null;

    try {
      result = await this.client.sendStreamGenerate({
        prompt: prompt,
        conversationId: this.conversationId,
        responseId: this.responseId,
        choiceId: this.choiceId,
        metadata: this.metadata,
        attachments: attachments,
        isImageGen: false,
        model: model,
        onStream: onStream,
      });

      if ((!result.text || result.text.trim().length === 0) && (!result.images || result.images.length === 0) && (this.conversationId || this.metadata)) {
        console.log('ChatSession: Phiên hội thoại cũ bị mất đồng bộ, tự động mở phiên mới...');
        this.reset();
        result = await this.client.sendStreamGenerate({
          prompt: prompt,
          attachments: attachments,
          isImageGen: false,
          model: model,
          onStream: onStream,
        });
      }
    } catch (err) {
      if (this.conversationId || this.metadata) {
        console.log('ChatSession: Lỗi tiếp tục hội thoại, tự động reset và gửi lại:', err.message);
        this.reset();
        result = await this.client.sendStreamGenerate({
          prompt: prompt,
          attachments: attachments,
          isImageGen: false,
          model: model,
          onStream: onStream,
        });
      } else {
        throw err;
      }
    }

    if (result.conversationId) this.conversationId = result.conversationId;
    if (result.responseId) this.responseId = result.responseId;
    if (result.choiceId) this.choiceId = result.choiceId;
    if (result.metadata) this.metadata = result.metadata;

    this.history.push({
      role: 'user',
      text: prompt,
      attachments: attachments,
      timestamp: Date.now(),
    });

    this.history.push({
      role: 'model',
      text: result.text,
      thoughts: result.thoughts,
      images: result.images,
      timestamp: Date.now(),
    });

    return result;
  }

  reset() {
    this.conversationId = null;
    this.responseId = null;
    this.choiceId = null;
    this.metadata = null;
    this.history = [];
  }

  getHistory() {
    return [...this.history];
  }
}
