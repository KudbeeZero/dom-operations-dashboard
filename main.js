/* ==========================================================================
   I Got A Dom — main.js
   HERMES Executor: canvas hero, GSAP hero, nav, before/after, reveals, form, QR.
   ========================================================================== */

/* Signal that JS is active so CSS can apply the hidden pre-reveal state.
   Done at parse time (script is at end of <body>) to avoid a flash. */
document.documentElement.classList.add('js');

/* -------------------------------------------------------------------------
   0. HERO CANVAS — particle field: chaos → align → sweep → snap → fade → loop
   ------------------------------------------------------------------------- */
function initHeroCanvas() {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const WORDS = ['resume', 'notes', 'draft', '??', 'typo', 'ALLCAPS',
                 'messy', 'fix', '•', '—', 'clean', 'ready', 'sent'];

  let w = 0, h = 0, dpr = 1;
  let particles = [];

  const lerp = (a, b, t) => a + (b - a) * t;
  const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

  // Build particles with a chaotic start and a tidy two-row target layout.
  function buildParticles() {
    const count = w < 600 ? 16 : 26;
    const perRow = Math.ceil(count / 2);
    const rowY = [h * 0.32, h * 0.68];      // straddle, but clear of the headline band
    const marginX = w * 0.14;
    const usable = w - marginX * 2;

    particles = [];
    for (let i = 0; i < count; i++) {
      const row = i < perRow ? 0 : 1;
      const slots = row === 0 ? perRow : count - perRow;
      const idxInRow = row === 0 ? i : i - perRow;
      const tx = marginX + (slots <= 1 ? usable / 2 : (usable * idxInRow) / (slots - 1));
      particles.push({
        text: WORDS[i % WORDS.length],
        tx, ty: rowY[row],
        cx: Math.random() * w,
        cy: Math.random() * h,
        size: 12 + Math.random() * 16,
        rot: (Math.random() - 0.5) * 1.4,
        floatPhase: Math.random() * Math.PI * 2,
        floatAmp: 8 + Math.random() * 14,
        reddish: Math.random() < 0.32,
      });
    }
  }

  function reseedChaos() {
    for (const p of particles) {
      p.cx = Math.random() * w;
      p.cy = Math.random() * h;
      p.rot = (Math.random() - 0.5) * 1.4;
      p.floatPhase = Math.random() * Math.PI * 2;
    }
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    w = rect.width; h = rect.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildParticles();
  }

  function drawParticle(p, align, opacity, ox, oy) {
    if (opacity <= 0.01) return;
    const x = lerp(p.cx, p.tx, align) + ox;
    const y = lerp(p.cy, p.ty, align) + oy;
    const rot = p.rot * (1 - align);
    const size = lerp(p.size, 16, align);

    // chaos = warm gray (red tint on some) → clean = blue-white
    const r = p.reddish ? lerp(202, 224, align) : lerp(178, 224, align);
    const g = p.reddish ? lerp(120, 240, align) : lerp(170, 240, align);
    const b = p.reddish ? lerp(110, 250, align) : lerp(162, 250, align);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.font = `${align > 0.5 ? 600 : 400} ${size}px 'DM Sans', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (align > 0.4) {
      ctx.shadowColor = `rgba(0,212,200,${0.4 * align})`;
      ctx.shadowBlur = 12 * align;
    }
    ctx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${opacity})`;
    ctx.fillText(p.text, 0, 0);
    ctx.restore();
  }

  // Static clean state for reduced-motion users.
  function drawStatic() {
    ctx.clearRect(0, 0, w, h);
    for (const p of particles) drawParticle(p, 1, 0.6, 0, 0);
  }

  if (prefersReduced) {
    resize();
    drawStatic();
    window.addEventListener('resize', () => { resize(); drawStatic(); }, { passive: true });
    return;
  }

  // Cycle timeline (ms): chaos → align → (sweep) → hold → fade → reset.
  const T_CHAOS = 2000, T_ALIGNED = 5000, T_HOLD = 6500, T_END = 7600;
  let cycleStart = null;

  function frame(now) {
    if (cycleStart === null) cycleStart = now;
    let t = now - cycleStart;
    if (t >= T_END) { reseedChaos(); cycleStart = now; t = 0; }

    ctx.clearRect(0, 0, w, h);

    let align;
    if (t < T_CHAOS) align = 0;
    else if (t < T_ALIGNED) align = easeInOut((t - T_CHAOS) / (T_ALIGNED - T_CHAOS));
    else align = 1;

    let opacity;
    if (t < T_CHAOS) opacity = 0.22;
    else if (t < T_ALIGNED) opacity = lerp(0.22, 0.85, (t - T_CHAOS) / (T_ALIGNED - T_CHAOS));
    else if (t < T_HOLD) opacity = 0.85;
    else opacity = lerp(0.85, 0, (t - T_HOLD) / (T_END - T_HOLD));

    const floatT = t / 1000;
    for (const p of particles) {
      const fade = 1 - align;
      const ox = Math.cos(floatT + p.floatPhase) * p.floatAmp * fade;
      const oy = Math.sin(floatT * 0.8 + p.floatPhase) * p.floatAmp * fade;
      drawParticle(p, align, opacity, ox, oy);
    }

    // Soft cursor-like glow sweep, left → right, 4s–5.2s.
    if (t >= 4000 && t <= 5200) {
      const sp = (t - 4000) / 1200;
      const sx = lerp(-0.15 * w, 1.15 * w, sp);
      const grad = ctx.createLinearGradient(sx - 130, 0, sx + 130, 0);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(0.5, `rgba(220,245,255,${0.45 * Math.sin(sp * Math.PI)})`);
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = grad;
      ctx.fillRect(sx - 140, 0, 280, h);
      ctx.restore();
    }

    requestAnimationFrame(frame);
  }

  resize();
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  }, { passive: true });
  requestAnimationFrame(frame);
}

