import { ssrRenderAttrs, ssrRenderAttr } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const _imports_0 = "/deskpet/images/settings-panel.png";
const __pageData = JSON.parse('{"title":"设置说明","description":"","frontmatter":{},"headers":[],"relativePath":"guide/settings.md","filePath":"guide/settings.md","lastUpdated":null}');
const _sfc_main = { name: "guide/settings.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="设置说明" tabindex="-1">设置说明 <a class="header-anchor" href="#设置说明" aria-label="Permalink to &quot;设置说明&quot;">​</a></h1><p>在宠物管理器右上角点击 <strong>设置</strong>，可以打开全局设置面板。</p><p><img${ssrRenderAttr("src", _imports_0)} alt="设置面板"></p><h2 id="运行设置" tabindex="-1">运行设置 <a class="header-anchor" href="#运行设置" aria-label="Permalink to &quot;运行设置&quot;">​</a></h2><h3 id="宠物透明度" tabindex="-1">宠物透明度 <a class="header-anchor" href="#宠物透明度" aria-label="Permalink to &quot;宠物透明度&quot;">​</a></h3><p>调整宠物悬浮窗的整体不透明度。</p><ul><li>默认值：<code>100%</code></li><li>范围：<code>10% ~ 100%</code></li></ul><p>向左拖动滑块，宠物会变透明；向右拖动恢复完全不透明。</p><h3 id="宠物始终置顶" tabindex="-1">宠物始终置顶 <a class="header-anchor" href="#宠物始终置顶" aria-label="Permalink to &quot;宠物始终置顶&quot;">​</a></h3><p>开启后，宠物窗口始终位于其他窗口之上，不会被浏览器、文档等遮挡。</p><ul><li>默认：开启</li></ul><h3 id="鼠标穿透" tabindex="-1">鼠标穿透 <a class="header-anchor" href="#鼠标穿透" aria-label="Permalink to &quot;鼠标穿透&quot;">​</a></h3><p>开启后，鼠标点击和拖拽不会作用于宠物，而是穿透到下面的窗口。适合只想把宠物当装饰、不互动的场景。</p><ul><li>默认：关闭</li></ul><blockquote><p>开启鼠标穿透后，无法再通过点击或拖拽与宠物互动。</p></blockquote><h3 id="看向鼠标" tabindex="-1">看向鼠标 <a class="header-anchor" href="#看向鼠标" aria-label="Permalink to &quot;看向鼠标&quot;">​</a></h3><p>开启后，宠物会根据鼠标相对于自己的左右位置自动水平翻转，产生「看向鼠标」的效果。</p><ul><li>默认：开启</li><li>在宠物右键菜单中可以手动覆盖翻转方向。</li></ul><h3 id="按键触发动画" tabindex="-1">按键触发动画 <a class="header-anchor" href="#按键触发动画" aria-label="Permalink to &quot;按键触发动画&quot;">​</a></h3><p>开启后，在 Windows 上按下以下按键会触发动画：</p><ul><li>空格、回车</li><li>方向键</li><li><code>W</code>、<code>A</code>、<code>S</code>、<code>D</code></li><li>数字键 <code>1</code> ~ <code>5</code></li></ul><p>触发逻辑：如果宠物有 <code>typing</code> 状态，则播放 <code>typing</code>；否则播放点击反馈状态（默认 <code>clicked</code>）。</p><ul><li>默认：开启</li><li>仅在 Windows 平台有效。</li></ul><h2 id="数据目录" tabindex="-1">数据目录 <a class="header-anchor" href="#数据目录" aria-label="Permalink to &quot;数据目录&quot;">​</a></h2><p>设置面板底部显示当前数据目录路径，并提供两个按钮：</p><ul><li><strong>更改目录</strong>：选择新的本地数据目录。</li><li><strong>恢复默认</strong>：把数据目录恢复为系统默认路径。</li></ul><p>详细说明请参考 <a href="/deskpet/guide/manage-pets.html#更改数据目录">宠物管理 › 更改数据目录</a>。</p><h2 id="当前宠物" tabindex="-1">当前宠物 <a class="header-anchor" href="#当前宠物" aria-label="Permalink to &quot;当前宠物&quot;">​</a></h2><p>设置面板底部会显示当前正在运行的宠物名称，方便确认状态。</p><h2 id="下一步" tabindex="-1">下一步 <a class="header-anchor" href="#下一步" aria-label="Permalink to &quot;下一步&quot;">​</a></h2><ul><li><a href="/deskpet/guide/run-pet.html">运行桌宠</a></li><li><a href="/deskpet/guide/faq.html">常见问题</a></li></ul></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("guide/settings.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const settings = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  settings as default
};
