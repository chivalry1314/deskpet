# .pet 文件格式（高级）

`.pet` 文件是 DeskPet 的宠物分享格式，本质上是一个 ZIP 压缩包，只是把后缀从 `.zip` 改成了 `.pet`。

## 文件结构

```
橘猫小咪.pet
├── manifest.json
├── icon.png
├── idle_01.png
├── idle_02.png
├── clicked_01.png
└── clicked_02.png
```

- `manifest.json`：宠物的配置文件，必须存在。
- `icon.png`：可选，管理器中显示的图标。
- `*.png`：各状态的动画帧图。

## manifest.json 字段说明

```json
{
  "name": "橘猫小咪",
  "version": "1.0",
  "author": "用户昵称",
  "window": {
    "width": 150,
    "height": 150,
    "scale": 1.0
  },
  "states": {
    "idle": {
      "frames": ["idle_01.png", "idle_02.png"],
      "fps": 8,
      "loop": true,
      "pingpong": true
    },
    "clicked": {
      "frames": ["clicked_01.png", "clicked_02.png"],
      "fps": 10,
      "loop": false,
      "next": "idle"
    }
  },
  "behavior": {
    "idle_time": [3, 10],
    "walk_speed": 2,
    "edge_bounce": true,
    "drag_physics": true,
    "random_states": ["sleep", "play"],
    "walk_area": "screen"
  },
  "interactions": {
    "on_click": "clicked",
    "on_drag": "drag",
    "on_hover": "idle"
  }
}
```

### 顶层字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `name` | string | 宠物名称，必填 |
| `version` | string | 版本号 |
| `author` | string | 作者名 |
| `window` | object | 悬浮窗尺寸与缩放 |
| `states` | object | 各状态动画配置 |
| `behavior` | object | 行为与随机逻辑 |
| `interactions` | object | 交互触发映射 |

### window

| 字段 | 类型 | 说明 |
|---|---|---|
| `width` | number | 窗口宽度（像素） |
| `height` | number | 窗口高度（像素） |
| `scale` | number | 整体缩放倍数 |

### states

每个状态是一个对象，键名为状态名（如 `idle`、`walk`）。

| 字段 | 类型 | 说明 |
|---|---|---|
| `frames` | string[] | 帧图文件名数组，按顺序播放 |
| `fps` | number | 每秒播放帧数 |
| `loop` | boolean | 是否循环播放 |
| `pingpong` | boolean | 是否往返循环（仅 `loop=true` 时有效） |
| `next` | string | 单次播放结束后切换到的状态（仅 `loop=false` 时有效） |

### behavior

| 字段 | 类型 | 说明 |
|---|---|---|
| `idle_time` | number[] | 待机状态持续的最短、最长时间（秒） |
| `walk_speed` | number | 随机游走速度 |
| `edge_bounce` | boolean | **已废弃，仅保留兼容**。旧版用此字段控制待机结束后随机游走；新版请通过 `random_states` 和 `walk_area` 控制 |
| `drag_physics` | boolean | 是否允许鼠标拖拽 |
| `random_states` | string[] | 待机结束后可能随机进入并播放的状态列表。包含 `walk` 时，宠物会播放 walk 动画 |
| `walk_area` | string | 随机游走范围：`screen`（宠物窗口在屏幕上全屏移动）或 `spot`（只原地播放 walk 动画，不移动窗口） |

### interactions

| 字段 | 类型 | 说明 |
|---|---|---|
| `on_click` | string | 点击时切换的状态 |
| `on_drag` | string | 拖拽时切换的状态（保留字段） |
| `on_hover` | string | 悬停时切换的状态（保留字段） |

## 手动打包 .pet

如果你更习惯用代码或脚本管理素材，可以手动打包：

1. 准备好 `manifest.json` 和所有帧图 PNG。
2. 把它们放入一个文件夹，例如 `my-pet/`。
3. 用压缩工具把文件夹内容打包为 ZIP（不要包含外层文件夹）。
4. 把 `.zip` 后缀改为 `.pet`。

命令行示例（Linux / macOS）：

```bash
cd my-pet
zip -r ../my-pet.pet .
```

Windows 示例（PowerShell）：

```powershell
Compress-Archive -Path "my-pet\*" -DestinationPath "my-pet.zip"
Rename-Item "my-pet.zip" "my-pet.pet"
```

## 手动导入

手动打包的 `.pet` 文件可以直接通过管理器的 **导入 .pet** 按钮导入。

## 注意事项

- `manifest.json` 必须是 UTF-8 编码。
- 帧图文件名在 `manifest.json` 中必须与实际文件名一致。
- 建议所有 PNG 使用透明背景，显示效果更佳。

## 下一步

- [宠物管理：导入/导出](/guide/manage-pets)
- [使用编辑器创建宠物](/guide/create-pet)
