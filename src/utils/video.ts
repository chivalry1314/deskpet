export interface VideoSplitResult {
  files: File[]
  /** 实际使用的采样帧率 */
  fps: number
}

const SAMPLE_FPS = 8
const MAX_FRAMES = 30

/** seek 到指定时间；目标与当前位置几乎相同时浏览器不会发 seeked，直接返回 */
function seekTo(video: HTMLVideoElement, t: number): Promise<void> {
  return new Promise((resolve, reject) => {
    if (Math.abs(video.currentTime - t) < 0.001) {
      resolve()
      return
    }
    const timer = setTimeout(() => reject(new Error('视频 seek 超时')), 5000)
    video.onseeked = () => {
      clearTimeout(timer)
      resolve()
    }
    video.onerror = () => {
      clearTimeout(timer)
      reject(new Error('视频 seek 失败'))
    }
    video.currentTime = t
  })
}

/**
 * 把视频（MP4/WebM 等浏览器可解码格式）按固定帧率抽帧，导出逐帧 PNG。
 */
export async function splitVideoToPngs(file: File): Promise<VideoSplitResult> {
  const url = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  video.src = url

  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('视频加载超时（可能是不支持的编码格式，如 H.265）')),
        10000
      )
      video.onloadedmetadata = () => {
        clearTimeout(timer)
        resolve()
      }
      video.onerror = () => {
        clearTimeout(timer)
        reject(new Error('视频解码失败（可能是不支持的编码格式，如 H.265）'))
      }
    })

    const { videoWidth: width, videoHeight: height, duration } = video
    if (!width || !height || !isFinite(duration) || duration <= 0) {
      throw new Error('无法读取视频尺寸或时长')
    }

    const frameCount = Math.max(1, Math.min(MAX_FRAMES, Math.round(duration * SAMPLE_FPS)))
    const step = duration / frameCount

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!

    const files: File[] = []
    for (let i = 0; i < frameCount; i++) {
      const t = Math.min(i * step, duration - 0.05)
      await seekTo(video, t)
      ctx.drawImage(video, 0, 0, width, height)
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (blob) {
        const name = `${file.name.replace(/\.\w+$/, '')}_${String(i + 1).padStart(2, '0')}.png`
        files.push(new File([blob], name, { type: 'image/png' }))
      }
    }

    return { files, fps: SAMPLE_FPS }
  } finally {
    video.removeAttribute('src')
    URL.revokeObjectURL(url)
  }
}
