import { cpSync, existsSync, mkdirSync } from "node:fs";
import { defineConfig } from "vite";

const STATIC_ASSETS = ["engine-ghost", "preview.webp"];

function copyStaticAssets() {
    const dist = "dist";
    if (!existsSync(dist)) mkdirSync(dist, { recursive: true });
    for (const asset of STATIC_ASSETS) {
        const src = asset;
        const dest = `${dist}/${asset}`;
        if (!existsSync(src)) continue;
        cpSync(src, dest, { recursive: true });
    }
}

const CSP =
    "default-src 'self'; script-src 'self' 'wasm-unsafe-eval' 'unsafe-eval' https://cdn.jsdelivr.net; worker-src 'self' blob:; connect-src 'self' https://cdn.jsdelivr.net; style-src 'self' https://fonts.googleapis.com https://cdn.jsdelivr.net; font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net data:; img-src 'self' data: blob:; media-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

export default defineConfig({
    base: "./",
    server: {
        // Bind to localhost only. Set to `true` only if you intentionally
        // need to reach the dev server from another device on your LAN.
        host: "127.0.0.1",
        headers: {
            "Content-Security-Policy": CSP,
        },
    },
    preview: {
        host: "127.0.0.1",
        headers: {
            "Content-Security-Policy": CSP,
        },
    },
    build: {
        copyPublicDir: false,
        rollupOptions: {
            plugins: [
                {
                    name: "copy-static-assets",
                    closeBundle: copyStaticAssets,
                },
            ],
        },
    },
    test: {
        environment: "happy-dom",
    },
});
