import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'zh-CN',
  title: 'DeskPet Engine',
  description: 'DeskPet Engine 桌宠引擎用户文档',
  base: '/deskpet/',
  lastUpdated: true,
  srcExclude: ['README.md'],

  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '使用指南', link: '/guide/what-is-deskpet' },
      { text: '常见问题', link: '/guide/faq' },
    ],

    sidebar: [
      {
        text: '开始',
        items: [
          { text: 'DeskPet 是什么？', link: '/guide/what-is-deskpet' },
          { text: '安装', link: '/guide/installation' },
          { text: '快速上手', link: '/guide/quick-start' },
        ],
      },
      {
        text: '创建宠物',
        items: [
          { text: '使用编辑器创建宠物', link: '/guide/create-pet' },
          { text: 'AI 生成动画素材', link: '/guide/ai-prompts' },
          { text: '高级：.pet 文件格式', link: '/guide/file-format' },
        ],
      },
      {
        text: '运行与管理',
        items: [
          { text: '运行桌宠', link: '/guide/run-pet' },
          { text: '宠物管理', link: '/guide/manage-pets' },
          { text: '设置说明', link: '/guide/settings' },
        ],
      },
      {
        text: '其他',
        items: [
          { text: '常见问题', link: '/guide/faq' },
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/chivalry1314/deskpet' },
    ],

    editLink: {
      pattern: 'https://github.com/chivalry1314/deskpet/edit/main/docs/:path',
      text: '在 GitHub 上编辑此页',
    },

    footer: {
      message: '基于 MIT 协议发布',
      copyright: 'Copyright © DeskPet Engine Contributors',
    },
  },
})
