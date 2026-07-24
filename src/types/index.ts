export interface WindowConfig {
  width: number
  height: number
  scale: number
}

export interface StateConfig {
  frames: string[]
  fps: number
  loop: boolean
  /** 往返循环：播到末尾后倒放回去，消除首尾帧跳变 */
  pingpong?: boolean
  next?: string
}

export interface BehaviorConfig {
  idle_time: [number, number]
  walk_speed: number
  edge_bounce: boolean
  drag_physics: boolean
  /** 待机结束后随机切换的状态名列表；为空时行为维持原样 */
  random_states?: string[]
}

export interface InteractionConfig {
  on_click: string
  on_drag: string
  on_hover: string
}

export interface Manifest {
  name: string
  version: string
  author: string
  window: WindowConfig
  states: Record<string, StateConfig>
  behavior: BehaviorConfig
  interactions: InteractionConfig
}

export interface PetInfo {
  name: string
  version: string
  author: string
  path: string
  icon?: string
}

export interface FrameFile {
  id: string
  file: File
  previewUrl: string
}

export interface EditorStateData {
  frames: FrameFile[]
  fps: number
  loop: boolean
  pingpong?: boolean
  next?: string
}

export interface EditorData {
  name: string
  version: string
  author: string
  width: number
  height: number
  scale: number
  states: Record<string, EditorStateData>
  behavior: BehaviorConfig
  interactions: InteractionConfig
}

export interface Settings {
  opacity: number
  always_on_top: boolean
  ignore_mouse: boolean
  follow_mouse: boolean
  key_reaction: boolean
  current_pet: string
  /** 自定义数据目录，空字符串表示使用默认目录 */
  data_dir: string
}
