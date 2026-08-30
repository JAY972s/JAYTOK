# Jaytok

TikTok quality-bypass tool, 100% client-side — no video ever leaves your browser.

Built entirely on one open-source project: [tiktok-quality](https://github.com/BastienGimbert/tiktok-quality)
by BastienGimbert (the "Ghost Frame" technique).

The Ghost Frame engine appends thousands of tiny ghost NALU frames that all
point to a single shared 8-byte filler block, inflating the declared frame
count (e.g. 10x) while adding only a few KB to the file. No pixel data is
touched — zero re-encode, original quality preserved. H.264 MP4 only.

It runs the **original, unmodified** `tiktok_quality` Python package directly
in the browser via [Pyodide](https://pyodide.org) (CPython compiled to
WebAssembly) — nothing is ever uploaded to a server.

## Running locally

This is a static site, so any static file server works. From this folder:

```bash
# Option A — no build step
python3 -m http.server 8080 --bind 127.0.0.1
# then open http://localhost:8080

# Option B — via Vite (hot reload)
npm install
npm run dev
```

> Serve over `http://` or `https://`, not `file://` — the app uses ES modules
> and dynamic imports that browsers block on the `file://` protocol.

## Deploying

`_headers` (Sevalla/Netlify-style) and `vercel.json` both set a strict
Content-Security-Policy — any static host works (Sevalla, Vercel, Netlify,
Cloudflare Pages). No cross-origin isolation headers are needed (unlike
Prism Optimizer's multi-thread FFmpeg mode) since Jaytok only runs
single-threaded Pyodide.

Redeploy with:
```bash
./deploy.sh "your commit message"
```
This stages, commits, and pushes — Sevalla auto-deploys on push.

## Project structure

```
Jaytok/
├── engine-ghost/             # Ghost Frame engine (Pyodide bridge + tiktok-quality source, unmodified)
│   ├── pyodide-bridge.mjs
│   └── tiktok_quality/
│       ├── __init__.py
│       ├── transform.py
│       └── mp4/{parser,builder}.py
├── src/
│   └── changelog*.mjs
├── index.html
├── style.css
├── app.js                    # Main app logic: queue, thumbnails (native <video>+<canvas>), history
├── db.js                     # IndexedDB history wrapper
├── vite.config.js
├── package.json
├── deploy.sh                 # git add/commit/push helper
├── _headers                  # CSP for Sevalla/Netlify
└── vercel.json                # CSP for Vercel
```

## How it works

- Strips SEI NALUs from the first sample, keeps the IDR slice
- Appends ghost frame timing/size/chunk entries pointing at a single shared
  8-byte filler NAL at the end of `mdat`
- Renames the audio handler, retags language, recalculates bitrates,
  writes an iTunes-style comment tag
- Replicates the output of the "TikTok Enhancer" browser extension,
  byte-for-byte, entirely offline

## Privacy

Everything happens locally in your browser tab: no video is ever uploaded to
a server. Processing history (including the patched video itself, for quick
re-download) is stored only in your browser's IndexedDB and can be cleared
at any time from the History panel.

## Disclaimer

This tool rewrites MP4 container metadata to influence how TikTok's servers
treat the upload. No video/audio pixel data is re-encoded. Always keep
backups of your original files before processing. Provided as-is, for
educational/personal use; using it may be against TikTok's terms of service.

## Credits

[tiktok-quality](https://github.com/BastienGimbert/tiktok-quality) by
BastienGimbert. MIT licensed.
