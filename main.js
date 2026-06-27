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

  const submitBtn = form.querySelector('.form-submit');
  const formError = document.getElementById('formError');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const allValid = fields.map(validateField).every(Boolean);
    if (!allValid) {
      form.querySelector('.field.invalid input, .field.invalid textarea')?.focus();
      return;
    }

    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending…'; }
    if (formError) formError.hidden = true;

    try {
      const res = await fetch('https://formspree.io/f/mqevpwzd', {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(form),
      });

      if (res.ok) {
        form.hidden = true;
        if (confirm) { confirm.hidden = false; confirm.focus?.(); }
      } else {
        throw new Error('not ok');
      }
    } catch (_) {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Send It →'; }
      if (formError) formError.hidden = false;
    }
  });
}

/* -------------------------------------------------------------------------
   4. QR CODE — teal/dark, opens SMS to Dominick's number
   ------------------------------------------------------------------------- */
function initQRCode() {
  const target = document.getElementById('qrcode');
  if (!target || typeof QRCode === 'undefined') return;
  new QRCode(target, {
    text: 'sms:7736477598',
    width: 128, height: 128,
    colorDark: '#00d4c8',
    colorLight: '#131316',
    correctLevel: QRCode.CorrectLevel.H,
  });
}

/* -------------------------------------------------------------------------
   4b. STICKY MOBILE CONTACT BAR — reveal after the hero scrolls past
   ------------------------------------------------------------------------- */
function initMobileBar() {
  const bar = document.getElementById('mobileBar');
  if (!bar) return;
  // Show once the user has scrolled past ~60% of the first screen.
  const onScroll = () => bar.classList.toggle('show', window.scrollY > window.innerHeight * 0.6);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* -------------------------------------------------------------------------
   5. BEFORE / AFTER — draggable comparison slider (pointer = mouse + touch)
   ------------------------------------------------------------------------- */
function initBeforeAfter() {
  const slider = document.getElementById('baSlider');
  const handle = document.getElementById('baHandle');
  if (!slider || !handle) return;

  const beforeContent = document.getElementById('baBeforeContent');
  const afterContent  = document.getElementById('baAfterContent');

  /* ---- Example data: one entry per tab ---- */
  const EXAMPLES = [
    /* 0 — Resume */
    {
      before: [
        '<p class="ba-line ba-title-line"><span class="ba-bad">resuMe</span> – <span class="ba-bad">johN smIth</span></p>',
        '<p class="ba-line ba-note">john.smith@gmal.com · <span class="ba-bad">773 64-75-98</span></p>',
        '<p class="ba-line"><span class="ba-bad">excperience</span> 2019-curent</p>',
        '<p class="ba-line">google — <span class="ba-bad">sofTware</span> eng <span class="ba-bad">(Sr??)</span></p>',
        '<p class="ba-line ba-skills-messy">•skills: python java sql idk maybe react?</p>',
        '<p class="ba-line"><span class="ba-bad">edukation:</span> BS ComputerSci 2018</p>',
        '<p class="ba-line ba-stamp-messy">draft?? is this ok to send?? ugh</p>',
      ].join(''),
      after: [
        '<p class="ba-line ba-title-line">John Smith</p>',
        '<p class="ba-line ba-meta">john.smith@gmail.com · (773) 647-5998</p>',
        '<p class="ba-line ba-section-label">Experience</p>',
        '<p class="ba-line">Google <span class="ba-dash">—</span> Senior Software Engineer <span class="ba-dash">· 2019–Present</span></p>',
        '<p class="ba-line ba-section-label">Education</p>',
        '<p class="ba-line">B.S. Computer Science <span class="ba-dash">· 2018</span></p>',
        '<p class="ba-line ba-skills"><span class="ba-chip">Python</span><span class="ba-chip">Java</span><span class="ba-chip">SQL</span><span class="ba-chip">React</span></p>',
        '<p class="ba-line ba-stamp"><span class="ba-check">✓</span> Polished &amp; interview-ready</p>',
      ].join(''),
    },
    /* 1 — Screenshot */
    {
      before: [
        '<p class="ba-line ba-title-line"><span class="ba-bad">📸 IMG_3847.png</span></p>',
        '<p class="ba-line ba-note">blurry receipt photo — can you get the numbers?</p>',
        '<p class="ba-line"><span class="ba-bad">T0tal items: l4</span></p>',
        '<p class="ba-line"><span class="ba-bad">Subtt0l: $84.99</span></p>',
        '<p class="ba-line"><span class="ba-bad">Tax (8.25%): $7.O1</span></p>',
        '<p class="ba-line"><span class="ba-bad">TOTAI: $92.OO</span></p>',
        '<p class="ba-line ba-stamp-messy">pls confirrm asap!!</p>',
      ].join(''),
      after: [
        '<p class="ba-line ba-title-line">Order Summary</p>',
        '<p class="ba-line ba-meta">Extracted from IMG_3847.png</p>',
        '<p class="ba-line">Total Items: <span class="ba-dash">14</span></p>',
        '<p class="ba-line">Subtotal: <span class="ba-dash">$84.99</span></p>',
        '<p class="ba-line">Tax (8.25%): <span class="ba-dash">$7.01</span></p>',
        '<p class="ba-line">Total: <span class="ba-dash">$92.00</span></p>',
        '<p class="ba-line ba-stamp"><span class="ba-check">✓</span> Extracted &amp; ready to send</p>',
      ].join(''),
    },
    /* 2 — Notes */
    {
      before: [
        '<p class="ba-line ba-title-line"><span class="ba-bad">mtg notes thurs maybe?</span></p>',
        '<p class="ba-line ba-note">voice note I recorded — very rough</p>',
        '<p class="ba-line"><span class="ba-bad">- john said budget thing??? need approval</span></p>',
        '<p class="ba-line"><span class="ba-bad">- mktg push Q3 idk someone</span></p>',
        '<p class="ba-line"><span class="ba-bad">- ACTION sarah does the thing by friday</span></p>',
        '<p class="ba-line"><span class="ba-bad">- mike said smth about vendors check later</span></p>',
        '<p class="ba-line ba-stamp-messy">next mtg TBD lol</p>',
      ].join(''),
      after: [
        '<p class="ba-line ba-title-line">Meeting Notes — Thursday</p>',
        '<p class="ba-line ba-section-label">Decisions</p>',
        '<p class="ba-line ba-bullet">Budget approval needed — John to escalate</p>',
        '<p class="ba-line ba-bullet">Q3 marketing push confirmed</p>',
        '<p class="ba-line ba-bullet">Vendor review — Mike to follow up</p>',
        '<p class="ba-line ba-section-label">Action Items</p>',
        '<p class="ba-line ba-bullet">Sarah: deliverable by Friday EOD</p>',
        '<p class="ba-line ba-stamp"><span class="ba-check">✓</span> Organized &amp; ready to share</p>',
      ].join(''),
    },
    /* 3 — Email */
    {
      before: [
        '<p class="ba-line ba-title-line"><span class="ba-bad">email draft (rough)</span></p>',
        '<p class="ba-line ba-note">need to tell them we\'re behind, don\'t want drama</p>',
        '<p class="ba-line"><span class="ba-bad">hey so basically we are delayed</span></p>',
        '<p class="ba-line"><span class="ba-bad">like 2 weeks, idk how to say it</span></p>',
        '<p class="ba-line"><span class="ba-bad">w/o them getting mad lol</span></p>',
        '<p class="ba-line"><span class="ba-bad">just say something professional??</span></p>',
        '<p class="ba-line ba-stamp-messy">help pleaseeeee</p>',
      ].join(''),
      after: [
        '<p class="ba-line ba-title-line">Re: Project Timeline Update</p>',
        '<p class="ba-line ba-meta">To: Client · From: You</p>',
        '<p class="ba-line">Hi [Name],</p>',
        '<p class="ba-line">We\'re running approximately 2 weeks behind.</p>',
        '<p class="ba-line">I\'ll have a revised timeline to you by Friday.</p>',
        '<p class="ba-line">Thank you for your patience.</p>',
        '<p class="ba-line ba-stamp"><span class="ba-check">✓</span> Professional &amp; ready to send</p>',
      ].join(''),
    },
  ];

  const setPos = (pct) => {
    const v = Math.max(0, Math.min(100, pct));
    slider.style.setProperty('--pos', v + '%');
    handle.setAttribute('aria-valuenow', String(Math.round(v)));
  };

  const posFromX = (clientX) => {
    const rect = slider.getBoundingClientRect();
    return ((clientX - rect.left) / rect.width) * 100;
  };

  /* ---- Tab switching ---- */
  const tabs = document.querySelectorAll('.showcase-tab');

  const renderExample = (i) => {
    const ex = EXAMPLES[i];
    if (!ex || !beforeContent || !afterContent) return;
    beforeContent.innerHTML = ex.before;
    afterContent.innerHTML  = ex.after;
    setPos(50);
    tabs.forEach((t, idx) => {
      t.classList.toggle('is-active', idx === i);
      t.setAttribute('aria-selected', String(idx === i));
    });
  };

  tabs.forEach((tab, i) => tab.addEventListener('click', () => renderExample(i)));
  renderExample(0);

  /* ---- Drag / pointer ---- */
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

  slider.addEventListener('pointerdown', onDown);
  handle.addEventListener('pointerdown', (e) => { e.stopPropagation(); onDown(e); });
  window.addEventListener('pointermove', onMove, { passive: false });
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);

  handle.addEventListener('keydown', (e) => {
    const cur = parseFloat(slider.style.getPropertyValue('--pos')) || 50;
    const step = e.shiftKey ? 10 : 4;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { setPos(cur - step); e.preventDefault(); }
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { setPos(cur + step); e.preventDefault(); }
    else if (e.key === 'Home') { setPos(0); e.preventDefault(); }
    else if (e.key === 'End') { setPos(100); e.preventDefault(); }
  });
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

/* -------------------------------------------------------------------------
   7. UNDERWATER DIVE — scroll-scrubbed video hero (Apple-style)
   Scroll position pins video.currentTime across the section's scroll height.
   Driven by requestAnimationFrame (no raw scroll handler) for smoothness.
   ------------------------------------------------------------------------- */
function initDiveHero() {
  /* ---- Tunable constants (no magic numbers inline) ----------------------- */
  const VIDEO_SRC        = 'assets/hero/underwater.mp4';  // wired path; drop the mp4 here
  const POSTER_SRC       = 'assets/hero/underwater-poster.svg';
  const SCROLL_HEIGHT_VH = 300;   // viewport-heights of scroll == the full clip
  const SCRUB_SMOOTHING  = 0.12;  // 0..1 ease toward target time (lower = smoother/laggier)
  const MOBILE_MAX_PX    = 768;   // at/below this width -> poster fallback (no scrub)
  const END_EPSILON      = 0.05;  // stay just shy of duration to avoid 'ended' flicker
  /* ----------------------------------------------------------------------- */

  const section = document.getElementById('dive');
  if (!section) return;
  const video = document.getElementById('diveVideo');

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isSmall = window.matchMedia(`(max-width: ${MOBILE_MAX_PX}px)`).matches;
  const isCoarse = window.matchMedia('(pointer: coarse)').matches;

  // Scroll-scrub only on larger, fine-pointer, motion-OK devices. iOS Safari
  // throttles per-frame video seeking badly, so small/coarse screens (and
  // reduced-motion) get the static poster instead.
  const posterOnly = prefersReduced || isSmall || isCoarse || !video;

  // Drop to a clean still hero: no tall track, no video download, no cue.
  function enablePosterOnly() {
    section.classList.add('dive--poster-only');
    section.classList.remove('is-scrub', 'is-playable');
    if (video) {
      video.preload = 'none';                 // don't pull ~9 MB just to hide it
      const src = video.querySelector('source');
      if (src) src.remove();                  // drop the source entirely
      video.removeAttribute('src');
      try { video.load(); } catch (_) {}       // reset + abort any in-flight fetch
    }
  }

  if (posterOnly) { enablePosterOnly(); return; }

  // --- Scroll-scrub path ---------------------------------------------------
  // Single source of truth for the track height = SCROLL_HEIGHT_VH.
  section.style.setProperty('--dive-scroll-vh', String(SCROLL_HEIGHT_VH));
  section.classList.add('is-scrub');
  video.preload = 'auto';

  // Keep the wired paths as the single source of truth (defensive if the
  // markup ever drifts from these constants).
  if (!video.getAttribute('poster')) video.setAttribute('poster', POSTER_SRC);
  let sourceEl = video.querySelector('source');
  if (!sourceEl) {
    sourceEl = document.createElement('source');
    sourceEl.type = 'video/mp4';
    sourceEl.src = VIDEO_SRC;
    video.appendChild(sourceEl);
  }

  let duration = 0;
  let renderTime = 0;
  let rafId = null;
  let inView = false;
  let metaReady = false;

  // If the asset is missing or the codec is unsupported, stay on the poster.
  function failToPoster() {
    stopLoop();
    section.classList.remove('is-scrub', 'is-playable');
    section.classList.add('dive--poster-only');
  }
  video.addEventListener('error', failToPoster);
  sourceEl.addEventListener('error', failToPoster);

  video.addEventListener('loadedmetadata', () => {
    if (!isFinite(video.duration) || video.duration <= 0) { failToPoster(); return; }
    duration = video.duration;
    metaReady = true;
    section.classList.add('is-playable');   // fade the video in over the poster
    if (inView) startLoop();
  });

  // 0..1 progress across the section's scrollable height (read in rAF, not on scroll)
  function progress() {
    const scrollable = section.offsetHeight - window.innerHeight;
    if (scrollable <= 0) return 0;
    const scrolled = Math.min(Math.max(-section.getBoundingClientRect().top, 0), scrollable);
    return scrolled / scrollable;
  }

  function tick() {
    const target = progress() * (duration - END_EPSILON);
    renderTime += (target - renderTime) * SCRUB_SMOOTHING;     // ease for buttery scrub
    if (Math.abs(target - renderTime) < 0.004) renderTime = target;
    if (metaReady && video.readyState >= 2 &&
        Math.abs(video.currentTime - renderTime) > 0.01) {
      try { video.currentTime = renderTime; } catch (_) {}
    }
    rafId = requestAnimationFrame(tick);
  }
  function startLoop() { if (rafId == null) rafId = requestAnimationFrame(tick); }
  function stopLoop() { if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; } }

  // Only spin the rAF loop while the hero is actually on screen.
  const io = new IntersectionObserver((entries) => {
    inView = entries[0].isIntersecting;
    if (inView && metaReady) startLoop(); else stopLoop();
  }, { threshold: 0 });
  io.observe(section);

  window.addEventListener('resize', () => {
    // mapping is recomputed every frame; nothing to cache, but keep the hook
    // explicit so future tunables (e.g. cached rects) have a home.
  }, { passive: true });

  try { video.load(); } catch (_) {}
}

