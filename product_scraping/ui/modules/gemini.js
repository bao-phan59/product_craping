/**
 * Gemini AI & Banana Studio Module Controller
 */

let geminiInstance = null;

/**
 * ĐÓNG GÓI SẠCH HÀM HỎI ĐÁP GEMINI:
 * Chỉ nhận input (prompt, model) và trả về output kết quả chuỗi hoàn chỉnh.
 * Loại bỏ hoàn toàn streaming lặp chữ, đơn giản hóa tối đa cho extension.
 */
export async function askGemini(prompt, model = '3.8-flash') {
  if (!geminiInstance) throw new Error('Gemini SDK chưa được khởi tạo');
  const res = await geminiInstance.models.generateContent({
    prompt,
    model
  });
  return res.text || '(Không nhận được phản hồi)';
}

/**
 * ĐÓNG GÓI SẠCH HÀM TẠO ẢNH BANANA (IMAGEN 3):
 * Chỉ nhận prompt, model, tỉ lệ và trả về mảng danh sách ảnh kết quả.
 */
export async function generateBanana(prompt, options = {}) {
  if (!geminiInstance) throw new Error('Gemini SDK chưa được khởi tạo');
  const model = options.model || 'imagen-3';
  const aspectRatio = options.aspectRatio || '1:1';

  const res = await geminiInstance.models.generateImages({
    prompt,
    model,
    aspectRatio
  });
  return res.images || [];
}

export function setupGeminiModule({ gemini }) {
  geminiInstance = gemini;

  const btnChatSub = document.getElementById('subTabGeminiChat');
  const btnBananaSub = document.getElementById('subTabGeminiBanana');
  const chatView = document.getElementById('geminiChatView');
  const bananaView = document.getElementById('geminiBananaView');

  const selectModel = document.getElementById('selectGeminiModel');
  const inputPrompt = document.getElementById('inputGeminiPrompt');
  const btnSend = document.getElementById('btnGeminiSend');
  const chatMessages = document.getElementById('chatMessages');

  // Switch Sub-tabs
  btnChatSub?.addEventListener('click', () => {
    btnChatSub.classList.add('active');
    btnBananaSub.classList.remove('active');
    chatView.style.display = 'flex';
    bananaView.style.display = 'none';
  });

  btnBananaSub?.addEventListener('click', () => {
    btnBananaSub.classList.add('active');
    btnChatSub.classList.remove('active');
    chatView.style.display = 'none';
    bananaView.style.display = 'flex';
  });

  // Quick chips
  document.querySelectorAll('.chip-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      inputPrompt.value = btn.dataset.prompt;
      inputPrompt.focus();
    });
  });

  // Gửi Chat — Chế độ sạch Input -> Output (Không lặp chữ)
  btnSend?.addEventListener('click', sendChatMessage);
  inputPrompt?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  });

  async function sendChatMessage() {
    const prompt = inputPrompt.value.trim();
    if (!prompt) return;

    const chosenModel = selectModel.value;
    inputPrompt.value = '';
    btnSend.disabled = true;

    // 1. Render tin nhắn của User
    appendMessage('user', prompt);

    // 2. Render khung chờ của AI
    const aiBubbleContent = appendMessage('ai', `⏳ Đang xử lý câu trả lời với ${chosenModel}...`);

    try {
      // GỌI HÀM SẠCH INPUT -> OUTPUT
      const answer = await askGemini(prompt, chosenModel);
      aiBubbleContent.textContent = answer;
      chatMessages.scrollTop = chatMessages.scrollHeight;
    } catch (err) {
      aiBubbleContent.textContent = `Lỗi Gemini AI: ${err.message}. Hãy mở 1 tab gemini.google.com và đăng nhập tài khoản Google.`;
    } finally {
      btnSend.disabled = false;
    }
  }

  function appendMessage(role, text) {
    const row = document.createElement('div');
    row.className = `msg-bubble msg-${role}`;
    if (role === 'ai') {
      const safeModel = escapeHtml(selectModel.value);
      const safeText = escapeHtml(text);
      row.innerHTML = `<div class="msg-author">Gemini (${safeModel})</div><div class="msg-content">${safeText}</div>`;
      chatMessages.appendChild(row);
      chatMessages.scrollTop = chatMessages.scrollHeight;
      return row.querySelector('.msg-content');
    } else {
      row.textContent = text;
      chatMessages.appendChild(row);
      chatMessages.scrollTop = chatMessages.scrollHeight;
      return row;
    }
  }

  // Banana Studio Generation — Chế độ sạch Input -> Output
  const inputBanana = document.getElementById('inputBananaPrompt');
  const selectBananaModel = document.getElementById('selectBananaModel');
  const selectRatio = document.getElementById('selectBananaRatio');
  const btnBanana = document.getElementById('btnBananaGenerate');
  const bananaResults = document.getElementById('bananaResults');

  async function loadBlobUrlSafe(url) {
    try {
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    } catch (e) {
      console.warn('loadBlobUrlSafe fallback:', e.message);
      return url;
    }
  }

  btnBanana?.addEventListener('click', async () => {
    const prompt = inputBanana.value.trim();
    if (!prompt) return;

    btnBanana.disabled = true;
    const model = selectBananaModel ? selectBananaModel.value : 'imagen-3';
    const ratio = selectRatio.value;

    bananaResults.innerHTML = `<div class="empty-state">⏳ Đang tạo ảnh với ${model} (${ratio}). Vui lòng đợi trong giây lát...</div>`;

    try {
      // GỌI HÀM SẠCH INPUT -> OUTPUT
      const images = await generateBanana(prompt, {
        model,
        aspectRatio: ratio
      });

      bananaResults.innerHTML = '';

      if (!images || images.length === 0) {
        bananaResults.innerHTML = '<div class="empty-state">Không tạo được ảnh từ Banana. Hãy mở tab gemini.google.com để nạp phiên.</div>';
        return;
      }

      bananaResults.innerHTML = '<div class="empty-state">⏳ Đang tải và hiển thị ảnh chất lượng cao...</div>';

      const cardsToAppend = [];
      for (const img of images) {
        const rawUrl = img.url || img.base64;
        let displayUrl = rawUrl;
        if (rawUrl && rawUrl.startsWith('http')) {
          displayUrl = await loadBlobUrlSafe(rawUrl);
        }

        const card = document.createElement('div');
        card.className = 'banana-card';

        card.innerHTML = `
          <img src="${displayUrl}" alt="Banana Generated" referrerpolicy="no-referrer" loading="lazy">
          <div style="padding: 8px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; color: #94a3b8;">${ratio} • ${model}</span>
            <a href="${displayUrl}" download="banana_${Date.now()}.png" target="_blank" class="btn btn-banana" style="font-size: 10px; padding: 4px 8px;">Tải Ảnh Về</a>
          </div>
        `;

        const imgEl = card.querySelector('img');
        imgEl.addEventListener('error', () => {
          imgEl.src = rawUrl;
        });

        cardsToAppend.push(card);
      }

      bananaResults.innerHTML = '';
      cardsToAppend.forEach(card => bananaResults.appendChild(card));
    } catch (err) {
      bananaResults.innerHTML = `<div class="empty-state" style="color: #f87171;">Lỗi Banana: ${escapeHtml(err.message)}</div>`;
    } finally {
      btnBanana.disabled = false;
    }
  });
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
