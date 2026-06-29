const DEFAULTS = {
  enabled: true, provider: 'DeepSeek',
  apiUrl: 'https://api.deepseek.com/chat/completions',
  model: 'deepseek-chat', apiKey: '',
  systemPrompt: 'Translate the following English text to Chinese. Return ONLY the translation result, no explanations, no notes, no quotes around the text.'
};

// ===== 右键菜单 =====
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'translate-selection',
    title: '翻译选中文本',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'translate-selection') return;
  const text = (info.selectionText || '').trim();
  if (!text) {
    chrome.notifications.create({
      type: 'basic', iconUrl: 'icons/icon128.png', title: '划词翻译',
      message: '未检测到选中文本。请先在 PDF 中选中文字后重试，或复制文字后点扩展图标手动翻译。'
    });
    return;
  }

  const config = await chrome.storage.sync.get(DEFAULTS);
  if (!config.apiKey) {
    chrome.notifications.create({
      type: 'basic', iconUrl: 'icons/icon128.png', title: '配置缺失',
      message: '请先点击扩展图标 → 设置 → 填入 API Key'
    });
    return;
  }

  try {
    const translation = await translateText(text, config);
    showResultWindow(text, translation);
  } catch (e) {
    chrome.notifications.create({
      type: 'basic', iconUrl: 'icons/icon128.png', title: '翻译失败',
      message: e.message
    });
  }
});

// ===== 弹出结果窗口 =====
function showResultWindow(original, translated) {
  const key = '_r_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  chrome.storage.local.set({ [key]: { original, translated } }, () => {
    // 清理旧数据（保留最近20条）
    chrome.storage.local.get(null, (all) => {
      const keys = Object.keys(all).filter(k => k.startsWith('_r_')).sort();
      if (keys.length > 20) {
        const toRemove = keys.slice(0, keys.length - 20);
        chrome.storage.local.remove(toRemove);
      }
    });

    chrome.windows.create({
      url: chrome.runtime.getURL('result.html') + '#' + key,
      type: 'popup',
      width: 480,
      height: 400
    });
  });
}

// ===== 翻译函数 =====
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'translate') {
    translateText(request.text, request.config)
      .then(t => sendResponse({ translation: t }))
      .catch(e => sendResponse({ error: e.message }));
    return true;
  }
});

async function translateText(text, config) {
  const { apiUrl, model, apiKey, systemPrompt } = config;
  if (!apiUrl) throw new Error('请配置 API 地址');
  if (!apiKey) throw new Error('请配置 API Key');
  if (!model) throw new Error('请配置模型名称');
  const resp = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
    body: JSON.stringify({ model, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: text }], temperature: 0.3, max_tokens: 4096 })
  });
  if (!resp.ok) throw new Error('API 请求失败 (' + resp.status + ')');
  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('API 返回格式异常');
  return content.trim();
}
