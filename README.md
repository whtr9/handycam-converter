# 🎥 Sony Handycam Video Converter (MPG / MTS / M2TS → MP4)

[![Live Demo](https://img.shields.io/badge/🚀_Launch_Web_App-GitHub_Pages-3b82f6?style=for-the-badge)](https://whtr9.github.io/handycam-converter/)
![PWA Ready](https://img.shields.io/badge/PWA-Offline_Ready-10b981?style=for-the-badge)
![FFmpeg.wasm](https://img.shields.io/badge/Engine-FFmpeg.wasm_v0.12-f59e0b?style=for-the-badge)
![License](https://img.shields.io/badge/Privacy-100%25_Client--Side-8b5cf6?style=for-the-badge)

> **🌐 Live Application / Открыть конвертер:** **[https://whtr9.github.io/handycam-converter/](https://whtr9.github.io/handycam-converter/)**

---

## 🇬🇧 English Description

A lightweight, **100% offline-capable Progressive Web App (PWA)** designed to convert legacy camcorder video files (`.MPG`, `.MPEG`, `.MTS`, `.M2TS`) from **Sony Handycam** cameras (such as HDR-CX405, DCR-SR, HDR-PJ series, and other AVCHD / MPEG-2 camcorders) into universally compatible **`.MP4`** files right on your smartphone or laptop.

### ✨ Key Features
* **🔒 100% Private & Local:** Powered by **WebAssembly (`FFmpeg.wasm`)**. Your videos are processed directly inside your device's RAM (`MEMFS`) and are **never uploaded** to any server.
* **✈️ Full Offline Mode (PWA):** Install the app on Android, iOS, macOS, or Windows. Once loaded, the ~31 MB FFmpeg core is cached by the Service Worker, allowing you to convert footage from your SD card on the go without an internet connection.
* **⚡ Smart Stream Processing:**
  * **For `.MTS` / `.M2TS` (AVCHD):** Performs ultra-fast **lossless video remuxing** (`-c:v copy`) while converting `AC-3` audio to universally supported `AAC`.
  * **For `.MPG` / `.MPEG` (MPEG-2 STD/HQ):** Automatically applies deinterlacing (`-vf yadif` to remove comb artifacts) and transcodes video into `H.264 (yuv420p)` + `AAC` audio for full compatibility with iOS, Android, browsers, and messengers.
* **📦 Batch Queue & Memory Cleanup:** Queue multiple clips at once. Files are processed sequentially with automatic virtual memory cleanup after each file to prevent browser crashes.
* **🌍 Bilingual UI:** Instant switch between **English** and **Russian** (`EN | RU`).

### 📊 Technical Specifications & Limits
| Parameter | Specification |
| :--- | :--- |
| **Supported Inputs** | `.mpg`, `.mpeg`, `.mts`, `.m2ts` |
| **Output Format** | `.mp4` (`H.264` + `AAC`, `-movflags +faststart`) |
| **Max Single File Size** | **~500 MB** on Mobile / **~1 GB** on Desktop *(32-bit WebAssembly memory limit)* |
| **Queue Size** | Unlimited *(sequential processing)* |

---

## 🇷🇺 Описание на русском языке

Легковесное автономное веб-приложение (**PWA**) для быстрой конвертации видеофайлов (`.MPG`, `.MPEG`, `.MTS`, `.M2TS`) с видеокамер **Sony Handycam** (например, HDR-CX405, серий DCR-SR, HDR-PJ и других камер стандартов AVCHD и MPEG-2) в современный универсальный формат **`.MP4`** прямо в браузере телефона или компьютера.

### ✨ Основные возможности
* **🔒 Полная приватность и локальная обработка:** Работает на базе технологии **WebAssembly (`FFmpeg.wasm`)**. Все видеофайлы обрабатываются строго в оперативной памяти твоего устройства и **никуда не загружаются**.
* **✈️ Работа без интернета (Офлайн PWA):** Приложение можно установить на домашний экран Android, iOS, macOS или Windows. Service Worker сохраняет 31 МБ ядра FFmpeg в память устройства при первом запуске — конвертируй видео с SD-карты прямо в дороге в авиарежиме.
* **⚡ Умная обработка потоков:**
  * **Для `.MTS` / `.M2TS` (AVCHD):** Мгновенный **ремуксинг видео без потери качества** (`-c:v copy`) с переводом аудиодорожки `AC-3` в совместимый формат `AAC`.
  * **Для `.MPG` / `.MPEG` (MPEG-2 STD/HQ):** Автоматическое устранение чересстрочной «гребенки» (`-vf yadif`) и перекодирование в `H.264 (yuv420p)` + `AAC`, чтобы видео открывалось на любых телефонах, в галереях и мессенджерах.
* **📦 Пакетная очередь и защита памяти:** Загружай сразу серию роликов. Скрипт обрабатывает их поочередно и принудительно очищает виртуальную память после каждого файла.
* **🌍 Двуязычный интерфейс:** Мгновенное переключение между **русским** и **английским** языками (`RU | EN`).

### 🚀 Как установить приложение на устройство
1. Открой **[whtr9.github.io/handycam-converter](https://whtr9.github.io/handycam-converter/)** в браузере (Chrome, Safari, Edge, Brave).
2. Дождись зеленого индикатора **«Ядро готово к работе»**.
3. Нажми **«Установить приложение»** в меню браузера (или *«Поделиться → На экран Домой»* в Safari на iOS).

---

### 🛠️ Local Development / Локальный запуск
If you want to run the project locally / Для запуска на локальном компьютере:

```bash
git clone [https://github.com/whtr9/handycam-converter.git](https://github.com/whtr9/handycam-converter.git)
cd handycam-converter
python3 -m http.server 8000
