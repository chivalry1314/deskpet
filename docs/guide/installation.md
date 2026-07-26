# 安装

DeskPet Engine 支持 Windows、macOS 和 Linux。请到 GitHub Release 下载对应系统的安装包。

## 下载地址

打开仓库 Release 页面：

```
https://github.com/baobaobaiphone/deskpet/releases
```

下载最新版本（文件名包含版本号，如 `v0.1.0`）的安装包。

## 各系统安装步骤

### Windows

1. 下载文件名类似 `DeskPet Engine_0.1.0_x64-setup.exe` 的安装包。
2. 双击运行安装向导。
3. 如果 Windows SmartScreen 提示「Windows 已保护你的电脑」，点击「更多信息」→「仍要运行」。

![Windows SmartScreen 放行示意图](/images/windows-smartscreen.svg)

4. 按提示完成安装，打开桌面的 **DeskPet Engine** 图标即可。

> 也可选择下载 `.msi` 安装包进行静默或企业部署。

### macOS

1. 下载文件名类似 `DeskPet Engine_0.1.0_aarch64.dmg`（M 系列芯片）或 `DeskPet Engine_0.1.0_x64.dmg`（Intel）的镜像。
2. 打开 DMG，把应用拖拽到 `Applications` 文件夹。

![macOS 拖拽安装示意图](/images/macos-install.svg)

3. 首次运行可能触发 Gatekeeper，请按以下方式之一放行：
   - 在「访达」→「应用程序」中右键 DeskPet Engine →「打开」。
   - 或在终端执行 `xattr -cr /Applications/DeskPet\ Engine.app` 后重新打开。

### Linux

推荐下载 AppImage，无需安装，双击即可运行：

```bash
# 1. 下载 AppImage
chmod +x "DeskPet Engine_0.1.0_amd64.AppImage"
./"DeskPet Engine_0.1.0_amd64.AppImage"
```

Debian / Ubuntu 用户也可选择 `.deb` 包安装：

```bash
sudo dpkg -i deskpet-engine_0.1.0_amd64.deb
sudo apt-get install -f
```

## 包名对照表

| 系统 | 推荐安装包 | 说明 |
|---|---|---|
| Windows (x64) | `DeskPet Engine_0.1.0_x64-setup.exe` | 图形安装向导 |
| Windows (x64) | `DeskPet Engine_0.1.0_x64_zh-CN.msi` | MSI 安装包 |
| macOS (Apple Silicon) | `DeskPet Engine_0.1.0_aarch64.dmg` | M 系列芯片 |
| macOS (Intel) | `DeskPet Engine_0.1.0_x64.dmg` | Intel 芯片 |
| Linux (x64) | `DeskPet Engine_0.1.0_amd64.AppImage` | 绿色可执行 |
| Linux (x64) | `deskpet-engine_0.1.0_amd64.deb` | Debian / Ubuntu |

## 安装后首次打开

打开软件后，默认进入**宠物管理器**，你会看到内置的「Live2D 示范猫」以及本地宠物列表（初始为空）。

![首次打开管理器示意图](/images/first-launch.png)

## 下一步

- [快速上手：5 分钟跑起第一只宠物](/guide/quick-start)
