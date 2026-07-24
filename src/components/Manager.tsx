import { useEffect, useRef, useState } from 'react'
import { convertFileSrc } from '@tauri-apps/api/core'
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

  async function handleRunLive2d() {
    try {
      await spawnPetWindow('__live2d__')
      setLive2dRunning(true)
    } catch (e) {
      alert('运行失败: ' + e)
    }
  }

  async function handleStopLive2d() {
    try {
      await closePetWindow()
      setLive2dRunning(false)
    } catch (e) {
      alert('停止失败: ' + e)
    }
  }

  useEffect(() => {
    refresh()
    getBaseDataDir().then(setBaseDir).catch(console.error)
    getSettings().then(setSettings).catch(console.error)
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
      if (
        confirm('是否把当前目录中的宠物迁移到新目录？\n选"取消"则只切换目录，旧宠物保留在原处。')
      ) {
        await migratePets(selected)
      }
      await saveSettingPatch({ data_dir: selected })
      await getBaseDataDir().then(setBaseDir)
      await refresh()
      alert('数据目录已切换: ' + selected)
    } catch (e) {
      alert('切换数据目录失败: ' + e)
    }
  }

  async function resetDataDir() {
    if (!confirm('恢复默认数据目录？当前自定义目录中的宠物不会自动迁移。')) return
    await saveSettingPatch({ data_dir: '' })
    await getBaseDataDir().then(setBaseDir)
    await refresh()
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
    try {
      await spawnPetWindow(pet.name)
      setRunning((prev) => new Set(prev).add(pet.name))
    } catch (e) {
      alert('运行失败: ' + e)
    }
  }

  async function handleStop(pet: PetInfo) {
    try {
      await closePetWindow()
      setRunning((prev) => {
        const next = new Set(prev)
        next.delete(pet.name)
        return next
      })
    } catch (e) {
      alert('停止失败: ' + e)
    }
  }

  async function handleDelete(pet: PetInfo) {
    if (!confirm(`确定删除宠物「${pet.name}」吗？`)) return
    try {
      if (running.has(pet.name)) await handleStop(pet)
      await deletePet(pet.name)
      refresh()
    } catch (e) {
      alert('删除失败: ' + e)
    }
  }

  async function handleImportClick() {
    importInputRef.current?.click()
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const buf = await file.arrayBuffer()
      await importPet(Array.from(new Uint8Array(buf)))
      refresh()
      alert('导入成功')
    } catch (err) {
      alert('导入失败: ' + err)
    } finally {
      e.target.value = ''
    }
  }

  async function handleExport(pet: PetInfo) {
    try {
      const path = await exportPetToDisk(pet.name)
      alert(`已导出: ${path}`)
    } catch (e) {
      alert('导出失败: ' + e)
    }
  }

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">DeskPet Engine</h1>
          <p className="text-sm text-slate-500">本地桌宠引擎 · 无需联网</p>
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
                    onClick={() => onEdit(pet.name)}
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
    </div>
  )
}
