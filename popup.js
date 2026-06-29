var DEFAULTS = {
  enabled: true,
  provider: 'DeepSeek',
  apiUrl: 'https://api.deepseek.com/chat/completions',
  model: 'deepseek-chat',
  apiKey: '',
  systemPrompt: 'Translate the following English text to Chinese. Return ONLY the translation result, no explanations, no notes, no quotes around the text.'
};

var $ = function (id) { return document.getElementById(id); };

document.addEventListener('DOMContentLoaded', async function () {
  var data = await chrome.storage.sync.get(DEFAULTS);
  $('statusDot').title = data.enabled ? '已启用' : '已禁用';
  $('statusDot').style.color = data.enabled ? '#8f8' : '#f88';
  $('inputText').focus();

  $('translateBtn').addEventListener('click', doTranslate);
  $('clearBtn').addEventListener('click', function () {
    $('inputText').value = '';
    $('resultArea').style.display = 'none';
    $('statusText').textContent = '已清空';
    $('inputText').focus();
  });

  $('openOptions').addEventListener('click', function (e) {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
});

async function doTranslate() {
  var text = $('inputText').value.trim();
  if (!text) {
    $('statusText').textContent = '请先粘贴要翻译的英文文本';
    return;
  }

  var config = await chrome.storage.sync.get(DEFAULTS);
  if (!config.apiKey) {
    $('statusText').textContent = '请先在设置中配置 API Key';
    return;
  }

  $('resultArea').style.display = 'block';
  $('resultText').textContent = '翻译中...';
  $('resultText').className = 'loading';
  $('statusText').textContent = '正在翻译...';
  $('translateBtn').disabled = true;

  try {
    var result = await new Promise(function (resolve, reject) {
      chrome.runtime.sendMessage({ action: 'translate', text: text, config: config }, function (resp) {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else if (resp && resp.error) reject(new Error(resp.error));
        else resolve(resp.translation);
      });
    });
    $('resultText').textContent = result;
    $('resultText').className = '';
    $('statusText').textContent = '翻译完成 ✓';
  } catch (e) {
    $('resultText').textContent = '翻译失败: ' + e.message;
    $('resultText').className = '';
    $('statusText').textContent = '翻译失败';
  }
  $('translateBtn').disabled = false;
}
