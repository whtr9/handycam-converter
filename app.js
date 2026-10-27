(() => {
  'use strict';

  const { FFmpeg } = window.FFmpegWASM;
  const { fetchFile } = window.FFmpegUtil;

  // Словари локализации (RU / EN)
  const I18N = {
    ru: {
      subtitle: 'Локальный конвертер для Sony Handycam',
      statusLoading: 'Загрузка ядра FFmpeg (~31 МБ)...',
      statusReady: 'Ядро готово к работе',
      statusError: 'Ошибка загрузки ядра',
      modeLabel: 'Режим обработки потоков:',
      modeSmart: 'Авто (Рекомендуется): MTS без потерь + MPG в H.264/AAC (полная совместимость)',
      modeCopy: 'Только перепаковка (Видео и Аудио без перекодирования — только для ПК-плееров)',
      autoDownload: 'Автоматически скачивать готовые .mp4 файлы',
      dropTitle: 'Перетащи файлы <strong>.MPG</strong>, <strong>.MTS</strong> или <strong>.M2TS</strong> сюда',
      dropSubtitle: 'или нажми для выбора с SD-карты / устройства',
      sizeLimitNote: 'Макс. размер 1 файла: до 500 МБ (смартфон) / до 1 ГБ (ПК) • Очередь без лимита',
      queueLabel: 'Файлов в очереди:',
      clearBtn: 'Очистить список',
      convertAllBtn: 'Конвертировать все',
      logSummary: 'Технический лог FFmpeg',
      footerNote: 'Все файлы обрабатываются строго в оперативной памяти твоего устройства и никуда не отправляются.',
      units: ['Б', 'КБ', 'МБ', 'ГБ'],
      hintMpg: 'MPG (перекодирование в H.264)',
      hintMts: 'MTS/M2TS (быстрая перепаковка)',
      statePending: 'Ожидает',
      stateReading: 'Чтение файла в память...',
      stateCopy: 'Прямая перепаковка потоков в MP4...',
      stateTranscodeMpg: 'Конвертация MPG (MPEG-2 → H.264)...',
      stateRemuxMts: 'Перепаковка MTS в MP4...',
      stateFinalizing: 'Формирование файла...',
      stateDone: (sec, size) => `Готово за ${sec} сек • Итоговый размер: ${size}`,
      stateError: (msg) => `Ошибка: ${msg}`,
      sizeWarn: 'Внимание: файл > 800 МБ (возможна нехватка памяти браузера)',
      btnConvert: 'Конвертировать',
      btnProcessing: 'Обработка...',
      btnDownload: 'Скачать .MP4',
      btnRetry: 'Повторить',
      logInit: 'Инициализация FFmpeg.wasm...',
      logReady: 'Ядро FFmpeg.wasm успешно загружено (поддержка MPG, MTS, M2TS).',
      logSkipped: (name) => `Пропущен неподдерживаемый файл: ${name} (поддерживаются только .mpg, .mpeg, .mts, .m2ts)`,
      logAdded: (count) => `Добавлено файлов в очередь: ${count}`,
      logStart: (name) => `--- Начало обработки: ${name} ---`,
      logDone: (name, sec) => `Успешно завершено: ${name} (${sec} сек)`,
      logQueueDone: 'Обработка всей очереди завершена.',
      logCleared: 'Очередь файлов очищена, память освобождена.',
      logSwReady: (scope) => `PWA: Service Worker активен (${scope}). Приложение готово к работе офлайн.`
    },
    en: {
      subtitle: 'Local offline converter for Sony Handycam',
      statusLoading: 'Loading FFmpeg core (~31 MB)...',
      statusReady: 'Engine ready (Offline OK)',
      statusError: 'Engine load error',
      modeLabel: 'Stream processing mode:',
      modeSmart: 'Auto (Recommended): Lossless MTS remux + MPG to H.264/AAC (universal compatibility)',
      modeCopy: 'Stream copy only (No video/audio re-encoding — for desktop players only)',
      autoDownload: 'Automatically download converted .mp4 files',
      dropTitle: 'Drag & drop <strong>.MPG</strong>, <strong>.MTS</strong> or <strong>.M2TS</strong> files here',
      dropSubtitle: 'or tap to browse from SD card / device',
      sizeLimitNote: 'Max single file size: ~500 MB (Mobile) / ~1 GB (Desktop) • Unlimited queue',
      queueLabel: 'Files in queue:',
      clearBtn: 'Clear list',
      convertAllBtn: 'Convert all',
      logSummary: 'FFmpeg Technical Log',
      footerNote: 'All files are processed locally in your device RAM and are never uploaded anywhere.',
      units: ['B', 'KB', 'MB', 'GB'],
      hintMpg: 'MPG (transcode to H.264)',
      hintMts: 'MTS/M2TS (fast remux)',
      statePending: 'Pending',
      stateReading: 'Reading file into memory...',
      stateCopy: 'Direct stream copy to MP4...',
      stateTranscodeMpg: 'Converting MPG (MPEG-2 → H.264)...',
      stateRemuxMts: 'Remuxing MTS to MP4...',
      stateFinalizing: 'Building output file...',
      stateDone: (sec, size) => `Done in ${sec}s • Output size: ${size}`,
      stateError: (msg) => `Error: ${msg}`,
      sizeWarn: 'Warning: file > 800 MB (may exceed browser WebAssembly memory)',
      btnConvert: 'Convert',
      btnProcessing: 'Processing...',
      btnDownload: 'Download .MP4',
      btnRetry: 'Retry',
      logInit: 'Initializing FFmpeg.wasm...',
      logReady: 'FFmpeg.wasm core loaded (MPG, MTS, M2TS supported).',
      logSkipped: (name) => `Skipped unsupported file: ${name} (only .mpg, .mpeg, .mts, .m2ts allowed)`,
      logAdded: (count) => `Added files to queue: ${count}`,
      logStart: (name) => `--- Starting conversion: ${name} ---`,
      logDone: (name, sec) => `Completed: ${name} (${sec}s)`,
      logQueueDone: 'All queued files processed.',
      logCleared: 'Queue cleared, memory freed.',
      logSwReady: (scope) => `PWA: Service Worker active (${scope}). Ready for offline use.`
    }
  };

  // Определение стартового языка (из localStorage или языка браузера)
  const savedLang = localStorage.getItem('handycam_lang');
  const browserLang = (navigator.language || 'en').toLowerCase().startsWith('ru') ? 'ru' : 'en';
  let currentLang = savedLang === 'en' || savedLang === 'ru' ? savedLang : browserLang;

  function t(key, ...args) {
    const val = I18N[currentLang][key];
    return typeof val === 'function' ? val(...args) : val;
  }

  // Элементы интерфейса
  const engineStatusBadge = document.getElementById('engine-status');
  const engineStatusText = document.getElementById('engine-status-text');
  const langRuBtn = document.getElementById('lang-ru');
  const langEnBtn = document.getElementById('lang-en');
  const audioModeSelect = document.getElementById('audio-mode');
  const autoDownloadCheckbox = document.getElementById('auto-download');
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const controlsBar = document.getElementById('controls-bar');
  const queueCountEl = document.getElementById('queue-count');
  const clearQueueBtn = document.getElementById('clear-queue-btn');
  const convertAllBtn = document.getElementById('convert-all-btn');
  const fileListEl = document.getElementById('file-list');
  const logOutputEl = document.getElementById('ffmpeg-log');

  const SUPPORTED_EXTENSIONS = ['.mpg', '.mpeg', '.mts', '.m2ts'];
  const WARN_FILE_SIZE_BYTES = 800 * 1024 * 1024; // 800 МБ

  // Состояние приложения
  let ffmpeg = null;
  let engineState = 'loading'; // 'loading' | 'ready' | 'error'
  let isProcessingQueue = false;
  let activeItemId = null;
  let fileQueue = [];
  let itemIdCounter = 0;

  function appendLog(message) {
    const timestamp = new Date().toLocaleTimeString();
    logOutputEl.textContent += `\n[${timestamp}] ${message}`;
    logOutputEl.scrollTop = logOutputEl.scrollHeight;
  }

  function formatBytes(bytes) {
    const units = t('units');
    if (bytes === 0) return '0 ' + units[0];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + units[i];
  }

  function getFileExtension(fileName) {
    const match = fileName.toLowerCase().match(/\.(mpg|mpeg|mts|m2ts)$/);
    return match ? match[1] : '';
  }

  function getOutputFileName(originalName) {
    return originalName.replace(/\.(mpg|mpeg|mts|m2ts)$/i, '') + '.mp4';
  }

  function setEngineStatus(state) {
    engineState = state;
    engineStatusBadge.className = `status-badge status-${state}`;
    if (state === 'loading') engineStatusText.textContent = t('statusLoading');
    if (state === 'ready') engineStatusText.textContent = t('statusReady');
    if (state === 'error') engineStatusText.textContent = t('statusError');
  }

  /**
   * Применение выбранного языка ко всему интерфейсу и очереди файлов
   */
  function applyLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('handycam_lang', lang);
    document.documentElement.lang = lang;

    langRuBtn.classList.toggle('active', lang === 'ru');
    langEnBtn.classList.toggle('active', lang === 'en');

    // Переводим все статические элементы с атрибутом data-i18n
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (I18N[lang][key]) {
        el.innerHTML = I18N[lang][key];
      }
    });

    // Обновляем статус ядра
    setEngineStatus(engineState);

    // Обновляем карточки файлов в очереди
    fileQueue.forEach((item) => {
      refreshItemUI(item);
    });
  }

  async function initFFmpeg() {
    try {
      setEngineStatus('loading');
      logOutputEl.textContent = t('logInit');

      ffmpeg = new FFmpeg();

      ffmpeg.on('log', ({ message }) => {
        appendLog(message);
      });

      ffmpeg.on('progress', ({ progress }) => {
        if (activeItemId === null) return;
        if (typeof progress === 'number' && !isNaN(progress)) {
          const percent = Math.min(99, Math.max(5, Math.round(progress * 100)));
          updateItemProgress(activeItemId, percent);
        }
      });

      const coreURL = new URL('./vendor/ffmpeg-core.js', window.location.href).href;
      const wasmURL = new URL('./vendor/ffmpeg-core.wasm', window.location.href).href;

      await ffmpeg.load({ coreURL, wasmURL });

      setEngineStatus('ready');
      appendLog(t('logReady'));
      updateControlsState();
    } catch (error) {
      console.error('FFmpeg init error:', error);
      setEngineStatus('error');
      appendLog(`ERROR: ${error.message || error}`);
    }
  }

  function addFilesToQueue(fileList) {
    let addedCount = 0;

    Array.from(fileList).forEach((file) => {
      const lowerName = file.name.toLowerCase();
      const isSupported = SUPPORTED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));

      if (!isSupported) {
        appendLog(t('logSkipped', file.name));
        return;
      }

      const id = ++itemIdCounter;
      const ext = getFileExtension(file.name);
      const isMpg = ext === 'mpg' || ext === 'mpeg';

      const item = {
        id,
        file,
        ext,
        isMpg,
        originalName: file.name,
        outputName: getOutputFileName(file.name),
        size: file.size,
        status: 'pending', // 'pending' | 'processing' | 'done' | 'error'
        durationSec: null,
        outputSize: null,
        errorMsg: null,
        blobUrl: null
      };

      fileQueue.push(item);
      renderFileItem(item);
      addedCount++;
    });

    if (addedCount > 0) {
      appendLog(t('logAdded', addedCount));
      updateControlsState();
    }
  }

  function renderFileItem(item) {
    const li = document.createElement('li');
    li.className = 'file-item';
    li.id = `file-item-${item.id}`;

    li.innerHTML = `
      <div class="file-item-header">
        <div class="file-info">
          <span class="file-name">${escapeHtml(item.originalName)} → ${escapeHtml(item.outputName)}</span>
          <span class="file-meta" id="meta-${item.id}"></span>
        </div>
        <div class="file-actions" id="actions-${item.id}"></div>
      </div>
      <div class="progress-track">
        <div class="progress-fill" id="progress-${item.id}" style="width: 0%"></div>
      </div>
    `;

    fileListEl.appendChild(li);
    refreshItemUI(item);
  }

  /**
   * Отрисовка текста статуса и кнопок карточки на текущем языке
   */
  function refreshItemUI(item) {
    const metaEl = document.getElementById(`meta-${item.id}`);
    const actionsContainer = document.getElementById(`actions-${item.id}`);
    if (!metaEl || !actionsContainer) return;

    const modeHint = item.isMpg ? t('hintMpg') : t('hintMts');
    const sizeWarning = item.size > WARN_FILE_SIZE_BYTES ? ` • ⚠️ ${t('sizeWarn')}` : '';

    if (item.status === 'pending') {
      metaEl.textContent = `${formatBytes(item.size)} • ${modeHint} • ${t('statePending')}${sizeWarning}`;
      actionsContainer.innerHTML = `
        <button type="button" class="btn btn-secondary btn-convert-single" data-id="${item.id}">
          ${t('btnConvert')}
        </button>
      `;
      actionsContainer.querySelector('.btn-convert-single').addEventListener('click', () => {
        if (!isProcessingQueue && engineState === 'ready') {
          processSingleFile(item);
        }
      });
    } else if (item.status === 'processing') {
      actionsContainer.innerHTML = `<button type="button" class="btn btn-secondary" disabled>${t('btnProcessing')}</button>`;
    } else if (item.status === 'done') {
      metaEl.textContent = `${formatBytes(item.size)} • ${t('stateDone', item.durationSec, formatBytes(item.outputSize))}`;
      actionsContainer.innerHTML = `
        <a href="${item.blobUrl}" download="${escapeHtml(item.outputName)}" class="btn btn-success" id="download-btn-${item.id}">
          ${t('btnDownload')}
        </a>
      `;
    } else if (item.status === 'error') {
      metaEl.textContent = `${formatBytes(item.size)} • ${t('stateError', item.errorMsg || 'Failed')}`;
      actionsContainer.innerHTML = `
        <button type="button" class="btn btn-secondary btn-retry" data-id="${item.id}">${t('btnRetry')}</button>
      `;
      actionsContainer.querySelector('.btn-retry').addEventListener('click', () => {
        if (!isProcessingQueue && engineState === 'ready') {
          processSingleFile(item);
        }
      });
    }

    updateControlsState();
  }

  function updateItemProgress(id, percent, modifierClass = '') {
    const progressEl = document.getElementById(`progress-${id}`);
    if (!progressEl) return;
    progressEl.style.width = `${percent}%`;
    progressEl.className = `progress-fill ${modifierClass}`.trim();
  }

  function updateItemMetaText(item, statusText) {
    const metaEl = document.getElementById(`meta-${item.id}`);
    if (!metaEl) return;
    metaEl.textContent = `${formatBytes(item.size)} • ${statusText}`;
  }

  async function convertFileItem(item) {
    if (engineState !== 'ready' || item.status === 'done') return;

    item.status = 'processing';
    activeItemId = item.id;
    refreshItemUI(item);
    updateItemMetaText(item, t('stateReading'));
    updateItemProgress(item.id, 5);

    const inputVirtName = `input_${item.id}.${item.ext}`;
    const outputVirtName = `output_${item.id}.mp4`;

    const startTime = performance.now();

    try {
      appendLog(t('logStart', item.originalName));

      const fileData = await fetchFile(item.file);
      await ffmpeg.writeFile(inputVirtName, fileData);

      const mode = audioModeSelect.value;
      let ffmpegArgs = ['-i', inputVirtName];

      if (mode === 'copy') {
        ffmpegArgs.push('-c:v', 'copy', '-c:a', 'copy');
        updateItemMetaText(item, t('stateCopy'));
      } else if (item.isMpg) {
        ffmpegArgs.push(
          '-vf', 'yadif',
          '-c:v', 'libx264',
          '-preset', 'ultrafast',
          '-crf', '20',
          '-pix_fmt', 'yuv420p',
          '-c:a', 'aac',
          '-b:a', '192k'
        );
        updateItemMetaText(item, t('stateTranscodeMpg'));
      } else {
        ffmpegArgs.push('-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k');
        updateItemMetaText(item, t('stateRemuxMts'));
      }

      ffmpegArgs.push('-movflags', '+faststart', outputVirtName);
      appendLog(`Command: ffmpeg ${ffmpegArgs.join(' ')}`);

      const exitCode = await ffmpeg.exec(ffmpegArgs);
      if (exitCode !== 0) {
        throw new Error(`FFmpeg exit code ${exitCode}`);
      }

      updateItemMetaText(item, t('stateFinalizing'));
      const outputData = await ffmpeg.readFile(outputVirtName);

      const mp4Blob = new Blob([outputData.buffer], { type: 'video/mp4' });
      item.blobUrl = URL.createObjectURL(mp4Blob);
      item.outputSize = mp4Blob.size;
      item.durationSec = ((performance.now() - startTime) / 1000).toFixed(1);
      item.status = 'done';

      updateItemProgress(item.id, 100, 'done');
      refreshItemUI(item);
      appendLog(t('logDone', item.outputName, item.durationSec));

      if (autoDownloadCheckbox.checked) {
        triggerDownload(item.blobUrl, item.outputName);
      }
    } catch (error) {
      console.error(`Conversion error (${item.originalName}):`, error);
      item.status = 'error';
      item.errorMsg = error.message || 'conversion failed';
      updateItemProgress(item.id, 100, 'error');
      refreshItemUI(item);
      appendLog(`ERROR (${item.originalName}): ${item.errorMsg}`);
    } finally {
      activeItemId = null;
      try {
        await ffmpeg.deleteFile(inputVirtName);
      } catch (_) {}
      try {
        await ffmpeg.deleteFile(outputVirtName);
      } catch (_) {}
    }
  }

  async function processSingleFile(item) {
    isProcessingQueue = true;
    updateControlsState();
    await convertFileItem(item);
    isProcessingQueue = false;
    updateControlsState();
  }

  async function processAllQueue() {
    if (isProcessingQueue || engineState !== 'ready') return;

    isProcessingQueue = true;
    updateControlsState();

    for (const item of fileQueue) {
      if (item.status === 'pending' || item.status === 'error') {
        await convertFileItem(item);
      }
    }

    isProcessingQueue = false;
    updateControlsState();
    appendLog(t('logQueueDone'));
  }

  function triggerDownload(blobUrl, fileName) {
    const tempLink = document.createElement('a');
    tempLink.href = blobUrl;
    tempLink.download = fileName;
    document.body.appendChild(tempLink);
    tempLink.click();
    document.body.removeChild(tempLink);
  }

  function clearQueue() {
    if (isProcessingQueue) return;

    fileQueue.forEach((item) => {
      if (item.blobUrl) {
        URL.revokeObjectURL(item.blobUrl);
      }
    });

    fileQueue = [];
    fileListEl.innerHTML = '';
    fileInput.value = '';
    updateControlsState();
    appendLog(t('logCleared'));
  }

  function updateControlsState() {
    queueCountEl.textContent = fileQueue.length;

    if (fileQueue.length > 0) {
      controlsBar.classList.remove('hidden');
    } else {
      controlsBar.classList.add('hidden');
    }

    const isReady = engineState === 'ready';
    const hasPending = fileQueue.some((item) => item.status === 'pending' || item.status === 'error');
    convertAllBtn.disabled = !isReady || isProcessingQueue || !hasPending;
    clearQueueBtn.disabled = isProcessingQueue;

    document.querySelectorAll('.btn-convert-single, .btn-retry').forEach((btn) => {
      btn.disabled = !isReady || isProcessingQueue;
    });
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, (char) => {
      const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
      return map[char];
    });
  }

  // Переключатели языка
  langRuBtn.addEventListener('click', () => applyLanguage('ru'));
  langEnBtn.addEventListener('click', () => applyLanguage('en'));

  // Обработчики файлов
  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      addFilesToQueue(e.target.files);
      fileInput.value = '';
    }
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) {
      addFilesToQueue(e.dataTransfer.files);
    }
  });

  convertAllBtn.addEventListener('click', processAllQueue);
  clearQueueBtn.addEventListener('click', clearQueue);

  // Инициализация языка и ядра
  applyLanguage(currentLang);
  initFFmpeg();
  
  // Регистрация Service Worker с принудительной проверкой обновлений и авто-перезагрузкой
  if ('serviceWorker' in navigator) {
    let isRefreshing = false;

    // Если активировался новый Service Worker — автоматически перезагружаем страницу, чтобы показать свежую версию
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!isRefreshing && !isProcessingQueue) {
        isRefreshing = true;
        window.location.reload();
      }
    });

    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('./sw.js', { updateViaCache: 'none' })
        .then((registration) => {
          // Принудительно проверяем наличие обновлений sw.js на сервере при каждом запуске приложения
          registration.update();
          appendLog(t('logSwReady', registration.scope));
        })
        .catch((error) => {
          appendLog(`PWA Service Worker error: ${error.message}`);
        });
    });
  }
})();
