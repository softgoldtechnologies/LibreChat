(function () {
  var frameSelector = 'iframe[data-office-preview]';

  function conversationId() {
    var match = location.pathname.match(/\/c\/([^/]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  }

  function findHtml(messages, filename) {
    var list = Array.isArray(messages) ? messages : messages && messages.messages;
    if (!Array.isArray(list)) {
      return '';
    }
    var html = '';
    list.forEach(function (message) {
      (message.attachments || []).forEach(function (attachment) {
        if (
          attachment &&
          attachment.filename === filename &&
          attachment.textFormat === 'html' &&
          typeof attachment.text === 'string' &&
          attachment.text.length > 0
        ) {
          html = attachment.text;
        }
      });
    });
    return html;
  }

  function show(panel, html) {
    if (panel.querySelector(frameSelector)) {
      return;
    }
    var frame = document.createElement('iframe');
    frame.setAttribute('data-office-preview', '1');
    frame.setAttribute('title', panel.getAttribute('aria-label') || 'Document preview');
    frame.setAttribute('sandbox', 'allow-scripts allow-popups allow-downloads');
    frame.style.position = 'absolute';
    frame.style.inset = '3.25rem 0 0 0';
    frame.style.width = '100%';
    frame.style.height = 'calc(100% - 3.25rem)';
    frame.style.border = '0';
    frame.style.background = '#fff';
    frame.style.zIndex = '30';
    frame.srcdoc = html;
    panel.appendChild(frame);
  }

  var inflight = '';

  async function fill() {
    var panel = document.getElementById('artifact-viewer');
    if (!panel || panel.querySelector(frameSelector)) {
      return;
    }
    var filename = panel.getAttribute('aria-label') || '';
    if (!/\.(docx|xlsx|pptx)$/i.test(filename)) {
      return;
    }
    var convo = conversationId();
    if (!convo) {
      return;
    }
    var key = convo + '|' + filename;
    if (inflight === key) {
      return;
    }
    inflight = key;
    try {
      var response = await fetch('/api/messages/' + encodeURIComponent(convo), {
        credentials: 'include',
      });
      if (!response.ok) {
        inflight = '';
        return;
      }
      var html = findHtml(await response.json(), filename);
      if (!html) {
        inflight = '';
        return;
      }
      var current = document.getElementById('artifact-viewer');
      if (current && current.getAttribute('aria-label') === filename) {
        show(current, html);
      }
    } catch (error) {
      inflight = '';
    }
  }

  new MutationObserver(fill).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  setInterval(fill, 1500);
})();
