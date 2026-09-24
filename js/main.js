(() => {
  'use strict';

  document.documentElement.classList.add('js');

  const body = document.body;
  const menuToggle = document.getElementById('menu-toggle');
  const menuPanel = document.getElementById('mobile-menu-panel');
  const mediaInner = document.querySelector('.hero-media-inner');
  const featuredInner = document.querySelector('.featured-media-inner');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // Header hairline + subtle hero/film parallax, driven by one rAF-throttled pass.
  const updateScroll = () => {
    body.classList.toggle('is-scrolled', window.scrollY > 8);

    const wideViewport = window.innerWidth >= 768;

    if (!prefersReducedMotion && wideViewport && mediaInner) {
      const media = mediaInner.parentElement;
      const rect = media.getBoundingClientRect();
      const viewport = window.innerHeight;
      let progress = (viewport - rect.top) / viewport;
      progress = Math.min(Math.max(progress, 0), 1);
      mediaInner.style.transform = `translate3d(0, ${(progress * rect.height * 0.07).toFixed(2)}px, 0)`;
    }

    if (!prefersReducedMotion && wideViewport && featuredInner) {
      const media = featuredInner.parentElement;
      const rect = media.getBoundingClientRect();
      const viewport = window.innerHeight;
      let progress = (viewport - rect.top) / viewport;
      progress = Math.min(Math.max(progress, 0), 1);
      featuredInner.style.transform = `translate3d(0, ${(progress * rect.height * 0.04).toFixed(2)}px, 0)`;
    }
  };

  let ticking = false;
  const onScroll = () => {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(() => {
        updateScroll();
        ticking = false;
      });
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', updateScroll);
  updateScroll();

  // Scroll-driven reveals for sections that sit below the fold.
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-inview');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2, rootMargin: '0px 0px -8% 0px' }
  );

  document.querySelectorAll('.stats, .about, .services, .featured, .projects, .offices, .contact, .site-footer').forEach((el) => revealObserver.observe(el));

  // --- Full-screen mobile menu overlay ------------------------------------
  const menuLinks = menuPanel ? menuPanel.querySelectorAll('a') : [];
  let menuTrigger = null;

  const setMenuOpen = (open) => {
    if (!menuPanel) return;
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.classList.toggle('is-active', open);
    menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (open) {
      const openTrigger = document.activeElement;
      menuTrigger =
        openTrigger && openTrigger !== document.body && document.contains(openTrigger)
          ? openTrigger
          : menuToggle;
      body.classList.add('menu-open');
      menuPanel.inert = false;
      menuPanel.classList.add('is-open');
      const firstLink = menuLinks[0];
      if (firstLink) firstLink.focus();
    } else {
      body.classList.remove('menu-open');
      menuPanel.classList.remove('is-open');
      menuPanel.inert = true;
      if (menuTrigger && document.contains(menuTrigger)) menuTrigger.focus();
      menuTrigger = null;
    }
  };

  menuToggle.addEventListener('click', () => {
    setMenuOpen(menuToggle.getAttribute('aria-expanded') !== 'true');
  });

  menuLinks.forEach((link) => {
    link.addEventListener('click', () => setMenuOpen(false));
  });

  document.addEventListener('keydown', (e) => {
    if (!menuPanel) return;

    if (e.key === 'Escape' && menuPanel.classList.contains('is-open')) {
      setMenuOpen(false);
      return;
    }

    // Keep Tab focus cycling inside the open menu instead of leaking into the page.
    if (e.key === 'Tab' && menuPanel.classList.contains('is-open')) {
      const focusables = Array.from(menuPanel.querySelectorAll('a, button')).filter(
        (el) => !el.hasAttribute('hidden') && el.getClientRects().length > 0
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 767) setMenuOpen(false);
  });

  // Featured film: poster-first. If a real <video> source is wired in, the play
  // button toggles it; otherwise the optimised poster stays and the control is
  // marked non-actionable so no runtime error surfaces.
  const featuredPlay = document.querySelector('.featured-play');
  const featuredVideo = document.querySelector('video[data-featured]');
  if (featuredPlay) {
    if (featuredVideo) {
      featuredPlay.addEventListener('click', () => {
        if (featuredVideo.paused) {
          featuredVideo.muted = true;
          featuredVideo.play().catch(() => {});
        } else {
          featuredVideo.pause();
        }
      });
    } else {
      featuredPlay.setAttribute('aria-disabled', 'true');
    }
  }

  // Subtle custom cursor: a small dot that trails the pointer on fine-pointer
  // desktops and swells into a ring when hovering architecture media.
  // Position and scale are driven entirely through transform (GPU-friendly).
  if (!prefersReducedMotion && isFinePointer && window.innerWidth >= 768) {
    const dot = document.createElement('div');
    dot.className = 'cursor-dot';
    body.appendChild(dot);
    body.classList.add('cursor-enabled');

    document.querySelectorAll('.service-media, .project-media, .office-media, .featured-media').forEach((el) => {
      el.setAttribute('data-cursor', '');
    });

    let x = -100;
    let y = -100;
    let ax = -100;
    let ay = -100;
    let scale = 1;
    let targetScale = 1;
    let seen = false;

    const onPointerMove = (e) => {
      x = e.clientX;
      y = e.clientY;
      if (!seen) {
        seen = true;
        ax = x;
        ay = y;
      }
    };

    const follow = () => {
      ax += (x - ax) * 0.18;
      ay += (y - ay) * 0.18;
      scale += (targetScale - scale) * 0.18;
      dot.style.transform = `translate3d(${ax.toFixed(1)}px, ${ay.toFixed(1)}px, 0) translate(-50%, -50%) scale(${scale.toFixed(3)})`;
      window.requestAnimationFrame(follow);
    };

    window.addEventListener('mousemove', onPointerMove, { passive: true });
    document.addEventListener('mouseover', (e) => {
      const overMedia = Boolean(e.target.closest('[data-cursor]'));
      body.classList.toggle('cursor-on-media', overMedia);
      targetScale = overMedia ? 4 : 1;
    });
    window.requestAnimationFrame(follow);
  }

  // Graceful fallback for any image that fails to load.
  document.addEventListener(
    'error',
    (e) => {
      const el = e.target;
      if (el && el.tagName === 'IMG') {
        el.classList.add('img-error');
      }
    },
    true
  );

  // --- Contact form --------------------------------------------------------
  const contactForm = document.querySelector('.contact-form');
  if (contactForm) {
    const contactStatus = contactForm.querySelector('.contact-status');
    const contactSubmit = contactForm.querySelector('.contact-submit');
    const honeypot = contactForm.querySelector('.contact-honeypot');
    const contactEndpoint = (window.NORDIC_CONFIG && window.NORDIC_CONFIG.contactEndpoint) || '';

    const setStatus = (message, state) => {
      contactStatus.textContent = message || '';
      contactStatus.hidden = !message;
      if (state) {
        contactStatus.setAttribute('data-state', state);
      } else {
        contactStatus.removeAttribute('data-state');
      }
    };

    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!contactForm.checkValidity()) {
        contactForm.reportValidity();
        setStatus('Please complete the highlighted fields before sending.', 'error');
        return;
      }

      // Automated submissions fill the hidden honeypot; swallow those quietly.
      if (honeypot && honeypot.value.trim() !== '') {
        contactForm.reset();
        return;
      }

      if (!contactEndpoint) {
        // No delivery service configured. Do not fake a successful send.
        setStatus('This form is not connected to a mail service yet — please email hello@nordicstudio.com directly.', 'dev');
        return;
      }

      const payload = new FormData(contactForm);
      payload.delete('website');

      setStatus('', '');
      contactSubmit.disabled = true;
      contactSubmit.setAttribute('aria-busy', 'true');
      contactSubmit.textContent = 'Sending…';

      fetch(contactEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(payload.entries()))
      })
        .then((res) => {
          if (!res.ok) throw new Error(`request failed: ${res.status}`);
          return res;
        })
        .then(() => {
          contactForm.reset();
          setStatus('Thanks — we will be in touch within two working days.', 'success');
        })
        .catch(() => {
          setStatus('Sorry — your message could not be sent. Please email hello@nordicstudio.com instead.', 'error');
        })
        .finally(() => {
          contactSubmit.disabled = false;
          contactSubmit.removeAttribute('aria-busy');
          contactSubmit.textContent = 'Send Message';
        });
    });
  }
})();