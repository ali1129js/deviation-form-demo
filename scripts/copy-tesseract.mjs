// Copies the tesseract.js worker, the LSTM-only wasm cores and the German traineddata
// from node_modules into public/tesseract/ so OCR is fully self-hosted (no CDN).
// Runs automatically before `dev` and `build`. public/tesseract/ is git-ignored.
import { cpSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const pkgDir = (name) => path.dirname(require.resolve(`${name}/package.json`));
const ziel = path.resolve("public/tesseract");

rmSync(ziel, { recursive: true, force: true });
mkdirSync(path.join(ziel, "core"), { recursive: true });
mkdirSync(path.join(ziel, "lang"), { recursive: true });

cpSync(path.join(pkgDir("tesseract.js"), "dist/worker.min.js"), path.join(ziel, "worker.min.js"));

const core = pkgDir("tesseract.js-core");
// OEM LSTM_ONLY: only the *-lstm variants are ever requested (plain, simd, relaxedsimd).
for (const f of readdirSync(core).filter((f) => /^tesseract-core.*-lstm\.wasm\.js$/.test(f)))
  cpSync(path.join(core, f), path.join(ziel, "core", f));

cpSync(
  path.join(pkgDir("@tesseract.js-data/deu"), "4.0.0/deu.traineddata.gz"),
  path.join(ziel, "lang/deu.traineddata.gz")
);
console.log(`tesseract assets -> ${path.relative(process.cwd(), ziel)}`);
