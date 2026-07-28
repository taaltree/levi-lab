/* ============================================================
   THE LEVI LAB — Main JavaScript
   ============================================================ */

/* --- Theme (OSU / Forest) ---------------------------------- */
(function () {
  // Restore saved theme on load (inline script in <head> handles the initial
  // set to avoid flash; this just ensures the toggle button reflects it)

  function applyTheme(theme) {
    if (theme === 'osu') {
      document.documentElement.setAttribute('data-theme', 'osu');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('levi-lab-theme', theme);
  }

  // Inject toggle button into desktop nav
  // (script runs at bottom of <body>, DOM already ready — no DOMContentLoaded needed)
  (function () {
    const navLinks = document.querySelector('.nav__links');
    if (!navLinks) return;

    const btn = document.createElement('button');
    btn.className = 'theme-toggle';
    btn.setAttribute('aria-label', 'Toggle color theme');

    function renderBtn() {
      const isOSU = document.documentElement.getAttribute('data-theme') === 'osu';
      btn.innerHTML =
        '<span class="theme-toggle__swatch"></span>' +
        (isOSU ? 'Forest' : 'OSU');
      btn.title = isOSU ? 'Switch to forest green theme' : 'Switch to OSU orange & black';
    }
    renderBtn();

    btn.addEventListener('click', function () {
      const isOSU = document.documentElement.getAttribute('data-theme') === 'osu';
      applyTheme(isOSU ? 'forest' : 'osu');
      renderBtn();
    });

    // Insert just before the Donate button. The donate link is wrapped in an
    // <li>, so insert relative to that list item — not the <a> itself, which
    // is not a direct child of .nav__links.
    const donateLi = navLinks.querySelector('.btn--donate')?.closest('li');
    if (donateLi && donateLi.parentNode === navLinks) {
      navLinks.insertBefore(btn, donateLi);
    } else {
      navLinks.appendChild(btn);
    }
  }());
})();

/* --- Navigation -------------------------------------------- */
(function () {
  const nav = document.querySelector('.nav');
  const hamburger = document.querySelector('.nav__hamburger');
  const mobileNav = document.querySelector('.nav__mobile');

  if (!nav) return;

  // Transparent → solid on scroll
  function updateNav() {
    if (window.scrollY > 60) {
      nav.classList.remove('nav--transparent');
      nav.classList.add('nav--solid');
    } else {
      // Only transparent on pages that have a hero video/image
      if (document.querySelector('.hero')) {
        nav.classList.add('nav--transparent');
        nav.classList.remove('nav--solid');
      }
    }
  }

  window.addEventListener('scroll', updateNav, { passive: true });
  updateNav();

  // On pages without a full hero, always solid
  if (!document.querySelector('.hero')) {
    nav.classList.add('nav--solid');
    nav.classList.remove('nav--transparent');
  }

  // Hamburger toggle
  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      const open = mobileNav.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', String(open));
    });

    // Close on Escape and hand focus back to the button
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && mobileNav.classList.contains('open')) {
        hamburger.classList.remove('open');
        mobileNav.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        hamburger.focus();
      }
    });
  }

  // Highlight active nav link
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav__link, .nav__mobile-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
})();

/* --- Scroll Animations ------------------------------------- */
(function () {
  const elements = document.querySelectorAll('.fade-in');
  if (!elements.length) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) {
    elements.forEach(el => el.classList.add('visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  elements.forEach(el => observer.observe(el));
})();

/* --- Gallery ------------------------------------------------
   Items are poster images that open the lightbox on click. They used
   to be five <video> elements force-set to autoplay here, which
   defeated preload="none" and cost ~33 MB on every homepage load.
   ------------------------------------------------------------ */

/* --- Lightbox ---------------------------------------------- */
(function () {
  const lightbox = document.getElementById('lightbox');
  if (!lightbox) return;

  const lightboxVideo = lightbox.querySelector('video');
  const closeBtn = lightbox.querySelector('.lightbox__close');

  document.querySelectorAll('[data-video-src]').forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      const src = trigger.getAttribute('data-video-src');
      lightboxVideo.src = src;
      lightboxVideo.play().catch(() => {});
      lightbox.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
  });

  function closeLightbox() {
    lightbox.classList.remove('open');
    lightboxVideo.pause();
    lightboxVideo.src = '';
    document.body.style.overflow = '';
  }

  if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
  });
})();

