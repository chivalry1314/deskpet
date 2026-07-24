import { decompressFrames, parseGIF } from 'gifuct-js'

export interface GifSplitResult {
  files: File[]
  /** 帧平均延迟（毫秒），用于自动推断 fps */
  avgDelayMs: number
}

/**
 * 把 GIF 拆成逐帧 PNG 文件。
 * 正确处理局部帧（patch）合成与 disposal=2 的背景恢复。
 */
export async function splitGifToPngs(file: File): Promise<GifSplitResult> {
  const buffer = await file.arrayBuffer()
  const gif = parseGIF(buffer)
  const frames = decompressFrames(gif, true)
  if (frames.length === 0) throw new Error('GIF 中没有帧')

  const width = gif.lsd.width
  const height = gif.lsd.height

  // 合成画布：逐帧累积
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!

  // patch 临时画布
  const patchCanvas = document.createElement('canvas')
  const patchCtx = patchCanvas.getContext('2d')!

  // 导出画布：快照当前合成状态
  const outCanvas = document.createElement('canvas')
  outCanvas.width = width
  outCanvas.height = height
  const outCtx = outCanvas.getContext('2d')!

  const files: File[] = []
  let totalDelay = 0

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i]
    const { left, top, width: pw, height: ph } = frame.dims

    if (frame.patch) {
      patchCanvas.width = pw
      patchCanvas.height = ph
      const imageData = new ImageData(new Uint8ClampedArray(frame.patch), pw, ph)
      patchCtx.putImageData(imageData, 0, 0)
      ctx.drawImage(patchCanvas, left, top)
    }

    // 快照导出
    outCtx.clearRect(0, 0, width, height)
    outCtx.drawImage(canvas, 0, 0)
    const blob = await new Promise<Blob | null>((resolve) => outCanvas.toBlob(resolve, 'image/png'))
    if (blob) {
      const name = `${file.name.replace(/\.\w+$/, '')}_${String(i + 1).padStart(2, '0')}.png`
      files.push(new File([blob], name, { type: 'image/png' }))
    }

    totalDelay += frame.delay || 100

    // disposal=2：本帧区域恢复为背景（透明），避免残影
    if (frame.disposalType === 2) {
      ctx.clearRect(left, top, pw, ph)
    }
  }

  return { files, avgDelayMs: totalDelay / frames.length }
}
