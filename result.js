var $ = function (id) { return document.getElementById(id); };

function showToast(msg) {
  var t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(function () { t.classList.remove('show'); }, 1800);
}

function doCopy(btn, text) {
  (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(text) : new Promise(function (resolve, reject) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.left = '-9999px';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); resolve(); } catch (e) { reject(e); }
    document.body.removeChild(ta);
  })).then(function () {
    showToast('已复制');
  }).catch(function () {
    showToast('复制失败');
  });
}

document.addEventListener('DOMContentLoaded', function () {
  var key = location.hash.replace('#', '');
  if (!key) { $('translatedText').textContent = '无数据'; $('originalText').textContent = '请通过右键菜单使用翻译功能'; return; }

  chrome.storage.local.get(key, function (data) {
    var result = data[key];
    if (!result) { $('translatedText').textContent = '数据已过期，请重新翻译'; return; }
    $('translatedText').textContent = result.translated;
    $('originalText').textContent = result.original;

    $('copyTransBtn').onclick = function () { doCopy(this, result.translated); };
    $('copyOrigBtn').onclick = function () { doCopy(this, result.original); };

    // 清理已读数据
    chrome.storage.local.remove(key);
  });

  function closeWin() { window.close(); }
  $('closeBtn').onclick = closeWin;
  $('closeBtn2').onclick = closeWin;

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeWin();
  });
});
