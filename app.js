(() => {
  'use strict';

  const { FFmpeg } = window.FFmpegWASM;
  const { fetchFile } = window.FFmpegUtil;

  // Элементы интерфейса
  const engineStatusBadge = document.getElementById('engine-status');
  const engineStatusText = document.getElementById('engine-status-text');
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

  // Поддерживаемые расширения
  const SUPPORTED_EXTENSIONS = ['.mpg', '.mpeg', '.mts', '.m2ts'];

  // Состояние приложения
  let ffmpeg = null;
  let isEngineLoaded = false;
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
    if (bytes === 0) return '0 Б';
    const k = 1024;
    const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Извлечение расширения файла в нижнем регистре (без точки)
   */
  function getFileExtension(fileName) {
    const match = fileName.toLowerCase().match(/\.(mpg|mpeg|mts|m2ts)$/);
    return match ? match[1] : '';
  }

  /**
   * Замена расширения .mpg / .mpeg / .mts / .m2ts на .mp4
   */
  function getOutputFileName(originalName) {
    return originalName.replace(/\.(mpg|mpeg|mts|m2ts)$/i, '') + '.mp4';
  }

  function setEngineStatus(state, text) {
    engineStatusBadge.className = `status-badge status-${state}`;
    engineStatusText.textContent = text;
  }

  async function initFFmpeg() {
    try {
      setEngineStatus('loading', 'Загрузка ядра FFmpeg (~31 МБ)...');
      logOutputEl.textContent = 'Инициализация FFmpeg.wasm...';

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

      isEngineLoaded = true;
      setEngineStatus('ready', 'Ядро готово к работе');
      appendLog('Ядро FFmpeg.wasm успешно загружено (поддержка MPG, MTS, M2TS).');
      updateControlsState();
    } catch (error) {
      console.error('Ошибка инициализации FFmpeg:', error);
      setEngineStatus('error', 'Ошибка загрузки ядра');
      appendLog(`КРИТИЧЕСКАЯ ОШИБКА: ${error.message || error}`);
    }
  }

  function addFilesToQueue(fileList) {
    let addedCount = 0;

    Array.from(fileList).forEach((file) => {
      const lowerName = file.name.toLowerCase();
      const isSupported = SUPPORTED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));

      if (!isSupported) {
        appendLog(`Пропущен неподдерживаемый файл: ${file.name}`);
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
        status: 'pending',
        blobUrl: null
      };

      fileQueue.push(item);
      renderFileItem(item);
      addedCount++;
    });

    if (addedCount > 0) {
      appendLog(`Добавлено файлов в очередь: ${addedCount}`);
      updateControlsState();
    }
  }

  function renderFileItem(item) {
    const li = document.createElement('li');
    li.className = 'file-item';
    li.id = `file-item-${item.id}`;

    const modeHint = item.isMpg ? 'MPG (перекодирование в H.264)' : 'MTS/M2TS (быстрая перепаковка)';

    li.innerHTML = `
      <div class="file-item-header">
        <div class="file-info">
          <span class="file-name">${escapeHtml(item.originalName)} → ${escapeHtml(item.outputName)}</span>
          <span class="file-meta" id="meta-${item.id}">${formatBytes(item.size)} • ${modeHint} • Ожидает</span>
        </div>
        <div class="file-actions" id="actions-${item.id}">
          <button type="button" class="btn btn-secondary btn-convert-single" data-id="${item.id}">
            Конвертировать
          </button>
        </div>
      </div>
      <div class="progress-track">
        <div class="progress-fill" id="progress-${item.id}" style="width: 0%"></div>
      </div>
    `;

    const singleBtn = li.querySelector('.btn-convert-single');
    singleBtn.addEventListener('click', () => {
      if (!isProcessingQueue && isEngineLoaded) {
        processSingleFile(item);
      }
    });

    fileListEl.appendChild(li);
  }

  function updateItemProgress(id, percent, modifierClass = '') {
    const progressEl = document.getElementById(`progress-${id}`);
    if (!progressEl) return;
    progressEl.style.width = `${percent}%`;
    progressEl.className = `progress-fill ${modifierClass}`.trim();
  }

  function updateItemMeta(item, statusText) {
    const metaEl = document.getElementById(`meta-${item.id}`);
    if (!metaEl) return;
    metaEl.textContent = `${formatBytes(item.size)} • ${statusText}`;
  }

  /**
   * Конвертация файла (автоматический выбор между ремуксингом MTS и транскодированием MPG)
   */
  async function convertFileItem(item) {
    if (!isEngineLoaded || item.status === 'done') return;

    item.status = 'processing';
    activeItemId = item.id;
    updateItemMeta(item, 'Чтение файла в память...');
    updateItemProgress(item.id, 5);

    const actionsContainer = document.getElementById(`actions-${item.id}`);
    if (actionsContainer) {
      actionsContainer.innerHTML = `<button type="button" class="btn btn-secondary" disabled>Обработка...</button>`;
    }

    const inputVirtName = `input_${item.id}.${item.ext}`;
    const outputVirtName = `output_${item.id}.mp4`;

    const startTime = performance.now();

    try {
      appendLog(`--- Начало обработки: ${item.originalName} ---`);

      // 1. Записываем исходный файл в виртуальную ФС MEMFS
      const fileData = await fetchFile(item.file);
      await ffmpeg.writeFile(inputVirtName, fileData);

      // 2. Формируем аргументы FFmpeg в зависимости от типа файла и выбранного режима
      const mode = audioModeSelect.value; // 'smart' или 'copy'
      let ffmpegArgs = ['-i', inputVirtName];

      if (mode === 'copy') {
        // Принудительное прямое копирование потоков без перекодирования
        ffmpegArgs.push('-c:v', 'copy', '-c:a', 'copy');
        updateItemMeta(item, 'Прямая перепаковка потоков в MP4...');
      } else if (item.isMpg) {
        // Для .MPG / .MPEG (MPEG-2): деинтерлейсинг (yadif) + быстрое кодирование в H.264 + звук AAC
        ffmpegArgs.push(
          '-vf', 'yadif',
          '-c:v', 'libx264',
          '-preset', 'ultrafast',
          '-crf', '20',
          '-pix_fmt', 'yuv420p',
          '-c:a', 'aac',
          '-b:a', '192k'
        );
        updateItemMeta(item, 'Конвертация MPG (MPEG-2 → H.264)...');
      } else {
        // Для .MTS / .M2TS (AVCHD): видео H.264 копируем без потерь, аудио AC-3 переводим в AAC
        ffmpegArgs.push('-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k');
        updateItemMeta(item, 'Перепаковка MTS в MP4...');
      }

      // Переносим заголовок moov в начало файла для мгновенного открытия в плеерах
      ffmpegArgs.push('-movflags', '+faststart', outputVirtName);

      appendLog(`Выполнение команды: ffmpeg ${ffmpegArgs.join(' ')}`);

      // 3. Запуск FFmpeg
      const exitCode = await ffmpeg.exec(ffmpegArgs);
      if (exitCode !== 0) {
        throw new Error(`FFmpeg завершился с кодом ошибки ${exitCode}`);
      }

      // 4. Чтение результата из памяти
      updateItemMeta(item, 'Формирование файла...');
      const outputData = await ffmpeg.readFile(outputVirtName);

      // 5. Создание Blob и ссылки для скачивания
      const mp4Blob = new Blob([outputData.buffer], { type: 'video/mp4' });
      item.blobUrl = URL.createObjectURL(mp4Blob);
      item.status = 'done';

      const durationSec = ((performance.now() - startTime) / 1000).toFixed(1);
      updateItemProgress(item.id, 100, 'done');
      updateItemMeta(item, `Готово за ${durationSec} сек • Итоговый размер: ${formatBytes(mp4Blob.size)}`);
      appendLog(`Успешно завершено: ${item.outputName} (${durationSec} сек)`);

      if (actionsContainer) {
        actionsContainer.innerHTML = `
          <a href="${item.blobUrl}" download="${escapeHtml(item.outputName)}" class="btn btn-success" id="download-btn-${item.id}">
            Скачать .MP4
          </a>
        `;
      }

      if (autoDownloadCheckbox.checked) {
        triggerDownload(item.blobUrl, item.outputName);
      }
    } catch (error) {
      console.error(`Ошибка при конвертации ${item.originalName}:`, error);
      item.status = 'error';
      updateItemProgress(item.id, 100, 'error');
      updateItemMeta(item, `Ошибка: ${error.message || 'сбой конвертации'}`);
      appendLog(`ОШИБКА (${item.originalName}): ${error.message || error}`);

      if (actionsContainer) {
        actionsContainer.innerHTML = `
          <button type="button" class="btn btn-secondary btn-retry" data-id="${item.id}">Повторить</button>
        `;
        actionsContainer.querySelector('.btn-retry').addEventListener('click', () => {
          if (!isProcessingQueue && isEngineLoaded) {
            processSingleFile(item);
          }
        });
      }
    } finally {
      // Очистка виртуальной памяти MEMFS
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
    if (isProcessingQueue || !isEngineLoaded) return;

    isProcessingQueue = true;
    updateControlsState();

    for (const item of fileQueue) {
      if (item.status === 'pending' || item.status === 'error') {
        await convertFileItem(item);
      }
    }

    isProcessingQueue = false;
    updateControlsState();
    appendLog('Обработка всей очереди завершена.');
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
    appendLog('Очередь файлов очищена, память освобождена.');
  }

  function updateControlsState() {
    queueCountEl.textContent = fileQueue.length;

    if (fileQueue.length > 0) {
      controlsBar.classList.remove('hidden');
    } else {
      controlsBar.classList.add('hidden');
    }

    const hasPending = fileQueue.some((item) => item.status === 'pending' || item.status === 'error');
    convertAllBtn.disabled = !isEngineLoaded || isProcessingQueue || !hasPending;
    clearQueueBtn.disabled = isProcessingQueue;

    document.querySelectorAll('.btn-convert-single, .btn-retry').forEach((btn) => {
      btn.disabled = !isEngineLoaded || isProcessingQueue;
    });
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, (char) => {
      const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
      return map[char];
    });
  }

  // Обработчики событий
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

  initFFmpeg();

  // Регистрация Service Worker для офлайн-режима PWA
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('./sw.js')
        .then((registration) => {
          appendLog(`PWA: Service Worker активен (область: ${registration.scope}). Приложение готово к работе офлайн.`);
        })
        .catch((error) => {
          appendLog(`PWA: Ошибка регистрации Service Worker: ${error.message}`);
        });
    });
  }
})();