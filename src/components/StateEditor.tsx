import type { EditorStateData } from '../types'

interface StateEditorProps {
  stateKey: string
  state: EditorStateData
  onChange: (patch: Partial<EditorStateData>) => void
  onRemove: () => void
  onFiles: (files: FileList | null) => void
  onRemoveFrame: (id: string) => void
}

export default function StateEditor({ stateKey, state, onChange, onRemove, onFiles, onRemoveFrame }: StateEditorProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="font-semibold capitalize">{stateKey}</div>
        {stateKey !== 'idle' && (
          <button onClick={onRemove} className="text-sm text-red-600 hover:underline">
            删除
          </button>
        )}
      </div>

      <div className="mb-4 grid grid-cols-3 gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-slate-500">FPS</span>
          <input
            type="number"
            min={1}
            max={60}
            value={state.fps}
            onChange={(e) => onChange({ fps: Number(e.target.value) })}
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-500">循环</span>
          <select
            value={state.loop ? 'true' : 'false'}
            onChange={(e) => onChange({ loop: e.target.value === 'true' })}
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5"
          >
            <option value="true">循环</option>
            <option value="false">单次</option>
          </select>
        </label>
        {state.loop && (
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">循环方式</span>
            <select
              value={state.pingpong ? 'pingpong' : 'normal'}
              onChange={(e) => onChange({ pingpong: e.target.value === 'pingpong' })}
              className="w-full rounded-lg border border-slate-300 px-2 py-1.5"
            >
              <option value="normal">直接循环</option>
              <option value="pingpong">往返循环（消除首尾跳变）</option>
            </select>
          </label>
        )}
        {!state.loop && (
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">结束后切换</span>
            <input
              value={state.next || 'idle'}
              onChange={(e) => onChange({ next: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-2 py-1.5"
            />
          </label>
        )}
      </div>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          onFiles(e.dataTransfer.files)
        }}
        className="mb-3 rounded-lg border-2 border-dashed border-slate-300 p-4 text-center text-sm text-slate-500 hover:border-indigo-400 hover:bg-indigo-50/50"
      >
        <label className="cursor-pointer">
          <span className="block">拖拽图片到此处 或 点击上传</span>
          <span className="mt-1 block text-xs text-slate-400">
            可一次选多张 PNG（同角色的不同姿势）· 也可直接上传 GIF 或 MP4，自动拆帧
          </span>
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => onFiles(e.target.files)}
          />
        </label>
      </div>

      {state.frames.length > 0 && (
        <div>
          <div className="mb-1 text-xs text-slate-400">共 {state.frames.length} 帧（按顺序轮播）</div>
          <div className="flex flex-wrap gap-2">
            {state.frames.map((frame, idx) => (
              <div key={frame.id} className="group relative inline-block">
                <img
                  src={frame.previewUrl}
                  alt={`frame-${idx}`}
                  className="h-16 w-16 rounded-lg border border-slate-200 object-contain"
                />
                <span className="absolute bottom-0 left-0 rounded-tr bg-black/50 px-1 text-[10px] text-white">
                  {idx + 1}
                </span>
                <button
                  onClick={() => onRemoveFrame(frame.id)}
                  className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white group-hover:flex"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
