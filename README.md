# DeskPet Engine

一个全本地运行的开源桌宠自定义引擎。用户上传自己的图片、配置动作状态，即可在桌面生成可交互的悬浮宠物。无需联网、无需注册、无服务器。

📖 [在线文档](https://baobaobaiphone.github.io/deskpet/)

## 技术栈

- **Tauri v2** (Rust + Web 前端)
- **React + TypeScript**
- **Tailwind CSS**

## 功能 (MVP)

- 宠物编辑器：创建/编辑宠物、上传帧图、配置状态与行为、实时预览
- 宠物运行器：透明无边框悬浮窗、循环动画、点击反馈、拖拽移动
- 宠物管理：本地宠物库、运行/停止、导入/导出 `.pet` 文件

## 文件格式 `.pet`

`.pet` 本质上是 ZIP 压缩包，内部包含 `manifest.json` 与各状态 PNG 帧图。

```
橘猫小咪.pet
├── manifest.json
├── idle_01.png
├── idle_02.png
├── clicked_01.png
└── ...
```

## 开发与构建

```bash
npm install
npm run tauri:dev      # 开发调试
npm run tauri:build    # 本地打包应用
```

## 自动发布到 GitHub Release

仓库已配置 `.github/workflows/release.yml`。推送 `v*` 标签后，GitHub Actions 会自动在 Windows、macOS、Linux 上编译并生成可下载的安装包。

```bash
git add .
git commit -m "release v0.1.0"
git tag v0.1.0
git push origin main v0.1.0
```

推送标签后，进入仓库的 **Actions** 页面查看构建进度；完成后在 **Releases** 页面下载对应系统的安装包。

### 下载包名对照

| 系统 | 文件名示例 | 说明 |
|------|-----------|------|
| Windows (x64) | `DeskPet Engine_0.1.0_x64-setup.exe` | 推荐，图形安装向导 |
| Windows (x64) | `DeskPet Engine_0.1.0_x64_zh-CN.msi` | MSI 安装包 |
| macOS (Apple Silicon / M1+) | `DeskPet Engine_0.1.0_aarch64.dmg` | 适用于 M 系列芯片 |
| macOS (Intel) | `DeskPet Engine_0.1.0_x64.dmg` | 适用于 Intel Mac |
| Linux (x64) | `deskpet-engine_0.1.0_amd64.AppImage` | 绿色可执行，无需安装 |
| Linux (x64) | `deskpet-engine_0.1.0_amd64.deb` | Debian / Ubuntu 安装包 |

> 文件名中的 `x64` 在 Windows/macOS 里通常代表 Intel/AMD 64 位；`aarch64` 代表 Apple Silicon；`amd64` 代表 Linux 64 位。

## 数据目录

- Windows: `%APPDATA%/DeskPet/`
- macOS: `~/Library/Application Support/DeskPet/`
- Linux: `~/.config/DeskPet/`

## 协议

MIT
