// content.js
(function () {
  // Inject a script into the page context so we can access window.monaco/editor
  function injectScript() {
    const s = document.createElement('script');
    s.src = chrome.runtime.getURL('inject.js');
    (document.head || document.documentElement).appendChild(s);
    s.onload = () => s.remove();
  }

  // Insert a Format button near the editor toolbar (best-effort selector)
  function addButton() {
    // Look for a toolbar/container around the editor. We try several anchors.
    const anchors = [
      '[data-automation="editor-toolbar"]',
      '.editor-toolbar',
      '.hr-monaco-editor, .monaco-editor',      // near editor
      '[data-analytics="CodeMirror"]',          // legacy
      'header, .header, .tabs__actions'         // fallback
    ];

    let host = null;
    for (const sel of anchors) {
      const el = document.querySelector(sel);
      if (el) { host = el; break; }
    }
    // Create a minimal floating host if none found.
    if (!host) {
      host = document.createElement('div');
      host.style.position = 'fixed';
      host.style.right = '16px';
      host.style.top = '80px';
      host.style.zIndex = '2147483647';
      document.body.appendChild(host);
    }

    // Avoid duplicate button
    if (document.querySelector('.hrfmt-btn')) return;

    const btn = document.createElement('button');
    btn.className = 'hrfmt-btn';
    btn.title = 'Format code in the active editor';
    btn.innerHTML = 'Format';

    btn.addEventListener('click', () => {
      window.postMessage({ source: 'HRFMT_EXT', type: 'HRFMT_REQUEST' }, '*');
    });

    // Prefer to append to host
    host.appendChild(btn);
    toast('HackerRank Formatter enabled');
  }

  function toast(msg, timeout = 2000) {
    const t = document.createElement('div');
    t.className = 'hrfmt-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), timeout);
  }

  // Listen for results from injected script
  window.addEventListener('message', (e) => {
    if (!e.data || e.data.source !== 'HRFMT_PAGE') return;
    if (e.data.type === 'HRFMT_RESULT') {
      if (e.data.ok) {
        toast('Code formatted successfully ✓', 3000);
      } else {
        const error = e.data.error || 'Unknown error';
        console.error('HRFormatter Error:', error);
        toast('Format failed: ' + error, 5000);

        // Show helpful message for common issues
        if (error.includes('No editor detected')) {
          setTimeout(() => {
            toast('💡 Try clicking in the code editor first, then click Format', 4000);
          }, 1000);
        }
      }
    }
  });

  // Run
  injectScript();
  // Try to place button after DOM settles
  const ready = () => addButton();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ready);
  } else {
    setTimeout(ready, 800);
  }
})();