# FreeGameCompressor (CompactVault) 🎮⚡

> A modern, high-performance, open-source Game Storage Optimizer & Transparent Compression Desktop App for **Windows**, **Linux**, and **macOS**.

[![GitHub Release](https://img.shields.io/github/v/release/hteariH/FreeGameCompressor?color=blue&label=Latest%20Release)](https://github.com/hteariH/FreeGameCompressor/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![Platform: Windows | Linux | macOS](https://img.shields.io/badge/Platform-Windows%20%7C%20Linux%20%7C%20macOS-0078D6.svg)](https://github.com/hteariH/FreeGameCompressor/releases/latest)
[![Tech: Electron + React + Tailwind](https://img.shields.io/badge/Tech-Electron%20%7C%20React%2019%20%7C%20Tailwind-61DAFB.svg)](https://github.com/hteariH/FreeGameCompressor)

<p align="center">
  <img src="build/icon.png" width="160" height="160" alt="FreeGameCompressor Logo" />
</p>

---

## 📥 Download FreeGameCompressor

Get the latest pre-built binaries directly for your operating system:

| Operating System | Format | Download Link | Description |
| :--- | :--- | :--- | :--- |
| **Windows 10 / 11** | 🚀 **Setup Installer (.exe)** | [**Download Installer**](https://github.com/hteariH/FreeGameCompressor/releases/latest/download/FreeGameCompressor.Setup.1.1.3.exe) | Standard Windows NSIS Setup |
| **Windows 10 / 11** | 💼 **Portable (.exe)** | [**Download Portable**](https://github.com/hteariH/FreeGameCompressor/releases/latest/download/FreeGameCompressor.1.1.3.exe) | No installation needed (run anywhere) |
| **Linux (Any Distro)** | 🐧 **AppImage** | [**Download AppImage**](https://github.com/hteariH/FreeGameCompressor/releases/latest/download/FreeGameCompressor-1.1.3.AppImage) | Universal standalone Linux executable (`chmod +x`) |
| **Linux (Ubuntu / Debian)** | 📦 **Debian Package (.deb)** | [**Download .deb**](https://github.com/hteariH/FreeGameCompressor/releases/latest/download/free-game-compressor_1.1.3_amd64.deb) | Install via `sudo apt install ./file.deb` |
| **macOS (Apple Silicon & Intel)** | 🍏 **DMG & Zip** | [**Download macOS Releases**](https://github.com/hteariH/FreeGameCompressor/releases/latest) | Apple Silicon (M1/M2/M3/M4) & Intel DMG |

👉 **[View All Release Assets & Changelogs](https://github.com/hteariH/FreeGameCompressor/releases/latest)**

---

## 🌟 Highlights & Features

- 🔍 **Universal Game Discovery**:
  - **Steam**: Auto-detects all library folders across drives, parses `.acf` manifests, pulls live box art and install paths. (Supports Windows, Linux native, Steam Flatpak, and macOS Steam).
  - **Epic Games Store**: Auto-detects Epic Launcher manifests on Windows & Mac, plus Linux Heroic / Legendary installs.
  - **GOG Galaxy**: Auto-detects Windows Registry installs, Mac GOG Galaxy, and Linux Lutris / Heroic GOG libraries.
  - **macOS Applications & Whisky**: Auto-detects `/Applications` games, Mac App Store games, and Whisky / CrossOver GPTK bottles on Apple Silicon.
  - **EA App / Origin & Ubisoft Connect**: Auto-detects local game installations and registries.
  - **Xbox / Windows Store**: Auto-discovers XboxGames directories across drives.
  - **Lutris & Bottles (Linux)**: Scans Linux gaming runners and prefixes.
  - **Custom & Standalone Games**: Add any game folder or ROM directory via one-click picker or drag-and-drop.

- ⚡ **Transparent Compression (Zero Playability Impact)**:
  - Compressed games are **immediately playable** without pre-decompressing or waiting.
  - **Windows Engine**: Uses native Windows 10/11 Windows Overlay Filter (WOF) NTFS algorithms (`XPRESS4K`, `XPRESS8K`, `XPRESS16K`, and `LZX`).
  - **Linux Engine**: Uses native **Btrfs transparent filesystem compression** (`zstd`/`zlib`) with `compsize` analytics and overlayfs helpers.
  - **macOS Engine**: Uses native **Apple APFS transparent filesystem compression** (`LZFSE`, `LZVN`, `ZLIB` via `ditto`).
  - **20% to 60% Storage Reduction**: Saves tens of gigabytes per game.
  - **One-Click Revert / Decompress**: Restore uncompressed state anytime.

- 📊 **Real-Time Storage Dashboard & Analytics**:
  - Live storage space saved odometer.
  - Multi-drive visualizer (C:, D:, etc., or `/`, `/home`, `Macintosh HD`).
  - Real-time compression streaming (current file, throughput MB/s, ETA timer, percentage).
  - **Batch Compression Queue**: Queue multiple games to compress while you're away.
  - Grid View (high-res box art) & Table View (sortable by space saved, size, status, launcher).

---

## ⚙️ Compression Algorithms Guide

| Algorithm | Speed | Compression Ratio | CPU Impact | Recommended For |
| :--- | :--- | :--- | :--- | :--- |
| **LZX** | Moderate | **30% - 60%** (Highest) | Negligible | AAA Games (50GB - 150GB+) on modern multi-core CPUs |
| **XPRESS 16K** | Fast | **20% - 35%** (Balanced) | Very Low | General games & fast drives |
| **XPRESS 8K** | Very Fast | **15% - 25%** | Minimal | Fast daily compression |
| **XPRESS 4K** | Blazing Fast | **10% - 20%** | Zero | Older CPUs or instant passes |

---

## 🚀 Building from Source

### 1. Prerequisites
- **Node.js** (v18 or higher recommended, npm included)
- **Windows 10/11**, **Linux**, or **macOS**

### 2. Install Dependencies
```bash
npm install
```

### 3. Run in Development Mode
```bash
npm run dev
```

### 4. Build Production Packages

#### Build for Windows (.exe / installer):
```bash
npm run package:win
```

#### Build for Linux (.AppImage / .deb / tar.gz):
```bash
npm run package:linux
```

#### Build for macOS (.dmg / .zip for Apple Silicon & Intel):
```bash
npm run package:mac
```

---

## 🔒 Safety & Integrity
- Uses native OS kernel compression APIs (`compact.exe` WOF on Windows, `btrfs`/filesystem ioctls on Linux, `ditto` APFS compression on macOS).
- Files remain standard files in the filesystem with transparent on-the-fly decompression by the OS kernel.
- Option to skip pre-compressed multimedia formats (`.mp4`, `.bik`, `.zip`, `.rar`, `.7z`).
- Clean background task termination without file corruption.

---

## 📜 License
MIT License. Free and open source for the gaming community.
