import path from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)
let canvasReady = false
let workerReady = false
let pdfParseClass

async function ensurePdfRuntime() {
  if (canvasReady && workerReady && pdfParseClass) return pdfParseClass
  try {
    const canvas = await import('@napi-rs/canvas')
    if (!globalThis.DOMMatrix && canvas.DOMMatrix) globalThis.DOMMatrix = canvas.DOMMatrix
    if (!globalThis.ImageData && canvas.ImageData) globalThis.ImageData = canvas.ImageData
    if (!globalThis.Path2D && canvas.Path2D) globalThis.Path2D = canvas.Path2D
    canvasReady = true

    // PDF.js intenta cargar un worker relativo a su propio bundle. Ese archivo
    // puede quedar fuera del bundle de una función serverless, por lo que se
    // configura explícitamente mediante una URL file:// resoluble en Vercel.
    const { PDFParse } = await import('pdf-parse')
    const pdfjsEntry = require.resolve('pdfjs-dist/legacy/build/pdf.mjs')
    const workerPath = path.join(path.dirname(pdfjsEntry), 'pdf.worker.mjs')
    PDFParse.setWorker(pathToFileURL(workerPath).href)
    pdfParseClass = PDFParse
    workerReady = true
    return PDFParse
  } finally {
    canvasReady = true
  }
}

export async function createPdfParser(data) {
  const PDFParse = await ensurePdfRuntime()
  return new PDFParse({ data })
}