/* -------------------------------------------------------------------------
   8. UNDERWATER WORLD — "the deep dive" atmosphere + particle physics
   GSAP ScrollTrigger scrubs the rays/caustics as you descend. A single
   IO-gated canvas runs the underwater scene: plankton, rising bubbles,
   drifting chaos words, and a shark that crosses and bites a chaos word
   (chaos devoured → clarity wins), scattering nearby particles in its wake.
   ------------------------------------------------------------------------- */
function initUnderwater() {
  /* ---- Tunable constants (no magic numbers inline) ----------------------- */
  const MOBILE_BP        = 600;   // px width below which we drop to mobile counts
  const BUBBLES_DESKTOP  = 70;    // "numerous" rising bubbles
  const BUBBLES_MOBILE   = 30;
  const PLANKTON_DESKTOP = 80;    // suspended sediment / plankton
  const PLANKTON_MOBILE  = 36;
  const RISE_MIN         = 14;    // px/sec — slowest (largest) bubble
  const RISE_MAX         = 52;    // px/sec — fastest (smallest) bubble
  const CHAOS_WORDS      = ['messy', 'typo', 'draft', 'chaos', '??', 'mess'];
  const WORD_COUNT       = 5;     // floating chaos words the shark can devour
  const SHARK_LEN        = 150;   // px nose-to-tail (scaled down on mobile)
  const SHARK_SPEED      = 300;   // px/sec cruising speed across the scene
  const SHARK_FIRST_MS   = 2600;  // first pass after the section enters view
  const SHARK_EVERY_MS   = 11000; // gap between passes
  const WAKE_RADIUS      = 110;   // px around the shark that disturbs particles
  const WAKE_FORCE       = 5;     // per-frame wake nudge (decays); bite is stronger
  /* ----------------------------------------------------------------------- */

  const section = document.getElementById('deep');
  if (!section) return;
  const canvas = document.getElementById('uwBubbles');
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Scroll-tied transitions — only when motion is OK and GSAP+ScrollTrigger loaded.
  if (!prefersReduced && typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);

    // Light rays fade in as the section enters view.
    gsap.fromTo('.uw-rays', { opacity: 0 }, {
      opacity: 0.7, ease: 'none',
      scrollTrigger: { trigger: section, start: 'top 80%', end: 'top 20%', scrub: 1.5 },
    });

    // "Settling into the deep" — the caustic light dims to rest as you descend.
    // Opacity-only (cheap to composite); avoids per-frame blur raster / jank.
    gsap.fromTo('.uw-caustics', { opacity: 0.12 }, {
      opacity: 0.06, ease: 'none',
      scrollTrigger: { trigger: section, start: 'top 90%', end: 'top 40%', scrub: 1 },
    });

    // Cards rise from the deep, staggered.
    gsap.from('.uw-card', {
      y: 40, opacity: 0, duration: 0.6, stagger: 0.15, ease: 'power2.out',
      scrollTrigger: { trigger: '.uw-cards', start: 'top 85%' },
    });
  }

  // Underwater scene canvas — skipped entirely under reduced motion.
  if (prefersReduced || !canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const rand = (a, b) => a + Math.random() * (b - a);
  let w = 0, h = 0, dpr = 1, rafId = null, lastT = 0, sceneT = 0, mobile = false;
  let bubbles = [], plankton = [], words = [], fragments = [], ripples = [];
  let shark = null, nextSharkAt = SHARK_FIRST_MS;

  /* Bubbles — rise with a sinusoidal wobble; smaller bubbles rise faster and
     grow slightly as they climb, then fade + pop near the surface. vx/vy hold
     a wake impulse that decays. */
  const resetBubble = (b, initial) => {
    b.r0 = rand(1.2, 4.5);
    b.r = b.r0;
    b.baseX = rand(0, w);
    b.y = initial ? rand(0, h) : h + rand(4, 30);
    b.speed = RISE_MAX - ((b.r0 - 1.2) / 3.3) * (RISE_MAX - RISE_MIN); // small ⇒ fast
    b.wobAmp = rand(4, 16);
    b.wobFreq = rand(0.6, 1.6);
    b.phase = rand(0, Math.PI * 2);
    b.alpha = rand(0.12, 0.4);
    b.draw = b.alpha;
    b.teal = Math.random() < 0.5;
    b.vx = 0; b.vy = 0;
    return b;
  };

  /* Plankton — tiny, low-opacity sediment drifting gently; wraps at edges. */
  const resetPlankton = (p) => {
    p.x = rand(0, w); p.y = rand(0, h);
    p.r = rand(0.4, 1.5);
    p.alpha = rand(0.05, 0.2);
    p.dx = rand(-6, 6); p.dy = rand(-4, 4);
    p.vx = 0; p.vy = 0;
    return p;
  };

  /* Chaos words — slow-drifting bite targets in the upper band (clear of cards). */
  const resetWord = (wd) => {
    wd.text = CHAOS_WORDS[Math.floor(Math.random() * CHAOS_WORDS.length)];
    wd.x = rand(w * 0.15, w * 0.85);
    wd.y = rand(h * 0.12, h * 0.46);
    wd.dx = rand(-10, 10); wd.dy = rand(-4, 4);
    wd.rot = rand(-0.22, 0.22);
    wd.size = mobile ? 16 : rand(20, 30);
    wd.alpha = rand(0.35, 0.6);
    wd.alive = true;
    return wd;
  };

  function build() {
    mobile = w < MOBILE_BP;
    bubbles  = Array.from({ length: mobile ? BUBBLES_MOBILE : BUBBLES_DESKTOP }, () => resetBubble({}, true));
    plankton = Array.from({ length: mobile ? PLANKTON_MOBILE : PLANKTON_DESKTOP }, () => resetPlankton({}));
    words    = Array.from({ length: WORD_COUNT }, () => resetWord({}));
    fragments = []; ripples = []; shark = null; nextSharkAt = sceneT + SHARK_FIRST_MS;
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    w = rect.width; h = rect.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
  }

  // Push particles away from (cx,cy): impulse falls off linearly to the radius.
  function disturb(list, cx, cy, radius, force) {
    const r2 = radius * radius;
    for (const p of list) {
      const px = p.baseX !== undefined ? p.baseX : p.x;
      const dx = px - cx, dy = p.y - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 > r2 || d2 === 0) continue;
      const d = Math.sqrt(d2);
      const k = (1 - d / radius) * force;
      p.vx += (dx / d) * k; p.vy += (dy / d) * k;
    }
  }

  // Tear a chaos word apart: its letters fly off, particles scatter, ripple pops.
  function biteWord(wd) {
    wd.alive = false;
    const chars = wd.text.split('');
    const span = wd.size * 0.6 * chars.length;
    chars.forEach((ch, i) => {
      fragments.push({
        ch, x: wd.x - span / 2 + i * (wd.size * 0.6), y: wd.y,
        vx: rand(-90, 90), vy: rand(-120, -20),
        rot: wd.rot, vrot: rand(-6, 6),
        size: wd.size, life: 1, ttl: rand(0.9, 1.5),
      });
    });
    ripples.push({ x: wd.x, y: wd.y, r: 8, life: 1 });
    disturb(bubbles, wd.x, wd.y, WAKE_RADIUS * 1.6, 150);
    disturb(plankton, wd.x, wd.y, WAKE_RADIUS * 1.6, 130);
    // Extensibility hook (sound/analytics later) + lets QA confirm the bite.
    window.dispatchEvent(new CustomEvent('uw:shark-bite', { detail: { word: wd.text } }));
    setTimeout(() => resetWord(wd), 4200);   // a fresh chaos word drifts back in
  }

  function launchShark() {
    const targets = words.filter((wd) => wd.alive);
    if (!targets.length) { nextSharkAt = sceneT + 3000; return; }
    const victim = targets[Math.floor(Math.random() * targets.length)];
    const dir = victim.x < w / 2 ? 1 : -1;             // approach from the near side
    const len = mobile ? SHARK_LEN * 0.7 : SHARK_LEN;
    shark = { x: dir > 0 ? -len : w + len, y: victim.y + rand(-10, 10),
              dir, len, speed: SHARK_SPEED, victim, bitten: false, mouth: 0 };
  }

  // Shark silhouette (dark body + teal rim light), drawn nose-first via dir flip.
  function drawShark(c, sh) {
    const L = sh.len, H = L * 0.34, m = sh.mouth;
    c.save();
    c.translate(sh.x, sh.y);
    c.scale(sh.dir, 1);
    c.fillStyle = 'rgba(6,16,26,0.95)';
    c.beginPath();                                   // body
    c.moveTo(-L * 0.5, 0);
    c.quadraticCurveTo(-L * 0.12, -H, L * 0.32, -H * 0.2);
    c.quadraticCurveTo(L * 0.52, 0, L * 0.34, H * (0.16 + m * 0.5));  // jaw opens with mouth
    c.quadraticCurveTo(L * 0.05, H * 0.55, -L * 0.5, H * 0.18);
    c.closePath(); c.fill();
    c.beginPath();                                   // dorsal fin
    c.moveTo(-L * 0.04, -H * 0.82); c.lineTo(L * 0.14, -H * 0.8); c.lineTo(0, -H * 1.5);
    c.closePath(); c.fill();
    c.beginPath();                                   // pectoral fin
    c.moveTo(L * 0.1, H * 0.32); c.lineTo(L * 0.24, H * 0.32); c.lineTo(L * 0.02, H * 0.98);
    c.closePath(); c.fill();
    c.beginPath();                                   // tail (fork)
    c.moveTo(-L * 0.46, 0); c.lineTo(-L * 0.64, -H * 0.72); c.lineTo(-L * 0.5, 0); c.lineTo(-L * 0.64, H * 0.58);
    c.closePath(); c.fill();
    c.strokeStyle = 'rgba(0,212,200,0.32)'; c.lineWidth = 1.5;   // rim light
    c.beginPath();
    c.moveTo(-L * 0.12, -H * 0.9); c.quadraticCurveTo(L * 0.18, -H * 0.84, L * 0.33, -H * 0.22); c.stroke();
    c.fillStyle = 'rgba(0,212,200,0.55)';            // eye
    c.beginPath(); c.arc(L * 0.3, -H * 0.06, 1.7, 0, Math.PI * 2); c.fill();
    c.restore();
  }

  function update(dt) {
    sceneT += dt * 1000;

    for (const b of bubbles) {
      b.phase += dt * b.wobFreq;
      b.baseX += b.vx * dt;
      b.y += (-b.speed + b.vy) * dt;
      b.vx *= 0.9; b.vy *= 0.9;                       // wake decays
      b.r = b.r0 * (1 + (1 - b.y / h) * 0.5);         // grows as it climbs
      const near = b.y / (h * 0.16);
      b.draw = b.y < h * 0.16 ? b.alpha * Math.max(0, near) : b.alpha; // fade + pop
      if (b.y < -10) resetBubble(b, false);
    }

    for (const p of plankton) {
      p.x += (p.dx + p.vx) * dt; p.y += (p.dy + p.vy) * dt;
      p.vx *= 0.92; p.vy *= 0.92;
      if (p.x < -5) p.x = w + 5; else if (p.x > w + 5) p.x = -5;
      if (p.y < -5) p.y = h + 5; else if (p.y > h + 5) p.y = -5;
    }

    for (const wd of words) {
      if (!wd.alive) continue;
      wd.x += wd.dx * dt; wd.y += wd.dy * dt;
      if (wd.x < w * 0.08 || wd.x > w * 0.92) wd.dx *= -1;
      if (wd.y < h * 0.08 || wd.y > h * 0.5) wd.dy *= -1;
    }

    for (let i = fragments.length - 1; i >= 0; i--) {
      const f = fragments[i];
      f.x += f.vx * dt; f.y += f.vy * dt;
      f.vy += 26 * dt; f.vx *= 0.98;                  // slight sink after the burst
      f.rot += f.vrot * dt;
      f.life -= dt / f.ttl;
      if (f.life <= 0) fragments.splice(i, 1);
    }

    for (let i = ripples.length - 1; i >= 0; i--) {
      const rp = ripples[i];
      rp.r += 120 * dt; rp.life -= dt / 0.6;
      if (rp.life <= 0) ripples.splice(i, 1);
    }

    if (!shark && sceneT >= nextSharkAt) launchShark();
    if (shark) {
      shark.x += shark.dir * shark.speed * dt;
      const noseX = shark.x + shark.dir * shark.len * 0.5;
      // continuous wake (dt-normalized so it's frame-rate independent)
      disturb(bubbles, shark.x, shark.y, WAKE_RADIUS, WAKE_FORCE * dt * 60);
      disturb(plankton, shark.x, shark.y, WAKE_RADIUS, WAKE_FORCE * dt * 60);
      const reached = shark.dir > 0 ? noseX >= shark.victim.x : noseX <= shark.victim.x;
      if (!shark.bitten && shark.victim.alive && reached) {
        shark.bitten = true; shark.mouth = 1; biteWord(shark.victim);
      }
      shark.mouth = Math.max(0, shark.mouth - dt * 2);
      if ((shark.dir > 0 && shark.x > w + shark.len) ||
          (shark.dir < 0 && shark.x < -shark.len)) {
        shark = null; nextSharkAt = sceneT + SHARK_EVERY_MS;
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);

    for (const p of plankton) {                       // sediment (back)
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180,225,235,${p.alpha})`; ctx.fill();
    }

    for (const wd of words) {                         // chaos words (muted red)
      if (!wd.alive) continue;
      ctx.save();
      ctx.translate(wd.x, wd.y); ctx.rotate(wd.rot);
      ctx.font = `600 ${wd.size}px 'DM Sans', sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = `rgba(200,150,140,${wd.alpha})`;
      ctx.fillText(wd.text, 0, 0);
      ctx.restore();
    }

    for (const f of fragments) {                      // torn letters flying off
      ctx.save();
      ctx.translate(f.x, f.y); ctx.rotate(f.rot);
      ctx.font = `600 ${f.size}px 'DM Sans', sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = `rgba(220,130,120,${Math.max(0, f.life)})`;
      ctx.fillText(f.ch, 0, 0);
      ctx.restore();
    }

    for (const rp of ripples) {                       // bite shock ring
      ctx.beginPath(); ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0,212,200,${0.4 * rp.life})`;
      ctx.lineWidth = 2; ctx.stroke();
    }

    for (const b of bubbles) {                        // bubbles (front)
      ctx.beginPath();
      ctx.arc(b.baseX + Math.sin(b.phase) * b.wobAmp, b.y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = b.teal ? `rgba(0,212,200,${b.draw})` : `rgba(220,245,255,${b.draw})`;
      ctx.fill();
    }

    if (shark) drawShark(ctx, shark);                 // shark on top
  }

  function tick(now) {
    const dt = lastT ? Math.min((now - lastT) / 1000, 0.05) : 0.016;
    lastT = now;
    update(dt); draw();
    rafId = requestAnimationFrame(tick);
  }
  const start = () => { if (rafId == null) { lastT = 0; rafId = requestAnimationFrame(tick); } };
  const stop  = () => { if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; } };

  resize();
  let rt = null;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 150); }, { passive: true });

  // Run the scene only while the section is on screen.
  new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) start(); else stop();
  }, { threshold: 0 }).observe(section);
}

