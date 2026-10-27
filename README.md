# 🎥 Sony Handycam Video Converter (MPG / MTS / M2TS → MP4)
> ** Live Application:** **[https://whtr9.github.io/handycam-converter/](https://whtr9.github.io/handycam-converter/)**

---

A lightweight, **100% offline-capable Progressive Web App (PWA)** designed to convert legacy camcorder video files (`.MPG`, `.MPEG`, `.MTS`, `.M2TS`) from **Sony Handycam** cameras (and other AVCHD / MPEG-2 camcorders) into **`.MP4`** files right on your smartphone or laptop.

### Key Features
* **100% Private & Local:** Powered by **WebAssembly (`FFmpeg.wasm`)**. Your videos are processed directly inside your device's RAM (`MEMFS`) and are **never uploaded** to any server.
* **Full Offline Mode (PWA):** Install the app on Android, iOS, macOS, or Windows. Once loaded, the ~31 MB FFmpeg core is cached by the Service Worker, allowing you to convert footage from your SD card on the go without an internet connection.
* **Smart Stream Processing:**
  * **For `.MTS` / `.M2TS` (AVCHD):** Performs ultra-fast **lossless video remuxing** (`-c:v copy`) while converting `AC-3` audio to universally supported `AAC`.
  * **For `.MPG` / `.MPEG` (MPEG-2 STD/HQ):** Automatically applies deinterlacing (`-vf yadif` to remove comb artifacts) and transcodes video into `H.264 (yuv420p)` + `AAC` audio for full compatibility with iOS, Android, browsers, and messengers.
* **Batch Queue & Memory Cleanup:** Queue multiple clips at once. Files are processed sequentially with automatic virtual memory cleanup after each file to prevent browser crashes.


###  Technical Specifications & Limits
| Parameter | Specification |
| :--- | :--- |
| **Supported Inputs** | `.mpg`, `.mpeg`, `.mts`, `.m2ts` |
| **Output Format** | `.mp4` (`H.264` + `AAC`, `-movflags +faststart`) |
| **Max Single File Size** | **~500 MB** on Mobile / **~1 GB** on Desktop |
| **Queue Size** | Unlimited |

---
### How to install the app on your device:
1. Open whtr9.github.io/handycam-converter in your browser.
2. Wait for the green **"Engine ready"** indicator..
3. Tap **"Install app"** in the browser menu (or "Share → Add to Home Screen" in iOS Safari)..
---

### 🛠️ Local Development / Локальный запуск
If you want to run the project locally / Для запуска на локальном компьютере:

```bash
git clone [https://github.com/whtr9/handycam-converter.git](https://github.com/whtr9/handycam-converter.git)
cd handycam-converter
python3 -m http.server 8000
