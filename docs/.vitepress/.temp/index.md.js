import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"","description":"","frontmatter":{"layout":"home","hero":{"name":"DeskPet Engine","text":"全本地桌宠引擎","tagline":"上传图片、配置动作，即可在桌面养一只会动的小宠物。无需联网、无需注册。","image":{"src":"/images/hero-pet.svg","alt":"DeskPet Engine"},"actions":[{"theme":"brand","text":"快速开始","link":"/guide/quick-start"},{"theme":"alt","text":"安装指南","link":"/guide/installation"}]},"features":[{"title":"全本地运行","details":"所有数据保存在本地，无需服务器、无需账号，隐私零担忧。"},{"title":"自定义宠物","details":"使用自己的图片创建宠物，支持 PNG 帧图、GIF、MP4 自动拆帧。"},{"title":"透明悬浮窗","details":"无边框透明窗口，宠物悬浮在桌面最上层，可拖拽、可点击互动。"},{"title":"一键导入导出","details":"宠物以 .pet 文件格式分享，导入即可使用。"}]},"headers":[],"relativePath":"index.md","filePath":"index.md","lastUpdated":null}');
const _sfc_main = { name: "index.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("index.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  index as default
};
