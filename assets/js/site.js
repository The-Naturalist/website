(function () {
  // Chinese pages (zh/) set <html lang="zh-CN">; L(en, zh) picks the right words.
  var ZH = /^zh/i.test(document.documentElement.lang || '');
  var L = function (en, zh) { return ZH ? zh : en; };
  // Header shadow on scroll
  var header = document.getElementById('top');
  if (header) {
    var onScroll = function () { header.classList.toggle('scrolled', window.scrollY > 8); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Mobile menu
  var btn = document.getElementById('menuBtn'), nav = document.getElementById('nav');
  if (btn && nav) {
    var setOpen = function (open) {
      nav.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', open);
      btn.setAttribute('aria-label', open ? L('Close menu', '关闭菜单') : L('Open menu', '打开菜单'));
    };
    btn.addEventListener('click', function () { setOpen(!nav.classList.contains('open')); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
  }

  // Photos that fail to load leave the tinted panel showing
  document.querySelectorAll('.frame img').forEach(function (img) {
    var fail = function () { img.remove(); };
    if (img.complete && img.naturalWidth === 0) fail();
    else img.addEventListener('error', fail);
  });

  // Copy buttons
  document.querySelectorAll('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var el = document.getElementById(b.dataset.copy), text = el.textContent.trim();
      var done = function () { b.textContent = L('Copied', '已复制'); setTimeout(function () { b.textContent = L('Copy', '复制'); }, 1600); };
      var select = function () {
        var r = document.createRange(); r.selectNodeContents(el);
        var s = getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = L('Selected', '已选中');
      };
      try { navigator.clipboard.writeText(text).then(done, select); } catch (err) { select(); }
    });
  });

  // Gallery filters
  var chips = document.querySelectorAll('.chip[data-filter]');
  chips.forEach(function (c) {
    c.addEventListener('click', function () {
      var f = c.dataset.filter;
      chips.forEach(function (x) { x.setAttribute('aria-pressed', x === c); });
      document.querySelectorAll('.gal-group').forEach(function (g) {
        g.hidden = !(f === 'all' || g.dataset.group === f);
      });
    });
  });

  // Lightbox. Clicks are picked up from the whole page, so photos added later (news albums) work too.
  // Previous/next stay inside the same album when the photo is in one.
  var lb = null, img, cap, idx = 0, last = null, group = [];
  var build = function () {
    lb = document.createElement('div');
    lb.className = 'lightbox'; lb.hidden = true;
    lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', L('Photo viewer', '照片查看器'));
    lb.innerHTML =
      '<button class="lb-btn lb-close" type="button" aria-label="' + L('Close', '关闭') + '"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>' +
      '<button class="lb-btn lb-prev" type="button" aria-label="' + L('Previous photo', '上一张') + '"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg></button>' +
      '<figure><img alt=""><figcaption></figcaption></figure>' +
      '<button class="lb-btn lb-next" type="button" aria-label="' + L('Next photo', '下一张') + '"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button>';
    document.body.appendChild(lb);
    img = lb.querySelector('img'); cap = lb.querySelector('figcaption');
    lb.querySelector('.lb-close').addEventListener('click', close);
    lb.querySelector('.lb-prev').addEventListener('click', function () { show(idx - 1); });
    lb.querySelector('.lb-next').addEventListener('click', function () { show(idx + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    lb.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'ArrowRight') show(idx + 1);
    });
  };
  var show = function (i) {
    if (!group.length) return;
    idx = (i + group.length) % group.length;
    var s = group[idx];
    img.src = s.dataset.full; img.alt = s.dataset.title || '';
    cap.textContent = s.dataset.title || '';
    if (s.dataset.sci) { var it = document.createElement('i'); it.textContent = s.dataset.sci; cap.appendChild(it); }
  };
  var open = function (s) {
    if (!lb) build();
    var scope = s.closest('.album') || document;
    group = Array.prototype.slice.call(scope.querySelectorAll('.shot[data-full]')).filter(function (x) { return !x.closest('[hidden]'); });
    last = s; lb.hidden = false; document.body.style.overflow = 'hidden'; show(group.indexOf(s)); lb.querySelector('.lb-close').focus();
  };
  function close() { lb.hidden = true; document.body.style.overflow = ''; img.src = ''; if (last) last.focus(); }
  document.addEventListener('click', function (e) {
    var s = e.target.closest && e.target.closest('.shot[data-full]');
    if (s) open(s);
  });

  // Floating contact buttons: WhatsApp and WeChat, each showing its QR card on hover (tap on phones for WeChat).
  // To set up WeChat: upload the QR code as assets/img/wechat-qr.jpg and put the WeChat ID below.
  var WECHAT_ID = '';
  var wa = document.querySelector('.wa-float');
  var me = document.querySelector('script[src$="site.js"]');
  if (wa && me && !document.querySelector('.fc-stack')) {
    var img = me.getAttribute('src').replace(/js\/site\.js$/, 'img/');
    var stack = document.createElement('div'); stack.className = 'fc-stack';
    var card = function (title, qr, alt, lines) {
      var c = document.createElement('div'); c.className = 'fc-card'; c.setAttribute('role', 'tooltip');
      var h = document.createElement('p'); h.className = 'fc-title'; h.textContent = title; c.appendChild(h);
      var q = document.createElement('img'); q.src = img + qr; q.alt = alt; q.width = 140; q.height = 140; q.loading = 'lazy';
      q.addEventListener('error', function () { q.replaceWith(Object.assign(document.createElement('p'), { className: 'fc-soon', textContent: L('QR code coming soon', '二维码即将上线') })); });
      c.appendChild(q);
      lines.forEach(function (t) { if (t) { var e = document.createElement('p'); e.className = 'fc-note'; e.textContent = t; c.appendChild(e); } });
      return c;
    };
    // WeChat
    var wc = document.createElement('div'); wc.className = 'fc fc-wechat';
    var wb = document.createElement('button'); wb.type = 'button'; wb.className = 'fc-btn wc-float';
    wb.setAttribute('aria-label', L('WeChat: show QR code', '微信：显示二维码')); wb.setAttribute('aria-expanded', 'false');
    wb.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.5 4C5.4 4 2 6.7 2 10.1c0 1.9 1.1 3.6 2.8 4.7L4.2 17l2.6-1.3c.8.2 1.7.4 2.7.4h.4"/><path d="M15.5 9c-3.6 0-6.5 2.4-6.5 5.3s2.9 5.3 6.5 5.3c.7 0 1.4-.1 2-.3l2.2 1.1-.5-2c1.7-1 2.8-2.5 2.8-4.1C22 11.4 19.1 9 15.5 9Z"/><circle cx="7" cy="9" r=".6" fill="currentColor"/><circle cx="11.5" cy="9" r=".6" fill="currentColor"/><circle cx="13.5" cy="13.8" r=".5" fill="currentColor"/><circle cx="17.5" cy="13.8" r=".5" fill="currentColor"/></svg>';
    wc.appendChild(wb);
    wc.appendChild(card(L('WeChat', '微信 WeChat'), 'wechat-qr.jpg', L('WeChat QR code for The Naturalist', 'The Naturalist 微信二维码'),
      [L('Scan in WeChat to add us', '用微信扫一扫添加我们'), WECHAT_ID && (L('WeChat ID: ', '微信号：') + WECHAT_ID)]));
    wb.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = !wc.classList.contains('open'); wc.classList.toggle('open', open); wb.setAttribute('aria-expanded', open);
    });
    // Links marked data-wechat (Chinese pages) open the WeChat card.
    document.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('[data-wechat]');
      if (!t) return;
      e.preventDefault(); e.stopPropagation();
      wc.classList.add('open'); wb.setAttribute('aria-expanded', 'true'); wb.focus({ preventScroll: true });
    });
    document.addEventListener('click', function (e) { if (!wc.contains(e.target)) { wc.classList.remove('open'); wb.setAttribute('aria-expanded', 'false'); } });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { wc.classList.remove('open'); wb.setAttribute('aria-expanded', 'false'); } });
    // WhatsApp: the button still opens the chat; hovering shows the QR for desktop visitors.
    // Chinese pages offer WeChat only; English pages offer both.
    wa.parentNode.insertBefore(stack, wa);
    if (ZH) {
      wa.remove();
      stack.appendChild(wc);
    } else {
      var wf = document.createElement('div'); wf.className = 'fc fc-whatsapp';
      wf.appendChild(wa);
      wf.appendChild(card('WhatsApp', 'contact-01.jpg', 'WhatsApp QR code for The Naturalist',
        ['Scan with your phone, or tap to chat', '+94 71 27 27 755']));
      stack.appendChild(wc); stack.appendChild(wf);
    }
  }

  // Pages that don't have the News link in their menu yet get it here.
  if (nav && !nav.querySelector('a[href$="news.html"]')) {
    var fn = nav.querySelector('a[href$="field-notes.html"]');
    if (fn) {
      var n = document.createElement('a');
      n.href = fn.getAttribute('href').replace('field-notes.html', 'news.html');
      n.textContent = L('News', '新闻');
      fn.after(n);
    }
  }
})();
