import { ssrRenderAttrs, ssrRenderAttr } from "vue/server-renderer";
import { _ as _imports_1 } from "./viewer-context-menu.D7Yeth-z.js";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const _imports_0 = "/deskpet/images/run-pet.png";
const _imports_2 = "/deskpet/images/system-tray-menu.svg";
const __pageData = JSON.parse('{"title":"运行桌宠","description":"","frontmatter":{},"headers":[],"relativePath":"guide/run-pet.md","filePath":"guide/run-pet.md","lastUpdated":null}');
const _sfc_main = { name: "guide/run-pet.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="运行桌宠" tabindex="-1">运行桌宠 <a class="header-anchor" href="#运行桌宠" aria-label="Permalink to &quot;运行桌宠&quot;">​</a></h1><p>在宠物管理器中，找到想运行的宠物，点击右侧 <strong>运行</strong> 按钮，桌面就会弹出宠物的透明悬浮窗。</p><p><img${ssrRenderAttr("src", _imports_0)} alt="运行宠物"></p><h2 id="宠物窗口特性" tabindex="-1">宠物窗口特性 <a class="header-anchor" href="#宠物窗口特性" aria-label="Permalink to &quot;宠物窗口特性&quot;">​</a></h2><p>宠物运行窗口是一个无边框、透明背景的悬浮窗：</p><ul><li><strong>始终置顶</strong>：默认位于所有窗口之上，不会被其他软件遮挡。</li><li><strong>不在任务栏显示</strong>：只在系统托盘区显示图标。</li><li><strong>鼠标可穿透</strong>：开启「鼠标穿透」后，点击宠物空白处可穿透到下方窗口。</li><li><strong>可拖拽</strong>：按住宠物拖动即可改变位置。</li></ul><h2 id="与宠物互动" tabindex="-1">与宠物互动 <a class="header-anchor" href="#与宠物互动" aria-label="Permalink to &quot;与宠物互动&quot;">​</a></h2><table tabindex="0"><thead><tr><th>操作</th><th>效果</th></tr></thead><tbody><tr><td>左键点击</td><td>触发配置的「点击响应状态」（默认 <code>clicked</code>）</td></tr><tr><td>按住拖拽</td><td>移动宠物位置</td></tr><tr><td>右键点击</td><td>打开宠物菜单：水平翻转、恢复自动朝向、关闭宠物</td></tr><tr><td>按键（Windows）</td><td>空格/回车/方向键/WASD/数字键 1-5 会触发 <code>typing</code> 状态或点击反馈</td></tr></tbody></table><p><img${ssrRenderAttr("src", _imports_1)} alt="宠物右键菜单"></p><h2 id="右键菜单说明" tabindex="-1">右键菜单说明 <a class="header-anchor" href="#右键菜单说明" aria-label="Permalink to &quot;右键菜单说明&quot;">​</a></h2><p>在宠物窗口上点击右键，会弹出菜单：</p><ul><li><strong>水平翻转</strong>：手动把宠物镜像显示。</li><li><strong>恢复自动朝向</strong>：取消手动翻转，恢复根据鼠标位置自动转向。</li><li><strong>关闭宠物</strong>：关闭当前宠物窗口，回到管理器。</li></ul><h2 id="关闭主窗口-vs-退出软件" tabindex="-1">关闭主窗口 vs 退出软件 <a class="header-anchor" href="#关闭主窗口-vs-退出软件" aria-label="Permalink to &quot;关闭主窗口 vs 退出软件&quot;">​</a></h2><p>点击管理器窗口右上角关闭按钮时，DeskPet 默认<strong>最小化到系统托盘</strong>，不会真正退出。宠物会继续运行。</p><p>要彻底退出：</p><ul><li>在系统托盘图标上右键 → <strong>退出</strong>。</li><li>或点击菜单中的 <strong>退出</strong>。</li></ul><p><img${ssrRenderAttr("src", _imports_2)} alt="系统托盘菜单"></p><h2 id="运行设置" tabindex="-1">运行设置 <a class="header-anchor" href="#运行设置" aria-label="Permalink to &quot;运行设置&quot;">​</a></h2><p>在管理器右上角点击 <strong>设置</strong>，可以调整全局运行参数：</p><table tabindex="0"><thead><tr><th>设置项</th><th>说明</th></tr></thead><tbody><tr><td>宠物透明度</td><td>悬浮窗整体不透明度</td></tr><tr><td>宠物始终置顶</td><td>是否保持窗口最前</td></tr><tr><td>鼠标穿透</td><td>是否不响应点击/拖拽（适合纯观赏）</td></tr><tr><td>看向鼠标</td><td>宠物根据鼠标左右位置自动翻转朝向</td></tr><tr><td>按键触发动画</td><td>敲击键盘时是否触发 <code>typing</code> 状态</td></tr></tbody></table><p>详细说明请参考 <a href="/deskpet/guide/settings.html">设置说明</a>。</p><h2 id="同时运行多只宠物" tabindex="-1">同时运行多只宠物 <a class="header-anchor" href="#同时运行多只宠物" aria-label="Permalink to &quot;同时运行多只宠物&quot;">​</a></h2><p>当前版本同一时间只支持运行一个宠物窗口。如果想换一只宠物，先点击<strong>停止</strong>，再运行另一只。</p><blockquote><p>多宠物同时运行已列入第二阶段计划，敬请期待。</p></blockquote><h2 id="下一步" tabindex="-1">下一步 <a class="header-anchor" href="#下一步" aria-label="Permalink to &quot;下一步&quot;">​</a></h2><ul><li><a href="/deskpet/guide/manage-pets.html">宠物管理：导入/导出/删除</a></li><li><a href="/deskpet/guide/settings.html">设置说明</a></li></ul></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("guide/run-pet.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const runPet = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  runPet as default
};