/* -------------------------------------------------------------------------
   1. HERO — three-stage chaos→clarity transformation (GSAP)
   ------------------------------------------------------------------------- */
function initHeroAnimation() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const chaos    = Array.from(document.querySelectorAll('.chaos-card'));
  const clarity  = Array.from(document.querySelectorAll('.clarity-card'));
  const surface  = document.getElementById('glassSurface');
  const headline = document.querySelector('.hero-headline');
  const sub      = document.querySelector('.hero-sub');
  const ctaRow   = document.querySelector('.hero-cta-row');
  const eyebrow  = document.querySelector('.hero-eyebrow');

  // Card positions live in style.css (.chaos-card/.clarity-card :nth-child).
  // GSAP only animates transforms/opacity/filter on top of those positions.

  // Reduced motion (or GSAP failed to load): show static clarity state, no animation.
  if (prefersReduced || typeof gsap === 'undefined') {
    clarity.forEach((c) => { c.style.opacity = '0.85'; });
    [eyebrow, headline, sub, ctaRow].forEach((el) => { if (el) el.style.opacity = '1'; });
    return;
  }

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  // Stage 1 — chaos cards fly in
  if (chaos.length) {
    tl.from(chaos, {
      opacity: 0, scale: 0.5,
      rotation: (i) => (i % 2 === 0 ? -40 : 40),
      x: (i) => (i % 2 === 0 ? -120 : 120),
      y: -80, filter: 'blur(8px)',
      stagger: 0.08, duration: 0.7,
    });
  }

  // Stage 2 — headline + supporting copy drop in
  tl.from([eyebrow, headline, sub, ctaRow].filter(Boolean), {
    opacity: 0, y: 40, stagger: 0.1, duration: 0.6,
  }, chaos.length ? '-=0.3' : 0);

  // Stage 2.5 — glass surface ripple
  if (surface) {
    tl.to(surface, { opacity: 1, scaleX: 1.2, duration: 0.4, ease: 'power2.out' }, '+=0.15')
      .to(surface, { opacity: 0, duration: 0.6 }, '+=0.1');
  }

  // Stage 3a — chaos scatters out / blurs up
  if (chaos.length) {
    tl.to(chaos, {
      opacity: 0, scale: 0.3, filter: 'blur(12px)', y: -60,
      stagger: 0.05, duration: 0.5,
    }, '-=0.4');
  }

  // Stage 3b — clarity cards rise from below the glass
  if (clarity.length) {
    tl.fromTo(clarity,
      { opacity: 0, y: 60, scale: 0.85, filter: 'blur(6px)' },
      { opacity: 0.85, y: 0, scale: 1, filter: 'blur(0px)',
        stagger: 0.1, duration: 0.7, ease: 'back.out(1.7)' },
      '-=0.2');

    // Stage 4 — gentle perpetual float
    const settle = tl.duration();
    clarity.forEach((card, i) => {
      gsap.to(card, {
        y: i % 2 === 0 ? -12 : 10,
        duration: 2.5 + i * 0.3,
        repeat: -1, yoyo: true, ease: 'sine.inOut',
        delay: settle,
      });
    });
  }
}

/* -------------------------------------------------------------------------
   2. NAV — sticky glass on scroll + mobile menu
   ------------------------------------------------------------------------- */
