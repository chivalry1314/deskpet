const DEFAULT_TOLERANCE = 32

/**
 * 从图片四角洪水填充，移除与边缘相连的近白色背景，返回透明 PNG。
 * 主体内部与背景不相连的白色区域（比如白熊的身体）不会被误伤。
 */
export async function removeWhiteBackground(file: File, tolerance = DEFAULT_TOLERANCE): Promise<File> {
  const bitmap = await createImageBitmap(file)
  try {
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0)

    const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const { data, width, height } = img
    const threshold = 255 - tolerance

    const isBackground = (idx: number): boolean => {
      const p = idx * 4
      if (data[p + 3] === 0) return true
      return data[p] >= threshold && data[p + 1] >= threshold && data[p + 2] >= threshold
    }

    const visited = new Uint8Array(width * height)
    const queue = new Int32Array(width * height)
    let head = 0
    let tail = 0
    const push = (idx: number) => {
      if (visited[idx]) return
      visited[idx] = 1
      queue[tail++] = idx
    }

    for (let x = 0; x < width; x++) {
      push(x)
      push((height - 1) * width + x)
    }
    for (let y = 0; y < height; y++) {
      push(y * width)
      push(y * width + width - 1)
    }

    let removed = 0
    while (head < tail) {
      const idx = queue[head++]
      if (!isBackground(idx)) continue
      data[idx * 4 + 3] = 0
      removed++
      const x = idx % width
      const y = (idx / width) | 0
      if (x > 0) push(idx - 1)
      if (x < width - 1) push(idx + 1)
      if (y > 0) push(idx - width)
      if (y < height - 1) push(idx + width)
    }

    // 没有可移除的背景（比如已经是透明图），直接返回原文件
    if (removed === 0) return file

    ctx.putImageData(img, 0, 0)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) return file
    const name = file.name.replace(/\.\w+$/, '') + '.png'
    return new File([blob], name, { type: 'image/png' })
  } finally {
    bitmap.close()
  }
}
