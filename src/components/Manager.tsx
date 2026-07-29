import { useEffect, useRef, useState } from 'react'
import { convertFileSrc } from '@tauri-apps/api/core'
import { getVersion } from '@tauri-apps/api/app'
import type { PetInfo, Settings } from '../types'
import {
  listLocalPets,
  deletePet,
  spawnPetWindow,
  closePetWindow,
  importPet,
  exportPetToDisk,
  getBaseDataDir,
  getSettings,
  saveSettings,
  migratePets,
} from '../stores/petStore'
import { open } from '@tauri-apps/plugin-dialog'

interface ManagerProps {
  onCreate: () => void
  onEdit: (name: string) => void
}

export default function Manager({ onCreate, onEdit }: ManagerProps) {
  const [pets, setPets] = useState<PetInfo[]>([])
  const [running, setRunning] = useState<Set<string>>(new Set())
  const [baseDir, setBaseDir] = useState('')
  const importInputRef = useRef<HTMLInputElement>(null)
  const [settings, setSettings] = useState<Settings>({
    opacity: 1.0,
    always_on_top: true,
    ignore_mouse: false,
    follow_mouse: true,
    key_reaction: true,
    current_pet: '',
    data_dir: '',
  })
  const [showSettings, setShowSettings] = useState(false)
  const [live2dRunning, setLive2dRunning] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const [appVersion, setAppVersion] = useState('')
  const [renameDialog, setRenameDialog] = useState<{
    open: boolean
    originalName: string
    newName: string
    bytes: Uint8Array | null
  }>({ open: false, originalName: '', newName: '', bytes: null })

  async function handleRunLive2d() {
    setLoading('启动 Live2D 示范猫...')
    try {
      await spawnPetWindow('__live2d__')
      setLive2dRunning(true)
    } catch (e) {
      alert('运行失败: ' + e)
    } finally {
      setLoading(null)
    }
  }

  async function handleStopLive2d() {
    setLoading('停止 Live2D 示范猫...')
    try {
      await closePetWindow()
      setLive2dRunning(false)
    } catch (e) {
      alert('停止失败: ' + e)
    } finally {
      setLoading(null)
    }
  }

  useEffect(() => {
    setLoading('加载宠物列表...')
    Promise.all([
      refresh(),
      getBaseDataDir().then(setBaseDir),
      getSettings().then(setSettings),
      getVersion().then(setAppVersion),
    ])
      .catch(console.error)
      .finally(() => setLoading(null))
  }, [])

  async function saveSettingPatch(patch: Partial<Settings>) {
    const next = { ...settings, ...patch }
    setSettings(next)
    try {
      await saveSettings(next)
    } catch (e) {
      alert('保存设置失败: ' + e)
    }
  }

  async function handleChangeDataDir() {
    try {
      const selected = await open({ directory: true })
      if (!selected || typeof selected !== 'string') return
      const migrate = confirm('是否把当前目录中的宠物迁移到新目录？\n选"取消"则只切换目录，旧宠物保留在原处。')
      setLoading(migrate ? '正在迁移数据目录...' : '正在切换数据目录...')
      if (migrate) {
        await migratePets(selected)
      }
      await saveSettingPatch({ data_dir: selected })
      await getBaseDataDir().then(setBaseDir)
      await refresh()
      alert('数据目录已切换: ' + selected)
    } catch (e) {
      alert('切换数据目录失败: ' + e)
    } finally {
      setLoading(null)
    }
  }

  async function resetDataDir() {
    if (!confirm('恢复默认数据目录？当前自定义目录中的宠物不会自动迁移。')) return
    setLoading('正在恢复默认数据目录...')
    try {
      await saveSettingPatch({ data_dir: '' })
      await getBaseDataDir().then(setBaseDir)
      await refresh()
    } catch (e) {
      alert('恢复失败: ' + e)
    } finally {
      setLoading(null)
    }
  }

  async function refresh() {
    try {
      const list = await listLocalPets()
      setPets(list)
    } catch (e) {
      alert('加载宠物列表失败: ' + e)
    }
  }

  async function handleRun(pet: PetInfo) {
    setLoading(`正在启动 ${pet.name}...`)
    try {
      await spawnPetWindow(pet.name)
      setRunning((prev) => new Set(prev).add(pet.name))
    } catch (e) {
      alert('运行失败: ' + e)
    } finally {
      setLoading(null)
    }
  }

  async function handleStop(pet: PetInfo) {
    setLoading('正在停止宠物...')
    try {
      await closePetWindow()
      setRunning((prev) => {
        const next = new Set(prev)
        next.delete(pet.name)
        return next
      })
    } catch (e) {
      alert('停止失败: ' + e)
    } finally {
      setLoading(null)
    }
  }

  async function handleDelete(pet: PetInfo) {
    if (!confirm(`确定删除宠物「${pet.name}」吗？`)) return
    setLoading(`正在删除 ${pet.name}...`)
    try {
      if (running.has(pet.name)) await handleStop(pet)
      await deletePet(pet.name)
      await refresh()
    } catch (e) {
      alert('删除失败: ' + e)
    } finally {
      setLoading(null)
    }
  }

  async function handleImportClick() {
    importInputRef.current?.click()
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading('正在导入 .pet...')
    try {
      const buf = await file.arrayBuffer()
      const bytes = new Uint8Array(buf)
      await tryImportPet(bytes)
    } catch (err) {
      alert('导入失败: ' + err)
    } finally {
      setLoading(null)
      e.target.value = ''
    }
  }

  async function tryImportPet(bytes: Uint8Array, suggestedName?: string) {
    try {
      await importPet(bytes, suggestedName)
      await refresh()
      setRenameDialog({ open: false, originalName: '', newName: '', bytes: null })
      if (suggestedName) {
        alert(`已以「${suggestedName}」导入成功`)
      } else {
        alert('导入成功')
      }
    } catch (err) {
      const msg = String(err)
      const match = msg.match(/宠物「(.+?)」已存在/)
      if (match) {
        const originalName = match[1]
        const baseName = suggestedName || originalName
        let counter = 2
        let candidate = `${baseName}_${counter}`
        while (pets.some((p) => p.name === candidate)) {
          counter++
          candidate = `${baseName}_${counter}`
        }
        setRenameDialog({
          open: true,
          originalName,
          newName: candidate,
          bytes,
        })
      } else {
        throw err
      }
    }
  }

  async function confirmRenameImport() {
    const { bytes, newName } = renameDialog
    const trimmed = newName.trim()
    if (!bytes || !trimmed) return
    if (pets.some((p) => p.name === trimmed)) {
      alert(`名称「${trimmed}」已被占用，请换一个`)
      return
    }
    setRenameDialog((prev) => ({ ...prev, open: false }))
    setLoading(`正在以「${trimmed}」导入...`)
    try {
      await tryImportPet(bytes, trimmed)
    } catch (err) {
      alert('导入失败: ' + err)
    } finally {
      setLoading(null)
    }
  }

  async function handleExport(pet: PetInfo) {
    setLoading(`正在导出 ${pet.name}...`)
    try {
      const path = await exportPetToDisk(pet.name)
      alert(`已导出: ${path}`)
    } catch (e) {
      alert('导出失败: ' + e)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">DeskPet Engine</h1>
          <p className="text-sm text-slate-500">
            本地桌宠引擎 · 无需联网
            {appVersion && <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-xs">v{appVersion}</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <input
            ref={importInputRef}
            type="file"
            accept=".pet"
            className="hidden"
            onChange={handleImportFile}
          />
          <button
            onClick={handleImportClick}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50"
          >
            导入 .pet
          </button>
          <button
            onClick={onCreate}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
          >
            创建新宠物
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50"
          >
            设置
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">运行设置</h3>
            <button
              onClick={() => setShowSettings(false)}
              className="text-sm text-slate-500 hover:underline"
            >
              关闭
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-slate-600">宠物透明度</label>
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.05}
                value={settings.opacity}
                onChange={(e) => saveSettingPatch({ opacity: Number(e.target.value) })}
                className="w-full"
              />
              <div className="mt-1 text-xs text-slate-400">{Math.round(settings.opacity * 100)}%</div>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={settings.always_on_top}
                  onChange={(e) => saveSettingPatch({ always_on_top: e.target.checked })}
                />
                宠物始终置顶
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={settings.ignore_mouse}
                  onChange={(e) => saveSettingPatch({ ignore_mouse: e.target.checked })}
                />
                鼠标穿透（不响应点击/拖拽）
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={settings.follow_mouse}
                  onChange={(e) => saveSettingPatch({ follow_mouse: e.target.checked })}
                />
                看向鼠标
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={settings.key_reaction}
                  onChange={(e) => saveSettingPatch({ key_reaction: e.target.checked })}
                />
                按键触发动画
              </label>
            </div>
          </div>
          <div className="mt-4 rounded-lg border border-slate-200 p-3">
            <div className="mb-1 text-sm font-medium text-slate-700">数据目录</div>
            <div className="mb-2 text-xs break-all text-slate-500">{baseDir || '加载中...'}</div>
            <div className="flex gap-2">
              <button
                onClick={handleChangeDataDir}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs hover:bg-slate-50"
              >
                更改目录
              </button>
              {settings.data_dir && (
                <button
                  onClick={resetDataDir}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs hover:bg-slate-50"
                >
                  恢复默认
                </button>
              )}
            </div>
          </div>
          {settings.current_pet && (
            <div className="mt-3 text-xs text-slate-500">当前宠物: {settings.current_pet}</div>
          )}
        </div>
      )}

      {baseDir && (
        <div className="mb-3 text-xs text-slate-400">数据目录: {baseDir}</div>
      )}

      <div className="flex-1 overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        {pets.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-slate-400">
            <p className="mb-2">还没有宠物</p>
            <button
              onClick={onCreate}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
            >
              创建一个
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            <li className="flex items-center justify-between px-5 py-4 hover:bg-slate-50">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-violet-100 text-2xl">
                  🐱
                </div>
                <div>
                  <div className="font-semibold">Live2D 示范猫</div>
                  <div className="text-xs text-slate-500">内置 Live2D 模型 · 无需素材</div>
                </div>
              </div>
              <div className="flex gap-2">
                {live2dRunning ? (
                  <button
                    onClick={handleStopLive2d}
                    className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm text-amber-700 hover:bg-amber-100"
                  >
                    停止
                  </button>
                ) : (
                  <button
                    onClick={handleRunLive2d}
                    className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm text-white hover:bg-violet-700"
                  >
                    运行
                  </button>
                )}
              </div>
            </li>
            {pets.map((pet) => (
              <li
                key={pet.name}
                className="flex items-center justify-between px-5 py-4 hover:bg-slate-50"
              >
                <div className="flex items-center gap-4">
                  {pet.icon ? (
                    <img
                      src={convertFileSrc(pet.icon)}
                      alt="icon"
                      className="h-12 w-12 rounded-lg border border-slate-200 object-contain"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-2xl">
                      🐾
                    </div>
                  )}
                  <div>
                    <div className="font-semibold">{pet.name}</div>
                    <div className="text-xs text-slate-500">
                      v{pet.version} · {pet.author || '匿名'}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {running.has(pet.name) ? (
                    <button
                      onClick={() => handleStop(pet)}
                      className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm text-amber-700 hover:bg-amber-100"
                    >
                      停止
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRun(pet)}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700"
                    >
                      运行
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      if (running.has(pet.name)) {
                        try {
                          await closePetWindow()
                          setRunning(new Set())
                        } catch (e) {
                          console.error('停止运行中宠物失败:', e)
                        }
                      }
                      onEdit(pet.name)
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleExport(pet)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
                  >
                    导出
                  </button>
                  <button
                    onClick={() => handleDelete(pet)}
                    className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                  >
                    删除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="loading-ring" />
          <div className="mt-3 text-sm font-medium text-white">{loading}</div>
        </div>
      )}
      {renameDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
            <h3 className="mb-2 text-lg font-semibold">宠物名称已存在</h3>
            <p className="mb-4 text-sm text-slate-500">
              宠物「{renameDialog.originalName}」已存在，请为该导入宠物指定一个新名称。
            </p>
            <label className="mb-1 block text-sm font-medium text-slate-700">新名称</label>
            <input
              type="text"
              value={renameDialog.newName}
              onChange={(e) => setRenameDialog((prev) => ({ ...prev, newName: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmRenameImport()
              }}
              className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRenameDialog({ open: false, originalName: '', newName: '', bytes: null })}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50"
              >
                取消
              </button>
              <button
                onClick={confirmRenameImport}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
              >
                确认导入
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
