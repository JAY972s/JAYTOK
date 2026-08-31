// Bridge that runs the unmodified `tiktok-quality` Python package (ghost-frame
// engine) inside the browser via Pyodide (CPython compiled to WebAssembly).
// The package has zero third-party dependencies, so it runs as-is.

const PYODIDE_CDN = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/";

let pyodideInstance = null;
let readyPromise = null;

const ENGINE_FILES = [
    ["__init__.py", "tiktok_quality/__init__.py"],
    ["transform.py", "tiktok_quality/transform.py"],
    ["mp4/__init__.py", "tiktok_quality/mp4/__init__.py"],
    ["mp4/parser.py", "tiktok_quality/mp4/parser.py"],
    ["mp4/builder.py", "tiktok_quality/mp4/builder.py"],
];

async function loadEngine(logFn) {
    logFn?.("Loading Python runtime (Pyodide, ~10MB, first run only)...", "info");
    const { loadPyodide } = await import(`${PYODIDE_CDN}pyodide.mjs`);
    const pyodide = await loadPyodide({ indexURL: PYODIDE_CDN });

    logFn?.("Installing Ghost Frame engine (tiktok-quality)...", "info");
    const base = new URL("engine-ghost/tiktok_quality/", document.baseURI);
    pyodide.FS.mkdirTree("/engine/tiktok_quality/mp4");
    for (const [rel, dest] of ENGINE_FILES) {
        const res = await fetch(new URL(rel, base));
        if (!res.ok) {
            throw new Error(`Failed to fetch engine file: ${rel}`);
        }
        const text = await res.text();
        pyodide.FS.writeFile(`/engine/${dest}`, text);
    }
    pyodide.runPython(`
import sys
if "/engine" not in sys.path:
    sys.path.insert(0, "/engine")
`);
    // Import once so subsequent calls are fast.
    pyodide.runPython("import tiktok_quality as _tqt_probe");
    logFn?.("Ghost Frame engine ready.", "success");
    return pyodide;
}

function getPyodide(logFn) {
    if (!readyPromise) {
        readyPromise = loadEngine(logFn).catch((err) => {
            readyPromise = null;
            throw err;
        });
    }
    return readyPromise;
}

/**
 * Runs the tiktok-quality ghost-frame transform on raw MP4 bytes.
 * @param {Uint8Array} bytes
 * @param {number} multiplier
 * @param {string} comment
 * @param {(msg: string, level?: string) => void} [logFn]
 * @returns {Promise<{bytes: Uint8Array, stats: Object|null}>}
 */
export async function ghostFrameTransform(
    bytes,
    multiplier = 10,
    comment = "TK8vY5VqBA6hUlo1yuGvNA",
    logFn,
) {
    const pyodide = await getPyodide(logFn);
    if (!pyodideInstance) pyodideInstance = pyodide;

    const inPath = `/tmp/in_${Date.now()}_${Math.random().toString(36).slice(2)}.mp4`;
    const outPath = `${inPath}.out.mp4`;
    pyodide.FS.mkdirTree("/tmp");
    pyodide.FS.writeFile(inPath, bytes);

    pyodide.globals.set("_in_path", inPath);
    pyodide.globals.set("_out_path", outPath);
    pyodide.globals.set("_mult", Math.max(2, Math.round(multiplier)));
    pyodide.globals.set("_comment", comment);

    const pyCode = `
import tiktok_quality as _tqt
_stats = None
try:
    _stats = _tqt.transform(_in_path, _out_path, multiplier=int(_mult), comment=_comment, verbose=False)
except SystemExit:
    raise RuntimeError(
        "Ghost Frame engine could not parse this file. It expects a standard "
        "H.264/AVC MP4 with moov+mdat boxes (e.g. exported from CapCut/Premiere). "
        "Try the Inflate engine instead."
    )
_stats
`;

    let statsPy;
    try {
        statsPy = await pyodide.runPythonAsync(pyCode);
    } finally {
        pyodide.globals.delete("_in_path");
        pyodide.globals.delete("_out_path");
        pyodide.globals.delete("_mult");
        pyodide.globals.delete("_comment");
    }

    const stats = statsPy ? statsPy.toJs({ dict_converter: Object.fromEntries }) : null;
    if (statsPy?.destroy) statsPy.destroy();

    const outBytes = pyodide.FS.readFile(outPath);
    const result = new Uint8Array(outBytes);

    try { pyodide.FS.unlink(inPath); } catch (_) { /* noop */ }
    try { pyodide.FS.unlink(outPath); } catch (_) { /* noop */ }

    return { bytes: result, stats };
}
