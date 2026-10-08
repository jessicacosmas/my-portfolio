
  /* =========================================================
     A PURPLE - page behaviour.
     Nothing here is needed for the content to show; it only adds
     polish. Safe to edit, but you normally will not need to.
     ========================================================= */
  (function () {
    'use strict';

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- 1. Footer year ------------------------------------- */
    var yearEl = document.getElementById('year');
    if (yearEl) { yearEl.textContent = new Date().getFullYear(); }

    /* ---------- 2. Mobile menu ------------------------------------- */
    var nav = document.getElementById('site-nav');
    var toggle = document.querySelector('.nav__toggle');
    var menu = document.getElementById('primary-menu');

    function closeMenu() {
      if (!nav || !toggle) { return; }
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('nav-open');
    }
    function openMenu() {
      nav.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      document.body.classList.add('nav-open');
    }
    if (nav && toggle && menu) {
      toggle.addEventListener('click', function () {
        if (nav.classList.contains('is-open')) { closeMenu(); } else { openMenu(); }
      });
      // close when a menu link is tapped
      menu.addEventListener('click', function (event) {
        if (event.target.closest('a')) { closeMenu(); }
      });
      // close with the Escape key
      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') { closeMenu(); }
      });
      // close if the window is widened to desktop
      window.addEventListener('resize', function () {
        if (window.innerWidth >= 900) { closeMenu(); }
      });
    }

    /* ---------- 3. Header shadow + back-to-top button -------------- */
    var toTop = document.getElementById('to-top');
    function onScroll() {
      if (nav) { nav.classList.toggle('is-scrolled', window.scrollY > 8); }
      if (toTop) { toTop.classList.toggle('is-visible', window.scrollY > 600); }
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    if (toTop) {
      toTop.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
      });
    }

    /* ---------- 4. Fade-up on scroll -------------------------------
       Any element with class="reveal" fades up when it enters the
       viewport. Add "reveal--d1 / d2 / d3" to stagger a row.        */
    var reveals = document.querySelectorAll('.reveal');
    if (reduceMotion || !('IntersectionObserver' in window)) {
      for (var r = 0; r < reveals.length; r++) { reveals[r].classList.add('is-visible'); }
    } else {
      var revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
      reveals.forEach(function (el) { revealObserver.observe(el); });
    }

    /* ---------- 5. Highlight the nav link for the section on screen -- */
    var sections = document.querySelectorAll('main section[id]');
    var navLinks = document.querySelectorAll('.nav__list a');
    if (navLinks.length && 'IntersectionObserver' in window) {
      var spy = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) { return; }
          for (var i = 0; i < navLinks.length; i++) {
            var link = navLinks[i];
            if (link.getAttribute('href') === '#' + entry.target.id) {
              link.classList.add('is-active');
            } else {
              link.classList.remove('is-active');
            }
          }
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      sections.forEach(function (section) { spy.observe(section); });
    }

    /* ---------- 6. Animated stat counters ---------------------------
       Change the numbers in the HTML (data-count + data-suffix), not here. */
    var counters = document.querySelectorAll('.stat__num[data-count]');

    function formatNumber(value) { return value.toLocaleString('en-US'); }

    function runCounter(el) {
      var target = parseFloat(el.getAttribute('data-count')) || 0;
      var suffix = el.getAttribute('data-suffix') || '';
      var duration = 1500;

      if (reduceMotion) { el.textContent = formatNumber(target) + suffix; return; }

      var startTime = null;
      function frame(now) {
        if (startTime === null) { startTime = now; }
        var progress = Math.min((now - startTime) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = formatNumber(Math.round(target * eased)) + suffix;
        if (progress < 1) { window.requestAnimationFrame(frame); }
      }
      window.requestAnimationFrame(frame);
    }

    if (counters.length && !reduceMotion && 'IntersectionObserver' in window) {
      var counterObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            runCounter(entry.target);
            counterObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.5 });
      counters.forEach(function (el) { counterObserver.observe(el); });
    }

    /* ---------- 7. Contact form -------------------------------------
       The form is validated on the spot. It has no backend yet: paste a
       free Formspree or Netlify endpoint into the form's action=""
       attribute and the browser will post to it normally. Until then we
       show a friendly message instead of a broken page.               */
    var form = document.getElementById('contact-form');
    if (form) {
      var status = document.getElementById('form-status');
      var action = form.getAttribute('action') || '';
      var endpointReady = action.indexOf('http') === 0 && action.indexOf('[PLACEHOLDER') === -1;

      function setStatus(message, state) {
        if (!status) { return; }
        status.textContent = message;
        status.setAttribute('data-state', state || 'info');
      }

      function setFieldError(input, message) {
        var field = input.closest('.field');
        var errorEl = field ? field.querySelector('.field__error') : null;
        if (message) {
          if (field) { field.classList.add('has-error'); }
          if (errorEl) { errorEl.textContent = message; }
          input.setAttribute('aria-invalid', 'true');
          return false;
        }
        if (field) { field.classList.remove('has-error'); }
        if (errorEl) { errorEl.textContent = ''; }
        input.removeAttribute('aria-invalid');
        return true;
      }

      function validateField(input) {
        var value = (input.value || '').trim();
        if (input.hasAttribute('required') && value === '') {
          return setFieldError(input, 'This field is required.');
        }
        if (input.type === 'email' && value !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
          return setFieldError(input, 'Please enter a valid email address.');
        }
        if (input.id === 'message' && value !== '' && value.length < 10) {
          return setFieldError(input, 'A little more detail helps: 10 characters minimum.');
        }
        return setFieldError(input, '');
      }

      var inputs = form.querySelectorAll('input, textarea');
      inputs.forEach(function (input) {
        input.addEventListener('blur', function () { validateField(input); });
        input.addEventListener('input', function () {
          var field = input.closest('.field');
          if (field && field.classList.contains('has-error')) { validateField(input); }
        });
      });

      form.addEventListener('submit', function (event) {
        var firstInvalid = null;
        inputs.forEach(function (input) {
          if (!validateField(input) && !firstInvalid) { firstInvalid = input; }
        });

        if (firstInvalid) {
          event.preventDefault();
          firstInvalid.focus();
          setStatus('Please check the highlighted fields and try again.', 'error');
          return;
        }

        if (!endpointReady) {
          event.preventDefault();
          setStatus('Thank you - your details look good. This form is not connected to an inbox yet, so please email me directly and I will reply within 24 hours.', 'success');
          form.reset();
          return;
        }

        setStatus('Sending your message...', 'info');
      });
    }
  })();
