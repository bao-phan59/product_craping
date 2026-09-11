/**
 * UI Utilities — Raw Error & Debug Formatting
 */

/**
 * Hiển thị khối lỗi thô (Raw Server Response & Debug Parameters) lên giao diện kèm nút Copy
 * @param {HTMLElement} container
 * @param {string} title
 * @param {Error|Object} err
 */
export function renderRawError(container, title, err) {
  const rawDetails = {
    message: err.message,
    name: err.name,
    status: err.status || 'N/A',
    url: err.url || err.debugInfo?.uploadUrl || 'N/A',
    rawResponse: err.rawResponse || err.responseBody || null,
    debugInfo: err.debugInfo || null,
    stack: err.stack || '',
  };

  const rawJsonStr = JSON.stringify(rawDetails, null, 2);

  let tip = '';
  if (String(err.message).includes('FAIL_SYS_ILLEGAL_ACCESS') || String(err.message).includes('FAIL_SYS_TOKEN_EXPIRED')) {
    tip = '💡 <strong>Mẹo gỡ lỗi:</strong> Token bảo mật H5 của Alibaba chưa đồng bộ với trình duyệt. Hãy bấm nút <em>"🌐 Mở Tab 1688.com"</em> ở góc trên, đợi trang tải xong hoàn toàn rồi bấm tìm kiếm lại!';
  } else if (String(err.message).includes('timeout')) {
    tip = '💡 <strong>Mẹo gỡ lỗi:</strong> Yêu cầu bị timeout do đường truyền hoặc firewall. Hãy mở sẵn tab <em>https://s.1688.com</em> để kích hoạt In-Tab Bypass!';
  }

  container.innerHTML = `
    <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid #ef4444; border-radius: 8px; padding: 16px; margin: 12px 0;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 8px;">
        <span style="color: #ef4444; font-weight: 700; font-size: 13px;">⚠️ ${title}: ${err.message}</span>
        <button class="btn-copy-raw-error" style="background: #1e293b; border: 1px solid #ef4444; color: #f87171; padding: 5px 12px; border-radius: 4px; font-size: 11px; cursor: pointer; font-weight: 600;">📋 Sao chép lỗi thô</button>
      </div>
      ${tip ? `<div style="background: rgba(234, 179, 8, 0.1); border-left: 3px solid #eab308; padding: 8px 12px; margin-bottom: 10px; font-size: 11px; color: #fde047;">${tip}</div>` : ''}
      <div style="font-size: 11px; color: #94a3b8; margin-bottom: 6px;">Chi tiết phản hồi thô từ server (Raw Server Response & Debug Parameters):</div>
      <pre style="background: #090d16; border: 1px solid #334155; color: #38bdf8; padding: 12px; border-radius: 6px; font-size: 11px; font-family: Consolas, Monaco, monospace; max-height: 350px; overflow: auto; white-space: pre-wrap; word-break: break-all;">${rawJsonStr}</pre>
    </div>
  `;

  container.querySelector('.btn-copy-raw-error')?.addEventListener('click', (e) => {
    navigator.clipboard.writeText(rawJsonStr);
    e.target.textContent = '✅ Đã sao chép!';
    setTimeout(() => { e.target.textContent = '📋 Sao chép lỗi thô'; }, 2000);
  });
}