/* --- Publications: topic, year, and search filters ----------
   All three compose. `?topic=` arrives from a research-area page and
   filters on the data-topics attribute; year and search then narrow
   further within that subset.
   ------------------------------------------------------------ */
(function () {
  const searchInput = document.getElementById('pubSearch');
  const yearBtns    = document.querySelectorAll('.pub-year-btn');
  const yearGroups  = document.querySelectorAll('.pub-year-group');
  const entries     = document.querySelectorAll('.pub-entry');

  if (!searchInput && !yearBtns.length) return;

  const TOPIC_NAMES = {
    'env-genetics':     'Environmental Genetics',
    'wildlife-ecology': 'Wildlife Ecology & Trophic Cascades',
    'tropical':         'Human Livelihoods & Tropical Conservation',
    'salmon':           'Salmon, Humans & Wildlife',
    'disease':          'Disease Ecology',
    'cascadia':         'Cascadia Forests & Wildlife'
  };

  const params = new URLSearchParams(window.location.search);
  const topic  = params.get('topic');
  let year     = 'all';

  // Banner telling the visitor why they are seeing a subset
  if (topic && TOPIC_NAMES[topic]) {
    const banner = document.getElementById('pubTopicBanner');
    const name   = document.getElementById('pubTopicName');
    const count  = document.getElementById('pubTopicCount');
    if (banner && name) {
      const n = document.querySelectorAll(
        '.pub-entry[data-topics~="' + topic + '"]').length;
      name.textContent = TOPIC_NAMES[topic];
      if (count) count.textContent = n + (n === 1 ? ' publication' : ' publications');
      banner.hidden = false;
    }
  }

  function matchesTopic(entry) {
    if (!topic || !TOPIC_NAMES[topic]) return true;
    const t = entry.getAttribute('data-topics') || '';
    return t.split(/\s+/).indexOf(topic) !== -1;
  }

  function apply() {
    const q = (searchInput ? searchInput.value : '').toLowerCase().trim();
    let totalVisible = 0;

    yearGroups.forEach(group => {
      const groupYear = group.dataset.year;
      const yearOK = (year === 'all' || groupYear === year);
      let groupVisible = 0;

      group.querySelectorAll('.pub-entry').forEach(entry => {
        const textOK = !q || entry.textContent.toLowerCase().includes(q);
        const show = yearOK && textOK && matchesTopic(entry);
        entry.style.display = show ? '' : 'none';
        if (show) { groupVisible++; totalVisible++; }
      });

      // A year with nothing left to show is hidden entirely, header included
      group.style.display = groupVisible === 0 ? 'none' : '';
      if (groupVisible) group.classList.remove('collapsed');

      const countEl = group.querySelector('.pub-year-group__count');
      if (countEl) {
        countEl.textContent = (q || topic)
          ? groupVisible + (groupVisible === 1 ? ' result' : ' results')
          : '';
      }
    });

    const totalEl = document.getElementById('pubCount');
    if (totalEl) {
      const all = entries.length;
      totalEl.textContent = (q || topic)
        ? totalVisible + ' of ' + all + ' publications'
        : '';
    }
  }

  yearBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      yearBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      year = btn.dataset.year;
      apply();
    });
  });

  document.querySelectorAll('.pub-year-group__header').forEach(header => {
    header.addEventListener('click', () => {
      header.closest('.pub-year-group').classList.toggle('collapsed');
    });
  });

  if (searchInput) searchInput.addEventListener('input', apply);

  apply();   // run once so ?topic= takes effect on load
})();

/* --- Auto-link publication titles to Google Scholar -------- */
(function () {
  document.querySelectorAll('.pub-entry__title, .pub-item__title').forEach(el => {
    const title = el.textContent.trim();
    if (!title || el.querySelector('a')) return;
    // Built as DOM rather than innerHTML: a title containing &, <, or
    // markup such as an italicised species name would otherwise be
    // mangled or silently dropped.
    const a = document.createElement('a');
    a.className = 'pub-title-link';
    a.href = 'https://scholar.google.com/scholar?q=' + encodeURIComponent(title);
    a.target = '_blank';
    a.rel = 'noopener';
    while (el.firstChild) a.appendChild(el.firstChild);
    el.appendChild(a);
  });
})();

/* --- Smooth anchor scrolling ------------------------------- */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    // querySelector('#') throws, and '#' is not a real target anyway
    if (!id || id === '#') return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    // Sections are not focusable, so keyboard focus would otherwise
    // stay behind at the link that was just activated.
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });
});

/* --- Footer year -------------------------------------------- */
(function () {
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();