/* -------------------------------------------------------------------------
   9. SEAFLOOR REEF — the page lands on the bottom (footer)
   The deep gradient, light shafts, and coral ridges are CSS; this canvas
   adds drifting reef fish + rising motes, only while the footer is in view.
   ------------------------------------------------------------------------- */
function initReef() {
  /* ---- Tunable constants (no magic numbers inline) ----------------------- */
  const MOBILE_BP     = 600;
  const FISH_DESKTOP  = 16;
  const FISH_MOBILE   = 8;
  const MOTES_DESKTOP = 40;   // tiny rising sediment
  const MOTES_MOBILE  = 18;
  /* ----------------------------------------------------------------------- */

  const footer = document.querySelector('.footer--reef');
  const canvas = document.getElementById('reefCanvas');
  if (!footer || !canvas) return;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;            // static reef (CSS ridges + rays) only
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const rand = (a, b) => a + Math.random() * (b - a);
  let w = 0, h = 0, dpr = 1, fish = [], motes = [], rafId = null, lastT = 0, mobile = false;

  // Reef fish — drift across near the seafloor with a gentle vertical bob;
  // re-enter from the far side (with a fresh heading) once off-screen.
  const resetFish = (f, initial) => {
    f.dir = Math.random() < 0.5 ? 1 : -1;
    f.x = initial ? rand(0, w) : (f.dir > 0 ? -20 : w + 20);
    f.y = rand(h * 0.45, h * 0.9);
    f.speed = rand(18, 40);
    f.size = rand(7, 14) * (mobile ? 0.8 : 1);
    f.bob = rand(0.4, 1.2); f.bobPhase = rand(0, Math.PI * 2); f.bobAmp = rand(3, 8);
    f.alpha = rand(0.25, 0.55);
    f.teal = Math.random() < 0.6;
    return f;
  };
  const resetMote = (m) => {
    m.x = rand(0, w); m.y = rand(0, h);
    m.r = rand(0.4, 1.4); m.alpha = rand(0.05, 0.2);
    m.vx = rand(-3, 3); m.vy = -rand(3, 10);
    return m;
  };

  function build() {
    mobile = w < MOBILE_BP;
    fish  = Array.from({ length: mobile ? FISH_MOBILE : FISH_DESKTOP }, () => resetFish({}, true));
    motes = Array.from({ length: mobile ? MOTES_MOBILE : MOTES_DESKTOP }, () => resetMote({}));
  }
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    w = rect.width; h = rect.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
  }

  function drawFish(f) {
    const s = f.size, y = f.y + Math.sin(f.bobPhase) * f.bobAmp;
    ctx.save();
    ctx.translate(f.x, y); ctx.scale(f.dir, 1);
    ctx.fillStyle = f.teal ? `rgba(0,212,200,${f.alpha})` : `rgba(200,225,235,${f.alpha})`;
    ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.5, 0, 0, Math.PI * 2); ctx.fill();        // body
    ctx.beginPath();                                                                       // tail
    ctx.moveTo(-s * 0.9, 0); ctx.lineTo(-s * 1.6, -s * 0.5); ctx.lineTo(-s * 1.6, s * 0.5);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function tick(now) {
    const dt = lastT ? Math.min((now - lastT) / 1000, 0.05) : 0.016;
    lastT = now;
    ctx.clearRect(0, 0, w, h);
    for (const m of motes) {                       // rising sediment
      m.x += m.vx * dt; m.y += m.vy * dt;
      if (m.y < -5) { m.y = h + 5; m.x = rand(0, w); }
      ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180,225,235,${m.alpha})`; ctx.fill();
    }
    for (const f of fish) {                        // reef fish
      f.x += f.dir * f.speed * dt;
      f.bobPhase += dt * f.bob;
      if ((f.dir > 0 && f.x > w + 30) || (f.dir < 0 && f.x < -30)) resetFish(f, false);
      drawFish(f);
    }
    rafId = requestAnimationFrame(tick);
  }
  const start = () => { if (rafId == null) { lastT = 0; rafId = requestAnimationFrame(tick); } };
  const stop  = () => { if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; } };

  resize();
  let rt = null;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 150); }, { passive: true });
  new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) start(); else stop();
  }, { threshold: 0 }).observe(footer);
}

/* -------------------------------------------------------------------------
   TEXT SCRAMBLE — shared utility used by hero + transform strip
   ------------------------------------------------------------------------- */
function makeScrambler(CHARS) {
  CHARS = CHARS || '!#@$%^&*<>[]{}/|?+~`░▒▓╬═╔╗';
  return function scramble(el, newText, durationMs) {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.textContent = newText; return Promise.resolve();
    }
    durationMs = durationMs || 900;
    const old = el.textContent;
    const len = Math.max(old.length, newText.length);
    const FPS = 24;
    const totalFrames = Math.round((durationMs / 1000) * FPS);
    const positions = Array.from({ length: len }, (_, i) => ({
      start: Math.floor(Math.random() * totalFrames * 0.25),
      end: Math.floor(totalFrames * 0.35 + Math.random() * totalFrames * 0.55),
    }));
    let frame = 0;
    return new Promise((resolve) => {
      const tick = () => {
        if (frame > totalFrames) { el.textContent = newText; resolve(); return; }
        let out = '';
        for (let i = 0; i < len; i++) {
          const pos = positions[i];
          if (frame < pos.start) out += (old[i] || '');
          else if (frame > pos.end) out += (newText[i] || '');
          else out += CHARS[Math.floor(Math.random() * CHARS.length)];
        }
        el.textContent = out;
        frame++;
        setTimeout(tick, 1000 / FPS);
      };
      tick();
    });
  };
}

/* -------------------------------------------------------------------------
   TRANSFORM DEMO — cycling scramble: "you send" → "you get back"
   ------------------------------------------------------------------------- */
function initTransformDemo() {
  const inEl  = document.getElementById('tIn');
  const outEl = document.getElementById('tOut');
  if (!inEl || !outEl) return;

  const PAIRS = [
    { in: 'messy draft full of typos',       out: 'clean, formatted, ready to send' },
    { in: 'blurry screenshot of text',        out: 'clean editable document' },
    { in: 'scattered meeting notes',          out: 'organized summary with action items' },
    { in: 'rambling email rough draft',       out: 'professional message, ready to hit send' },
    { in: 'handwritten menu update',          out: 'print-ready formatted menu' },
    { in: 'voice-note transcription chaos',   out: 'structured, easy-to-read doc' },
  ];

  const scramble = makeScrambler();
  let idx = 0;
  let paused = false;
  let timer = null;

  const HOLD_MS  = 3200;
  const GAP_MS   = 400;

  async function runCycle() {
    if (paused) return;
    const pair = PAIRS[idx % PAIRS.length];
    idx++;
    await scramble(inEl,  pair.in,  780);
    await new Promise(r => setTimeout(r, GAP_MS));
    await scramble(outEl, pair.out, 820);
    timer = setTimeout(runCycle, HOLD_MS);
  }

  const section = inEl.closest('.transform-strip');
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      paused = false;
      clearTimeout(timer);
      runCycle();
    } else {
      paused = true;
      clearTimeout(timer);
    }
  }, { threshold: 0.3 });

  if (section) observer.observe(section); else runCycle();
}

/* -------------------------------------------------------------------------
   HERO CLARITY SCRAMBLE — "Clarity." resolves from glitch on page load
   ------------------------------------------------------------------------- */
function initClarityScramble() {
  const el = document.getElementById('wordClarity');
  if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (typeof gsap === 'undefined') return;
  const scramble = makeScrambler('!#@%?*<>[]{}/|~░▒▓');
  const target   = el.textContent;
  el.textContent = '???????';
  gsap.delayedCall(1.8, () => scramble(el, target, 1100));
}

/* -------------------------------------------------------------------------
   PROCESS TIMELINE — GSAP ScrollTrigger: line draws, cards slide L↔R, numbers pop
   Must run before initScrollReveals so .step elements are removed from IO reveal.
   ------------------------------------------------------------------------- */
function initProcessTimeline() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);

  const steps = document.querySelectorAll('.steps .step');
  const line  = document.querySelector('#process .step-line');
  if (!steps.length) return;

  // Claim these from the IO reveal system to avoid double-animation
  steps.forEach((el) => el.classList.remove('reveal'));

  // Draw the connector line as the section scrolls into view (desktop only; hidden on mobile)
  if (line) {
    gsap.set(line, { scaleY: 0, transformOrigin: 'top center' });
    gsap.to(line, {
      scaleY: 1,
      ease: 'power1.inOut',
      scrollTrigger: {
        trigger: '#process .steps',
        start: 'top 70%',
        end: 'bottom 58%',
        scrub: 0.7,
      },
    });
  }

  // Each step card slides in from alternating left / right
  steps.forEach((step, i) => {
    const fromX = i % 2 === 0 ? -60 : 60;

    gsap.from(step, {
      x: fromX, opacity: 0,
      duration: 0.8,
      ease: 'power3.out',
      scrollTrigger: { trigger: step, start: 'top 84%' },
    });

    // Step number pops in with a spring
    const num = step.querySelector('.step-num');
    if (num) {
      gsap.from(num, {
        scale: 0.35, opacity: 0,
        duration: 0.55,
        ease: 'back.out(2.8)',
        delay: 0.1,
        scrollTrigger: { trigger: step, start: 'top 84%' },
      });
    }

    // Format chips stagger in after the card lands
    const chips = step.querySelectorAll('.step-formats span');
    if (chips.length) {
      gsap.from(chips, {
        opacity: 0, y: 10,
        stagger: 0.07,
        duration: 0.38,
        ease: 'power2.out',
        delay: 0.42,
        scrollTrigger: { trigger: step, start: 'top 84%' },
      });
    }
  });
}

/* -------------------------------------------------------------------------
   CARD SPOTLIGHT — cursor-tracking radial glow on bento cards (fine pointer only)
   ------------------------------------------------------------------------- */
function initCardSpotlight() {
  if (window.matchMedia('(pointer: coarse)').matches) return;
  document.querySelectorAll('.bento-card').forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', ((e.clientX - rect.left) / rect.width) * 100 + '%');
      card.style.setProperty('--my', ((e.clientY - rect.top) / rect.height) * 100 + '%');
    });
  });
}

