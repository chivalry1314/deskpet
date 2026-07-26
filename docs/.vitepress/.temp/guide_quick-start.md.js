import { ssrRenderAttrs, ssrRenderAttr } from "vue/server-renderer";
import { _ as _imports_0, a as _imports_3 } from "./import-pet.Cq09XL4d.js";
import { _ as _imports_1$1 } from "./viewer-context-menu.D7Yeth-z.js";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const _imports_1 = "/deskpet/images/run-live2d.svg";
const _imports_4 = "/deskpet/images/create-pet-button.png";
const __pageData = JSON.parse('{"title":"快速上手","description":"","frontmatter":{},"headers":[],"relativePath":"guide/quick-start.md","filePath":"guide/quick-start.md","lastUpdated":null}');
const _sfc_main = { name: "guide/quick-start.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="快速上手" tabindex="-1">快速上手 <a class="header-anchor" href="#快速上手" aria-label="Permalink to &quot;快速上手&quot;">​</a></h1><p>本指南将带你用内置的 Live2D 示范猫和示例宠物，在 5 分钟内跑起第一只桌宠。</p><h2 id="_1-启动软件" tabindex="-1">1. 启动软件 <a class="header-anchor" href="#_1-启动软件" aria-label="Permalink to &quot;1. 启动软件&quot;">​</a></h2><p>安装并打开 DeskPet Engine，进入宠物管理器。你会看到以下界面：</p><p><img${ssrRenderAttr("src", _imports_0)} alt="宠物管理器界面"></p><p>界面说明：</p><ul><li><strong>左侧/上方</strong>：宠物列表，包括「Live2D 示范猫」和你自己创建的宠物。</li><li><strong>右侧按钮</strong>：运行、编辑、导出、删除。</li><li><strong>右上角</strong>：导入 <code>.pet</code>、创建新宠物、设置。</li></ul><h2 id="_2-运行内置-live2d-示范猫" tabindex="-1">2. 运行内置 Live2D 示范猫 <a class="header-anchor" href="#_2-运行内置-live2d-示范猫" aria-label="Permalink to &quot;2. 运行内置 Live2D 示范猫&quot;">​</a></h2><p>点击「Live2D 示范猫」右侧的 <strong>运行</strong> 按钮，桌面会弹出一个透明悬浮窗，一只猫出现在屏幕中央。</p><p><img${ssrRenderAttr("src", _imports_1)} alt="运行 Live2D 示范猫"></p><h2 id="_3-与宠物互动" tabindex="-1">3. 与宠物互动 <a class="header-anchor" href="#_3-与宠物互动" aria-label="Permalink to &quot;3. 与宠物互动&quot;">​</a></h2><p>在宠物窗口上：</p><ul><li><strong>鼠标点击</strong>：触发点击反馈动作。</li><li><strong>按住拖拽</strong>：把宠物移动到屏幕任意位置。</li><li><strong>右键菜单</strong>：可「水平翻转」或「关闭宠物」。</li></ul><p><img${ssrRenderAttr("src", _imports_1$1)} alt="宠物右键菜单"></p><h2 id="_4-导入示例宠物-可选" tabindex="-1">4. 导入示例宠物（可选） <a class="header-anchor" href="#_4-导入示例宠物-可选" aria-label="Permalink to &quot;4. 导入示例宠物（可选）&quot;">​</a></h2><p>仓库里的 <code>examples/demo-cat.pet</code> 是一个帧图宠物示例。你可以：</p><ol><li>在管理器右上角点击 <strong>导入 .pet</strong>。</li><li>选择 <code>demo-cat.pet</code> 文件。</li><li>导入成功后，列表里会出现「橘猫小咪」。</li><li>点击 <strong>运行</strong> 即可。</li></ol><p><img${ssrRenderAttr("src", _imports_3)} alt="导入 .pet 文件"></p><h2 id="_5-创建自己的宠物" tabindex="-1">5. 创建自己的宠物 <a class="header-anchor" href="#_5-创建自己的宠物" aria-label="Permalink to &quot;5. 创建自己的宠物&quot;">​</a></h2><p>想用自己的角色图？点击右上角 <strong>创建新宠物</strong>，进入编辑器：</p><p><img${ssrRenderAttr("src", _imports_4)} alt="创建新宠物入口"></p><p>编辑器会引导你完成：</p><ol><li>填写宠物名称、作者、窗口尺寸。</li><li>在「状态管理」里上传 idle（待机）等状态的图片。</li><li>调整 FPS、循环方式。</li><li>点击「保存到本地」。</li></ol><p>更详细的步骤请参考 <a href="/deskpet/guide/create-pet.html">使用编辑器创建宠物</a>。</p><h2 id="下一步" tabindex="-1">下一步 <a class="header-anchor" href="#下一步" aria-label="Permalink to &quot;下一步&quot;">​</a></h2><ul><li><a href="/deskpet/guide/create-pet.html">使用编辑器创建宠物</a></li><li><a href="/deskpet/guide/run-pet.html">运行桌宠的更多技巧</a></li></ul></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("guide/quick-start.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const quickStart = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  quickStart as default
};
