/**
 * Healthcheck / Diagnostics Suite Module Controller
 */

export function setupHealthcheckModule({ suiteRunner }) {
  const btnCheck = document.getElementById('btnRunSuiteCheck');
  const progressBar = document.getElementById('suiteProgressBar');
  const statusText = document.getElementById('suiteStatusText');
  const grid = document.getElementById('diagnosticGrid');

  btnCheck?.addEventListener('click', async () => {
    btnCheck.disabled = true;
    grid.innerHTML = '';
    progressBar.style.width = '10%';
    statusText.textContent = 'Đang tiến hành chẩn đoán sức khỏe 5 SDK...';

    try {
      const report = await suiteRunner.runAllTests((step) => {
        const percent = Math.round(((step.currentIndex + 1) / step.total) * 100);
        progressBar.style.width = `${percent}%`;
        statusText.textContent = `Đang kiểm tra [${step.currentIndex + 1}/${step.total}]: ${step.currentTestName}...`;

        if (step.state === 'done' && step.singleResult) {
          renderDiagnosticCard(step.singleResult);
        }
      });

      progressBar.style.width = '100%';
      statusText.textContent = `Hoàn thành! Đạt ${report.passedCount}/${report.totalTests} SDK trong ${report.totalDurationMs}ms.`;
    } catch (err) {
      statusText.textContent = `Lỗi chẩn đoán: ${err.message}`;
    } finally {
      btnCheck.disabled = false;
    }
  });

  function renderDiagnosticCard(res) {
    const card = document.createElement('div');
    card.className = 'diag-card';
    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <strong style="color: #fff;">${res.sdk}</strong>
        <span style="font-size: 11px; padding: 2px 6px; border-radius: 4px; font-weight: 600; background: ${res.success ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}; color: ${res.success ? '#34d399' : '#f87171'};">
          ${res.success ? 'Thành công' : 'Chưa sẵn sàng'}
        </span>
      </div>
      <div style="font-size: 11px; color: #94a3b8;">Độ trễ: ${res.latencyMs}ms</div>
      <div style="font-size: 11px; color: #64748b;">${res.details ? JSON.stringify(res.details) : (res.error || 'N/A')}</div>
      ${res.suggestion ? `<div style="font-size: 11px; color: #fbbf24;">💡 ${res.suggestion}</div>` : ''}
    `;
    grid.appendChild(card);
  }
}
