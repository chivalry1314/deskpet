import { useState, useCallback, useEffect, useRef } from 'react'
import { readFile, writeFile, mkdir } from '@tauri-apps/plugin-fs'
import type { EditorData, EditorStateData, FrameFile, Manifest } from '../types'
import { loadPet, savePetManifest, getBaseDataDir } from '../stores/petStore'
import { removeWhiteBackground } from '../utils/removeBg'
import { splitGifToPngs } from '../utils/gif'
import { splitVideoToPngs } from '../utils/video'
import { getStateName, STATE_PRESETS } from '../utils/stateNames'
import StateEditor from './StateEditor'

interface EditorProps {
  petName: string | null
  onBack: () => void
  onSaved: () => void
}

function createDefaultState(): EditorStateData {
  return { frames: [], fps: 8, loop: true, pingpong: false, next: 'idle' }
}

function createDefaultData(): EditorData {
  return {
    name: '新宠物',
    version: '1.0',
    author: '',
    width: 150,
    height: 150,
    scale: 1.0,
    states: { idle: createDefaultState() },
    behavior: {
      idle_time: [3, 10],
      walk_speed: 2,
      edge_bounce: false,
      drag_physics: true,
      random_states: [],
      walk_area: 'screen',
    },
    interactions: { on_click: 'idle', on_drag: 'drag', on_hover: 'idle' },
  }
}

interface PromptPreset {
  key: string
  category: '通用' | '猫' | '狗'
  title: string
  prompt: string
}

async function withConcurrency<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency = 8
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let index = 0
  async function worker() {
    while (index < items.length) {
      const i = index++
      results[i] = await fn(items[i])
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker))
  return results
}

