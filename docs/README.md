# DeskPet Engine 文档

本目录存放 DeskPet Engine 的用户文档站点，使用 [VitePress](https://vitepress.dev/) 构建。

## 本地开发

```bash
npm install
npm run docs:dev
```

## 构建

```bash
npm run docs:build
```

构建产物位于 `docs/.vitepress/dist`。

## 部署到 GitHub Pages

仓库已配置 `.github/workflows/docs.yml`。

1. 把本仓库推送到 GitHub。
2. 在仓库设置中启用 GitHub Pages：
   - 进入 **Settings → Pages**
   - **Source** 选择 **GitHub Actions**
3. 每次向 `main` 分支推送 `docs/` 目录的变更，Actions 会自动构建并部署。

> 默认 `base` 路径为 `/deskpet/`，即部署后访问地址形如 `https://<用户名>.github.io/deskpet/`。
> 如果你的仓库名不是 `deskpet`，请修改 `docs/.vitepress/config.ts` 中的 `base` 配置。

## 替换截图

`docs/public/images/` 下的 SVG 图片为示意占位图（主要用于系统弹窗、流程图等无法直接浏览器截取的场景）。

大部分 UI 界面截图已由 `scripts/capture-screenshots.py` 自动从本地开发服务器截取（使用 Playwright + Mock Tauri API）。如果你更新了界面样式，可重新运行：

```bash
npm run dev          # 在另一个终端启动开发服务器
python scripts/capture-screenshots.py
```

脚本会自动把截图保存到 `docs/public/images/`，覆盖同名 PNG 文件。
