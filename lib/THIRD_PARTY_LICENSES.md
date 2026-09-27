# Third-Party Libraries — Chess Mode

Mythika's Chess mode uses two vendored open-source libraries, included
locally under `lib/` rather than loaded from a CDN, so the game keeps
working even if a third-party CDN goes down or changes.

## three.js — 3D rendering
- Version: 0.186.1
- License: MIT
- Source: https://github.com/mrdoob/three.js
- Files: `lib/three.module.js`, `lib/three.core.js`, `lib/OrbitControls.js`
- (`three.core.js` is not optional — `three.module.js` imports its
  entire class list from it via a relative `./three.core.js` path.
  Both files must be kept side by side in `lib/` for either to work.)
- MIT is permissive — no obligations beyond keeping this notice.

## Stockfish — chess AI opponent
- Version: 19 (lite, single-threaded build)
- License: GPL-3.0
- Source: https://github.com/nmrugg/stockfish.js (WASM build of
  https://github.com/official-stockfish/Stockfish)
- Files: `lib/stockfish/stockfish-19-lite-single.js`,
  `lib/stockfish/stockfish-19-lite-single.wasm`
- Full license text: see the Stockfish project's `Copying.txt` at the
  source repository above, or https://www.gnu.org/licenses/gpl-3.0.html

### A note on the GPL and how Stockfish is used here
Stockfish is run as a separate Web Worker process, communicated with
only through the standard UCI text protocol (the same interface every
chess GUI — Lichess, Chess.com, ChessBase — uses to talk to any UCI
engine). Mythika's own code is not statically or dynamically linked
against Stockfish; it sends and receives plain text messages to an
independent process. This is the standard, widely-used pattern across
the entire web chess ecosystem for exactly this reason. Mythika's own
source is not GPL-licensed by virtue of this usage.

This is a factual description of common practice, not legal advice —
if licensing certainty matters for your specific distribution plans,
consult the GPL-3.0 text directly or a qualified professional.

## Why the "lite, single-threaded" Stockfish build specifically
Stockfish ships several build variants. This project deliberately uses
the **lite** (smaller neural network, ~1.8MB WASM instead of ~95MB) and
**single-threaded** (no `SharedArrayBuffer` requirement) variant because:

1. **File size** — the standard build's WASM binary is ~95MB, wildly
   impractical for a web game. The lite build is ~1.8MB — still a
   genuinely strong opponent, just using a smaller evaluation network.
2. **Static hosting compatibility** — multi-threaded WASM requires the
   browser to have `SharedArrayBuffer` available, which in turn
   requires the server to send `Cross-Origin-Opener-Policy` and
   `Cross-Origin-Embedder-Policy` response headers. GitHub Pages does
   **not** allow setting custom response headers, so a multi-threaded
   build would silently fail or fall back badly there. The
   single-threaded build has no such requirement and works on any
   static host, including GitHub Pages, with zero configuration.

If Mythika is ever hosted somewhere that *can* set those headers (a
custom server, Netlify with a `_headers` file, Cloudflare Pages, etc.),
switching to the full multi-threaded build for faster AI moves is a
drop-in change — swap the vendored files and the loader path, no other
code changes needed, since both builds speak the same UCI protocol.