/** AI 生图预设提示词：配合用户自己的角色图，到豆包/即梦等生成 GIF/MP4 后回传拆帧 */
const PROMPT_PRESETS: PromptPreset[] = [
  {
    key: 'idle',
    category: '通用',
    title: '待机动画（idle · 循环播放）',
    prompt:
      '以这张图片中的角色为主角，生成一个2~3秒的循环动画：角色保持完全相同的造型、配色和画风，做轻微的待机动作（呼吸起伏、偶尔眨眼）。要求：纯白背景、角色居中、画面构图保持不动、首尾帧能无缝循环、不加文字和水印、不改变角色的任何外观细节。',
  },
  {
    key: 'clicked',
    category: '通用',
    title: '点击反应（clicked · 单次播放）',
    prompt:
      '以这张图片中的角色为主角，生成一个1~2秒的动画：角色保持完全相同的造型、配色和画风，做一个被点击后的可爱反应（开心跳一下、冒爱心、挥手打招呼均可）。要求：纯白背景、角色居中、不加文字和水印、不改变角色的任何外观细节。',
  },
  {
    key: 'walk',
    category: '通用',
    title: '行走动画（walk · 循环播放）',
    prompt:
      '以这张图片中的角色为主角，生成一个2秒左右的循环动画：角色保持完全相同的造型、配色和画风，做出走路或蹦跳的动作，首尾帧能无缝循环。要求：纯白背景、角色居中、不加文字和水印、不改变角色的任何外观细节。',
  },
  {
    key: 'typing',
    category: '通用',
    title: '键盘反应（typing · 敲键盘时播放）',
    prompt:
      '以这张图片中的角色为主角，生成一个1秒左右的短动画：角色保持完全相同的造型、配色和画风，做出敲键盘打字的动作，头顶冒出一个可爱的小气泡，气泡里显示一个按键字母（比如"A"）。要求：纯白背景、角色居中、除气泡里的字母外不加其他文字和水印、不改变角色的任何外观细节。',
  },
  {
    key: 'sleep',
    category: '通用',
    title: '睡觉（sleep · 待机/单次均可）',
    prompt:
      '以这张图片中的角色为主角，生成一个2秒左右的动画：角色保持完全相同的造型、配色和画风，做出趴下睡觉的动作（闭眼、轻微呼吸、冒小鼻涕泡）。要求：纯白背景、角色居中、不加文字和水印、不改变角色的任何外观细节。',
  },
  {
    key: 'play',
    category: '通用',
    title: '玩耍（play · 单次/循环均可）',
    prompt:
      '以这张图片中的角色为主角，生成一个1.5秒左右的动画：角色保持完全相同的造型、配色和画风，做出开心玩耍的动作（摇尾巴/转圈/扑空气）。要求：纯白背景、角色居中、不加文字和水印、不改变角色的任何外观细节。',
  },
  {
    key: 'scratch',
    category: '通用',
    title: '伸懒腰/抓痒（scratch · 单次播放）',
    prompt:
      '以这张图片中的角色为主角，生成一个1秒左右的短动画：角色保持完全相同的造型、配色和画风，做出伸懒腰或抓痒的动作。要求：纯白背景、角色居中、不加文字和水印、不改变角色的任何外观细节。',
  },
  {
    key: 'idle-cat',
    category: '猫',
    title: '猫待机（idle · 循环播放）',
    prompt:
      '以这张图片中的小猫为主角，生成一个2~3秒的循环动画：小猫保持完全相同的造型、配色和画风，做猫咪待机动作——尾巴轻轻摆动、偶尔眨眼、偶尔舔一下爪子。要求：纯白背景、角色居中、首尾帧无缝循环、不加文字和水印、不改变角色的任何外观细节。',
  },
  {
    key: 'clicked-cat',
    category: '猫',
    title: '猫被点击（clicked · 单次播放）',
    prompt:
      '以这张图片中的小猫为主角，生成一个1~2秒的动画：小猫保持完全相同的造型、配色和画风，做出被主人抚摸脑袋后的可爱反应——眯眼、歪头、发出呼噜声的姿态。要求：纯白背景、角色居中、不加文字和水印、不改变角色的任何外观细节。',
  },
  {
    key: 'typing-cat',
    category: '猫',
    title: '猫敲键盘（typing · 敲键盘时播放）',
    prompt:
      '以这张图片中的小猫为主角，生成一个1秒左右的短动画：小猫保持完全相同的造型、配色和画风，一只猫爪踩在键盘上，头顶冒出一个显示按键字母的小气泡，表情有点无辜。要求：纯白背景、角色居中、除气泡里的字母外不加其他文字和水印、不改变角色的任何外观细节。',
  },
  {
    key: 'idle-dog',
    category: '狗',
    title: '狗待机（idle · 循环播放）',
    prompt:
      '以这张图片中的小狗为主角，生成一个2~3秒的循环动画：小狗保持完全相同的造型、配色和画风，做狗狗待机动作——吐舌头喘气、尾巴欢快摇动、偶尔眨眼。要求：纯白背景、角色居中、首尾帧无缝循环、不加文字和水印、不改变角色的任何外观细节。',
  },
  {
    key: 'clicked-dog',
    category: '狗',
    title: '狗被点击（clicked · 单次播放）',
    prompt:
      '以这张图片中的小狗为主角，生成一个1~2秒的动画：小狗保持完全相同的造型、配色和画风，做出被主人夸奖后的开心反应——摇尾巴、吐舌头、跳一下。要求：纯白背景、角色居中、不加文字和水印、不改变角色的任何外观细节。',
  },
  {
    key: 'typing-dog',
    category: '狗',
    title: '狗敲键盘（typing · 敲键盘时播放）',
    prompt:
      '以这张图片中的小狗为主角，生成一个1秒左右的短动画：小狗保持完全相同的造型、配色和画风，两只前爪扒在键盘上，头顶冒出一个显示按键字母的小气泡。要求：纯白背景、角色居中、除气泡里的字母外不加其他文字和水印、不改变角色的任何外观细节。',
  },
]

