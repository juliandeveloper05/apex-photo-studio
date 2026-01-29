# ✨ APEX Photo Studio v1.1.0

<div align="center">

![APEX Photo Studio](https://img.shields.io/badge/APEX-Photo%20Studio%20v1.1.0-0ea5e9?style=for-the-badge&logo=aperture&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind-4.1-38B2AC?style=flat-square&logo=tailwindcss)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=flat-square&logo=vite)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

**Professional photo capture and editing application with a premium Lightroom-inspired interface**

[Live Demo](#) · [Features](#-features) · [Getting Started](#-getting-started) · [Roadmap](#-roadmap)

</div>

---

## 🎯 Features

### 📷 Camera Capture
- **Live Preview** with real-time video feed
- **Resolution Selection** (4K, 2K, 1080p, 720p, Max Quality)
- **Timer Mode** (2s, 5s, 10s countdown)
- **Multi-camera Support** with easy switching
- **Animated Countdown Overlay**

### 🎨 Professional Editor
- **Real-time Image Processing** with instant preview
- **Before/After Comparison** with draggable split view
- **Zoom & Pan** with mouse wheel and drag support
- **Grid Overlays** (Rule of Thirds, Golden Ratio, Diagonals, Center)
- **Zebra Patterns** for exposure clipping detection

### 🎚️ Adjustment Controls

| Basic | Color | Detail | HSL |
|-------|-------|--------|-----|
| Exposure | Temperature | Clarity | Per-color Hue |
| Contrast | Tint | Sharpness | Per-color Saturation |
| Highlights | Vibrance | Noise Reduction | Per-color Luminance |
| Shadows | Saturation | | 8 Color Channels |
| Whites | | | Skin Tone Protection |
| Blacks | | | |

### 📈 Tone Curve Editor
- Interactive SVG-based curve widget
- RGB master + individual R/G/B channel curves
- Click to add, drag to move, double-click to remove points
- Cubic spline interpolation for smooth curves
- Histogram underlay visualization

### ✨ Creative Effects
| Effect | Controls |
|--------|----------|
| **Vignette** | Amount, Midpoint, Roundness, Feather |
| **Film Grain** | Amount, Size, Roughness, Monochrome |
| **Dehaze** | Positive (remove haze) / Negative (add atmosphere) |
| **Split Toning** | Highlight/Shadow Hue & Saturation, Balance |

### 🔧 Lens Correction
- **Distortion** - Barrel/Pincushion correction
- **Chromatic Aberration** - Red/Cyan and Blue/Yellow fringe removal

### 💾 Export
- **Formats:** JPEG, PNG, WebP
- **Quality slider** with file size estimation
- **Resolution presets:** Original, 4K, 2K, 1080p, 720p, Instagram formats
- **One-click download** with auto-generated filename

### 📊 Real-time Histogram
- RGB channel visualization
- Clipping detection with animated indicators
- Live updates during adjustments
- **3D Visualization** support (Experimental)

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/juliandeveloper05/apex-photo-studio.git

# Navigate to the project
cd apex-photo-studio

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
npm run preview
```

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `C` | Switch to Camera mode |
| `E` | Switch to Editor mode |
| `G` | Cycle through grid overlays |
| `Z` | Toggle zebra patterns |
| `H` | Toggle histogram |
| `\` | Toggle before/after comparison |
| `+` / `-` | Zoom in/out |
| `0` | Reset zoom to 100% |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |

---

## 🗺️ Roadmap

### Phase 1 - Core Foundation ✅ `v1.0.0`
- [x] Camera capture with live preview
- [x] Basic image adjustments (Exposure, Contrast, Highlights, Shadows)
- [x] Color adjustments (Temperature, Tint, Vibrance, Saturation)
- [x] Detail adjustments (Clarity, Sharpness, Noise Reduction)
- [x] Real-time RGB histogram
- [x] Grid overlays and zebra patterns
- [x] Before/After comparison mode
- [x] Glassmorphism premium UI

### Phase 2 - Advanced Editing ✅ `v1.1.0`
- [x] HSL/Color panel (Hue, Saturation, Luminance per 8 color channels)
- [x] Tone Curve editor with cubic spline interpolation
- [x] Vignette effect with highlight protection
- [x] Film Grain with monochrome option
- [x] Dehaze effect
- [x] Split Toning (shadows/highlights)
- [x] Lens correction (Distortion, Chromatic Aberration)
- [x] Export with quality settings (JPEG, PNG, WebP)
- [x] Transforms engine (crop, rotate, flip)

### Phase 3 - Presets & Profiles 📅 `v1.2.0`
- [ ] Built-in preset library (Cinematic, Portrait, Landscape, B&W)
- [ ] Custom preset creation and saving
- [ ] Import/Export presets (.apex format)
- [ ] One-click preset application
- [ ] Preset preview on hover

### Phase 4 - Layers & Masks 📅 `v1.3.0`
- [ ] Non-destructive layer system
- [ ] Adjustment layers
- [ ] Gradient masks
- [ ] Radial masks
- [ ] Brush masks with feathering
- [ ] Luminosity masks

### Phase 5 - AI-Powered Features 📅 `v2.0.0`
- [ ] AI Auto-enhance (one-click optimization)
- [ ] AI Sky replacement
- [ ] AI Portrait retouching (skin smoothing, eye enhancement)
- [ ] AI Background removal
- [ ] AI Noise reduction (deep learning)
- [ ] AI Upscaling (super resolution)

### Phase 6 - Collaboration & Cloud 📅 `v2.1.0`
- [ ] Cloud storage integration (Google Drive, Dropbox)
- [ ] Project sharing and collaboration
- [ ] Version history and snapshots
- [ ] Multi-device sync
- [ ] Real-time collaborative editing

### Phase 7 - Pro Features 📅 `v3.0.0`
- [ ] RAW file support (CR2, NEF, ARW, DNG)
- [ ] Batch processing
- [ ] Watermark and branding tools
- [ ] Print layout designer
- [ ] Video frame extraction
- [ ] Plugin/Extension system
- [ ] Mobile companion app (PWA)

---

## 🛠️ Tech Stack

- **Framework:** React 19 with TypeScript
- **Build Tool:** Vite 7
- **Styling:** Tailwind CSS 4
- **State Management:** Zustand
- **Icons:** Lucide React
- **Image Processing:** Custom Canvas-based engine
- **3D Visualizations:** React Three Fiber / Three.js

---

## 📁 Project Structure

```
apex-photo-studio/
├── src/
│   ├── components/       # React components
│   │   ├── Camera.tsx          # Camera capture
│   │   ├── Editor.tsx          # Image editor
│   │   ├── Toolbar.tsx         # Top toolbar with export
│   │   ├── AdjustmentsPanel.tsx    # Sliders panel
│   │   ├── HSLPanel.tsx        # HSL per-color adjustments
│   │   ├── ToneCurveEditor.tsx # Interactive curve widget
│   │   ├── EffectsPanel.tsx    # Vignette, Grain, Split Toning
│   │   ├── LensCorrectionPanel.tsx # Distortion & CA
│   │   ├── ExportModal.tsx     # Export dialog
│   │   ├── Histogram.tsx       # RGB histogram
│   │   ├── GridOverlay.tsx     # Composition guides
│   │   └── ZebraOverlay.tsx    # Clipping patterns
│   ├── engine/           # Image processing
│   │   ├── imageProcessing.ts  # Main pipeline
│   │   ├── adjustments.ts      # All adjustment algorithms
│   │   └── transforms.ts       # Crop, rotate, flip
│   ├── hooks/            # Custom React hooks
│   ├── types/            # TypeScript definitions
│   └── utils/            # Utility functions
├── public/
└── package.json
```

---

## ✨ Design Features

- **Glassmorphism UI** with blur effects and transparency
- **Premium Animations** for smooth interactions
- **Custom Sliders** with glow effects and bidirectional support
- **Responsive Layout** for desktop and tablet
- **Dark Theme** optimized for photo editing

---

## 👨‍💻 Author

<div align="center">

### **Julian Soto**
#### Senior Software Engineer

*Specialized in TypeScript, Modern Web Architecture & Legacy Systems Modernization*

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/full-stack-julian-soto/)
[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/juliandeveloper05)
[![Portfolio](https://img.shields.io/badge/Portfolio-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://juliansoto-portfolio.vercel.app/es)
[![Instagram](https://img.shields.io/badge/Instagram-E4405F?style=for-the-badge&logo=instagram&logoColor=white)](https://www.instagram.com/palee_0x71)

📧 **Email:** juliansoto.dev@gmail.com  
📱 **Phone:** +54 9 11 3066-6369

</div>

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2026 Julian Javier Soto

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

<div align="center">

**APEX Photo Studio v1.1.0**

Made with ❤️ by Julian Javier Soto

</div>
