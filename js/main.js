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

/* --- Publications: Year Filter & Search -------------------- */
(function () {
  const searchInput = document.getElementById('pubSearch');
  const yearBtns = document.querySelectorAll('.pub-year-btn');
  const yearGroups = document.querySelectorAll('.pub-year-group');

  if (!searchInput && !yearBtns.length) return;

  // Year filter
  yearBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      yearBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const year = btn.dataset.year;

      yearGroups.forEach(group => {
        if (year === 'all' || group.dataset.year === year) {
          group.style.display = '';
          group.classList.remove('collapsed');
        } else {
          group.style.display = 'none';
        }
      });

      // Re-run search with new filter
      if (searchInput) filterPubs(searchInput.value);
    });
  });

  // Year group toggle (collapse/expand)
  document.querySelectorAll('.pub-year-group__header').forEach(header => {
    header.addEventListener('click', () => {
      const group = header.closest('.pub-year-group');
      group.classList.toggle('collapsed');
    });
  });

  // Search filter
  if (searchInput) {
    searchInput.addEventListener('input', () => filterPubs(searchInput.value));
  }

  function filterPubs(query) {
    const q = query.toLowerCase().trim();
    let totalVisible = 0;

    yearGroups.forEach(group => {
      // Skip hidden-by-year groups
      if (group.style.display === 'none') return;

      let groupVisible = 0;
      group.querySelectorAll('.pub-entry').forEach(entry => {
        const text = entry.textContent.toLowerCase();
        if (!q || text.includes(q)) {
          entry.style.display = '';
          groupVisible++;
          totalVisible++;
        } else {
          entry.style.display = 'none';
        }
      });

      // Hide group header if no matches
      group.style.display = groupVisible === 0 ? 'none' : '';

      // Update count badge (search results only — no per-year counts)
      const countEl = group.querySelector('.pub-year-group__count');
      if (countEl && q) {
        countEl.textContent = `${groupVisible} result${groupVisible !== 1 ? 's' : ''}`;
      } else if (countEl) {
        countEl.textContent = '';
      }
    });

    // Update global count
    const countEl = document.getElementById('pubCount');
    if (countEl) {
      const allEntries = document.querySelectorAll('.pub-entry');
      countEl.textContent = q
        ? `${totalVisible} of ${allEntries.length} publications`
        : '';
    }
  }
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
