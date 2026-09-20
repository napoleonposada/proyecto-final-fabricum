import { WorkerMessageHandler } from 'pdfjs-dist/legacy/build/pdf.worker.mjs'

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

    // En Node, PDF.js puede ejecutar el worker en el mismo proceso. Registrar
    // el manejador importado estáticamente evita cualquier búsqueda de archivos
    // dentro de node_modules durante la ejecución de la función serverless.
    globalThis.pdfjsWorker = { WorkerMessageHandler }
    const { PDFParse } = await import('pdf-parse')
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