/* -------------------------------------------------------------------------
   HERO PARALLAX — teal orb drifts up as the hero scrolls away
   ------------------------------------------------------------------------- */
function initHeroParallax() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  const orb = document.querySelector('.teal-orb');
  if (!orb) return;
  gsap.registerPlugin(ScrollTrigger);
  gsap.to(orb, {
    y: -110,
    ease: 'none',
    scrollTrigger: {
      trigger: '#hero',
      start: 'top top',
      end: 'bottom top',
      scrub: 1.2,
    },
  });
}

/* -------------------------------------------------------------------------
   CARD TILT — smooth lerp-based 3D perspective tilt on bento service cards
   (fine pointer / desktop only; respects prefers-reduced-motion)
   ------------------------------------------------------------------------- */
function initCardTilt() {
  if (window.matchMedia('(pointer: coarse)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  document.querySelectorAll('.bento-card').forEach((card) => {
    let cx = 0, cy = 0, tx = 0, ty = 0, rafId = null, inside = false;

    const loop = () => {
      cx += (tx - cx) * 0.1;
      cy += (ty - cy) * 0.1;
      if (!inside && Math.abs(cx) < 0.04 && Math.abs(cy) < 0.04) {
        card.style.transform = '';
        card.classList.remove('tilt-active');
        rafId = null;
        return;
      }
      card.style.transform = `perspective(900px) rotateX(${cx}deg) rotateY(${cy}deg) scale(${inside ? 1.025 : 1})`;
      rafId = requestAnimationFrame(loop);
    };

    card.addEventListener('mouseenter', () => {
      inside = true;
      card.classList.add('tilt-active');
      if (!rafId) rafId = requestAnimationFrame(loop);
    });

    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      tx = ((e.clientY - r.top) / r.height - 0.5) * -14;
      ty = ((e.clientX - r.left) / r.width - 0.5) * 14;
    });

    card.addEventListener('mouseleave', () => {
      inside = false;
      tx = 0; ty = 0;
      if (!rafId) rafId = requestAnimationFrame(loop);
    });
  });
}

/* -------------------------------------------------------------------------
   COUNT-UP — IO-triggered number animation on trust bar stats
   ------------------------------------------------------------------------- */
function initCountUp() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const doCount = (el, prefix, end, suffix) => {
    const t0 = performance.now(), dur = 920;
    const tick = (now) => {
      const p = Math.min((now - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);    // ease-out cubic
      el.textContent = prefix + Math.round(end * eased) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      obs.unobserve(entry.target);
      const el = entry.target;
      const m = el.textContent.trim().match(/^([^0-9]*)(\d+)(.*)$/);
      if (!m || parseInt(m[2]) < 5) return;   // skip non-numeric or tiny values
      doCount(el, m[1], parseInt(m[2]), m[3]);
    });
  }, { threshold: 0.9 });

  document.querySelectorAll('.trust-stat').forEach((el) => {
    if (/\d/.test(el.textContent)) io.observe(el);
  });
}

/* -------------------------------------------------------------------------
   CUSTOM CURSOR — teal dot + lagging ring (fine pointer + motion-OK only)
   Dot tracks exact mouse position; ring lerps at 0.13 each frame.
   ring.over expands on interactive hover; ring.press shrinks on click.
   ------------------------------------------------------------------------- */
function initCustomCursor() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const dot  = document.createElement('div');
  const ring = document.createElement('div');
  dot.id  = 'cursorDot';
  ring.id = 'cursorRing';
  dot.setAttribute('aria-hidden', 'true');
  ring.setAttribute('aria-hidden', 'true');
  document.body.appendChild(dot);
  document.body.appendChild(ring);
  document.body.classList.add('custom-cursor');

  let mx = -200, my = -200, rx = -200, ry = -200;

  document.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; });

  // Use event delegation so dynamically-revealed elements are covered
  const INTERACTIVE = 'a, button, [role="button"], summary, label, .bento-card, .showcase-tab, .ba-handle';
  document.addEventListener('mouseover', (e) => {
    ring.classList.toggle('over', Boolean(e.target.closest(INTERACTIVE)));
  });

  document.addEventListener('mousedown', () => ring.classList.add('press'));
  document.addEventListener('mouseup',   () => ring.classList.remove('press'));

  // Hide when pointer leaves the viewport
  document.documentElement.addEventListener('mouseleave', () => {
    dot.style.opacity  = '0';
    ring.style.opacity = '0';
  });
  document.documentElement.addEventListener('mouseenter', () => {
    dot.style.opacity  = '';
    ring.style.opacity = '';
  });

  const tick = () => {
    rx += (mx - rx) * 0.13;
    ry += (my - ry) * 0.13;
    dot.style.transform  = `translate(${mx}px, ${my}px)`;
    ring.style.transform = `translate(${rx}px, ${ry}px)`;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* -------------------------------------------------------------------------
   KINETIC TEXT — word-by-word staggered reveal on .kinetic-section entry
   ------------------------------------------------------------------------- */
function initKineticText() {
  const section = document.querySelector('.kinetic-section');
  const words   = section ? section.querySelectorAll('.k-word') : [];
  if (!words.length) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    words.forEach((w) => w.classList.add('k-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries, obs) => {
    if (!entries[0].isIntersecting) return;
    obs.disconnect();
    words.forEach((word, i) => {
      setTimeout(() => word.classList.add('k-visible'), i * 100);
    });
  }, { threshold: 0.45 });

  observer.observe(section);
}

/* -------------------------------------------------------------------------
   FAQ SMOOTH OPEN — animate content fade-down on <details> open
   ------------------------------------------------------------------------- */
function initFaqAnimation() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  document.querySelectorAll('.faq-item').forEach((item) => {
    item.addEventListener('toggle', () => {
      if (!item.open) return;
      const p = item.querySelector('p');
      if (!p) return;
      p.classList.remove('faq-anim');
      void p.offsetWidth;                 // force reflow to restart animation
      p.classList.add('faq-anim');
    });
  });
}

/* -------------------------------------------------------------------------
   PAGE INTRO — dark overlay covers the page on load, then wipes upward.
   Element lives in the HTML so it blocks content from the very first paint.
   JS adds the exit class; CSS handles the transition and removal fires after.
   ------------------------------------------------------------------------- */
function initPageIntro() {
  const overlay = document.getElementById('pageIntro');
  if (!overlay) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    overlay.remove();
    return;
  }
  // Two rAF calls guarantee the browser has composited the initial state before
  // we add the exit class, preventing an instant-skip if the class is added
  // synchronously in the same frame as the element's insertion.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      overlay.classList.add('intro-exit');
      overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
    });
  });
}

/* -------------------------------------------------------------------------
   ABOUT ENTRANCE — GSAP timeline: icon pops → headline wipes → copy fades → CTA slides
   Runs before initScrollReveals in the inits[] array so it can claim .reveal.
   ------------------------------------------------------------------------- */
function initAboutEntrance() {
  const block = document.querySelector('.about-block');
  if (!block) return;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    block.classList.remove('reveal');
    return;
  }
  gsap.registerPlugin(ScrollTrigger);
  block.classList.remove('reveal');   // claim from IO system

  const icon     = block.querySelector('.about-icon');
  const headline = block.querySelector('.about-headline');
  const copy     = block.querySelector('.about-copy');
  const cta      = block.querySelector('.about-cta');

  const tl = gsap.timeline({ scrollTrigger: { trigger: block, start: 'top 82%' } });
  if (icon)     tl.from(icon,     { scale: 0.35, opacity: 0, duration: 0.6,  ease: 'back.out(2.4)' });
  if (headline) tl.from(headline, { clipPath: 'inset(0 100% 0 0)', duration: 0.72, ease: 'power3.inOut' }, '-=0.2');
  if (copy)     tl.from(copy,     { y: 18, opacity: 0, duration: 0.55, ease: 'power2.out' }, '-=0.3');
  if (cta)      tl.from(cta,      { y: 14, opacity: 0, duration: 0.45, ease: 'power2.out' }, '-=0.2');
}

/* -------------------------------------------------------------------------
   CONTACT FIELD STAGGER — IO-based staggered reveal on .contact-form .field
   ------------------------------------------------------------------------- */
function initContactReveal() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced || !('IntersectionObserver' in window)) return;
  const form = document.getElementById('contactForm');
  if (!form) return;
  const fields = form.querySelectorAll('.field');
  if (!fields.length) return;

  fields.forEach((f, i) => f.style.setProperty('--reveal-delay', (i * 110) + 'ms'));

  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      obs.unobserve(e.target);
      e.target.classList.add('is-visible');
    });
  }, { threshold: 0.15 });

  fields.forEach((f) => {
    f.classList.add('reveal');
    if (f.getBoundingClientRect().top < window.innerHeight) {
      f.classList.add('is-instant', 'is-visible');
    } else {
      io.observe(f);
    }
  });
}

/* -------------------------------------------------------------------------
   SECTION AMBIENT — IO-triggered teal haze at the top of each .section.
   A .section-ambient div is prepended to each section and fades in via
   the .active class as the section enters the viewport.
   ------------------------------------------------------------------------- */
function initSectionAmbient() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const sections = document.querySelectorAll('.section');
  if (!sections.length) return;
  sections.forEach((s) => {
    const glow = document.createElement('div');
    glow.className = 'section-ambient';
    glow.setAttribute('aria-hidden', 'true');
    s.insertBefore(glow, s.firstChild);
  });
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const g = e.target.querySelector(':scope > .section-ambient');
      if (g) g.classList.toggle('active', e.isIntersecting);
    });
  }, { threshold: 0.12 });
  sections.forEach((s) => io.observe(s));
}

/* -------------------------------------------------------------------------
   BUTTON RIPPLE — material-style circular ripple from the click point on .btn
   ------------------------------------------------------------------------- */
function initButtonRipple() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn');
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const ripple = document.createElement('span');
    ripple.className = 'btn-ripple';
    ripple.style.cssText = [
      `width:${size}px`, `height:${size}px`,
      `left:${e.clientX - rect.left - size / 2}px`,
      `top:${e.clientY - rect.top  - size / 2}px`,
    ].join(';');
    btn.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
  });
}

/* -------------------------------------------------------------------------
   HERO CURSOR GLOW — subtle radial teal gradient in the hero BG follows the
   cursor; fades in on mouseenter and fades out on mouseleave.
   ------------------------------------------------------------------------- */
function initHeroCursorGlow() {
  if (window.matchMedia('(pointer: coarse)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const hero = document.getElementById('hero');
  if (!hero) return;
  hero.addEventListener('mousemove', (e) => {
    const r = hero.getBoundingClientRect();
    hero.style.setProperty('--gx', ((e.clientX - r.left) / r.width  * 100).toFixed(1) + '%');
    hero.style.setProperty('--gy', ((e.clientY - r.top)  / r.height * 100).toFixed(1) + '%');
  });
  hero.addEventListener('mouseenter', () => hero.style.setProperty('--ghover', '1'));
  hero.addEventListener('mouseleave', () => hero.style.setProperty('--ghover', '0'));
}

/* -------------------------------------------------------------------------
   SCROLL TO TOP — circular button appears after 40 % of page is scrolled;
   smooth-scrolls back to top on click.
   ------------------------------------------------------------------------- */
function initScrollToTop() {
  const btn = document.createElement('button');
  btn.id = 'scrollTop';
  btn.setAttribute('aria-label', 'Back to top');
  btn.textContent = '↑';
  document.body.appendChild(btn);
  const toggle = () => btn.classList.toggle('visible', window.scrollY > window.innerHeight * 0.4);
  window.addEventListener('scroll', toggle, { passive: true });
  toggle();
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

/* -------------------------------------------------------------------------
   ACTIVE NAV — highlights the nav link for the section currently in view.
   Uses a narrow rootMargin viewport band so only one section wins at a time.
   ------------------------------------------------------------------------- */
function initActiveNav() {
  const links = Array.from(document.querySelectorAll('.nav-links a[href^="#"]'));
  if (!links.length) return;
  const sections = links.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  if (!sections.length) return;

  const setActive = (id) => links.forEach(a =>
    a.classList.toggle('is-active', a.getAttribute('href') === '#' + id)
  );

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => { if (entry.isIntersecting) setActive(entry.target.id); });
  }, { rootMargin: '-28% 0px -68% 0px' });

  sections.forEach(s => io.observe(s));
}

/* -------------------------------------------------------------------------
   SCROLL PROGRESS — thin teal bar at the top edge that fills as you scroll
   ------------------------------------------------------------------------- */
function initScrollProgress() {
  const bar = document.createElement('div');
  bar.id = 'scrollProgress';
  bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);
  const update = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0) + '%';
  };
  window.addEventListener('scroll', update, { passive: true });
  update();
}

/* -------------------------------------------------------------------------
   MAGNETIC BUTTONS — .btn-primary drifts toward the cursor within ~90px;
   springs back with a cubic-bezier bounce on mouseleave.
   Desktop / fine-pointer only; respects prefers-reduced-motion.
   ------------------------------------------------------------------------- */
