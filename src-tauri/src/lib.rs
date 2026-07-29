struct GlobalListenerState {
    enabled: Arc<AtomicBool>,
}

#[cfg(target_os = "windows")]
fn start_global_input_listener(
    app: tauri::AppHandle,
    enabled: Arc<AtomicBool>,
    hwnd: windows::Win32::Foundation::HWND,
) {
    // HWND 包含 *mut c_void，不能跨线程 Send；在线程内通过 isize 句柄值重建
    let hwnd_value = hwnd.0 as isize;
    std::thread::spawn(move || {
        use windows::Win32::Foundation::{HWND, POINT, RECT};
        use windows::Win32::UI::Input::KeyboardAndMouse::GetAsyncKeyState;
        use windows::Win32::UI::WindowsAndMessaging::{
            GetCursorPos, GetWindowRect, PeekMessageW, MSG, PM_NOREMOVE,
        };

        // 在当前线程强制创建消息队列，否则 GetAsyncKeyState 可能始终返回 0
        unsafe {
            let mut msg: MSG = std::mem::zeroed();
            let _ = PeekMessageW(&mut msg, None, 0, 0, PM_NOREMOVE);
        }

        let hwnd = HWND(hwnd_value as *mut core::ffi::c_void);
        let mut last_direction = String::new();
        // 监听常用按键：SPACE, RETURN, 方向键, WASD, 数字键 1-8
        // 不监听鼠标键（LBUTTON/RBUTTON/MIDDLE），否则点击屏幕任何位置都会触发宠物动作
        let keys: [i32; 15] = [
            0x20, 0x0D, 0x25, 0x26, 0x27, 0x28, 0x41, 0x44, 0x53, 0x57, 0x31, 0x32, 0x33, 0x34,
            0x35,
        ];
        let mut key_states = [false; 15];

        loop {
            if !enabled.load(Ordering::Relaxed) {
                std::thread::sleep(std::time::Duration::from_millis(500));
                last_direction.clear();
                continue;
            }

            unsafe {
                let mut point = POINT { x: 0, y: 0 };
                if GetCursorPos(&mut point).is_ok() {
                    let mut rect = RECT { left: 0, top: 0, right: 0, bottom: 0 };
                    if GetWindowRect(hwnd, &mut rect).is_ok() {
                        let center_x = (rect.left + rect.right) / 2;
                        let inside = point.x >= rect.left
                            && point.x <= rect.right
                            && point.y >= rect.top
                            && point.y <= rect.bottom;
                        if !inside {
                            let direction = if point.x < center_x { "left" } else { "right" };
                            if direction != last_direction {
                                last_direction = direction.to_string();
                                let _ = app.emit(
                                    "global-mouse",
                                    serde_json::json!({ "direction": direction }),
                                );
                            }
                        } else if !last_direction.is_empty() {
                            // 鼠标进入窗口范围时重置，避免离开时立即重复发送同一方向
                            last_direction.clear();
                        }
                    }
                }

                for (i, vk) in keys.iter().enumerate() {
                    let state = GetAsyncKeyState(*vk);
                    let pressed = state < 0;
                    if pressed && !key_states[i] {
                        key_states[i] = true;
                        let _ = app.emit("global-key", serde_json::json!({ "vk": *vk }));
                    } else if !pressed && key_states[i] {
                        key_states[i] = false;
                    }
                }
            }
            std::thread::sleep(std::time::Duration::from_millis(50));
        }
    });
}

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if let Some(main) = app.get_webview_window("main") {
                let _ = main.set_title("DeskPet Engine");
            }
            if let Some(pet) = app.get_webview_window("pet") {
                let _ = pet.hide();
            }

            // Load and apply settings
            let settings = load_settings(app.handle()).unwrap_or_else(|_| Settings {
                opacity: 1.0,
                always_on_top: true,
                ignore_mouse: false,
                follow_mouse: true,
                key_reaction: true,
                current_pet: String::new(),
                data_dir: String::new(),
            });
            apply_settings(app.handle(), &settings);

            // Start global input listener (disabled until pet window is shown) [Windows only]
            #[cfg(target_os = "windows")]
            {
                let listener_enabled = Arc::new(AtomicBool::new(false));
                app.manage(GlobalListenerState {
                    enabled: listener_enabled.clone(),
                });
                let pet = app.get_webview_window("pet").ok_or("pet window not found")?;
                let hwnd = pet.hwnd().map_err(|e| e.to_string())?;
                start_global_input_listener(app.handle().clone(), listener_enabled, hwnd);
            }

            #[cfg(not(target_os = "windows"))]
            {
                // 非 Windows 平台不管理 GlobalListenerState，spawn/close 中 try_state 会自然返回 None
                let _ = app;
            }

            // System tray
            let menu = tauri::menu::MenuBuilder::new(app)
                .item(&tauri::menu::MenuItemBuilder::new("显示主窗口").id("show").build(app)?)
                .item(&tauri::menu::MenuItemBuilder::new("隐藏宠物").id("toggle_pet").build(app)?)
                .separator()
                .item(&tauri::menu::MenuItemBuilder::new("退出").id("quit").build(app)?)
                .build()?;

            let tray = tauri::tray::TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "show" => {
                        if let Some(win) = app.get_webview_window("main") {
                            let _ = win.show();
                            let _ = win.set_focus();
                        }
                    }
                    "toggle_pet" => {
                        if let Some(pet) = app.get_webview_window("pet") {
                            if let Ok(visible) = pet.is_visible() {
                                if visible {
                                    let _ = pet.hide();
                                } else {
                                    let _ = pet.show();
                                }
                            }
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .build(app)?;
            let _ = tray;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            list_local_pets,
            load_pet,
            save_pet,
            delete_pet,
            spawn_pet_window,
            close_pet_window,
            export_pet,
            export_pet_to_disk,
            import_pet,
            load_pet_image,
            get_base_data_dir,
            get_model_dir,
            migrate_pets,
            get_settings,
            save_settings,
        ])
        .plugin(tauri_plugin_dialog::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn settings_path(app: &tauri::AppHandle) -> std::path::PathBuf {
    let mut base = app.path().app_data_dir().expect("app_data_dir");
    base.push("DeskPet");
    base.push("settings.json");
    base
}

/// 有效数据目录：用户自定义或默认 app_data/DeskPet
fn base_dir(app: &tauri::AppHandle) -> std::path::PathBuf {
    if let Ok(settings) = load_settings(app) {
        if !settings.data_dir.is_empty() {
            let custom = std::path::PathBuf::from(&settings.data_dir);
            if custom.is_absolute() {
                return custom;
            }
        }
    }
    let mut base = app.path().app_data_dir().expect("app_data_dir");
    base.push("DeskPet");
    base
}

fn deskpet_dir(app: &tauri::AppHandle) -> std::path::PathBuf {
    base_dir(app).join("pets")
}

#[tauri::command]
fn get_base_data_dir(app: tauri::AppHandle) -> Result<String, String> {
    Ok(base_dir(&app).to_string_lossy().to_string())
}

/// 返回内置 Live2D 模型目录。
/// dev 模式下资源未打包，直接用源码目录；release 模式用 resource_dir。
#[tauri::command]
fn get_model_dir(app: tauri::AppHandle) -> Result<String, String> {
    #[cfg(debug_assertions)]
    {
        let dev_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("assets/models/standard");
        if dev_path.exists() {
            return Ok(dev_path.to_string_lossy().to_string());
        }
    }
    let dir = app
        .path()
        .resource_dir()
        .map_err(|e| e.to_string())?
        .join("assets/models/standard");
    Ok(dir.to_string_lossy().to_string())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    #[serde(default = "default_opacity")]
    pub opacity: f64,
    #[serde(default = "default_bool::<true>")]
    pub always_on_top: bool,
    #[serde(default = "default_bool::<false>")]
    pub ignore_mouse: bool,
    #[serde(default = "default_bool::<true>")]
    pub follow_mouse: bool,
    #[serde(default = "default_bool::<true>")]
    pub key_reaction: bool,
    #[serde(default)]
    pub current_pet: String,
    /// 用户自定义数据目录（宠物、导出文件存放处），空字符串表示使用默认目录
    #[serde(default)]
    pub data_dir: String,
}

fn default_opacity() -> f64 {
    1.0
}
fn default_bool<const V: bool>() -> bool {
    V
}

fn load_settings(app: &tauri::AppHandle) -> Result<Settings, String> {
    let path = settings_path(app);
    if !path.exists() {
        return Ok(Settings {
            opacity: 1.0,
            always_on_top: true,
            ignore_mouse: false,
            follow_mouse: true,
            key_reaction: true,
            current_pet: String::new(),
            data_dir: String::new(),
        });
    }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_settings(app: tauri::AppHandle) -> Result<Settings, String> {
    load_settings(&app)
}

#[tauri::command]
fn save_settings(app: tauri::AppHandle, settings: Settings) -> Result<(), String> {
    let path = settings_path(&app);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())?;
    apply_settings(&app, &settings);
    Ok(())
}

fn apply_settings(app: &tauri::AppHandle, settings: &Settings) {
    if let Some(pet) = app.get_webview_window("pet") {
        let _ = pet.set_always_on_top(settings.always_on_top);
        let _ = pet.set_ignore_cursor_events(settings.ignore_mouse);
        // Opacity is applied via CSS in the frontend
    }
}

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::io::{Read, Write};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{Emitter, Manager};
use zip::write::SimpleFileOptions;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowConfig {
    pub width: u32,
    pub height: u32,
    pub scale: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateConfig {
    pub frames: Vec<String>,
    pub fps: u32,
    #[serde(rename = "loop")]
    pub loop_: bool,
    /// 往返循环：播到末尾后倒放回去，消除首尾帧跳变
    #[serde(default)]
    pub pingpong: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BehaviorConfig {
    pub idle_time: Vec<u32>,
    pub walk_speed: u32,
    pub edge_bounce: bool,
    pub drag_physics: bool,
    /// 待机结束后随机进入的状态名列表（如 sleep/play/scratch）
    #[serde(default)]
    pub random_states: Vec<String>,
    /// 随机游走范围：screen=全屏移动，spot=原地播放 walk 动画不移动窗口，默认 screen
    #[serde(default = "default_walk_area")]
    pub walk_area: String,
}

fn default_walk_area() -> String {
    "screen".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InteractionConfig {
    pub on_click: String,
    pub on_drag: String,
    pub on_hover: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Manifest {
    pub name: String,
    pub version: String,
    pub author: String,
    pub window: WindowConfig,
    pub states: HashMap<String, StateConfig>,
    pub behavior: BehaviorConfig,
    pub interactions: InteractionConfig,
}

#[derive(Debug, Clone, Serialize)]
pub struct PetInfo {
    pub name: String,
    pub version: String,
    pub author: String,
    pub path: String,
    pub icon: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SavePetPayload {
    pub config: Manifest,
    pub images: Vec<Vec<u8>>,
    pub image_names: Vec<String>,
}

#[tauri::command]
fn list_local_pets(app: tauri::AppHandle) -> Result<Vec<PetInfo>, String> {
    let pets_dir = deskpet_dir(&app);
    fs::create_dir_all(&pets_dir).map_err(|e| e.to_string())?;
    let mut list = Vec::new();
    for entry in fs::read_dir(&pets_dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        let manifest_path = path.join("manifest.json");
        if !manifest_path.exists() {
            continue;
        }
        let content = fs::read_to_string(&manifest_path).map_err(|e| e.to_string())?;
        let manifest: Manifest = serde_json::from_str(&content).map_err(|e| e.to_string())?;
        let icon = manifest
            .states
            .values()
            .flat_map(|s| s.frames.iter())
            .next()
            .cloned();
        list.push(PetInfo {
            name: manifest.name.clone(),
            version: manifest.version.clone(),
            author: manifest.author.clone(),
            path: path.to_string_lossy().to_string(),
            icon: icon.map(|n| path.join(n).to_string_lossy().to_string()),
        });
    }
    Ok(list)
}

#[tauri::command]
fn load_pet(app: tauri::AppHandle, pet_name: String) -> Result<Manifest, String> {
    let path = deskpet_dir(&app).join(&pet_name).join("manifest.json");
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let manifest: Manifest = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    Ok(manifest)
}

#[tauri::command]
fn save_pet(app: tauri::AppHandle, payload: SavePetPayload) -> Result<(), String> {
    let pet_dir = deskpet_dir(&app).join(&payload.config.name);
    fs::create_dir_all(&pet_dir).map_err(|e| e.to_string())?;

    // remove old frames to avoid stale files
    for entry in fs::read_dir(&pet_dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let p = entry.path();
        if p.extension().and_then(|s| s.to_str()) == Some("png") {
            let _ = fs::remove_file(p);
        }
    }

    for (bytes, name) in payload.images.iter().zip(payload.image_names.iter()) {
        fs::write(pet_dir.join(name), bytes).map_err(|e| e.to_string())?;
    }

    let manifest_path = pet_dir.join("manifest.json");
    let json = serde_json::to_string_pretty(&payload.config).map_err(|e| e.to_string())?;
    fs::write(&manifest_path, json).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_pet(app: tauri::AppHandle, pet_name: String) -> Result<(), String> {
    let path = deskpet_dir(&app).join(&pet_name);
    if path.exists() {
        fs::remove_dir_all(&path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn load_pet_image(app: tauri::AppHandle, pet_name: String, image_name: String) -> Result<Vec<u8>, String> {
    let path = deskpet_dir(&app).join(&pet_name).join(&image_name);
    fs::read(&path).map_err(|e| e.to_string())
}

fn build_pet_zip(src_dir: &std::path::Path) -> Result<Vec<u8>, String> {
    let mut buffer = Vec::new();
    {
        let mut zip = zip::ZipWriter::new(std::io::Cursor::new(&mut buffer));
        let options = SimpleFileOptions::default()
            .compression_method(zip::CompressionMethod::Deflated)
            .unix_permissions(0o644);

        for entry in walkdir::WalkDir::new(src_dir) {
            let entry = entry.map_err(|e| e.to_string())?;
            let path = entry.path();
            if path.is_file() {
                let name = path
                    .strip_prefix(src_dir)
                    .map_err(|e| e.to_string())?
                    .to_string_lossy()
                    .to_string();
                zip.start_file(name, options).map_err(|e| e.to_string())?;
                let bytes = fs::read(path).map_err(|e| e.to_string())?;
                zip.write_all(&bytes).map_err(|e| e.to_string())?;
            }
        }
        zip.finish().map_err(|e| e.to_string())?;
    }
    Ok(buffer)
}

#[tauri::command]
fn export_pet(app: tauri::AppHandle, pet_name: String) -> Result<Vec<u8>, String> {
    let src_dir = deskpet_dir(&app).join(&pet_name);
    if !src_dir.exists() {
        return Err("pet not found".to_string());
    }
    build_pet_zip(&src_dir)
}

/// 导出 .pet 到 数据目录/DeskPet/exports/ 并在文件管理器中显示，返回文件路径。
/// （webview 里 a.click() 触发 blob 下载默认不生效，所以走磁盘直写）
#[tauri::command]
fn export_pet_to_disk(app: tauri::AppHandle, pet_name: String) -> Result<String, String> {
    let src_dir = deskpet_dir(&app).join(&pet_name);
    if !src_dir.exists() {
        return Err("pet not found".to_string());
    }
    let bytes = build_pet_zip(&src_dir)?;
    let export_dir = deskpet_dir(&app)
        .parent()
        .ok_or("invalid data dir")?
        .join("exports");
    fs::create_dir_all(&export_dir).map_err(|e| e.to_string())?;
    let out_path = export_dir.join(format!("{}.pet", pet_name));
    fs::write(&out_path, bytes).map_err(|e| e.to_string())?;

    // 在文件管理器中选中导出的文件（失败不影响导出结果）
    #[cfg(target_os = "windows")]
    {
        let _ = std::process::Command::new("explorer")
            .arg(format!("/select,{}", out_path.display()))
            .spawn();
    }
    #[cfg(target_os = "macos")]
    {
        let _ = std::process::Command::new("open")
            .arg("-R")
            .arg(&out_path)
            .spawn();
    }
    #[cfg(target_os = "linux")]
    {
        let _ = std::process::Command::new("xdg-open")
            .arg(&export_dir)
            .spawn();
    }

    Ok(out_path.to_string_lossy().to_string())
}

/// 把当前数据目录下的 pets 文件夹内容复制到新数据目录，用于用户切换数据目录时迁移已有宠物。
#[tauri::command]
fn migrate_pets(app: tauri::AppHandle, new_base: String) -> Result<(), String> {
    let new_base = std::path::PathBuf::from(new_base);
    if !new_base.is_absolute() {
        return Err("请选择绝对路径".to_string());
    }
    let old_pets = deskpet_dir(&app);
    let new_pets = new_base.join("pets");
    if old_pets == new_pets {
        return Ok(());
    }
    fs::create_dir_all(&new_pets).map_err(|e| e.to_string())?;
    if !old_pets.exists() {
        return Ok(());
    }
    for entry in walkdir::WalkDir::new(&old_pets) {
        let entry = entry.map_err(|e| e.to_string())?;
        let src = entry.path();
        if src.is_file() {
            let rel = src.strip_prefix(&old_pets).map_err(|e| e.to_string())?;
            let dst = new_pets.join(rel);
            if let Some(parent) = dst.parent() {
                fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }
            fs::copy(src, dst).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
fn import_pet(app: tauri::AppHandle, bytes: Vec<u8>, new_name: Option<String>) -> Result<(), String> {
    let mut archive = zip::ZipArchive::new(std::io::Cursor::new(&bytes)).map_err(|e| e.to_string())?;

    // Read manifest first to determine pet name
    let mut manifest_content = String::new();
    {
        let mut mf = archive
            .by_name("manifest.json")
            .map_err(|e| e.to_string())?;
        mf.read_to_string(&mut manifest_content)
            .map_err(|e| e.to_string())?;
    }
    let mut manifest: Manifest = serde_json::from_str(&manifest_content).map_err(|e| e.to_string())?;
    let original_name = manifest.name.clone();
    let target_name = new_name.as_ref().unwrap_or(&original_name).to_string();

    // If user provided a new name, update the manifest so the pet displays with that name
    if let Some(ref name) = new_name {
        manifest.name = name.clone();
    }

    let target_dir = deskpet_dir(&app).join(&target_name);

    // Prevent silent overwrite of an existing local pet
    if target_dir.exists() && target_dir.read_dir().map_err(|e| e.to_string())?.count() > 0 {
        return Err(format!(
            "宠物「{}」已存在，请先删除或重命名后再导入",
            original_name
        ));
    }

    fs::create_dir_all(&target_dir).map_err(|e| e.to_string())?;

    for i in 0..archive.len() {
        let mut item = archive.by_index(i).map_err(|e| e.to_string())?;
        if item.is_dir() {
            continue;
        }
        let out = target_dir.join(item.name());
        if let Some(parent) = out.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        if item.name() == "manifest.json" {
            let json = serde_json::to_string_pretty(&manifest).map_err(|e| e.to_string())?;
            fs::write(&out, json).map_err(|e| e.to_string())?;
        } else {
            let mut buf = Vec::new();
            item.read_to_end(&mut buf).map_err(|e| e.to_string())?;
            fs::write(&out, buf).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

fn percent_encode(input: &str) -> String {
    input
        .bytes()
        .map(|b| {
            if b.is_ascii_alphanumeric() || b == b'-' || b == b'_' || b == b'.' || b == b'~' {
                char::from(b).to_string()
            } else {
                format!("%{:02X}", b)
            }
        })
        .collect()
}

#[tauri::command]
fn spawn_pet_window(app: tauri::AppHandle, pet_name: String) -> Result<(), String> {
    if let Some(state) = app.try_state::<GlobalListenerState>() {
        state.enabled.store(true, Ordering::Relaxed);
    }
    let window = app.get_webview_window("pet").ok_or("pet window not found")?;
    // Live2D 示例模式：无需加载 manifest，直接使用固定尺寸
    let (width, height) = if pet_name == "__live2d__" {
        (260.0_f64, 260.0_f64)
    } else {
        let manifest = load_pet(app.clone(), pet_name.clone())?;
        (manifest.window.width as f64, manifest.window.height as f64)
    };

    window
        .set_size(tauri::Size::Logical(tauri::LogicalSize::new(width, height)))
        .map_err(|e| e.to_string())?;

    // 将宠物窗口置于当前工作区中央（按显示器缩放因子换算物理像素）
    if let Some(monitor) = window.current_monitor().map_err(|e| e.to_string())? {
        let scale = window.scale_factor().map_err(|e| e.to_string())?;
        let physical_width = (width * scale) as i32;
        let physical_height = (height * scale) as i32;
        let work_area = monitor.work_area();
        let x = work_area.position.x + (work_area.size.width as i32 - physical_width) / 2;
        let y = work_area.position.y + (work_area.size.height as i32 - physical_height) / 2;
        window
            .set_position(tauri::Position::Physical(tauri::PhysicalPosition::new(x, y)))
            .map_err(|e| e.to_string())?;
    }

    // hash 与当前相同不会触发 hashchange，Viewer 不会重载 manifest，需强制刷新
    let js = format!(
        "(function(){{var t='#/viewer?petName={}';if(window.location.hash===t){{window.location.reload();}}else{{window.location.hash=t;}}}})();",
        percent_encode(&pet_name)
    );
    window.eval(&js).map_err(|e| e.to_string())?;
    window.show().map_err(|e| e.to_string())?;

    // Persist current pet
    if let Ok(mut settings) = load_settings(&app) {
        settings.current_pet = pet_name.clone();
        let _ = save_settings(app, settings);
    }

    Ok(())
}

#[tauri::command]
fn close_pet_window(_app: tauri::AppHandle) -> Result<(), String> {
    if let Some(state) = _app.try_state::<GlobalListenerState>() {
        state.enabled.store(false, Ordering::Relaxed);
    }
    if let Some(window) = _app.get_webview_window("pet") {
        window.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}