export default function Editor({ petName, onBack, onSaved }: EditorProps) {
  const [data, setData] = useState<EditorData>(createDefaultData())
  const [activeTab, setActiveTab] = useState<'basic' | 'states' | 'behavior' | 'preview'>('basic')
  const [previewState, setPreviewState] = useState('idle')
  const [previewFrame, setPreviewFrame] = useState(0)
  const [autoRemoveBg, setAutoRemoveBg] = useState(true)
  const [showPrompts, setShowPrompts] = useState(false)
  const [copiedKey, setCopiedKey] = useState('')
  const [loading, setLoading] = useState<string | null>(petName ? '正在加载宠物...' : null)
  const objectUrlsRef = useRef<Set<string>>(new Set())
  const [stateDialog, setStateDialog] = useState<{ open: boolean; preset: string }>({
    open: false,
    preset: 'walk',
  })

  function registerObjectUrl(url: string) {
    objectUrlsRef.current.add(url)
  }

  function revokeObjectUrl(url: string) {
    try {
      URL.revokeObjectURL(url)
    } catch {
      // ignore
    }
    objectUrlsRef.current.delete(url)
  }

  function revokeAllObjectUrls() {
    objectUrlsRef.current.forEach((url) => {
      try {
        URL.revokeObjectURL(url)
      } catch {
        // ignore
      }
    })
    objectUrlsRef.current.clear()
  }

  async function copyPrompt(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(''), 1500)
  }

  function ensureInteraction(value: string, stateKeys: string[]): string {
    if (stateKeys.includes(value)) return value
    return stateKeys.length > 0 ? stateKeys[0] : value
  }

  useEffect(() => {
    return () => revokeAllObjectUrls()
  }, [])

  useEffect(() => {
    if (!petName) return
    let cancelled = false
    setLoading('正在加载宠物...')
    Promise.all([loadPet(petName), getBaseDataDir()])
      .then(async ([manifest, baseDir]) => {
        if (cancelled) return
        console.time(`[perf] 加载 ${petName} 帧图`)
        const petDir = `${baseDir.replace(/\\/g, '/')}/pets/${petName}`
        // 从后端读回每个状态的已保存帧图，重建 FrameFile（可继续编辑，无需重传）
        const states: Record<string, EditorStateData> = {}
        for (const [key, cfg] of Object.entries(manifest.states)) {
          const frames: FrameFile[] = (
            await Promise.all(
              cfg.frames.map(async (name) => {
                try {
                  const bytes = await readFile(`${petDir}/${name}`)
                  const blob = new Blob([bytes], { type: 'image/png' })
                  const file = new File([blob], name, { type: 'image/png' })
                  const previewUrl = URL.createObjectURL(blob)
                  registerObjectUrl(previewUrl)
                  return {
                    id: Math.random().toString(36).slice(2),
                    file,
                    previewUrl,
                  } as FrameFile
                } catch (err) {
                  console.error(`加载帧图失败 ${petDir}/${name}:`, err)
                  return null
                }
              })
            )
          ).filter((f): f is FrameFile => f !== null)
          states[key] = {
            frames,
            fps: cfg.fps,
            loop: cfg.loop,
            pingpong: cfg.pingpong ?? false,
            next: cfg.next,
          }
        }
        if (cancelled) return
        console.timeEnd(`[perf] 加载 ${petName} 帧图`)
        const stateKeys = Object.keys(states)
        setData({
          name: manifest.name,
          version: manifest.version,
          author: manifest.author,
          width: manifest.window.width,
          height: manifest.window.height,
          scale: manifest.window.scale,
          states,
          behavior: manifest.behavior,
          interactions: {
            on_click: ensureInteraction(manifest.interactions.on_click, stateKeys),
            on_drag: ensureInteraction(manifest.interactions.on_drag, stateKeys),
            on_hover: ensureInteraction(manifest.interactions.on_hover, stateKeys),
          },
        })
      })
      .catch((e) => alert('加载失败: ' + e))
      .finally(() => {
        if (!cancelled) setLoading(null)
      })

    return () => {
      cancelled = true
      revokeAllObjectUrls()
    }
  }, [petName])

  useEffect(() => {
    setPreviewState((prev) => {
      if (data.states[prev]) return prev
      const keys = Object.keys(data.states)
      return keys.length > 0 ? keys[0] : 'idle'
    })
  }, [data.states])

  useEffect(() => {
    const state = data.states[previewState]
    if (!state || state.frames.length === 0) return
    let frame = 0
    let dir = 1
    setPreviewFrame(0)
    let lastTime = performance.now()
    const interval = 1000 / state.fps
    let rafId = 0

    function loop(now: number) {
      const elapsed = now - lastTime
      if (elapsed >= interval) {
        const steps = Math.floor(elapsed / interval)
        lastTime += steps * interval
        for (let s = 0; s < steps; s++) {
          if (state.loop && state.pingpong && state.frames.length > 1) {
            frame += dir
            if (frame >= state.frames.length - 1) {
              frame = state.frames.length - 1
              dir = -1
            } else if (frame <= 0) {
              frame = 0
              dir = 1
            }
          } else {
            frame = (frame + 1) % (state.loop ? state.frames.length : Math.max(1, state.frames.length))
            if (!state.loop && frame === state.frames.length - 1) {
              setPreviewFrame(frame)
              return
            }
          }
        }
        setPreviewFrame(frame)
      }
      rafId = requestAnimationFrame(loop)
    }

    rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
  }, [previewState, data.states])

  const updateState = useCallback((key: string, patch: Partial<EditorStateData>) => {
    setData((d) => ({
      ...d,
      states: {
        ...d.states,
        [key]: { ...d.states[key], ...patch },
      },
    }))
  }, [])

  const addState = useCallback(() => {
    const first = Object.keys(data.states).length === 0 ? 'idle' : 'walk'
    setStateDialog({ open: true, preset: first })
  }, [data.states])

  function confirmAddState() {
    const name = stateDialog.preset.trim()
    if (!name) return
    if (data.states[name]) {
      alert('状态已存在')
      return
    }
    const st = createDefaultState()
    if (name === 'typing') {
      st.loop = false
      st.next = 'idle'
    }
    setData((d) => ({
      ...d,
      states: { ...d.states, [name]: st },
    }))
    setStateDialog({ open: false, preset: 'walk' })
  }

  const removeState = useCallback((key: string) => {
    if (!confirm(`删除状态「${getStateName(key)}」?`)) return
    setData((d) => {
      const { [key]: _, ...rest } = d.states
      const nextKeys = Object.keys(rest)
      const interactions = { ...d.interactions }
      if (interactions.on_click === key) interactions.on_click = ensureInteraction(interactions.on_click, nextKeys)
      if (interactions.on_drag === key) interactions.on_drag = ensureInteraction(interactions.on_drag, nextKeys)
      if (interactions.on_hover === key) interactions.on_hover = ensureInteraction(interactions.on_hover, nextKeys)
      return { ...d, states: rest, interactions }
    })
  }, [])

  const handleFileDrop = useCallback(
    async (stateKey: string, files: FileList | null) => {
      if (!files) return
      setLoading('正在处理素材...')
      const newFrames: FrameFile[] = []
      let inferredFps: number | null = null
      let fromVideo = false

      // GIF / 视频先拆成逐帧 PNG
      const expanded: File[] = []
      for (const file of Array.from(files)) {
        if (file.type === 'image/gif') {
          try {
            const { files: gifFrames, avgDelayMs } = await splitGifToPngs(file)
            expanded.push(...gifFrames)
            if (avgDelayMs > 0) {
              inferredFps = Math.min(60, Math.max(1, Math.round(1000 / avgDelayMs)))
            }
          } catch (e) {
            alert('GIF 解析失败: ' + e)
          }
          continue
        }
        if (file.type.startsWith('video/')) {
          try {
            const { files: videoFrames, fps } = await splitVideoToPngs(file)
            expanded.push(...videoFrames)
            inferredFps = fps
            fromVideo = true
          } catch (e) {
            alert('视频解析失败: ' + e)
          }
          continue
        }
        expanded.push(file)
      }

      const imageFiles = expanded.filter((f) => f.type.startsWith('image/'))
      const processedFiles = await withConcurrency(imageFiles, async (file) => {
        if (!autoRemoveBg) return file
        try {
          return await removeWhiteBackground(file)
        } catch {
          return file
        }
      })

      for (const processed of processedFiles) {
        const previewUrl = URL.createObjectURL(processed)
        registerObjectUrl(previewUrl)
        newFrames.push({ id: Math.random().toString(36).slice(2), file: processed, previewUrl })
      }
      setData((d) => ({
        ...d,
        states: {
          ...d.states,
          [stateKey]: {
            ...d.states[stateKey],
            frames: [...d.states[stateKey].frames, ...newFrames],
            ...(inferredFps ? { fps: inferredFps } : {}),
            // AI 生成的视频首尾帧通常接不上，自动开启往返循环消除跳变
            ...(fromVideo ? { pingpong: true } : {}),
          },
        },
      }))
      setLoading(null)
    },
    [autoRemoveBg]
  )

  const removeFrame = useCallback((stateKey: string, frameId: string) => {
    setData((d) => {
      const frame = d.states[stateKey].frames.find((f) => f.id === frameId)
      if (frame) revokeObjectUrl(frame.previewUrl)
      return {
        ...d,
        states: {
          ...d.states,
          [stateKey]: {
            ...d.states[stateKey],
            frames: d.states[stateKey].frames.filter((f) => f.id !== frameId),
          },
        },
      }
    })
  }, [])

  const handleSave = useCallback(async () => {
    if (!data.name.trim()) {
      alert('请输入宠物名称')
      return
    }
    if (!data.states.idle || data.states.idle.frames.length === 0) {
      alert('idle 状态至少需要一帧')
      return
    }

    setLoading('正在保存宠物...')

    const states: Manifest['states'] = {}
    const frameEntries: { name: string; frame: FrameFile }[] = []
    for (const [stateKey, state] of Object.entries(data.states)) {
      const frameNames: string[] = []
      for (let i = 0; i < state.frames.length; i++) {
        const name = `${stateKey}_${String(i + 1).padStart(2, '0')}.png`
        frameNames.push(name)
        frameEntries.push({ name, frame: state.frames[i] })
      }
      states[stateKey] = {
        frames: frameNames,
        fps: state.fps,
        loop: state.loop,
        pingpong: state.pingpong || undefined,
        next: state.loop ? undefined : state.next,
      }
    }

    const manifest: Manifest = {
      name: data.name.trim(),
      version: data.version,
      author: data.author,
      window: { width: data.width, height: data.height, scale: data.scale },
      states,
      behavior: data.behavior,
      interactions: data.interactions,
    }
    console.log('[editor] saving behavior:', manifest.behavior)

    const baseDir = await getBaseDataDir()
    const petDir = `${baseDir.replace(/\\/g, '/')}/pets/${data.name.trim()}`

    try {
      console.time(`[perf] 保存 ${data.name.trim()}`)
      await mkdir(petDir, { recursive: true })
      await Promise.all(
        frameEntries.map(async ({ name, frame }) => {
          const buf = await frame.file.arrayBuffer()
          await writeFile(`${petDir}/${name}`, new Uint8Array(buf))
        })
      )
      await savePetManifest(manifest)
      console.timeEnd(`[perf] 保存 ${data.name.trim()}`)
      alert('保存成功')
      onSaved()
    } catch (e) {
      alert('保存失败: ' + e)
    } finally {
      setLoading(null)
    }
  }, [data, onSaved])

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
            ← 返回
          </button>
          <h2 className="text-lg font-bold">{petName ? `编辑: ${petName}` : '创建宠物'}</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            保存到本地
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-48 border-r border-slate-200 bg-slate-50 p-3">
          <nav className="space-y-1">
            {[
              { key: 'basic', label: '基本信息' },
              { key: 'states', label: '状态管理' },
              { key: 'behavior', label: '行为配置' },
              { key: 'preview', label: '实时预览' },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key as any)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                  activeTab === t.key ? 'bg-white font-medium shadow-sm' : 'hover:bg-white/50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'basic' && (
            <div className="max-w-xl space-y-4">
              <h3 className="font-semibold">基本信息</h3>
              <div className="grid gap-4">
                <Field label="宠物名称">
                  <input
                    value={data.name}
                    onChange={(e) => setData((d) => ({ ...d, name: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="版本">
                    <input
                      value={data.version}
                      onChange={(e) => setData((d) => ({ ...d, version: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </Field>
                  <Field label="作者">
                    <input
                      value={data.author}
                      onChange={(e) => setData((d) => ({ ...d, author: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <Field label="窗口宽度">
                    <input
                      type="number"
                      value={data.width}
                      onChange={(e) => setData((d) => ({ ...d, width: Number(e.target.value) }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </Field>
                  <Field label="窗口高度">
                    <input
                      type="number"
                      value={data.height}
                      onChange={(e) => setData((d) => ({ ...d, height: Number(e.target.value) }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </Field>
                  <Field label="缩放">
                    <input
                      type="number"
                      step={0.1}
                      value={data.scale}
                      onChange={(e) => setData((d) => ({ ...d, scale: Number(e.target.value) }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </Field>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'states' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">状态管理</h3>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setShowPrompts((v) => !v)}
                    className="rounded-lg border border-violet-300 bg-violet-50 px-3 py-1.5 text-sm text-violet-700 hover:bg-violet-100"
                  >
                    ✨ AI 生成提示词
                  </button>
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={autoRemoveBg}
                      onChange={(e) => setAutoRemoveBg(e.target.checked)}
                    />
                    上传时自动去白底
                  </label>
                  <button
                    onClick={addState}
                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700"
                  >
                    + 添加状态
                  </button>
                </div>
              </div>

              {showPrompts && (
                <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-4">
                  <div className="mb-3 text-sm text-slate-600">
                    使用流程：复制提示词 → 打开豆包/即梦等 AI，<b>上传你的角色图 + 粘贴提示词</b>生成动画
                    （GIF 或 MP4 均可）→ 回到这里把文件拖进对应状态的上传区（自动拆帧）。
                  </div>
                  <div className="space-y-5">
                    {(['通用', '猫', '狗'] as const).map((category) => {
                      const items = PROMPT_PRESETS.filter((p) => p.category === category)
                      if (items.length === 0) return null
                      return (
                        <div key={category}>
                          <div className="mb-2 text-sm font-semibold text-violet-800">{category}</div>
                          <div className="space-y-3">
                            {items.map((p) => (
                              <div key={p.key} className="rounded-lg border border-slate-200 bg-white p-3">
                                <div className="mb-1 flex items-center justify-between">
                                  <span className="text-sm font-medium">{p.title}</span>
                                  <button
                                    onClick={() => copyPrompt(p.key, p.prompt)}
                                    className="rounded bg-indigo-600 px-2.5 py-1 text-xs text-white hover:bg-indigo-700"
                                  >
                                    {copiedKey === p.key ? '已复制 ✓' : '复制提示词'}
                                  </button>
                                </div>
                                <p className="text-xs leading-relaxed text-slate-500">{p.prompt}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              <div className="space-y-4">
                {Object.entries(data.states).map(([key, state]) => (
                  <StateEditor
                    key={key}
                    stateKey={key}
                    stateKeys={Object.keys(data.states)}
                    state={state}
                    onChange={(patch) => updateState(key, patch)}
                    onRemove={() => removeState(key)}
                    onFiles={(files) => handleFileDrop(key, files)}
                    onRemoveFrame={(id) => removeFrame(key, id)}
                  />
                ))}
              </div>
            </div>
          )}

          {activeTab === 'behavior' && (
            <div className="max-w-xl space-y-4">
              <h3 className="font-semibold">行为配置</h3>
              <div className="grid grid-cols-2 gap-4">
                <Field label="待机最短时间 (秒)">
                  <input
                    type="number"
                    value={data.behavior.idle_time[0]}
                    onChange={(e) =>
                      setData((d) => ({
                        ...d,
                        behavior: { ...d.behavior, idle_time: [Number(e.target.value), d.behavior.idle_time[1]] },
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="待机最长时间 (秒)">
                  <input
                    type="number"
                    value={data.behavior.idle_time[1]}
                    onChange={(e) =>
                      setData((d) => ({
                        ...d,
                        behavior: { ...d.behavior, idle_time: [d.behavior.idle_time[0], Number(e.target.value)] },
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="移动速度">
                  <input
                    type="number"
                    value={data.behavior.walk_speed}
                    onChange={(e) =>
                      setData((d) => ({ ...d, behavior: { ...d.behavior, walk_speed: Number(e.target.value) } }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="点击响应状态">
                  <select
                    value={data.interactions.on_click}
                    onChange={(e) =>
                      setData((d) => ({ ...d, interactions: { ...d.interactions, on_click: e.target.value } }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    {Object.keys(data.states).length === 0 && <option value="">暂无状态</option>}
                    {Object.keys(data.states).map((name) => (
                      <option key={name} value={name}>
                        {getStateName(name)}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={data.behavior.drag_physics}
                    onChange={(e) =>
                      setData((d) => ({ ...d, behavior: { ...d.behavior, drag_physics: e.target.checked } }))
                    }
                  />
                  可被拖拽
                </label>
              </div>
              <Field label="待机结束后随机切换状态（勾选后，宠物空闲时会自动播放这些状态；勾选「游走」时会自动在屏幕上游走）">
                <div className="flex flex-wrap gap-3 rounded-lg border border-slate-300 p-3">
                  {Object.keys(data.states).length === 0 ? (
                    <span className="text-sm text-slate-400">请先添加状态</span>
                  ) : (
                    Object.keys(data.states).map((name) => {
                      const checked = (data.behavior.random_states ?? []).includes(name)
                      return (
                        <label key={name} className="flex items-center gap-1.5 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const list = data.behavior.random_states ?? []
                              setData((d) => ({
                                ...d,
                                behavior: {
                                  ...d.behavior,
                                  random_states: e.target.checked
                                    ? [...list, name]
                                    : list.filter((s) => s !== name),
                                },
                              }))
                            }}
                          />
                          {getStateName(name)}
                        </label>
                      )
                    })
                  )}
                </div>
                {(data.behavior.random_states ?? []).includes('walk') && (
                  <div className="mt-3 flex items-center gap-2">
                    <label className="text-sm text-slate-700">游走范围</label>
                    <select
                      value={data.behavior.walk_area ?? 'screen'}
                      onChange={(e) => {
                        console.log('[editor] walk_area changed to:', e.target.value)
                        setData((d) => ({
                          ...d,
                          behavior: { ...d.behavior, walk_area: e.target.value as 'screen' | 'spot' },
                        }))
                      }}
                      className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
                    >
                      <option value="screen">全屏走动</option>
                      <option value="spot">原地走动</option>
                    </select>
                  </div>
                )}
              </Field>
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium">预览状态:</label>
                <select
                  value={previewState}
                  onChange={(e) => setPreviewState(e.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                >
                  {Object.keys(data.states).map((k) => (
                    <option key={k} value={k}>
                      {getStateName(k)}
                    </option>
                  ))}
                </select>
              </div>
              <div
                className="flex items-center justify-center rounded-xl border border-slate-200 bg-slate-100"
                style={{ width: data.width, height: data.height, minWidth: 200, minHeight: 200 }}
              >
                {data.states[previewState]?.frames[previewFrame] ? (
                  <img
                    src={data.states[previewState].frames[previewFrame].previewUrl}
                    alt="preview"
                    className="object-contain"
                    style={{ width: data.width * data.scale, height: data.height * data.scale }}
                  />
                ) : (
                  <span className="text-sm text-slate-400">无帧可预览</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="loading-ring" />
          <div className="mt-3 text-sm font-medium text-white">{loading}</div>
        </div>
      )}
      {stateDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
            <h3 className="mb-4 text-lg font-semibold">添加状态</h3>
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-slate-700">选择状态</label>
              <select
                value={stateDialog.preset}
                onChange={(e) => setStateDialog((prev) => ({ ...prev, preset: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {STATE_PRESETS.map((name) => (
                  <option key={name} value={name}>
                    {getStateName(name)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setStateDialog({ open: false, preset: 'walk' })}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50"
              >
                取消
              </button>
              <button
                onClick={confirmAddState}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-slate-600">{label}</span>
      {children}
    </label>
  )
}