function initMagneticButtons() {
  if (window.matchMedia('(pointer: coarse)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const RADIUS   = 90;
  const STRENGTH = 0.38;

  document.querySelectorAll('.btn-primary').forEach((btn) => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const dx = e.clientX - (rect.left + rect.width  / 2);
      const dy = e.clientY - (rect.top  + rect.height / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < RADIUS) {
        const pull = (1 - dist / RADIUS) * STRENGTH;
        btn.style.transform = `translate(${(dx * pull).toFixed(2)}px,${(dy * pull).toFixed(2)}px)`;
      }
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transition = 'transform 0.45s cubic-bezier(0.34,1.56,0.64,1)';
      btn.style.transform  = '';
      setTimeout(() => { btn.style.transition = ''; }, 460);
    });
  });
}

/* -------------------------------------------------------------------------
   HEADING REVEAL — each .section-title wipes in left→right via clip-path
   as it enters the viewport (GSAP ScrollTrigger, one-shot per heading).
   ------------------------------------------------------------------------- */
function initHeadingReveal() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);
  document.querySelectorAll('.section-title').forEach((h) => {
    gsap.from(h, {
      clipPath: 'inset(0 100% 0 0)',
      duration: 0.88,
      ease: 'power3.inOut',
      scrollTrigger: { trigger: h, start: 'top 91%' },
    });
  });
}

/* -------------------------------------------------------------------------
   PRICING ENTRANCE — GSAP spring-stagger on .price-card as the grid enters;
   removes .reveal so the IO system doesn't double-animate.
   After all cards land, the price amounts fire a brief teal glow pulse.
   ------------------------------------------------------------------------- */
function initPricingEntrance() {
  const grid = document.querySelector('.pricing-grid');
  if (!grid) return;
  const cards = Array.from(grid.querySelectorAll('.price-card'));
  if (!cards.length) return;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    cards.forEach(c => c.classList.remove('reveal'));
    return;
  }
  gsap.registerPlugin(ScrollTrigger);
  cards.forEach(c => c.classList.remove('reveal'));
  gsap.from(cards, {
    y: 52,
    opacity: 0,
    scale: 0.93,
    stagger: 0.14,
    duration: 0.76,
    ease: 'back.out(1.7)',
    scrollTrigger: { trigger: grid, start: 'top 86%' },
    onComplete() {
      document.querySelectorAll('.price-amount').forEach((el, i) => {
        setTimeout(() => el.classList.add('price-lit'), i * 120 + 80);
      });
    },
  });
}

/* -------------------------------------------------------------------------
   BENTO REVEAL — replaces the IO .reveal on .bento-card with a GSAP stagger;
   anchor card leads with extra pop (back.out(2)), rest cascade at 0.09s.
   ------------------------------------------------------------------------- */
function initBentoReveal() {
  const bento = document.querySelector('.bento');
  if (!bento) return;
  const cards = Array.from(bento.querySelectorAll('.bento-card'));
  if (!cards.length) return;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    cards.forEach(c => c.classList.remove('reveal'));
    return;
  }
  gsap.registerPlugin(ScrollTrigger);
  cards.forEach(c => c.classList.remove('reveal'));

  const anchor = bento.querySelector('.anchor');
  const rest   = cards.filter(c => c !== anchor);
  const tl = gsap.timeline({ scrollTrigger: { trigger: bento, start: 'top 82%' } });
  if (anchor) {
    tl.from(anchor, { y: 48, opacity: 0, scale: 0.90, duration: 0.82, ease: 'back.out(2)' });
  }
  if (rest.length) {
    tl.from(rest, { y: 38, opacity: 0, scale: 0.94, stagger: 0.09, duration: 0.65, ease: 'back.out(1.5)' }, anchor ? '-=0.44' : 0);
  }
}

/* -------------------------------------------------------------------------
   CONTACT STEPS STAGGER — .contact-next li items slide in from the left
   with a cascading delay (145ms per step); IO-triggered on scroll.
   ------------------------------------------------------------------------- */
function initContactSteps() {
  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const list = document.querySelector('.contact-next');
  if (!list) return;
  const items = Array.from(list.querySelectorAll('li'));
  if (!items.length) return;
  items.forEach((li, i) => li.style.setProperty('--step-delay', (i * 145) + 'ms'));
  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      obs.unobserve(e.target);
      e.target.classList.add('is-visible');
    });
  }, { threshold: 0.18 });
  items.forEach((li) => {
    li.classList.add('step-reveal');
    if (li.getBoundingClientRect().top < window.innerHeight) {
      li.classList.add('is-visible');
    } else {
      io.observe(li);
    }
  });
}

/* -------------------------------------------------------------------------
   HERO TRUST CYCLE — .hero-trust rotates through 4 short trust lines every
   4 s; crossfades via opacity transition. Skipped on reduced-motion.
   ------------------------------------------------------------------------- */
function initHeroTrustCycle() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const el = document.querySelector('.hero-trust');
  if (!el) return;
  const LINES = [
    'Same-day help • Personal service • Ready-to-send results',
    'No account needed — just text or fill out the form',
    'You talk to Dominick directly, not a bot',
    'Quick Fix $25 · Clean Package $50 · Rush jobs from $75',
  ];
  let i = 0;
  el.classList.add('trust-cycle');
  const rotate = () => {
    el.classList.add('trust-fade');
    setTimeout(() => {
      i = (i + 1) % LINES.length;
      el.textContent = LINES[i];
      el.classList.remove('trust-fade');
    }, 350);
  };
  setInterval(rotate, 4200);
}

/* -------------------------------------------------------------------------
   TRUST BAR ENTRANCE — .trust-item elements stagger up from y:18 with a
   spring ease as the bar enters the viewport (first scroll after hero).
   ------------------------------------------------------------------------- */
function initTrustBarEntrance() {
  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const items = document.querySelectorAll('.trust-item');
  if (!items.length) return;
  items.forEach((item, i) => item.style.setProperty('--trust-delay', (i * 110) + 'ms'));
  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      obs.unobserve(e.target);
      e.target.classList.add('trust-visible');
    });
  }, { threshold: 0.5 });
  items.forEach((item) => {
    item.classList.add('trust-enter');
    io.observe(item);
  });
}

/* -------------------------------------------------------------------------
   FOOTER ENTRANCE — .footer-inner direct children fade + slide up as the
   footer enters the viewport; staggered 140ms per element.
   ------------------------------------------------------------------------- */
function initFooterEntrance() {
  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const inner = document.querySelector('.footer-inner');
  if (!inner) return;
  const items = Array.from(inner.children);
  if (!items.length) return;
  items.forEach((el, i) => el.style.setProperty('--footer-delay', (i * 140) + 'ms'));
  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      obs.unobserve(e.target);
      e.target.classList.add('footer-visible');
    });
  }, { threshold: 0.12 });
  items.forEach((el) => {
    el.classList.add('footer-enter');
    io.observe(el);
  });
}

/* -------------------------------------------------------------------------
   FAQ STAGGER — GSAP slides .faq-item elements in from the right as the FAQ
   list enters the viewport; replaces the flat IO .reveal fade.
   ------------------------------------------------------------------------- */
function initFaqStagger() {
  const list = document.querySelector('.faq-list');
  if (!list) return;
  const items = Array.from(list.querySelectorAll('.faq-item'));
  if (!items.length) return;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    items.forEach(el => el.classList.remove('reveal'));
    return;
  }
  gsap.registerPlugin(ScrollTrigger);
  items.forEach(el => el.classList.remove('reveal'));
  gsap.from(items, {
    x: 48,
    opacity: 0,
    stagger: 0.1,
    duration: 0.62,
    ease: 'power3.out',
    scrollTrigger: { trigger: list, start: 'top 86%' },
  });
}

/* -------------------------------------------------------------------------
   SHOWCASE AUTOPLAY — cycles showcase tabs every 5 s; pauses on hover/click;
   resumes 8 s after last manual interaction. Piggybacks on the existing
   .showcase-tab click handlers set up by initBeforeAfter.
   ------------------------------------------------------------------------- */
function initShowcaseAutoplay() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const tabs   = document.querySelectorAll('.showcase-tab');
  const slider = document.getElementById('baSlider');
  if (!tabs.length || !slider) return;

  let idx    = 0;
  let paused = false;
  let resumeTimer = null;

  const advance = () => {
    if (paused) return;
    idx = (idx + 1) % tabs.length;
    tabs[idx].click();
  };

  const pause = (resumeAfterMs) => {
    paused = true;
    clearTimeout(resumeTimer);
    if (resumeAfterMs) resumeTimer = setTimeout(() => { paused = false; }, resumeAfterMs);
  };

  setInterval(advance, 5200);

  slider.addEventListener('pointerenter', () => pause(0));
  slider.addEventListener('pointerleave', () => { paused = false; });

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      idx = parseInt(tab.dataset.tab || '0', 10);
      pause(9000);
    });
  });

  document.addEventListener('visibilitychange', () => {
    paused = document.hidden;
  });
}

/* -------------------------------------------------------------------------
   KINETIC CTA FLOAT — .kinetic-cta springs in on scroll then gently floats
   up and down on loop, drawing repeated attention to the SMS CTA.
   ------------------------------------------------------------------------- */
function initKineticFloat() {
  const cta = document.querySelector('.kinetic-cta');
  if (!cta) return;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);
  gsap.from(cta, {
    scale: 0.78,
    opacity: 0,
    duration: 0.72,
    ease: 'back.out(2.2)',
    scrollTrigger: { trigger: cta, start: 'top 90%' },
    onComplete() {
      gsap.to(cta, {
        y: -9,
        duration: 2.2,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
      });
    },
  });
}

/* -------------------------------------------------------------------------
   NAV CTA PING — sonar pulse ring fires from the primary SMS CTA buttons
   (nav + mobile bar) after 5 s, then every 9 s. A <span> is appended,
   animates outward, and self-removes on animationend.
   ------------------------------------------------------------------------- */
function initNavCTAPing() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const targets = [
    document.querySelector('.nav-cta'),
    document.querySelector('.mobile-bar-btn.mobile-bar-text'),
  ].filter(Boolean);

  if (!targets.length) return;

  const firePing = (el) => {
    const ping = document.createElement('span');
    ping.className = 'cta-ping';
    ping.setAttribute('aria-hidden', 'true');
    el.appendChild(ping);
    ping.addEventListener('animationend', () => ping.remove(), { once: true });
  };

  setTimeout(() => {
    targets.forEach(firePing);
    setInterval(() => targets.forEach(firePing), 9000);
  }, 5200);
}

/* -------------------------------------------------------------------------
   SLIDER TAB INDICATOR — a sliding teal underline follows the active tab
   in the showcase section; syncs with autoplay via MutationObserver.
   ------------------------------------------------------------------------- */
function initSliderTabIndicator() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const container = document.querySelector('.showcase-tabs');
  if (!container) return;

  const indicator = document.createElement('div');
  indicator.className = 'tab-slide-indicator';
  indicator.setAttribute('aria-hidden', 'true');
  container.appendChild(indicator);

  const move = (tab) => {
    const cr = container.getBoundingClientRect();
    const tr = tab.getBoundingClientRect();
    indicator.style.left  = (tr.left - cr.left) + 'px';
    indicator.style.width = tr.width + 'px';
  };

  const activeTab = container.querySelector('.showcase-tab.is-active');
  if (activeTab) {
    indicator.style.transition = 'none';
    move(activeTab);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      indicator.style.transition = '';
    }));
  }

  container.addEventListener('click', (e) => {
    const tab = e.target.closest('.showcase-tab');
    if (tab) move(tab);
  });

  new MutationObserver(() => {
    const active = container.querySelector('.showcase-tab.is-active');
    if (active) move(active);
  }).observe(container, { attributes: true, subtree: true, attributeFilter: ['class'] });
}

/* -------------------------------------------------------------------------
   FORM COMPLETION GLOW — submit button gets a progressive teal glow as the
   user fills in required fields; full glow = all fields have content.
   ------------------------------------------------------------------------- */
function initFormCompletionGlow() {
  const form = document.getElementById('contactForm');
  if (!form) return;
  const submit   = form.querySelector('[type="submit"]');
  const required = Array.from(form.querySelectorAll('[required]'));
  if (!submit || !required.length) return;

  const update = () => {
    const filled = required.filter(el => el.value.trim().length > 0).length;
    submit.classList.toggle('form-partial', filled > 0 && filled < required.length);
    submit.classList.toggle('form-ready',   filled === required.length);
  };

  required.forEach(el => el.addEventListener('input', update));
}

/* -------------------------------------------------------------------------
   SLIDER HINT — BA handle wiggles left-right once when the slider first
   enters the viewport, teaching users to drag it.
   Fires at most once per page load; skips on reduced-motion.
   ------------------------------------------------------------------------- */
function initSliderHint() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const handle = document.getElementById('baHandle');
  const slider = document.getElementById('baSlider');
  if (!handle || !slider || !('IntersectionObserver' in window)) return;

  const fire = () => {
    handle.classList.add('hint-wiggle');
    handle.addEventListener('animationend', () => handle.classList.remove('hint-wiggle'), { once: true });
  };

  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      setTimeout(fire, 700);
    });
  }, { threshold: 0.55 });
  io.observe(slider);
}

/* -------------------------------------------------------------------------
   GLASS SHIMMER — staggered periodic light-reflection sweeps across .glass
   elements, simulating glancing light off frosted glass. Pure CSS via a
   shared ::before pseudo, driven by per-element --shimmer-delay var.
   ------------------------------------------------------------------------- */
function initGlassShimmer() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('.glass').forEach((el, i) => {
    el.classList.add('has-shimmer');
    el.style.setProperty('--shimmer-delay', (i * 1.6) + 's');
  });
}

