/* =========================================================
   Nimbus — interactions
   ========================================================= */
(() => {
  'use strict';

  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------
     1. Header state + scroll progress
  --------------------------------------------------------- */
  const header = $('[data-header]');
  const progressBar = $('[data-progress-bar]');

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      if (header) header.classList.toggle('is-stuck', y > 12);

      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      if (progressBar) {
        progressBar.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
      }
      ticking = false;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------------------------------------------------------
     2. Mobile navigation
  --------------------------------------------------------- */
  const navToggle = $('[data-nav-toggle]');
  const mobileNav = $('[data-mobile-nav]');

  const setNav = (open) => {
    if (!navToggle || !mobileNav) return;
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    mobileNav.classList.toggle('is-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  };

  navToggle?.addEventListener('click', () =>
    setNav(navToggle.getAttribute('aria-expanded') !== 'true')
  );
  $$('a', mobileNav || document.createElement('div')).forEach((a) =>
    a.addEventListener('click', () => setNav(false))
  );
  window.addEventListener('resize', () => {
    if (window.innerWidth > 860) setNav(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setNav(false);
  });

  /* ---------------------------------------------------------
     3. Scroll reveal (IntersectionObserver)
  --------------------------------------------------------- */
  const revealables = $$('[data-reveal]');

  if (REDUCED || !('IntersectionObserver' in window)) {
    revealables.forEach((el) => el.classList.add('is-visible'));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          const siblings = el.parentElement
            ? Array.from(el.parentElement.children).filter((c) => c.hasAttribute('data-reveal'))
            : [];
          const index = siblings.indexOf(el);
          el.style.setProperty('--d', Math.max(0, index) * 90 + 'ms');
          el.classList.add('is-visible');
          io.unobserve(el);
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    revealables.forEach((el) => io.observe(el));
  }

  /* ---------------------------------------------------------
     4. Animated counters
  --------------------------------------------------------- */
  const counters = $$('[data-counter]');

  const animateCounter = (el) => {
    const target = parseFloat(el.dataset.counter);
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    const suffix = el.dataset.suffix || '';
    const duration = 1600;

    if (REDUCED) {
      el.textContent = target.toFixed(decimals) + suffix;
      return;
    }

    const start = performance.now();
    const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
    const finish = () => { el.textContent = target.toFixed(decimals) + suffix; };

    const step = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const value = target * easeOutExpo(p);
      el.textContent = value.toFixed(decimals) + suffix;
      if (p < 1) requestAnimationFrame(step);
      else finish();
    };
    requestAnimationFrame(step);
    // Safety net: guarantees the exact value even if rAF is throttled (background tab).
    window.setTimeout(finish, duration + 120);
  };

  if ('IntersectionObserver' in window) {
    const cio = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          animateCounter(entry.target);
          cio.unobserve(entry.target);
        });
      },
      { threshold: 0.6 }
    );
    counters.forEach((c) => cio.observe(c));
  } else {
    counters.forEach(animateCounter);
  }

  /* ---------------------------------------------------------
     5. Scroll spy — active nav link
  --------------------------------------------------------- */
  const navLinks = $$('.nav__link');
  const spyTargets = navLinks
    .map((l) => document.querySelector(l.getAttribute('href')))
    .filter(Boolean);

  if (spyTargets.length && 'IntersectionObserver' in window) {
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          navLinks.forEach((l) =>
            l.classList.toggle('is-active', l.getAttribute('href') === '#' + entry.target.id)
          );
        });
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );
    spyTargets.forEach((t) => spy.observe(t));
  }

  /* ---------------------------------------------------------
     6. Tabs
  --------------------------------------------------------- */
  $$('[data-tabs]').forEach((tabs) => {
    const tabBtns = $$('.tabs__tab', tabs);
    const panels = $$('.tabs__panel', tabs);

    const activate = (btn) => {
      const key = btn.dataset.tab;
      tabBtns.forEach((b) => {
        const on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-selected', String(on));
        b.tabIndex = on ? 0 : -1;
      });
      panels.forEach((p) => {
        const on = p.dataset.panel === key;
        p.hidden = !on;
        p.classList.toggle('is-active', on);
      });
    };

    tabBtns.forEach((btn, i) => {
      btn.addEventListener('click', () => activate(btn));
      btn.addEventListener('keydown', (e) => {
        let next = null;
        if (e.key === 'ArrowRight') next = tabBtns[(i + 1) % tabBtns.length];
        if (e.key === 'ArrowLeft') next = tabBtns[(i - 1 + tabBtns.length) % tabBtns.length];
        if (e.key === 'Home') next = tabBtns[0];
        if (e.key === 'End') next = tabBtns[tabBtns.length - 1];
        if (next) {
          e.preventDefault();
          next.focus();
          activate(next);
        }
      });
    });
  });

  /* ---------------------------------------------------------
     7. Pricing — billing period toggle
  --------------------------------------------------------- */
  const billing = $('[data-billing-toggle]');

  if (billing) {
    const btns = $$('.toggle__btn', billing);
    const thumb = $('.toggle__thumb', billing);

    const moveThumb = (btn) => {
      if (!thumb) return;
      const parent = billing.getBoundingClientRect();
      const btnRect = btn.getBoundingClientRect();
      const borderLeft = parseFloat(getComputedStyle(billing).borderLeftWidth) || 0;
      // The thumb's containing block is the padding box, so offset from the border edge.
      const x = btnRect.left - parent.left - borderLeft;
      thumb.style.width = btnRect.width + 'px';
      thumb.style.transform = `translateX(${x}px)`;
    };

    const setPeriod = (period) => {
      btns.forEach((b) => {
        const on = b.dataset.period === period;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', String(on));
      });

      $$('[data-price]').forEach((priceEl) => {
        const value = priceEl.dataset[period];
        if (priceEl.textContent === value) return;
        priceEl.classList.add('is-swapping');
        window.setTimeout(() => {
          priceEl.textContent = value;
          priceEl.classList.remove('is-swapping');
        }, REDUCED ? 0 : 180);
      });

      const active = btns.find((b) => b.dataset.period === period);
      if (active) moveThumb(active);
    };

    btns.forEach((b) =>
      b.addEventListener('click', () => setPeriod(b.dataset.period))
    );

    const initial = btns.find((b) => b.classList.contains('is-active')) || btns[0];
    requestAnimationFrame(() => setPeriod(initial?.dataset.period || 'monthly'));
    window.addEventListener('resize', () => {
      const active = btns.find((b) => b.classList.contains('is-active'));
      if (active) moveThumb(active);
    });

    // Webfonts (and any late layout shift) change button widths — re-measure.
    const remeasure = () => {
      const active = btns.find((b) => b.classList.contains('is-active'));
      if (active) moveThumb(active);
    };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
    if ('ResizeObserver' in window) new ResizeObserver(remeasure).observe(billing);
  }

  /* ---------------------------------------------------------
     8. FAQ accordion
  --------------------------------------------------------- */
  $$('[data-accordion]').forEach((acc) => {
    const items = $$('.faq__item', acc);

    items.forEach((item) => {
      const btn = $('.faq__q', item);
      btn?.addEventListener('click', () => {
        const isOpen = item.classList.contains('is-open');

        if (acc.dataset.accordion === 'single' || !isOpen) {
          items.forEach((it) => {
            it.classList.remove('is-open');
            $('.faq__q', it)?.setAttribute('aria-expanded', 'false');
          });
        }
        if (!isOpen) {
          item.classList.add('is-open');
          btn.setAttribute('aria-expanded', 'true');
        }
      });
    });
  });

  /* ---------------------------------------------------------
     9. Card spotlight (pointer-following glow)
  --------------------------------------------------------- */
  if (!REDUCED && window.matchMedia('(hover:hover)').matches) {
    $$('[data-spotlight]').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', ((e.clientX - r.left) / r.width) * 100 + '%');
        card.style.setProperty('--my', ((e.clientY - r.top) / r.height) * 100 + '%');
      });
    });
  }

  /* ---------------------------------------------------------
     10. Hero 3D tilt
  --------------------------------------------------------- */
  const tiltEl = $('[data-tilt]');
  if (tiltEl && !REDUCED && window.matchMedia('(hover:hover)').matches) {
    const inner = $('.mock', tiltEl);
    tiltEl.addEventListener('pointermove', (e) => {
      const r = tiltEl.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      if (inner) {
        inner.style.transform = `rotateY(${px * 9}deg) rotateX(${-py * 9}deg) translateZ(0)`;
      }
    });
    tiltEl.addEventListener('pointerleave', () => {
      if (inner) inner.style.transform = '';
    });
  }

  /* ---------------------------------------------------------
     11. CTA form + toast
  --------------------------------------------------------- */
  const toast = $('[data-toast]');
  const toastText = $('[data-toast-text]');
  let toastTimer;

  const showToast = (message) => {
    if (!toast) return;
    if (toastText) toastText.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 3600);
  };

  $$('[data-cta-form]').forEach((form) => {
    const input = $('input[type="email"]', form);
    const note = $('[data-cta-note]', form);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const value = input?.value.trim() || '';
      const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);

      if (!valid) {
        input?.classList.add('is-invalid');
        if (note) {
          note.textContent = 'Please enter a valid work email address.';
          note.classList.add('is-error');
        }
        input?.focus();
        return;
      }

      input?.classList.remove('is-invalid');
      if (note) {
        note.textContent = 'Thanks! Check your inbox for your invite.';
        note.classList.remove('is-error');
      }
      showToast("You're on the list — check your inbox!");
      form.reset();
    });

    input?.addEventListener('input', () => {
      input.classList.remove('is-invalid');
      if (note) {
        note.textContent = 'No credit card required · Free forever tier';
        note.classList.remove('is-error');
      }
    });
  });

  /* ---------------------------------------------------------
     12. Misc
  --------------------------------------------------------- */
  const yearEl = $('[data-year]');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Marquee: pause on hover + respect reduced motion
  const marquee = $('[data-marquee]');
  if (marquee && REDUCED) marquee.style.animation = 'none';

  // Smooth anchor scrolling with header offset
  $$('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href');
      if (!id) return;
      if (id === '#') {
        e.preventDefault();
        return;
      }
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const offset = (header?.offsetHeight || 72) + 12;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({
        top: Math.max(0, top),
        behavior: REDUCED ? 'auto' : 'smooth'
      });
      history.replaceState(null, '', id);
    });
  });
})();
