(() => {
  const themeName = "Impulse";
  const patterns = new Set(["mobile-menu","hover-zoom-cards","sticky-nav","mega-menu","quick-view","countdown-timer","parallax-hero","slide-out-cart","swatch-filters","before-after-slider","promo-popup"]);
  const header = document.querySelector('.site-header');
  const menuToggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.primary-nav');
  const heroMedia = document.querySelector('.hero__media');
  const quickView = document.querySelector('.quick-view');
  const quickViewTitle = document.querySelector('#quick-view-title');
  const quickViewCopy = document.querySelector('[data-quick-view-copy]');
  const cartDrawer = document.querySelector('.cart-drawer');
  const cartCount = document.querySelector('.cart-count');
  const backToTop = document.querySelector('.back-to-top');
  const promo = document.querySelector('.promo-popup');
  let cartItems = 0;

  function setExpanded(button, expanded) {
    if (button) button.setAttribute('aria-expanded', String(expanded));
  }

  function setOpen(panel, isOpen) {
    if (!panel) return;
    panel.classList.toggle('is-open', isOpen);
    panel.setAttribute('aria-hidden', String(!isOpen));
  }

  function updateScrollStates() {
    const isScrolled = window.scrollY > 24;
    if (header && patterns.has('sticky-nav')) header.classList.toggle('is-scrolled', isScrolled);
    if (backToTop) backToTop.classList.toggle('is-visible', window.scrollY > 600);
    if (heroMedia && patterns.has('parallax-hero')) {
      heroMedia.style.setProperty('--parallax-offset', Math.round(window.scrollY * 0.08) + 'px');
    }
  }

  window.addEventListener('scroll', updateScrollStates, { passive: true });
  updateScrollStates();

  if (menuToggle && nav && patterns.has('mobile-menu')) {
    menuToggle.addEventListener('click', () => {
      const nextState = !nav.classList.contains('is-open');
      nav.classList.toggle('is-open', nextState);
      document.body.classList.toggle('menu-open', nextState);
      setExpanded(menuToggle, nextState);
    });
  }

  document.querySelectorAll('.primary-nav a').forEach((link) => {
    link.addEventListener('click', () => {
      nav?.classList.remove('is-open');
      document.body.classList.remove('menu-open');
      setExpanded(menuToggle, false);
    });
  });

  document.querySelectorAll('[data-product-card]').forEach((card) => {
    card.addEventListener('mouseenter', () => card.classList.add('is-hovered'));
    card.addEventListener('mouseleave', () => card.classList.remove('is-hovered'));
  });

  document.querySelectorAll('[data-open-quick-view]').forEach((button) => {
    button.addEventListener('click', () => {
      if (quickViewTitle) quickViewTitle.textContent = button.dataset.product || themeName + ' selection';
      if (quickViewCopy) quickViewCopy.textContent = button.dataset.copy || 'A focused product edit with practical buying details.';
      setOpen(quickView, true);
    });
  });

  document.querySelector('[data-close-quick-view]')?.addEventListener('click', () => setOpen(quickView, false));

  document.querySelectorAll('[data-cart-add]').forEach((button) => {
    button.addEventListener('click', () => {
      cartItems += 1;
      if (cartCount) cartCount.textContent = String(cartItems);
      button.textContent = 'Added';
      window.setTimeout(() => {
        button.textContent = button.closest('.quick-view') ? 'Add to cart' : 'Add';
      }, 1100);
    });
  });

  document.querySelector('[data-cart-open]')?.addEventListener('click', () => setOpen(cartDrawer, true));
  document.querySelector('[data-cart-close]')?.addEventListener('click', () => setOpen(cartDrawer, false));

  document.querySelectorAll('.swatch').forEach((swatch) => {
    swatch.style.setProperty('--swatch-color', swatch.dataset.swatch || '#111111');
    swatch.addEventListener('click', () => {
      document.querySelectorAll('.swatch').forEach((item) => item.classList.remove('is-selected'));
      swatch.classList.add('is-selected');
    });
  });

  document.querySelectorAll('[data-before-after]').forEach((compare) => {
    const input = compare.querySelector('input[type="range"]');
    input?.addEventListener('input', () => {
      compare.style.setProperty('--compare-width', input.value + '%');
    });
  });

  backToTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  if (patterns.has('promo-popup') && promo) {
    window.setTimeout(() => {
      promo.classList.add('is-open');
      promo.setAttribute('aria-hidden', 'false');
    }, 1600);
    document.querySelector('[data-close-promo]')?.addEventListener('click', () => {
      promo.classList.remove('is-open');
      promo.setAttribute('aria-hidden', 'true');
    });
  }

  if (patterns.has('countdown-timer')) {
    const announcement = document.querySelector('.announcement-bar');
    const endTime = Date.now() + 48 * 60 * 60 * 1000;
    window.setInterval(() => {
      if (!announcement) return;
      const remaining = Math.max(0, endTime - Date.now());
      const hours = String(Math.floor(remaining / 3600000)).padStart(2, '0');
      const minutes = String(Math.floor((remaining % 3600000) / 60000)).padStart(2, '0');
      announcement.dataset.timer = hours + ':' + minutes;
    }, 30000);
  }

  if (patterns.has('infinite-scroll')) {
    const rail = document.querySelector('.collection-rail');
    rail?.addEventListener('scroll', () => {
      if (rail.scrollLeft + rail.clientWidth > rail.scrollWidth - 8) rail.scrollLeft = 0;
    }, { passive: true });
  }

  if (patterns.has('mega-menu')) {
    document.querySelectorAll('.primary-nav a').forEach((link) => {
      link.addEventListener('mouseenter', () => link.dataset.preview = 'open');
      link.addEventListener('mouseleave', () => delete link.dataset.preview);
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    setOpen(quickView, false);
    setOpen(cartDrawer, false);
    nav?.classList.remove('is-open');
    document.body.classList.remove('menu-open');
    setExpanded(menuToggle, false);
  });

  document.querySelector('.newsletter-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const button = event.currentTarget.querySelector('button');
    if (!button) return;
    button.textContent = 'Joined';
    event.currentTarget.reset();
  });
})();