export const STATE_NAME_MAP: Record<string, string> = {
  idle: '待机',
  clicked: '点击',
  walk: '游走',
  typing: '打字',
  sleep: '睡觉',
  play: '玩耍',
  scratch: '挠痒',
  eat: '进食',
  drink: '喝水',
  angry: '生气',
  happy: '开心',
  sad: '难过',
  surprised: '惊讶',
  confused: '困惑',
  drag: '拖拽',
  hover: '悬停',
}

export function getStateName(key: string): string {
  return STATE_NAME_MAP[key] || key
}

export const STATE_PRESETS = [
  'idle',
  'clicked',
  'walk',
  'typing',
  'sleep',
  'play',
  'scratch',
  'eat',
  'drink',
  'angry',
  'happy',
  'sad',
  'surprised',
  'confused',
]

export const STATE_PRESETS_WITH_LABELS = STATE_PRESETS.map((key) => ({
  key,
  label: getStateName(key),
}))
