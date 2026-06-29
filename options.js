const DEFAULTS = {
  enabled: true,
  provider: 'DeepSeek',
  apiUrl: 'https://api.deepseek.com/chat/completions',
  model: 'deepseek-chat',
  apiKey: '',
  systemPrompt: 'Translate the following English text to Chinese. Return ONLY the translation result, no explanations, no notes, no quotes around the text.'
};

const PRESETS = {
  deepseek: { provider: 'DeepSeek', apiUrl: 'https://api.deepseek.com/chat/completions', model: 'deepseek-chat' },
  openai: { provider: 'OpenAI', apiUrl: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini' },
  openrouter: { provider: 'OpenRouter', apiUrl: 'https://openrouter.ai/api/v1/chat/completions', model: 'anthropic/claude-3.5-sonnet' },
  custom: {}
};

const $ = id => document.getElementById(id);

async function load() {
  const data = await chrome.storage.sync.get(DEFAULTS);
  $('enabled').checked = data.enabled;
  $('provider').value = data.provider;
  $('apiUrl').value = data.apiUrl;
  $('model').value = data.model;
  $('apiKey').value = data.apiKey || '';
  $('systemPrompt').value = data.systemPrompt;
}

async function save() {
  const data = {
    enabled: $('enabled').checked,
    provider: $('provider').value.trim(),
    apiUrl: $('apiUrl').value.trim(),
    model: $('model').value.trim(),
    apiKey: $('apiKey').value.trim(),
    systemPrompt: $('systemPrompt').value.trim()
  };
  await chrome.storage.sync.set(data);
  const status = $('status');
  status.classList.add('show');
  clearTimeout(status._timer);
  status._timer = setTimeout(() => status.classList.remove('show'), 2000);
}

function resetToDefaults() {
  Object.entries(DEFAULTS).forEach(([k, v]) => {
    const el = $(k);
    if (el.type === 'checkbox') el.checked = v;
    else el.value = v;
  });
  save();
}

document.querySelectorAll('[data-preset]').forEach(btn => {
  btn.addEventListener('click', () => {
    const preset = PRESETS[btn.dataset.preset];
    if (!preset) return;
    document.querySelectorAll('[data-preset]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (preset.provider !== undefined) $('provider').value = preset.provider;
    if (preset.apiUrl !== undefined) $('apiUrl').value = preset.apiUrl;
    if (preset.model !== undefined) $('model').value = preset.model;
  });
});

$('saveBtn').addEventListener('click', save);
$('resetBtn').addEventListener('click', resetToDefaults);

document.addEventListener('DOMContentLoaded', load);
