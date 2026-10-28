(function () {
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
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
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
      var done = function () { b.textContent = 'Copied'; setTimeout(function () { b.textContent = 'Copy'; }, 1600); };
      var select = function () {
        var r = document.createRange(); r.selectNodeContents(el);
        var s = getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = 'Selected';
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
    lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Photo viewer');
    lb.innerHTML =
      '<button class="lb-btn lb-close" type="button" aria-label="Close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>' +
      '<button class="lb-btn lb-prev" type="button" aria-label="Previous photo"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg></button>' +
      '<figure><img alt=""><figcaption></figcaption></figure>' +
      '<button class="lb-btn lb-next" type="button" aria-label="Next photo"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button>';
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

  // Pages that don't have the News link in their menu yet get it here.
  if (nav && !nav.querySelector('a[href$="news.html"]')) {
    var fn = nav.querySelector('a[href$="field-notes.html"]');
    if (fn) {
      var n = document.createElement('a');
      n.href = fn.getAttribute('href').replace('field-notes.html', 'news.html');
      n.textContent = 'News';
      fn.after(n);
    }
  }
})();
