# SourceTX Official Website

Modern, responsive portal and web flasher for **SourceTX** — the open-source RC transmitter firmware for ESP32-S3 and ExpressLRS / CRSF.

## Features

- **Cyberpunk Dark Aero Aesthetic**: Sleek glassmorphism, responsive grid, dynamic canvas constellation mesh.
- **Interactive 16-Channel Transmitter Simulator**: Real-time virtual gimbals (mouse & touch draggable), microsecond PWM mappings (988µs–2012µs), and simulated OLED telemetry HUD.
- **In-Browser WebSerial Diagnostics & Flasher**: Direct USB communication with ESP32-S3 over WebSerial API.
- **Dynamic GitHub Release Integrations**: Automatically displays latest release badges and direct download links for Windows `.exe` and Android `.apk`.
- **Hardware Pinout Visualizer**: Interactive ESP32-S3 GPIO reference with 1-click clipboard copy.

## Running Locally

You can serve this website locally using any standard static web server:

### Using Python
```bash
python -m http.server 8000
```
Then open `http://localhost:8000` in your browser.

### Using Node.js / npx
```bash
npx serve .
```

## Deployment

### GitHub Pages
1. Go to repository **Settings** -> **Pages**.
2. Set **Source** to `Deploy from a branch` -> `main` / `root`.
3. Save and your site will be live at `https://<username>.github.io/<repo>/`!

### Cloudflare Pages / Vercel / Netlify
Point the deployment directory to `/` with no build command needed.