/* -------------------------------------------------------------------------
   SCROLL BLOOM — a fixed teal radial gradient drifts from bottom-left to
   top-right of the viewport as the user scrolls the full page length.
   Very subtle (≤5.5% opacity) — adds depth without distracting.
   Uses rAF throttling for smooth, jank-free updates.
   ------------------------------------------------------------------------- */
function initScrollBloom() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const bloom = document.createElement('div');
  bloom.id = 'scrollBloom';
  bloom.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bloom);

  let raf = null;
  const update = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const pct = scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0;
    bloom.style.setProperty('--bloom-pct', pct.toFixed(3));
    raf = null;
  };

  window.addEventListener('scroll', () => {
    if (!raf) raf = requestAnimationFrame(update);
  }, { passive: true });
  update();
}

/* -------------------------------------------------------------------------
   Sprint 27-A: Nav shrink — adds .nav-compact on scroll for tighter padding
   ------------------------------------------------------------------------- */
function initNavShrink() {
  const nav = document.getElementById('nav');
  if (!nav) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const onScroll = () => nav.classList.toggle('nav-compact', window.scrollY > 80);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* -------------------------------------------------------------------------
   Sprint 27-B: Price card spotlight — radial glow follows cursor on desktop
   ------------------------------------------------------------------------- */
function initPriceCardSpotlight() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  const cards = document.querySelectorAll('.price-card');
  if (!cards.length) return;
  cards.forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });
}

/* -------------------------------------------------------------------------
   Sprint 27-C: Section kicker reveal — char-by-char fade+rise on scroll
   ------------------------------------------------------------------------- */
function initSectionKickerReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;
  const kickers = document.querySelectorAll('.section-kicker');
  if (!kickers.length) return;
  kickers.forEach((el) => {
    const label = el.textContent;
    const chars = label.split('');
    el.innerHTML = chars.map((ch, i) =>
      ch === ' '
        ? ' '
        : `<span class="kicker-char" aria-hidden="true" style="--ki:${i}">${ch}</span>`
    ).join('');
    el.classList.add('kicker-split');
    el.setAttribute('aria-label', label);
    if (el.getBoundingClientRect().top < window.innerHeight) {
      el.classList.add('kicker-go');
      return;
    }
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        obs.unobserve(e.target);
        e.target.classList.add('kicker-go');
      });
    }, { threshold: 0.5 });
    io.observe(el);
  });
}

/* -------------------------------------------------------------------------
   Sprint 28-A: Cursor trail — lagging dot chain follows mouse on desktop
   ------------------------------------------------------------------------- */
function initCursorTrail() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const COUNT = 10;
  const EASE = 0.22;
  const mouse = { x: -200, y: -200 };
  const pos = Array.from({ length: COUNT }, () => ({ x: -200, y: -200 }));

  const dots = Array.from({ length: COUNT }, (_, i) => {
    const d = document.createElement('div');
    d.className = 'cursor-trail-dot';
    d.setAttribute('aria-hidden', 'true');
    d.style.setProperty('--ti', String(i));
    document.body.appendChild(d);
    return d;
  });

  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  }, { passive: true });

  const lerp = (a, b, t) => a + (b - a) * t;
  let raf;
  const tick = () => {
    pos[0].x = lerp(pos[0].x, mouse.x, EASE + 0.08);
    pos[0].y = lerp(pos[0].y, mouse.y, EASE + 0.08);
    for (let i = 1; i < COUNT; i++) {
      pos[i].x = lerp(pos[i].x, pos[i - 1].x, EASE);
      pos[i].y = lerp(pos[i].y, pos[i - 1].y, EASE);
    }
    dots.forEach((d, i) => {
      d.style.transform = `translate(${pos[i].x - 3}px, ${pos[i].y - 3}px)`;
    });
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
}

/* -------------------------------------------------------------------------
   Sprint 28-B: Bento icon bounce — GSAP elastic pop when card enters view
   ------------------------------------------------------------------------- */
function initBentoIconBounce() {
  const icons = document.querySelectorAll('.bento-icon');
  if (!icons.length) return;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);
  icons.forEach((icon, i) => {
    gsap.from(icon, {
      scale: 0, rotation: -20, opacity: 0,
      duration: 0.72, ease: 'elastic.out(1, 0.48)',
      delay: i * 0.07,
      scrollTrigger: { trigger: icon.closest('.bento-card') || icon, start: 'top 84%' },
    });
  });
}

/* -------------------------------------------------------------------------
   Sprint 28-C: Section progress dots — fixed right-side nav, dot per section
   ------------------------------------------------------------------------- */
function initSectionProgressDots() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;

  const SECTIONS = [
    { id: 'hero',     label: 'Home' },
    { id: 'showcase', label: 'Before & After' },
    { id: 'services', label: 'Services' },
    { id: 'pricing',  label: 'Pricing' },
    { id: 'process',  label: 'Process' },
    { id: 'faq',      label: 'FAQ' },
    { id: 'contact',  label: 'Contact' },
  ];

  const sections = SECTIONS
    .map(s => ({ ...s, el: document.getElementById(s.id) }))
    .filter(s => s.el);
  if (sections.length < 2) return;

  const nav = document.createElement('nav');
  nav.className = 'section-dots';
  nav.setAttribute('aria-label', 'Page sections');

  const dotEls = sections.map((s) => {
    const btn = document.createElement('button');
    btn.className = 'section-dot';
    btn.setAttribute('aria-label', s.label);
    btn.setAttribute('title', s.label);
    btn.addEventListener('click', () =>
      s.el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    );
    nav.appendChild(btn);
    return btn;
  });

  document.body.appendChild(nav);

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const idx = sections.findIndex(s => s.el === e.target);
      if (idx !== -1) dotEls[idx].classList.toggle('is-active', e.isIntersecting);
    });
  }, { rootMargin: '-30% 0px -30% 0px', threshold: 0 });

  sections.forEach(s => io.observe(s.el));
}

/* -------------------------------------------------------------------------
   Sprint 29-A: Scroll velocity skew — subtle section lean on fast scroll
   ------------------------------------------------------------------------- */
function initScrollSkew() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  // Skip hero: it has competing hero animation transforms.
  // Skip footer: footer entrance animation owns its transform timing.
  const targets = Array.from(document.querySelectorAll('.ba-section, .section'));
  if (!targets.length) return;

  const MAX_SKEW = 1.6;
  const EASE = 0.08;
  let lastY = window.scrollY;
  let skew = 0;

  const tick = () => {
    const delta = window.scrollY - lastY;
    lastY = window.scrollY;
    const goal = Math.max(-MAX_SKEW, Math.min(MAX_SKEW, delta * -0.032));
    skew += (goal - skew) * EASE;
    const abs = Math.abs(skew);
    const val = abs > 0.02 ? `skewY(${skew.toFixed(3)}deg)` : '';
    if (abs <= 0.02) skew = 0;
    targets.forEach(el => { el.style.transform = val; });
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* -------------------------------------------------------------------------
   Sprint 29-B: Section title curtain — clip-path wipe left→right on scroll
   ------------------------------------------------------------------------- */
function initSectionTitleMask() {
  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const titles = document.querySelectorAll('.section-title');
  if (!titles.length) return;
  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      obs.unobserve(e.target);
      e.target.classList.add('title-revealed');
    });
  }, { threshold: 0.25 });
  titles.forEach((el) => {
    el.classList.add('title-mask');
    if (el.getBoundingClientRect().top < window.innerHeight) {
      el.classList.add('title-revealed');
    } else {
      io.observe(el);
    }
  });
}

/* -------------------------------------------------------------------------
   Sprint 29-C: Floating CTA chip — appears once hero exits, hides at contact
   ------------------------------------------------------------------------- */
function initFloatingCTA() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const hero    = document.getElementById('hero');
  const contact = document.getElementById('contact');
  if (!hero || !contact) return;

  const btn = document.createElement('button');
  btn.className  = 'float-cta';
  btn.textContent = 'Get Started →';
  btn.setAttribute('aria-label', 'Scroll to contact form');
  btn.addEventListener('click', () =>
    contact.scrollIntoView({ behavior: 'smooth', block: 'start' })
  );
  document.body.appendChild(btn);

  let heroGone = false, atContact = false;
  const update = () => btn.classList.toggle('float-cta-visible', heroGone && !atContact);

  new IntersectionObserver(
    (e) => { heroGone = !e[0].isIntersecting; update(); },
    { threshold: 0.1 }
  ).observe(hero);

  new IntersectionObserver(
    (e) => { atContact = e[0].isIntersecting; update(); },
    { threshold: 0.25 }
  ).observe(contact);
}

/* -------------------------------------------------------------------------
   Sprint 31-A: Featured card pulse — persistent ring glow on popular card
   ------------------------------------------------------------------------- */
function initFeaturedCardPulse() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const card = document.querySelector('.price-card.featured');
  if (!card) return;
  card.classList.add('featured-pulse');
}

/* -------------------------------------------------------------------------
   Sprint 31-B: Bento title scramble — h3 text glitches on card hover
   ------------------------------------------------------------------------- */
function initBentoTitleScramble() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#@!?*';
  const scramble = (el) => {
    const original = el.textContent;
    let iter = 0;
    const step = () => {
      el.textContent = original.split('').map((ch, i) => {
        if (i < iter || ch === ' ') return original[i];
        return CHARS[Math.floor(Math.random() * CHARS.length)];
      }).join('');
      iter += 0.45;
      if (iter < original.length) requestAnimationFrame(step);
      else el.textContent = original;
    };
    requestAnimationFrame(step);
  };
  document.querySelectorAll('.bento-card').forEach((card) => {
    const title = card.querySelector('h3');
    if (!title) return;
    let busy = false;
    card.addEventListener('mouseenter', () => {
      if (busy) return;
      busy = true;
      scramble(title);
      setTimeout(() => { busy = false; }, 600);
    }, { passive: true });
  });
}

/* -------------------------------------------------------------------------
   Sprint 31-C: FAQ bar reveal — teal left-bar box-shadow on open
   ------------------------------------------------------------------------- */
function initFaqBarReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('.faq-item').forEach((item) => {
    item.addEventListener('toggle', () => {
      item.classList.toggle('faq-opened', item.open);
    });
  });
}

/* -------------------------------------------------------------------------
   Sprint 30-A: Step number pop — GSAP elastic entrance on process step nums
   ------------------------------------------------------------------------- */
function initStepNumPop() {
  const nums = document.querySelectorAll('.step-num');
  if (!nums.length) return;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);
  nums.forEach((num, i) => {
    gsap.from(num, {
      scale: 0, opacity: 0, rotation: 20,
      duration: 0.85, ease: 'elastic.out(1, 0.45)',
      delay: i * 0.14,
      scrollTrigger: { trigger: num.closest('.step') || num, start: 'top 82%' },
    });
  });
}

/* -------------------------------------------------------------------------
   Sprint 30-B: Grain overlay — SVG noise texture adds film-grain depth
   ------------------------------------------------------------------------- */
function initGrainOverlay() {
  const grain = document.createElement('div');
  grain.id = 'grainOverlay';
  grain.setAttribute('aria-hidden', 'true');
  document.body.appendChild(grain);
}

/* -------------------------------------------------------------------------
   Sprint 30-C: Submit confetti — teal particle burst on form success
   ------------------------------------------------------------------------- */
function initSubmitConfetti() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const confirmEl = document.getElementById('formConfirm');
  const submitBtn = document.querySelector('.form-submit');
  if (!confirmEl || !submitBtn) return;

  let fired = false;
  const COLORS = ['#00d4c8', '#a0f0ed', '#ffffff', '#00a89e', '#5ff0e8'];

  const launch = () => {
    if (fired) return;
    fired = true;
    const rect = submitBtn.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    for (let i = 0; i < 30; i++) {
      const p = document.createElement('span');
      p.className = 'confetti-piece';
      p.setAttribute('aria-hidden', 'true');
      const angle = (i / 30) * Math.PI * 2;
      const speed = 80 + (i * 37) % 120;
      p.style.cssText = [
        `left:${cx}px`, `top:${cy}px`,
        `--dx:${Math.cos(angle) * speed}px`,
        `--dy:${Math.sin(angle) * speed - 100}px`,
        `--color:${COLORS[i % COLORS.length]}`,
        `--rot:${(i * 43) % 720}deg`,
        `--delay:${(i * 0.022).toFixed(3)}s`,
      ].join(';');
      document.body.appendChild(p);
      p.addEventListener('animationend', () => p.remove(), { once: true });
    }
  };

  new MutationObserver(() => {
    if (!confirmEl.hidden) launch();
  }).observe(confirmEl, { attributes: true, attributeFilter: ['hidden'] });
}

/* -------------------------------------------------------------------------
   Sprint 33-A: About icon spin — D badge rotates into view via GSAP
   ------------------------------------------------------------------------- */
function initAboutIconSpin() {
  const icon = document.querySelector('.about-icon');
  if (!icon) return;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);
  gsap.from(icon, {
    rotation: -180, scale: 0, opacity: 0,
    duration: 0.92, ease: 'back.out(1.6)',
    scrollTrigger: { trigger: icon.closest('.about-block') || icon, start: 'top 82%' },
  });
}

/* -------------------------------------------------------------------------
   Sprint 33-B: Step badge pop — GSAP elastic entrance for .step-badge pills
   ------------------------------------------------------------------------- */
