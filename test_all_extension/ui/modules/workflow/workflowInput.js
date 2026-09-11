/**
 * workflowInput.js — Input Screen & Form Controller
 * Quản lý Màn hình 1 (Screen 1): Kéo thả ảnh (Drag & Drop), tải ảnh qua URL,
 * định dạng SKU tự động, xem trước ảnh HD và xác thực form đầu vào.
 */

let currentImageSource = null;

/**
 * Gắn sự kiện cho Màn hình 1: Nhập liệu
 * @param {Object} options
 * @param {Function} options.onStart - Callback khi người dùng bấm nút Bắt đầu Pipeline
 */
export function bindInputEvents({ onStart }) {
  const dropzone = document.getElementById('wfDropzone');
  const fileInput = document.getElementById('wfFileInput');
  const urlInput = document.getElementById('wfUrlInput');
  const btnLoadUrl = document.getElementById('wfBtnLoadUrl');
  const skuInput = document.getElementById('wfSkuInput');
  const btnStart = document.getElementById('wfBtnStartPipeline');
  const btnRemoveImg = document.getElementById('wfBtnRemoveImage');

  // Drag & Drop
  if (dropzone) {
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('wf-dropzone-dragover');
    });

    ['dragleave', 'dragend'].forEach(evt => {
      dropzone.addEventListener(evt, () => {
        dropzone.classList.remove('wf-dropzone-dragover');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('wf-dropzone-dragover');
      const files = e.dataTransfer.files;
      if (files && files[0]) {
        handleFileSelect(files[0]);
      }
    });

    dropzone.addEventListener('click', () => {
      if (fileInput) fileInput.click();
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleFileSelect(e.target.files[0]);
      }
    });
  }

  // URL image load
  if (btnLoadUrl && urlInput) {
    btnLoadUrl.addEventListener('click', () => {
      const url = urlInput.value.trim();
      if (url) {
        setImageSource(url, 'URL Web');
      }
    });
  }

  // SKU Uppercase auto formatting
  if (skuInput) {
    skuInput.addEventListener('input', () => {
      skuInput.value = skuInput.value.toUpperCase();
      validateInputForm();
    });
  }

  // Remove preview image
  if (btnRemoveImg) {
    btnRemoveImg.addEventListener('click', () => {
      currentImageSource = null;
      const previewBox = document.getElementById('wfPreviewBox');
      if (previewBox) previewBox.style.display = 'none';
      if (dropzone) dropzone.style.display = 'flex';
      validateInputForm();
    });
  }

  // Start Pipeline Button
  if (btnStart) {
    btnStart.addEventListener('click', () => {
      if (onStart) onStart();
    });
  }
}

/**
 * Xử lý khi người dùng chọn file ảnh từ máy
 */
export function handleFileSelect(file) {
  if (!file.type.startsWith('image/')) {
    alert('Vui lòng chỉ chọn file hình ảnh (JPG, PNG, WEBP)!');
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    setImageSource(e.target.result, `${file.name} (${Math.round(file.size / 1024)} KB)`);
  };
  reader.readAsDataURL(file);
}

/**
 * Cập nhật hình ảnh đầu vào và hiển thị preview HD
 */
export function setImageSource(src, infoText = '') {
  currentImageSource = src;
  const previewBox = document.getElementById('wfPreviewBox');
  const previewImg = document.getElementById('wfPreviewImg');
  const previewInfo = document.getElementById('wfPreviewInfo');
  const dropzone = document.getElementById('wfDropzone');

  if (previewImg) previewImg.src = src;
  if (previewInfo) previewInfo.textContent = infoText;
  if (previewBox) previewBox.style.display = 'flex';
  if (dropzone) dropzone.style.display = 'none';

  validateInputForm();
}

/**
 * Kiểm tra xem đã đủ ảnh và SKU chưa để kích hoạt nút Start
 */
export function validateInputForm() {
  const skuInput = document.getElementById('wfSkuInput');
  const btnStart = document.getElementById('wfBtnStartPipeline');
  if (!btnStart) return;

  const hasImage = Boolean(currentImageSource);
  const hasSku = Boolean(skuInput && skuInput.value.trim().length >= 2);

  if (hasImage && hasSku) {
    btnStart.disabled = false;
    btnStart.classList.add('wf-btn-glow');
  } else {
    btnStart.disabled = true;
    btnStart.classList.remove('wf-btn-glow');
  }
}

/**
 * Reset form nhập liệu về trạng thái ban đầu
 */
export function resetInputForm() {
  currentImageSource = null;
  const previewBox = document.getElementById('wfPreviewBox');
  const dropzone = document.getElementById('wfDropzone');
  const skuInput = document.getElementById('wfSkuInput');
  if (previewBox) previewBox.style.display = 'none';
  if (dropzone) dropzone.style.display = 'flex';
  if (skuInput) skuInput.value = '';
  validateInputForm();
}

/**
 * Lấy hình ảnh nguồn hiện tại
 */
export function getCurrentImageSource() {
  return currentImageSource;
}

/**
 * Lấy SKU hiện tại
 */
export function getCurrentSku() {
  const skuInput = document.getElementById('wfSkuInput');
  return (skuInput ? skuInput.value : 'SKU_AUTO').trim().toUpperCase();
}
