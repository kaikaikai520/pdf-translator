# PDF 划词翻译 - Chrome 扩展

解决 Chrome 打开本地 PDF 文件时无法划词翻译的问题。

## 痛点

Chrome 内置的 PDF 查看器使用 PDFium 引擎渲染，PDF 内容位于 `<embed>` 插件隔离上下文中。普通划词翻译扩展在该页面完全失效——`content script` 无法执行、`window.getSelection()` 返回空、`scripting.executeScript` 被安全策略阻止。

## 方案

本扩展绕过 Chrome 对 `file://` 页面的安全限制，采用多策略适配：

| 场景 | 实现方式 |
|------|---------|
| **本地 PDF (file://)** | 右键菜单 → 获取选中文本 → 后台调用 LLM → 弹出结果窗口 |
| **普通网页** | 注入 content script，划词自动弹出翻译按钮 |
| **备用方案** | 扩展弹窗，手动粘贴翻译 |

## 安装

1. 打开 `chrome://extensions`
2. 右上角开启 **开发者模式**
3. 点击 **加载已解压的扩展程序**，选择项目目录
4. 在扩展详情页开启 **允许访问文件网址**（本地 PDF 必需）

## 使用

### PDF 本地文件

1. 打开 PDF → 选中英文
2. 右键 → **「翻译选中文本」**
3. 弹出结果窗口，可复制译文或原文

### 普通网页

1. 选中英文
2. 自动弹出蓝色「译」按钮 → 点击翻译

### 手动粘贴

1. 选中文字 → Ctrl+C 复制
2. 点击扩展图标
3. Ctrl+V 粘贴 → 点击翻译

## 配置

点击扩展图标 → ⚙ 设置，可配置：

- **LLM 供应商**：DeepSeek（默认）、OpenAI、OpenRouter 或自定义
- **API 地址**：完整的 Chat Completions 端点 URL
- **模型名称**：如 `deepseek-chat`、`gpt-4o-mini`
- **API Key**：你的 API 密钥（仅在浏览器本地存储）
- **系统提示词**：自定义翻译指令

## 项目结构

```
├── manifest.json          # Manifest V3
├── background.js          # Service Worker：右键菜单、API 调用
├── content_script.js      # 网页划词检测 + 浮窗 UI
├── popup.html / popup.js  # 手动粘贴翻译弹窗
├── result.html / result.js# 翻译结果展示窗口
├── options.html / options.js # 供应商配置页
└── icons/                 # 扩展图标
```