function initStepBadgePop() {
  const badges = document.querySelectorAll('.step-badge');
  if (!badges.length) return;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);
  badges.forEach((badge) => {
    gsap.from(badge, {
      scale: 0, opacity: 0, y: 10,
      duration: 0.68, ease: 'elastic.out(1, 0.48)', delay: 0.28,
      scrollTrigger: { trigger: badge.closest('.step') || badge, start: 'top 82%' },
    });
  });
}

/* -------------------------------------------------------------------------
   Sprint 33-C: Phone ring wiggle — attention animation on phone/SMS links
   ------------------------------------------------------------------------- */
function initPhoneRingWiggle() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const targets = document.querySelectorAll('.hero-phone, .step-link');
  if (!targets.length) return;
  const fire = (el) => {
    el.classList.add('phone-ring');
    el.addEventListener('animationend', () => el.classList.remove('phone-ring'), { once: true });
  };
  setTimeout(() => {
    targets.forEach(fire);
    setInterval(() => targets.forEach(fire), 9000);
  }, 4500);
}

/* -------------------------------------------------------------------------
   Sprint 32-A: Process line draw — scaleX 0→1 left-to-right on scroll
   ------------------------------------------------------------------------- */
function initProcessLineDraw() {
  const line = document.querySelector('.step-line');
  if (!line) return;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);
  gsap.set(line, { scaleX: 0, transformOrigin: 'left center' });
  gsap.to(line, {
    scaleX: 1, duration: 1.25, ease: 'power2.inOut',
    scrollTrigger: { trigger: line, start: 'top 85%' },
  });
}

/* -------------------------------------------------------------------------
   Sprint 32-B: Hero eyebrow pulse — teal glow burst 2s after load
   ------------------------------------------------------------------------- */
function initHeroEyebrowPulse() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const el = document.querySelector('.hero-eyebrow');
  if (!el) return;
  setTimeout(() => {
    el.classList.add('eyebrow-pulse');
    el.addEventListener('animationend', () => el.classList.remove('eyebrow-pulse'), { once: true });
  }, 2200);
}

/* -------------------------------------------------------------------------
   Sprint 32-C: Format tag entrance — GSAP pop for .step-formats chips
   ------------------------------------------------------------------------- */
function initFormatTagEntrance() {
  const tags = document.querySelectorAll('.step-formats span');
  if (!tags.length) return;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);
  const groups = new Map();
  tags.forEach((tag) => {
    const parent = tag.closest('.step-formats');
    if (!groups.has(parent)) groups.set(parent, []);
    groups.get(parent).push(tag);
  });
  groups.forEach((tagList, parent) => {
    gsap.from(tagList, {
      y: 14, opacity: 0, scale: 0.8,
      stagger: 0.065, duration: 0.44, ease: 'back.out(2)',
      scrollTrigger: { trigger: parent, start: 'top 85%' },
    });
  });
}

/* Sprint 35 — social-proof ticker, CTA border morph, nav depth blur -------- */

function initSocialProofTicker() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const trustBar = document.querySelector('.trust-bar');
  if (!trustBar) return;
  const PHRASES = [
    '✓ Same-day results', '✓ Real person, not a bot', '✓ $25 to start',
    '✓ Free fix if not right', '✓ No subscription fees', '✓ Always Dominick',
    '✓ Text and get a reply', '✓ No AI guessing', '✓ One human you can call',
    '✓ No templates, no fluff',
  ];
  const track = document.createElement('div');
  track.className = 'sp-ticker-track';
  track.setAttribute('aria-hidden', 'true');
  const doubled = [...PHRASES, ...PHRASES];
  doubled.forEach((phrase) => {
    const span = document.createElement('span');
    span.textContent = phrase;
    track.appendChild(span);
  });
  const ticker = document.createElement('div');
  ticker.className = 'sp-ticker';
  ticker.setAttribute('aria-label', 'Why choose Dominick');
  ticker.appendChild(track);
  trustBar.insertAdjacentElement('afterend', ticker);
}

function initCtaMorph() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('.btn.btn-primary').forEach((btn) => {
    btn.classList.add('cta-morph');
  });
}

function initNavBlur() {
  const nav = document.getElementById('nav');
  if (!nav) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let rafId;
  const update = () => {
    const depth = Math.min(window.scrollY / 500, 1);
    const blur = (8 + depth * 22).toFixed(1);
    nav.style.setProperty('--nav-blur', blur + 'px');
    nav.classList.toggle('nav-deep', window.scrollY > 80);
  };
  window.addEventListener('scroll', () => { cancelAnimationFrame(rafId); rafId = requestAnimationFrame(update); }, { passive: true });
  update();
}

/* Sprint 36 — hero sub morph, contact pulse ring, badge levitate ----------- */

function initHeroSubMorph() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const el = document.querySelector('.hero-sub');
  if (!el) return;
  const LINES = [
    'I turn messy notes, screenshots, menus, and rough drafts into clean, professional, ready-to-send results. Same day.',
    'You send me the mess. I send back something ready to use. Done same day.',
    'No app to learn. No bot to configure. Just text me and get it back clean.',
  ];
  let idx = 0;
  el.classList.add('hero-sub-morph');
  setInterval(() => {
    el.classList.add('hero-sub-out');
    setTimeout(() => {
      idx = (idx + 1) % LINES.length;
      el.textContent = LINES[idx];
      el.classList.remove('hero-sub-out');
      el.classList.add('hero-sub-in');
      el.addEventListener('animationend', () => el.classList.remove('hero-sub-in'), { once: true });
    }, 350);
  }, 4500);
}

function initContactPulseRing() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const form = document.getElementById('contactForm');
  if (!form) return;
  const anchor = document.createElement('div');
  anchor.className = 'contact-pulse-anchor';
  anchor.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 3; i++) {
    const ring = document.createElement('span');
    ring.className = 'contact-pulse-ring';
    ring.style.setProperty('--ri', String(i));
    anchor.appendChild(ring);
  }
  form.parentElement.insertBefore(anchor, form);
  if (!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => anchor.classList.toggle('pulse-active', e.isIntersecting));
  }, { threshold: 0.3 });
  io.observe(form);
}

function initBadgeLevitate() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const badge = document.querySelector('.bento-card .bento-badge');
  if (!badge) return;
  badge.classList.add('badge-levitate');
}

/* Sprint 37 — footer brand glow, step left-border flash, hero orbit dot ----- */

function initFooterBrandGlow() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  const brand = document.querySelector('.footer-brand');
  if (!brand) return;
  brand.classList.add('footer-brand-glow');
  brand.addEventListener('mousemove', (e) => {
    const r = brand.getBoundingClientRect();
    brand.style.setProperty('--fx', (e.clientX - r.left) + 'px');
    brand.style.setProperty('--fy', (e.clientY - r.top) + 'px');
  }, { passive: true });
}

function initStepRevealSequence() {
  const steps = document.querySelectorAll('.step');
  if (!steps.length) return;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);
  steps.forEach((step, i) => {
    ScrollTrigger.create({
      trigger: step,
      start: 'top 82%',
      once: true,
      onEnter: () => {
        setTimeout(() => {
          step.classList.add('step-border-flash');
          step.addEventListener('animationend', () => step.classList.remove('step-border-flash'), { once: true });
        }, i * 120);
      },
    });
  });
}

function initHeroOrbitDot() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const hero = document.getElementById('hero');
  if (!hero) return;
  const dot = document.createElement('div');
  dot.className = 'hero-orbit-dot';
  dot.setAttribute('aria-hidden', 'true');
  hero.appendChild(dot);
}

/* Sprint 38 — FAQ icon spin, price hover wash, section deco numbers --------- */

function initFaqIconSpin() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const list = document.querySelector('.faq-list');
  if (!list) return;
  list.classList.add('faq-spin-icons');
}

function initPriceHoverMorph() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('.price-card').forEach((card) => {
    const wash = document.createElement('div');
    wash.className = 'price-morph-wash';
    wash.setAttribute('aria-hidden', 'true');
    card.appendChild(wash);
    card.classList.add('price-morph-ready');
  });
}

function initSectionDecoNumbers() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;
  const kickers = document.querySelectorAll('.section-kicker');
  if (!kickers.length) return;
  let n = 0;
  kickers.forEach((kicker) => {
    n++;
    const num = document.createElement('span');
    num.className = 'section-deco-num';
    num.setAttribute('aria-hidden', 'true');
    num.textContent = String(n).padStart(2, '0');
    kicker.parentElement.insertBefore(num, kicker);
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        obs.unobserve(e.target);
        e.target.classList.add('deco-num-visible');
      });
    }, { threshold: 0.3 });
    io.observe(num);
  });
}

/* Sprint 39 — hero tagline typewriter, bento border trace, form field glow -- */

function initHeroTaglineTypewriter() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const el = document.querySelector('.hero-trust');
  if (!el) return;
  const text = el.textContent;
  el.textContent = '';
  el.setAttribute('aria-label', text);
  el.classList.add('hero-trust-typing');
  let i = 0;
  const type = () => {
    if (i >= text.length) { el.classList.remove('hero-trust-typing'); return; }
    el.textContent += text[i++];
    setTimeout(type, i === 1 ? 2600 : 38);
  };
  setTimeout(type, 2600);
}

function initBentoBorderTrace() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('.bento-card').forEach((card) => {
    const trace = document.createElement('div');
    trace.className = 'bento-border-trace';
    trace.setAttribute('aria-hidden', 'true');
    card.appendChild(trace);
  });
}

function initFormFieldGlow() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const fields = document.querySelectorAll('.contact-form input, .contact-form textarea');
  if (!fields.length) return;
  fields.forEach((field) => {
    field.classList.add('field-glow');
    field.addEventListener('focus', () => field.classList.add('field-glow-active'), { passive: true });
    field.addEventListener('blur', () => field.classList.remove('field-glow-active'), { passive: true });
  });
}

/* Sprint 43 — section glow halo, step icon hover, hero CTA pulse ring -------- */

function initSectionGlowHalo() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;
  const sections = document.querySelectorAll('.section, .ba-section');
  if (!sections.length) return;
  sections.forEach((section) => {
    const halo = document.createElement('div');
    halo.className = 'section-halo';
    halo.setAttribute('aria-hidden', 'true');
    section.style.position = section.style.position || 'relative';
    section.insertBefore(halo, section.firstChild);
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        obs.unobserve(e.target);
        halo.classList.add('halo-fire');
        halo.addEventListener('animationend', () => halo.classList.remove('halo-fire'), { once: true });
      });
    }, { threshold: 0.15 });
    io.observe(section);
  });
}

function initStepIconHover() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('.step-num').forEach((num) => {
    num.addEventListener('mouseenter', () => {
      num.classList.remove('step-num-glow');
      void num.offsetWidth;
      num.classList.add('step-num-glow');
      num.addEventListener('animationend', () => num.classList.remove('step-num-glow'), { once: true });
    });
  });
}

function initCtaPulseRing() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const btn = document.querySelector('.hero-cta-row .btn-primary');
  if (!btn) return;
  btn.classList.add('cta-pulse-ready');
  const fire = () => {
    for (let i = 0; i < 2; i++) {
      const ring = document.createElement('span');
      ring.className = 'cta-ring';
      ring.setAttribute('aria-hidden', 'true');
      ring.style.setProperty('--ri', String(i));
      btn.parentElement.appendChild(ring);
      ring.addEventListener('animationend', () => ring.remove(), { once: true });
    }
  };
  setTimeout(() => { fire(); setInterval(fire, 5000); }, 3500);
}

/* Sprint 42 — hero headline color cycle, contact list pop, footer glow pulse  */

function initHeroHeadlineColorCycle() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const el = document.getElementById('wordClarity');
  if (!el) return;
  setTimeout(() => el.classList.add('clarity-cycle'), 4200);
}

function initContactListPop() {
  const list = document.querySelector('.contact-next');
  if (!list) return;
  const items = list.querySelectorAll('li');
  if (!items.length) return;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);
  gsap.from(items, {
    x: -28, opacity: 0, duration: 0.5, ease: 'power3.out', stagger: 0.13,
    scrollTrigger: { trigger: list, start: 'top 85%' },
  });
}

function initFooterGlowPulse() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const footer = document.querySelector('.footer--reef');
  if (!footer) return;
  const pulse = document.createElement('div');
  pulse.className = 'footer-glow-pulse';
  pulse.setAttribute('aria-hidden', 'true');
  footer.appendChild(pulse);
  if (!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => pulse.classList.toggle('footer-glow-active', e.isIntersecting));
  }, { threshold: 0.2 });
  io.observe(footer);
}

/* Sprint 41 — nav progress line, showcase tab pop, price label pop ---------- */

function initNavProgressLine() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const nav = document.getElementById('nav');
  if (!nav) return;
  const line = document.createElement('div');
  line.className = 'nav-progress-line';
  line.setAttribute('aria-hidden', 'true');
  nav.appendChild(line);
  const update = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const pct = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
    line.style.setProperty('--np', pct.toFixed(2) + '%');
  };
  window.addEventListener('scroll', update, { passive: true });
  update();
}

function initShowcaseTabPop() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const tabs = document.querySelectorAll('.showcase-tab');
  if (!tabs.length) return;
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tab.classList.remove('tab-pop');
      void tab.offsetWidth;
      tab.classList.add('tab-pop');
      tab.addEventListener('animationend', () => tab.classList.remove('tab-pop'), { once: true });
    });
  });
}

