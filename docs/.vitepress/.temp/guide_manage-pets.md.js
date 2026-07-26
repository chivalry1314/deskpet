import { ssrRenderAttrs, ssrRenderAttr } from "vue/server-renderer";
import { _ as _imports_0, a as _imports_3$1 } from "./import-pet.Cq09XL4d.js";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const _imports_2 = "/deskpet/images/export-pet.svg";
const _imports_3 = "/deskpet/images/change-data-dir.svg";
const __pageData = JSON.parse('{"title":"宠物管理","description":"","frontmatter":{},"headers":[],"relativePath":"guide/manage-pets.md","filePath":"guide/manage-pets.md","lastUpdated":null}');
const _sfc_main = { name: "guide/manage-pets.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="宠物管理" tabindex="-1">宠物管理 <a class="header-anchor" href="#宠物管理" aria-label="Permalink to &quot;宠物管理&quot;">​</a></h1><p>宠物管理器是 DeskPet 的主界面，用于查看本地宠物库、运行、编辑、导入、导出和删除宠物。</p><h2 id="打开管理器" tabindex="-1">打开管理器 <a class="header-anchor" href="#打开管理器" aria-label="Permalink to &quot;打开管理器&quot;">​</a></h2><p>启动 DeskPet 后默认就是管理器。如果正在运行宠物，可通过系统托盘右键菜单「显示主窗口」打开。</p><p><img${ssrRenderAttr("src", _imports_0)} alt="宠物管理器"></p><h2 id="导入-pet-文件" tabindex="-1">导入 .pet 文件 <a class="header-anchor" href="#导入-pet-文件" aria-label="Permalink to &quot;导入 .pet 文件&quot;">​</a></h2><p><code>.pet</code> 是 DeskPet 的宠物打包格式，本质是一个 ZIP 压缩包，后缀改为 <code>.pet</code>。你可以从网上下载别人分享的 <code>.pet</code> 文件，然后导入使用。</p><p>操作步骤：</p><ol><li>在管理器右上角点击 <strong>导入 .pet</strong>。</li><li>在文件选择对话框中选择 <code>.pet</code> 文件。</li><li>导入成功后，宠物会出现在列表中。</li></ol><p><img${ssrRenderAttr("src", _imports_3$1)} alt="导入 .pet"></p><blockquote><p>导入会自动解压到本地数据目录，不会覆盖已有同名宠物（如需更新，请先删除旧宠物）。</p></blockquote><h2 id="导出-pet-文件" tabindex="-1">导出 .pet 文件 <a class="header-anchor" href="#导出-pet-文件" aria-label="Permalink to &quot;导出 .pet 文件&quot;">​</a></h2><p>想把自己做的宠物分享给朋友？</p><ol><li>在宠物列表中点击该宠物右侧的 <strong>导出</strong> 按钮。</li><li>软件会把宠物打包成 <code>.pet</code> 文件，保存到数据目录的 <code>exports</code> 文件夹下，并自动打开文件夹。</li></ol><p><img${ssrRenderAttr("src", _imports_2)} alt="导出 .pet"></p><p>导出的文件可以直接发送给其他人，对方用 DeskPet 导入即可运行。</p><h2 id="编辑已有宠物" tabindex="-1">编辑已有宠物 <a class="header-anchor" href="#编辑已有宠物" aria-label="Permalink to &quot;编辑已有宠物&quot;">​</a></h2><p>点击宠物右侧的 <strong>编辑</strong>，会重新进入编辑器，所有图片和配置都可以再次修改。</p><blockquote><p>修改后保存，会覆盖原宠物数据。</p></blockquote><h2 id="删除宠物" tabindex="-1">删除宠物 <a class="header-anchor" href="#删除宠物" aria-label="Permalink to &quot;删除宠物&quot;">​</a></h2><p>点击宠物右侧的 <strong>删除</strong>，确认后即可删除本地宠物及其所有素材。</p><blockquote><p>删除后无法恢复，如需保留，请先导出备份。</p></blockquote><h2 id="本地数据目录" tabindex="-1">本地数据目录 <a class="header-anchor" href="#本地数据目录" aria-label="Permalink to &quot;本地数据目录&quot;">​</a></h2><p>DeskPet 把所有数据存放在本地以下路径：</p><table tabindex="0"><thead><tr><th>系统</th><th>路径</th></tr></thead><tbody><tr><td>Windows</td><td><code>%APPDATA%/DeskPet/</code></td></tr><tr><td>macOS</td><td><code>~/Library/Application Support/DeskPet/</code></td></tr><tr><td>Linux</td><td><code>~/.config/DeskPet/</code></td></tr></tbody></table><p>目录结构：</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>DeskPet/</span></span>
<span class="line"><span>├── pets/                  # 宠物文件夹</span></span>
<span class="line"><span>│   ├── 橘猫小咪/</span></span>
<span class="line"><span>│   │   ├── manifest.json</span></span>
<span class="line"><span>│   │   └── *.png</span></span>
<span class="line"><span>│   └── ...</span></span>
<span class="line"><span>├── exports/               # 导出的 .pet 文件</span></span>
<span class="line"><span>├── settings.json          # 全局设置</span></span>
<span class="line"><span>└── pets.json              # 宠物索引</span></span></code></pre></div><h2 id="更改数据目录" tabindex="-1">更改数据目录 <a class="header-anchor" href="#更改数据目录" aria-label="Permalink to &quot;更改数据目录&quot;">​</a></h2><p>在管理器右上角点击 <strong>设置</strong> → <strong>数据目录</strong> → <strong>更改目录</strong>，可以切换到自定义位置。例如把数据目录放到外置硬盘或云同步盘，实现跨设备同步。</p><p>切换时可选择是否迁移已有宠物：</p><ul><li><strong>迁移</strong>：把旧目录里的宠物复制到新目录。</li><li><strong>不迁移</strong>：只切换目录，旧宠物仍保留在原处。</li></ul><p><img${ssrRenderAttr("src", _imports_3)} alt="更改数据目录"></p><blockquote><p>建议定期备份数据目录，尤其是自己做的宠物。</p></blockquote><h2 id="下一步" tabindex="-1">下一步 <a class="header-anchor" href="#下一步" aria-label="Permalink to &quot;下一步&quot;">​</a></h2><ul><li><a href="/deskpet/guide/settings.html">设置说明</a></li><li><a href="/deskpet/guide/file-format.html">高级：.pet 文件格式</a></li></ul></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("guide/manage-pets.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const managePets = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  managePets as default
};