function initNav() {
  const nav = document.getElementById('nav');
  const toggle = document.getElementById('navToggle');
  const menu = document.getElementById('mobileMenu');

  if (nav) {
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  if (toggle && menu) {
    const setOpen = (open) => {
      menu.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      menu.setAttribute('aria-hidden', String(!open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      document.body.style.overflow = open ? 'hidden' : '';
    };
    toggle.addEventListener('click', () => setOpen(!menu.classList.contains('open')));
    menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
  }
}

/* -------------------------------------------------------------------------
   3. CONTACT FORM — client-side validation
   ------------------------------------------------------------------------- */
function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;
  const confirm = document.getElementById('formConfirm');

  const fields = ['name', 'need', 'reach'];
  const MIN_MESSAGE = 10;

  const validateField = (id) => {
    const input = document.getElementById(id);
    const wrap = input.closest('.field');
    const err = form.querySelector(`.error[data-for="${id}"]`);
    const value = input.value.trim();
    let msg = '';

    if (!value) {
      msg = 'This one’s required.';
    } else if (id === 'need' && value.length < MIN_MESSAGE) {
      msg = `A little more detail, please (${value.length}/${MIN_MESSAGE}).`;
    } else if (id === 'reach' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value) && !/\d{7,}/.test(input.value.replace(/\D/g, ''))) {
      msg = 'Add a valid email or phone number.';
    }

    wrap.classList.toggle('invalid', Boolean(msg));
    if (err) err.textContent = msg;
    return !msg;
  };

  fields.forEach((id) => {
    const input = document.getElementById(id);
    input.addEventListener('blur', () => validateField(id));
    input.addEventListener('input', () => {
      if (input.closest('.field').classList.contains('invalid')) validateField(id);
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const allValid = fields.map(validateField).every(Boolean);
    if (!allValid) {
      form.querySelector('.field.invalid input, .field.invalid textarea')?.focus();
      return;
    }
    // Success: swap the form out for the branded confirmation state.
    form.hidden = true;
    if (confirm) {
      confirm.hidden = false;
      confirm.focus?.();
    }
  });
}

/* -------------------------------------------------------------------------
   4. QR CODE — teal/dark, points at the live site
   ------------------------------------------------------------------------- */
function initQRCode() {
  const target = document.getElementById('qrcode');
  if (!target || typeof QRCode === 'undefined') return;
  new QRCode(target, {
    text: 'https://igotadom.com',
    width: 128, height: 128,
    colorDark: '#00d4c8',
    colorLight: '#131316',
    correctLevel: QRCode.CorrectLevel.H,
  });
}

/* -------------------------------------------------------------------------
   5. BEFORE / AFTER — draggable comparison slider (pointer = mouse + touch)
   ------------------------------------------------------------------------- */
function initBeforeAfter() {
  const slider = document.getElementById('baSlider');
  const handle = document.getElementById('baHandle');
  if (!slider || !handle) return;

  const setPos = (pct) => {
    const v = Math.max(0, Math.min(100, pct));
    slider.style.setProperty('--pos', v + '%');
    handle.setAttribute('aria-valuenow', String(Math.round(v)));
  };

  const posFromX = (clientX) => {
    const rect = slider.getBoundingClientRect();
    return ((clientX - rect.left) / rect.width) * 100;
  };

  let dragging = false;

  const onDown = (e) => {
    dragging = true;
    handle.setPointerCapture?.(e.pointerId);
    setPos(posFromX(e.clientX));
  };
  const onMove = (e) => {
    if (!dragging) return;
    setPos(posFromX(e.clientX));
    if (e.cancelable) e.preventDefault();
  };
  const onUp = () => { dragging = false; };

  // Press anywhere on the slider to jump; grab the handle to drag.
  slider.addEventListener('pointerdown', onDown);
  handle.addEventListener('pointerdown', (e) => { e.stopPropagation(); onDown(e); });
  window.addEventListener('pointermove', onMove, { passive: false });
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);

  // Keyboard support for the slider role.
  handle.addEventListener('keydown', (e) => {
    const cur = parseFloat(slider.style.getPropertyValue('--pos')) || 50;
    const step = e.shiftKey ? 10 : 4;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { setPos(cur - step); e.preventDefault(); }
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { setPos(cur + step); e.preventDefault(); }
    else if (e.key === 'Home') { setPos(0); e.preventDefault(); }
    else if (e.key === 'End') { setPos(100); e.preventDefault(); }
  });

  setPos(50);
}

/* -------------------------------------------------------------------------
   6. SCROLL REVEALS — IntersectionObserver fade-up with per-section stagger
   ------------------------------------------------------------------------- */
function initScrollReveals() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const reveals = Array.from(document.querySelectorAll('.reveal'));
  if (!reveals.length) return;

  // Reduced motion or no IO support: leave everything visible (CSS default).
  if (prefersReduced || !('IntersectionObserver' in window)) {
    reveals.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  // Per-section stagger: each card waits index * step before easing in.
  const groups = [
    { selector: '.bento .bento-card',     step: 80 },
    { selector: '.pricing-grid .price-card', step: 120 },
    { selector: '.steps .step',           step: 200 },
  ];
  groups.forEach(({ selector, step }) => {
    document.querySelectorAll(selector).forEach((el, i) => {
      el.style.setProperty('--reveal-delay', i * step + 'ms');
    });
  });

  const inViewport = (el) => {
    const r = el.getBoundingClientRect();
    return r.top < window.innerHeight && r.bottom > 0;
  };

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

  reveals.forEach((el) => {
    // Anything already on screen at load shows instantly (no animation).
    if (inViewport(el)) {
      el.classList.add('is-instant', 'is-visible');
    } else {
      observer.observe(el);
    }
  });
}

/* ------------------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  // Each init is isolated so a failure in one (e.g. a blocked CDN) can't
  // take down the rest of the page's interactivity.
  const inits = [
    initHeroCanvas, initHeroAnimation, initNav,
    initBeforeAfter, initScrollReveals, initContactForm, initQRCode,
  ];
  for (const init of inits) {
    try { init(); } catch (err) { console.error(`${init.name} failed:`, err); }
  }
});