function initPriceLabelPop() {
  const labels = document.querySelectorAll('.price-name');
  if (!labels.length) return;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);
  labels.forEach((label, i) => {
    gsap.from(label, {
      scale: 0.7, opacity: 0, y: 8, duration: 0.65, ease: 'elastic.out(1, 0.5)',
      delay: i * 0.1, scrollTrigger: { trigger: label.closest('.price-card') || label, start: 'top 85%' },
    });
  });
}

/* Sprint 40 — hero orb drift, pricing urgency badge, form shake validation -- */

function initHeroOrbDrift() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const orb = document.querySelector('.teal-orb');
  if (!orb) return;
  orb.classList.add('orb-drift');
}

function initPricingUrgency() {
  if (!('IntersectionObserver' in window)) return;
  const heading = document.querySelector('#pricing .section-title');
  if (!heading) return;
  const badge = document.createElement('span');
  badge.className = 'pricing-urgency';
  badge.setAttribute('aria-label', 'Same-day slots fill quickly');
  badge.textContent = '⚡ Same-day slots fill up';
  heading.insertAdjacentElement('afterend', badge);
  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      obs.unobserve(e.target);
      setTimeout(() => badge.classList.add('urgency-visible'), 400);
    });
  }, { threshold: 0.5 });
  io.observe(heading);
}

function initFormShakeValidation() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const form = document.getElementById('contactForm');
  if (!form) return;
  const shake = (field) => {
    field.classList.remove('field-shake');
    void field.offsetWidth;
    field.classList.add('field-shake');
    field.addEventListener('animationend', () => field.classList.remove('field-shake'), { once: true });
  };
  new MutationObserver((mutations) => {
    mutations.forEach((m) => {
      if (m.type === 'attributes' && m.attributeName === 'class') {
        const el = m.target;
        if (el.classList.contains('invalid') && !el.classList.contains('field-shake')) shake(el);
      }
    });
  }).observe(form, { attributes: true, subtree: true, attributeFilter: ['class'] });
}

/* Sprint 34 — price-diff stagger, hero-price flash, QR hover glow ---------- */

function initPriceDiffStagger() {
  const row = document.querySelector('.price-diff-row');
  if (!row) return;
  const items = row.querySelectorAll('.price-diff-item');
  if (!items.length) return;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);
  gsap.from(items, {
    x: 40, opacity: 0, duration: 0.55, ease: 'power3.out', stagger: 0.12,
    scrollTrigger: { trigger: row, start: 'top 88%' },
  });
}

function initHeroPriceFlash() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const el = document.querySelector('.hero-price strong');
  if (!el) return;
  setTimeout(() => {
    el.classList.add('hero-price-flash');
    el.addEventListener('animationend', () => el.classList.remove('hero-price-flash'), { once: true });
  }, 1800);
}

function initQRHoverGlow() {
  const block = document.querySelector('.qr-block');
  if (!block) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  block.classList.add('qr-glow-ready');
  if (!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => block.classList.toggle('qr-in-view', e.isIntersecting));
  }, { threshold: 0.4 });
  io.observe(block);
}

/* Sprint 44 — headline glitch, QR orbit rings, section h2 underline ---------- */

function initHeadlineGlitch() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const el = document.querySelector('.hero-headline');
  if (!el) return;
  const fire = () => {
    el.classList.remove('headline-glitch');
    void el.offsetWidth;
    el.classList.add('headline-glitch');
    el.addEventListener('animationend', () => el.classList.remove('headline-glitch'), { once: true });
  };
  setTimeout(() => { fire(); setInterval(fire, 14000); }, 2200);
}

function initQROrbitRings() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const card = document.querySelector('.qr-card');
  if (!card) return;
  card.style.position = card.style.position || 'relative';
  [0, 1].forEach((i) => {
    const ring = document.createElement('div');
    ring.className = `qr-orbit qr-orbit--${i}`;
    ring.setAttribute('aria-hidden', 'true');
    card.appendChild(ring);
  });
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const state = e.isIntersecting ? 'running' : 'paused';
      card.querySelectorAll('.qr-orbit').forEach((r) => {
        r.style.animationPlayState = state;
      });
    });
  }, { threshold: 0.1 });
  io.observe(card);
}

function initSectionH2Underline() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const headings = document.querySelectorAll('.section h2, .ba-section h2');
  if (!headings.length) return;
  headings.forEach((h2) => {
    h2.style.position = h2.style.position || 'relative';
    const line = document.createElement('span');
    line.className = 'h2-underline';
    line.setAttribute('aria-hidden', 'true');
    h2.appendChild(line);
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        obs.unobserve(e.target);
        line.classList.add('h2-underline--active');
      });
    }, { threshold: 0.3 });
    io.observe(h2);
  });
}

/* Sprint 45 — click sparks, slider handle glow, scroll vignette ------------ */

function initClickSpark() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.addEventListener('click', (e) => {
    for (let i = 0; i < 5; i++) {
      const spark = document.createElement('span');
      spark.className = 'click-spark';
      spark.setAttribute('aria-hidden', 'true');
      spark.style.setProperty('--cx', `${e.clientX}px`);
      spark.style.setProperty('--cy', `${e.clientY}px`);
      spark.style.setProperty('--sa', `${(360 / 5) * i + (Math.random() * 20 - 10)}deg`);
      spark.style.setProperty('--sd', `${28 + Math.random() * 18}px`);
      document.body.appendChild(spark);
      spark.addEventListener('animationend', () => spark.remove(), { once: true });
    }
  });
}

function initSliderHandleGlow() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const handle = document.querySelector('.ba-handle');
  if (!handle) return;
  handle.classList.add('handle-glow-pulse');
}

function initScrollVignette() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const vig = document.createElement('div');
  vig.className = 'scroll-vignette';
  vig.setAttribute('aria-hidden', 'true');
  document.body.appendChild(vig);
  let lastY = window.scrollY;
  let fade = null;
  window.addEventListener('scroll', () => {
    const dy = Math.abs(window.scrollY - lastY);
    lastY = window.scrollY;
    if (dy > 8) {
      vig.classList.add('vig-active');
      clearTimeout(fade);
      fade = setTimeout(() => vig.classList.remove('vig-active'), 180);
    }
  }, { passive: true });
}

/* Sprint 46 — floating ghost words, morph blob, service tag hover ----------- */

function initFloatingWords() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const hero = document.querySelector('.hero, .hero-section, #hero');
  if (!hero) return;
  hero.style.overflow = hero.style.overflow || 'hidden';
  const words = ['CLEAN', 'FAST', 'CLEAR', 'POLISHED', 'READY'];
  const positions = [10, 25, 60, 75, 45];
  words.forEach((word, i) => {
    const el = document.createElement('span');
    el.className = 'float-word';
    el.setAttribute('aria-hidden', 'true');
    el.textContent = word;
    el.style.setProperty('--fw-x', `${positions[i]}%`);
    el.style.setProperty('--fw-delay', `${i * 1.8}s`);
    el.style.setProperty('--fw-dur', `${9 + i * 1.2}s`);
    hero.insertBefore(el, hero.firstChild);
  });
}

function initMorphBlob() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const target = document.querySelector('.about, .about-section, #about');
  if (!target) return;
  target.style.position = target.style.position || 'relative';
  const blob = document.createElement('div');
  blob.className = 'morph-blob';
  blob.setAttribute('aria-hidden', 'true');
  target.insertBefore(blob, target.firstChild);
}

function initServiceTagHover() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('.format-tag, .bento-tag, .service-tag').forEach((tag) => {
    tag.classList.add('tag-hover-bounce');
  });
}

/* Sprint 47 — bento card shine, nav dot indicator, pricing grid glow -------- */

function initBentoCardShine() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('.bento-card').forEach((card) => {
    const shine = document.createElement('div');
    shine.className = 'card-shine';
    shine.setAttribute('aria-hidden', 'true');
    card.style.overflow = card.style.overflow || 'hidden';
    card.appendChild(shine);
    card.addEventListener('mouseenter', () => {
      shine.classList.remove('card-shine-sweep');
      void shine.offsetWidth;
      shine.classList.add('card-shine-sweep');
    });
  });
}

function initNavDotIndicator() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const links = document.querySelectorAll('.nav-link, nav a');
  if (!links.length) return;
  const nav = links[0].closest('nav, .nav, header');
  if (!nav) return;
  nav.style.position = nav.style.position || 'relative';
  const dot = document.createElement('span');
  dot.className = 'nav-dot';
  dot.setAttribute('aria-hidden', 'true');
  nav.appendChild(dot);
  links.forEach((link) => {
    link.addEventListener('mouseenter', () => {
      const lr = link.getBoundingClientRect();
      const nr = nav.getBoundingClientRect();
      dot.style.setProperty('--dot-x', `${lr.left - nr.left + lr.width / 2}px`);
      dot.style.setProperty('--dot-y', `${lr.bottom - nr.top + 4}px`);
      dot.classList.add('dot-active');
    });
  });
  nav.addEventListener('mouseleave', () => dot.classList.remove('dot-active'));
}

function initPricingGridGlow() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;
  const grid = document.querySelector('.pricing-grid, .pricing-section, #pricing');
  if (!grid) return;
  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      obs.unobserve(e.target);
      e.target.classList.add('pricing-glow-active');
    });
  }, { threshold: 0.2 });
  io.observe(grid);
}

/* Sprint 48 — pricing card hover particles, about pulse, footer link glow ---- */

function initPricingCardParticles() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('.pricing-card').forEach((card) => {
    card.addEventListener('mouseenter', () => {
      for (let i = 0; i < 4; i++) {
        const p = document.createElement('span');
        p.className = 'price-particle';
        p.setAttribute('aria-hidden', 'true');
        p.style.setProperty('--pp-angle', `${i * 90 + Math.random() * 30 - 15}deg`);
        p.style.setProperty('--pp-dist', `${32 + Math.random() * 16}px`);
        card.appendChild(p);
        p.addEventListener('animationend', () => p.remove(), { once: true });
      }
    });
  });
}

function initAboutSectionPulse() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;
  const about = document.querySelector('.about, .about-section, #about');
  if (!about) return;
  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      obs.unobserve(e.target);
      e.target.classList.add('about-pulse-active');
    });
  }, { threshold: 0.25 });
  io.observe(about);
}

function initFooterLinkGlow() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('footer a, .footer a, .footer-nav a').forEach((link) => {
    link.classList.add('footer-link-glow');
  });
}

/* ------------------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  // Each init is isolated so a failure in one (e.g. a blocked CDN) can't
  // take down the rest of the page's interactivity.
  const inits = [
    initPageIntro, initHeroCanvas, initHeroAnimation, initClarityScramble, initNav, initMobileBar, initDiveHero,
    initAboutEntrance, initBeforeAfter, initProcessTimeline,
    initPricingEntrance, initBentoReveal, initFaqStagger,
    initScrollReveals, initUnderwater, initReef,
    initContactForm, initQRCode, initTransformDemo, initCardSpotlight, initHeroParallax,
    initCardTilt, initCountUp, initKineticText, initFaqAnimation, initCustomCursor,
    initScrollProgress, initMagneticButtons, initHeadingReveal, initActiveNav,
    initButtonRipple, initHeroCursorGlow, initScrollToTop, initSectionAmbient,
    initContactReveal, initContactSteps,
    initHeroTrustCycle, initTrustBarEntrance, initFooterEntrance,
    initShowcaseAutoplay, initKineticFloat,
    initNavCTAPing, initSliderTabIndicator, initFormCompletionGlow,
    initSliderHint, initGlassShimmer, initScrollBloom,
    initNavShrink, initPriceCardSpotlight, initSectionKickerReveal,
    initCursorTrail, initBentoIconBounce, initSectionProgressDots,
    initScrollSkew, initSectionTitleMask, initFloatingCTA,
    initStepNumPop, initGrainOverlay, initSubmitConfetti,
    initFeaturedCardPulse, initBentoTitleScramble, initFaqBarReveal,
    initProcessLineDraw, initHeroEyebrowPulse, initFormatTagEntrance,
    initAboutIconSpin, initStepBadgePop, initPhoneRingWiggle,
    initPriceDiffStagger, initHeroPriceFlash, initQRHoverGlow,
    initSocialProofTicker, initCtaMorph, initNavBlur,
    initHeroSubMorph, initContactPulseRing, initBadgeLevitate,
    initFooterBrandGlow, initStepRevealSequence, initHeroOrbitDot,
    initFaqIconSpin, initPriceHoverMorph, initSectionDecoNumbers,
    initHeroTaglineTypewriter, initBentoBorderTrace, initFormFieldGlow,
    initHeroOrbDrift, initPricingUrgency, initFormShakeValidation,
    initNavProgressLine, initShowcaseTabPop, initPriceLabelPop,
    initHeroHeadlineColorCycle, initContactListPop, initFooterGlowPulse,
    initSectionGlowHalo, initStepIconHover, initCtaPulseRing,
    initHeadlineGlitch, initQROrbitRings, initSectionH2Underline,
    initClickSpark, initSliderHandleGlow, initScrollVignette,
    initFloatingWords, initMorphBlob, initServiceTagHover,
    initBentoCardShine, initNavDotIndicator, initPricingGridGlow,
    initPricingCardParticles, initAboutSectionPulse, initFooterLinkGlow,
  ];
  for (const init of inits) {
    try { init(); } catch (err) { console.error(`${init.name} failed:`, err); }
  }
});
