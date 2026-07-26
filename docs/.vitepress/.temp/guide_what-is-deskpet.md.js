import { ssrRenderAttrs, ssrRenderAttr } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const _imports_0 = "/deskpet/images/manager-screenshot.svg";
const __pageData = JSON.parse('{"title":"DeskPet 是什么？","description":"","frontmatter":{},"headers":[],"relativePath":"guide/what-is-deskpet.md","filePath":"guide/what-is-deskpet.md","lastUpdated":null}');
const _sfc_main = { name: "guide/what-is-deskpet.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="deskpet-是什么" tabindex="-1">DeskPet 是什么？ <a class="header-anchor" href="#deskpet-是什么" aria-label="Permalink to &quot;DeskPet 是什么？&quot;">​</a></h1><p><strong>DeskPet Engine</strong> 是一款开源、全本地运行的桌面宠物自定义引擎。</p><p>你可以把自己喜欢的角色图片（小猫、小狗、二次元角色等）上传进来，配置待机、走路、被点击等动作状态，生成一只会在桌面上跑来跑去、会互动的小宠物。</p><p><img${ssrRenderAttr("src", _imports_0)} alt="DeskPet 主界面示意图"></p><h2 id="核心特点" tabindex="-1">核心特点 <a class="header-anchor" href="#核心特点" aria-label="Permalink to &quot;核心特点&quot;">​</a></h2><ul><li><strong>全本地</strong>：不上传任何数据到服务器，不需要注册账号。</li><li><strong>轻量跨平台</strong>：基于 Tauri v2 构建，Windows / macOS / Linux 均可运行。</li><li><strong>素材门槛低</strong>：只需要准备几张静态 PNG 帧图，即可让角色动起来。</li><li><strong>支持 AI 工作流</strong>：复制内置提示词到豆包、即梦等 AI 工具，生成动画 GIF/MP4 后自动拆帧。</li><li><strong>可分享</strong>：宠物打包为 <code>.pet</code> 文件，可发给朋友导入。</li></ul><h2 id="适合谁用" tabindex="-1">适合谁用 <a class="header-anchor" href="#适合谁用" aria-label="Permalink to &quot;适合谁用&quot;">​</a></h2><ul><li>想在工作时养一只桌面小宠物的普通用户。</li><li>想把自己 OC（原创角色）做成可互动桌宠的画师/创作者。</li><li>想快速体验 Live2D 效果的用户（内置 Live2D 示范猫）。</li></ul><h2 id="主要界面" tabindex="-1">主要界面 <a class="header-anchor" href="#主要界面" aria-label="Permalink to &quot;主要界面&quot;">​</a></h2><p>DeskPet 有三个核心界面：</p><table tabindex="0"><thead><tr><th>界面</th><th>作用</th><th>入口</th></tr></thead><tbody><tr><td><strong>宠物管理器</strong></td><td>查看本地宠物库、运行/停止/导入/导出宠物</td><td>打开软件默认进入</td></tr><tr><td><strong>宠物编辑器</strong></td><td>创建或修改宠物：上传图片、配置状态、预览动画</td><td>管理器中点击「创建新宠物」或「编辑」</td></tr><tr><td><strong>宠物悬浮窗</strong></td><td>桌宠实际运行的透明窗口</td><td>管理器中点击「运行」</td></tr></tbody></table><h2 id="下一步" tabindex="-1">下一步 <a class="header-anchor" href="#下一步" aria-label="Permalink to &quot;下一步&quot;">​</a></h2><ul><li><a href="/deskpet/guide/installation.html">安装 DeskPet</a></li><li><a href="/deskpet/guide/quick-start.html">快速上手：5 分钟跑起第一只宠物</a></li></ul></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("guide/what-is-deskpet.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const whatIsDeskpet = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  whatIsDeskpet as default
};
