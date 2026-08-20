# SourceTX website

The SourceTX website is a dependency-free static GitHub Pages site for the
SourceTX transmitter system. It documents the firmware/control loop, official
reference hardware, signed release feed, Windows and Android companion apps,
safe installation paths, and partnership contact points.

## Local preview

Serve the repository root with any static web server. For example:

```text
python -m http.server 8000
```

Then open `http://localhost:8000/`.

The page has no browser flasher. Firmware installation and model transfer stay
inside the verified companion applications and the documented USB recovery
workflow.

## Deployment

The repository is configured for GitHub Pages from the `main` branch and keeps
the custom domain in `CNAME`.

Release badges read the latest GitHub release at runtime and fall back to the
documented stable versions when the API is unavailable. The content source of
truth is the main SourceTX repository and its companion/release repositories.
