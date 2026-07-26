import json
import base64
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
PET_DIR = ROOT / "examples" / "demo-cat"
MANIFEST = json.loads((PET_DIR / "manifest.json").read_text(encoding="utf-8"))

# Encode demo cat frames as data URLs for mock convertFileSrc / load_pet_image
IMAGES = {}
IMAGE_DATA_URLS = {}
for f in PET_DIR.glob("*.png"):
    data = f.read_bytes()
    b64 = base64.b64encode(data).decode()
    IMAGES[f.name] = data
    IMAGE_DATA_URLS[f.name] = f"data:image/png;base64,{b64}"


def build_mock():
    """Return a JS string that mocks window.__TAURI_INTERNALS__."""
    manifest_json = json.dumps(MANIFEST, ensure_ascii=False)
    image_data = {name: url for name, url in IMAGE_DATA_URLS.items()}
    image_data_json = json.dumps(image_data, ensure_ascii=False)
    pet_info = json.dumps(
        {
            "name": MANIFEST["name"],
            "version": MANIFEST["version"],
            "author": MANIFEST["author"],
            "path": "C:/Users/DeskPet/AppData/Roaming/DeskPet/pets/" + MANIFEST["name"],
            "icon": "idle_01.png",
        },
        ensure_ascii=False,
    )
    default_settings = json.dumps(
        {
            "opacity": 1.0,
            "always_on_top": True,
            "ignore_mouse": False,
            "follow_mouse": True,
            "key_reaction": True,
            "current_pet": "",
            "data_dir": "",
        },
        ensure_ascii=False,
    )
    return f"""
(() => {{
  const manifest = {manifest_json};
  const imageDataUrls = {image_data_json};
  const petInfo = {pet_info};
  const defaultSettings = {default_settings};
  window.__TAURI_INTERNALS__ = {{
    invoke: async (cmd, args) => {{
      if (cmd === 'list_local_pets') return [petInfo];
      if (cmd === 'get_base_data_dir') return 'C:/\\\\Users\\\\DeskPet/AppData/Roaming/DeskPet';
      if (cmd === 'get_settings') return defaultSettings;
      if (cmd === 'get_model_dir') return 'assets/models/standard';
      if (cmd === 'load_pet') return manifest;
      if (cmd === 'load_pet_image') {{
        const name = args && args.imageName;
        if (imageDataUrls[name]) {{
          const b64 = imageDataUrls[name].split(',')[1];
          const bytes = atob(b64).split('').map(c => c.charCodeAt(0));
          return bytes;
        }}
        return [];
      }}
      if (cmd === 'save_pet') return null;
      if (cmd === 'delete_pet') return null;
      if (cmd === 'spawn_pet_window') return null;
      if (cmd === 'close_pet_window') return null;
      if (cmd === 'export_pet') return [];
      if (cmd === 'export_pet_to_disk') return 'C:/\\\\Users\\\\DeskPet/exports/' + manifest.name + '.pet';
      if (cmd === 'import_pet') return null;
      if (cmd === 'migrate_pets') return null;
      if (cmd === 'save_settings') return null;
      return null;
    }},
    transformCallback: (cb) => {{
      return 'cb_' + Math.random().toString(36).slice(2);
    }},
    convertFileSrc: (filePath) => {{
      const name = filePath.split('/').pop().split('\\\\\\\\').pop();
      return imageDataUrls[name] || '';
    }},
    unregisterCallback: () => {{}}
  }};
}})();
"""


