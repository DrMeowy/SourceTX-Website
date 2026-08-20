# SourceTX website

The SourceTX website is a dependency-free static GitHub Pages site for the
SourceTX transmitter system. It documents the firmware/control loop, official
reference hardware, signed release feed, browser maintenance tools, Windows
and Android companion apps, safe installation paths, and partnership contact
points.

## Local preview

Serve the repository root with any static web server. For example:

```text
python -m http.server 8000
```

Then open `http://localhost:8000/`.

The site includes a reference Hardware page with the required parts, default
pin map, and electrical boundaries; a standalone-apps page for Windows and
Android companion downloads; and a Donate page for project support. The Install
section also offers a browser alpha for the official ESP32-S3 target. The
browser path is split into separate firmware-installation and
transmitter-configuration pages, with requirements, live Web Serial controls,
and expandable CLI details. It uses secure Chrome or Edge context and verifies
release signatures locally before flashing. The companion applications remain
the fallback for older browsers, Android USB OTG, model backup/restore, and
guided recovery.

## Deployment

The repository is configured for GitHub Pages from the `main` branch and keeps
the custom domain in `CNAME`.

Release badges read the latest GitHub release at runtime and fall back to the
documented stable versions when the API is unavailable. The content source of
truth is the main SourceTX repository and its companion/release repositories.
