// Service workers have no clipboard access, so clearing happens here (offscreen document).
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.type !== 'offscreen-clear-clipboard') return;
  const ta = document.getElementById('t');
  ta.value = ' ';
  ta.focus();
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch (e) {
    ok = false;
  }
  ta.value = '';
  sendResponse({ ok });
});
