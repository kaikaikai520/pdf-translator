(function () {
  // PDF 页面由 background 的 MAIN world 注入处理，content script 跳过
  if (/\.pdf$/i.test(location.href.replace(/[#?].*$/, ''))) return;

  let tooltip, translateBtn, loadingEl, resultEl;
  let enabled = true;
  let selectedText = '';
  let selectionRect = null;
  let _selectionTimer = null;
  let _lastSelectionText = '';

  const DEFAULTS = {
    enabled: true,
    provider: 'DeepSeek',
    apiUrl: 'https://api.deepseek.com/chat/completions',
    model: 'deepseek-chat',
    apiKey: '',
    systemPrompt: 'Translate the following English text to Chinese. Return ONLY the translation result, no explanations, no notes, no quotes around the text.'
  };

  function createUI() {
    if (document.getElementById('pt-tooltip')) return;

    const style = document.createElement('style');
    style.id = 'pt-style';
    style.textContent = `
      #pt-tooltip { all: initial; position: fixed; z-index: 2147483647; display: none; background: #fff; border: 1px solid #e0e0e0; border-radius: 10px; box-shadow: 0 6px 24px rgba(0,0,0,0.18); padding: 14px 18px; max-width: 440px; min-width: 120px; font: 14px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; color: #333; word-break: break-word; }
      #pt-tooltip .pt-close { position: absolute; top: 4px; right: 8px; cursor: pointer; color: #aaa; font-size: 18px; line-height: 1; user-select: none; }
      #pt-tooltip .pt-close:hover { color: #666; }
      #pt-tooltip .pt-loading { color: #999; font-size: 13px; padding: 4px 0; }
      #pt-tooltip .pt-result { line-height: 1.7; }
      #pt-btn { all: initial; position: fixed; z-index: 2147483646; display: none; width: 34px; height: 34px; border-radius: 50%; background: #4A90D9; color: #fff; font: bold 18px/34px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; text-align: center; cursor: pointer; box-shadow: 0 3px 10px rgba(74,144,217,0.45); user-select: none; transition: transform 0.12s, box-shadow 0.12s; }
      #pt-btn:hover { transform: scale(1.12); box-shadow: 0 4px 14px rgba(74,144,217,0.55); }
      #pt-btn:active { transform: scale(0.95); }
    `;
    document.head.appendChild(style);

    tooltip = document.createElement('div');
    tooltip.id = 'pt-tooltip';
    tooltip.innerHTML = '<span class="pt-close">&times;</span><div class="pt-loading">翻译中...</div><div class="pt-result"></div>';
    document.body.appendChild(tooltip);

    loadingEl = tooltip.querySelector('.pt-loading');
    resultEl = tooltip.querySelector('.pt-result');
    tooltip.querySelector('.pt-close').onclick = () => { tooltip.style.display = 'none'; };

    translateBtn = document.createElement('div');
    translateBtn.id = 'pt-btn';
    translateBtn.textContent = '译';
    document.body.appendChild(translateBtn);
  }

  function getSelectionInfo() {
    const s = window.getSelection();
    if (!s || s.isCollapsed || !s.rangeCount) return null;
    const text = s.toString().trim();
    if (!text) return null;
    const r = s.getRangeAt(0);
    let rect;
    try {
      rect = r.getBoundingClientRect();
      if (!rect || (rect.width === 0 && rect.height === 0)) {
        const rects = r.getClientRects();
        if (rects && rects.length > 0) rect = rects[0];
      }
      if (!rect || (rect.width === 0 && rect.height === 0)) {
        const c = r.commonAncestorContainer;
        if (c && c.nodeType === 3 && c.parentElement) rect = c.parentElement.getBoundingClientRect();
        else if (c && c.nodeType === 1) rect = c.getBoundingClientRect();
      }
    } catch (e) {}
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    return { text, rect };
  }

  function showBtn(rect) {
    translateBtn.style.left = (rect.right + 6) + 'px';
    translateBtn.style.top = (rect.top - 18) + 'px';
    translateBtn.style.display = 'block';
  }

  function hideBtn() { translateBtn.style.display = 'none'; }

  function showLoading(rect) {
    resultEl.style.display = 'none';
    loadingEl.style.display = 'block';
    positionTooltip(rect);
    tooltip.style.display = 'block';
  }

  function showResult(rect, text) {
    loadingEl.style.display = 'none';
    resultEl.textContent = text;
    resultEl.style.display = 'block';
    positionTooltip(rect);
    tooltip.style.display = 'block';
  }

  function hideTooltip() { tooltip.style.display = 'none'; }

  function positionTooltip(rect) {
    tooltip.style.left = '';
    tooltip.style.right = '';
    tooltip.style.top = '';
    tooltip.style.bottom = '';
    const tipW = 440;
    const gap = 10;
    let left = Math.max(4, Math.min(rect.left, window.innerWidth - tipW - 4));
    let top = rect.bottom + gap;
    if (top + 300 > window.innerHeight) {
      top = Math.max(4, rect.top - 300 - gap);
    }
    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
  }

  function hideAll() { hideBtn(); hideTooltip(); }

  async function doTranslate(text) {
    try {
      const config = await chrome.storage.sync.get(DEFAULTS);
      return await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          { action: 'translate', text, config },
          resp => {
            if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
            else if (resp && resp.error) reject(new Error(resp.error));
            else resolve(resp.translation);
          }
        );
      });
    } catch (err) {
      return '翻译失败: ' + err.message;
    }
  }

  chrome.storage.sync.get({ enabled: true }, r => { enabled = r.enabled; });
  chrome.storage.onChanged.addListener(changes => {
    if (changes.enabled) enabled = changes.enabled.newValue;
  });

  function checkSelection() {
    if (!enabled) return;
    const info = getSelectionInfo();
    if (info && info.text !== _lastSelectionText) {
      _lastSelectionText = info.text;
      selectedText = info.text;
      selectionRect = info.rect;
      showBtn(info.rect);
    } else if (!info) {
      if (tooltip && tooltip.style.display !== 'block') {
        _lastSelectionText = '';
      }
    }
  }

  function onSelectionChanged() {
    clearTimeout(_selectionTimer);
    _selectionTimer = setTimeout(checkSelection, 150);
  }

  function init() {
    createUI();

    document.addEventListener('mouseup', onSelectionChanged);
    document.addEventListener('selectionchange', onSelectionChanged);
    setInterval(checkSelection, 500);

    document.addEventListener('mousedown', (e) => {
      if (tooltip && !tooltip.contains(e.target) && translateBtn && !translateBtn.contains(e.target)) {
        hideAll();
      }
    });

    translateBtn.addEventListener('click', async () => {
      if (!selectedText || !selectionRect) return;
      hideBtn();
      showLoading(selectionRect);
      const translation = await doTranslate(selectedText);
      showResult(selectionRect, translation);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') hideAll();
    });

    window.addEventListener('scroll', hideAll, true);

    new MutationObserver(() => {
      if (!document.getElementById('pt-tooltip')) createUI();
    }).observe(document.body, { childList: true, subtree: false });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
