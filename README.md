# deviation-form-demo

A small, generic **deviation report** web app (UI in German: *Abweichungsbericht*) for production
shift teams: capture a deviation, keep a local history, print it, back it up — and pre-fill order
data from a scanned PDF via in-browser OCR.

> **AI-assisted:** this project was built with the help of AI coding tools and reviewed by me.
>
> **Fictional data only:** all names, numbers, companies and the sample scan are made up for
> demonstration purposes. Any resemblance to real orders, materials or organisations is coincidental.

## Features
- Report form with zod validation (draft vs. complete), running numbers `DR-YYYY-NNNN`
- History list with search, status badges
- Print view (A4, signature lines, `@media print`)
- Backup export/import (validated JSON); corrupt localStorage is backed up and writes are locked, never silently overwritten
- **OCR import**: PDF text layer via pdf.js, otherwise lazy-loaded **tesseract.js** (self-hosted under `public/tesseract`, no CDN) with orientation detection and binarisation. Results go to a preview table — OCR values are marked *„bitte prüfen“*, only empty fields are pre-selected
- Try it with the built-in fictional sample scan (`public/samples/beispiel-auftrag-scan.pdf`, image-only, regenerate with `npm run sample:pdf`)

All data stays in the browser (localStorage). No backend.

## Stack
Vite · React 19 · strict TypeScript · zod · pdfjs-dist · tesseract.js · Vitest

## Development
```bash
npm install
npm run dev      # copies tesseract assets to public/tesseract first
npm test
npm run build
```