def capture():
    out_dir = ROOT / "docs" / "public" / "images" / "screenshots"
    out_dir.mkdir(parents=True, exist_ok=True)
    base_url = "http://127.0.0.1:5173/index.html"
    mock = build_mock()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1200, "height": 800})
        page = context.new_page()
        page.add_init_script(mock)

        # Manager with demo-cat pet
        page.goto(f"{base_url}#/manager")
        page.wait_for_timeout(1200)
        page.screenshot(path=str(out_dir / "manager-overview.png"))

        # First launch variant: no mock pet, only Live2D (open fresh page without mock list)
        page2 = context.new_page()
        page2.add_init_script(
            mock.replace("if (cmd === 'list_local_pets') return [petInfo];", "if (cmd === 'list_local_pets') return [];")
        )
        page2.goto(f"{base_url}#/manager")
        page2.wait_for_timeout(1200)
        page2.screenshot(path=str(out_dir / "first-launch.png"))
        page2.close()

        # Open settings
        page.locator("button:has-text('设置')").click()
        page.wait_for_timeout(500)
        page.screenshot(path=str(out_dir / "settings-panel.png"))
        page.keyboard.press("Escape")
        page.wait_for_timeout(300)

        # Open editor for demo-cat
        page.locator("button:has-text('编辑')").first.click()
        page.wait_for_timeout(1200)
        page.screenshot(path=str(out_dir / "editor-open.png"))
        page.screenshot(path=str(out_dir / "editor-layout.png"))

        # Basic info tab
        page.locator("nav button:has-text('基本信息')").click()
        page.wait_for_timeout(400)
        page.screenshot(path=str(out_dir / "editor-basic-info.png"))

        # States tab
        page.locator("nav button:has-text('状态管理')").click()
        page.wait_for_timeout(400)
        # AI prompt button visible before opening panel
        page.screenshot(path=str(out_dir / "ai-prompt-button.png"))
        page.screenshot(path=str(out_dir / "editor-upload-frames.png"))
        page.screenshot(path=str(out_dir / "editor-state-config.png"))

        # Focused frame order screenshot (idle frames thumbnails)
        frame_list = page.locator("text=idle").first.locator("..").locator("img")
        if frame_list.count() > 0:
            page.locator("text=共 2 帧").first.scroll_into_view_if_needed()
            page.wait_for_timeout(200)
        page.screenshot(path=str(out_dir / "editor-frames-order.png"))

        # AI prompt panel
        page.locator("button:has-text('AI 生成提示词')").click()
        page.wait_for_timeout(500)
        page.screenshot(path=str(out_dir / "ai-prompt-panel.png"))
        page.locator("button:has-text('AI 生成提示词')").click()  # close
        page.wait_for_timeout(300)

        # Add state button (click to show prompt)
        page.locator("button:has-text('+ 添加状态')").click()
        page.wait_for_timeout(300)
        page.screenshot(path=str(out_dir / "editor-add-state.png"))
        page.keyboard.press("Escape")
        page.wait_for_timeout(300)

        # Behavior tab
        page.locator("nav button:has-text('行为配置')").click()
        page.wait_for_timeout(400)
        page.screenshot(path=str(out_dir / "editor-behavior-config.png"))

        # Preview tab
        page.locator("nav button:has-text('实时预览')").click()
        page.wait_for_timeout(800)
        page.screenshot(path=str(out_dir / "editor-preview.png"))

        # Save button focus (basic info tab, where save button is always visible)
        page.locator("nav button:has-text('基本信息')").click()
        page.wait_for_timeout(200)
        page.screenshot(path=str(out_dir / "editor-save.png"))

        # Back to manager
        page.locator("button:has-text('← 返回')").click()
        page.wait_for_timeout(800)

        # Run pet (hover/run button)
        page.locator("button:has-text('运行')").nth(1).click()
        page.wait_for_timeout(1000)
        page.screenshot(path=str(out_dir / "run-pet.png"))

        # Create new pet
        page.locator("button:has-text('创建新宠物')").click()
        page.wait_for_timeout(1000)
        page.screenshot(path=str(out_dir / "create-pet-button.png"))

        # Viewer route with demo-cat (browser-only, transparent window cannot be captured)
        page3 = context.new_page()
        page3.add_init_script(mock)
        page3.set_viewport_size({"width": 400, "height": 400})
        page3.add_init_script("""
        document.addEventListener('DOMContentLoaded', () => {
          document.documentElement.classList.add('viewer-root');
          document.body.classList.add('viewer-root');
          document.body.style.background = 'linear-gradient(45deg, #e2e8f0 25%, #f1f5f9 25%, #f1f5f9 50%, #e2e8f0 50%, #e2e8f0 75%, #f1f5f9 75%, #f1f5f9 100%)';
          document.body.style.backgroundSize = '20px 20px';
        });
        """)
        page3.goto(f"{base_url}#/viewer?petName={MANIFEST['name']}")
        page3.wait_for_timeout(1500)
        # Right-click on the pet image to trigger context menu
        page3.mouse.click(200, 200, button='right')
        page3.wait_for_timeout(400)
        page3.screenshot(path=str(out_dir / "viewer-context-menu.png"))

        browser.close()


if __name__ == "__main__":
    capture()
    print("Screenshots captured.")
