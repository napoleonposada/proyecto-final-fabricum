let canvasReady = false

async function ensurePdfRuntime() {
  if (canvasReady) return
  try {
    const canvas = await import('@napi-rs/canvas')
    if (!globalThis.DOMMatrix && canvas.DOMMatrix) globalThis.DOMMatrix = canvas.DOMMatrix
    if (!globalThis.ImageData && canvas.ImageData) globalThis.ImageData = canvas.ImageData
    if (!globalThis.Path2D && canvas.Path2D) globalThis.Path2D = canvas.Path2D
  } finally {
    canvasReady = true
  }
}

export async function createPdfParser(data) {
  await ensurePdfRuntime()
  const { PDFParse } = await import('pdf-parse')
  return new PDFParse({ data })
}
