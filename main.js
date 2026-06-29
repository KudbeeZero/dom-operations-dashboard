/* ==========================================================================
   I Got A Dom — main.js
   HERMES Executor: canvas hero, GSAP hero, nav, before/after, reveals, form, QR.
   ========================================================================== */

/* The `js` class is now added by a tiny inline <script> in <head> so the reveal
   pre-state applies before paint even though main.js is deferred. Kept here as a
   no-op guard in case the inline script is ever removed. */
document.documentElement.classList.add('js');

/* -------------------------------------------------------------------------
   Cinematic spine — Lenis smooth-scroll, synced with GSAP ScrollTrigger.
   This is the inertial scroll that makes the 50+ ScrollTrigger beats read as
   one cinematic camera move instead of discrete triggers. Reduced-motion users
   keep native scroll. Exposed as window.__lenis for later scrubbed sections.
   ------------------------------------------------------------------------- */
function initSmoothScroll() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  // Touch devices: Lenis' smoothTouch is off by default (native momentum scroll is
  // already good on phones), so running its rAF + the velocity-lean writes is pure
  // overhead — and part of the mobile load that triggers iOS Safari tab reloads.
  // Skip it on coarse pointers; desktop keeps the buttery inertial scroll.
  if (window.matchMedia('(pointer: coarse)').matches) return;
  if (typeof Lenis === 'undefined') return; // CDN guard — fall back to native scroll
  if (window.__lenis) return;               // idempotent

  const lenis = new Lenis({
    lerp: 0.1,            // inertia: lower = floatier
    smoothWheel: true,
    wheelMultiplier: 1,
  });
  window.__lenis = lenis;

  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    // Drive ScrollTrigger off Lenis' virtual scroll so scrubs stay in sync.
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  } else {
    // No GSAP — run Lenis' own rAF loop.
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }

  // In-page anchors (nav + CTAs) ride the smooth scroll instead of jumping.
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    const sel = a.getAttribute('href');
    if (!sel || sel.length < 2) return; // skip bare "#"
    a.addEventListener('click', (e) => {
      const el = document.querySelector(sel);
      if (!el) return;
      e.preventDefault();
      lenis.scrollTo(el, { offset: -70 }); // clear the sticky header
    });
  });
}

/* -------------------------------------------------------------------------
   Cinematic Sprint B — scroll-velocity "camera lean". Lenis' scroll velocity
   drives a --scroll-vel CSS var (-1..1); CSS leans/parallaxes cinematic type
   with momentum, then settles to 0 as Lenis eases to a stop. Pure CSS-var write
   per scroll tick (no per-element JS), so it's cheap and conflict-free.
   ------------------------------------------------------------------------- */
function initScrollVelocityCinema() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const lenis = window.__lenis;
  if (!lenis) return; // depends on the Sprint A smooth-scroll spine
  const root = document.documentElement;
  lenis.on('scroll', () => {
    const raw = typeof lenis.velocity === 'number' ? lenis.velocity : 0;
    const v = Math.max(-1, Math.min(1, raw / 35)); // normalize to a gentle range
    root.style.setProperty('--scroll-vel', v.toFixed(3));
  });
}

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

    if (rafActive) requestAnimationFrame(frame);
  }

  let rafActive = true;
  resize();
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  }, { passive: true });

  // Pause the RAF loop when the hero canvas is off-screen to save GPU/CPU.
  const canvasIO = new IntersectionObserver(entries => {
    rafActive = entries[0].isIntersecting;
    if (rafActive) requestAnimationFrame(frame);
  }, { threshold: 0 });
  canvasIO.observe(canvas);
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
    // The 300vh dive section's final height is only known now — recompute every
    // downstream ScrollTrigger so post-#dive reveals (pricing, etc.) fire correctly.
    if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
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

  // Underwater scene canvas — skipped under reduced motion, AND on phones.
  // The bubbles + plankton + shark-physics rAF is the single heaviest thing on the
  // page; on mobile it (plus the reef canvas, glass blur, and caustics) blows past
  // iOS Safari's memory/GPU ceiling and the tab gets discarded/reloaded ("resets
  // itself"). The static CSS scene (bg gradient + .uw-rays + ridges) stays, and the
  // cheap GSAP ray/card scroll transitions above still run — so #deep still looks right.
  const coarseOrSmall = window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;
  if (prefersReduced || coarseOrSmall || !canvas) return;
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
  // Skip the fish/motes rAF on phones too — part of the mobile memory diet that
  // stops iOS Safari from reloading the tab. CSS ridges + rays keep the reef look.
  const coarseOrSmall = window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;
  if (prefersReduced || coarseOrSmall) return;   // static reef (CSS ridges + rays) only
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
    // once: reveal a single time and stay (don't re-hide on scroll-up). A global
    // ScrollTrigger.refresh() after init/fonts/load recomputes this trigger's start
    // so it fires reliably even though the 300vh #dive section shifts layout.
    scrollTrigger: { trigger: grid, start: 'top 86%', once: true },
    onComplete() {
      document.querySelectorAll('.price-amount').forEach((el, i) => {
        setTimeout(() => el.classList.add('price-lit'), i * 120 + 80);
      });
    },
  });

  // Hard safety net: if ScrollTrigger somehow never fires (stale layout, refresh
  // missed), the cards would be stuck at opacity:0 forever. After the page settles,
  // force any still-hidden card visible so pricing can never silently disappear.
  window.addEventListener('load', () => {
    setTimeout(() => {
      cards.forEach((c) => {
        if (parseFloat(getComputedStyle(c).opacity) < 0.05) {
          gsap.set(c, { clearProps: 'opacity,transform' });
        }
      });
    }, 1200);
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
  let trustTimer = null;
  const ioTrust = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) {
      if (!trustTimer) trustTimer = setInterval(rotate, 4200);
    } else {
      clearInterval(trustTimer);
      trustTimer = null;
    }
  }, { threshold: 0 });
  ioTrust.observe(el);
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

  let autoplayTimer = null;
  const ioAutoplay = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) {
      if (!autoplayTimer) autoplayTimer = setInterval(advance, 5200);
    } else {
      clearInterval(autoplayTimer);
      autoplayTimer = null;
    }
  }, { threshold: 0 });
  ioAutoplay.observe(slider);

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

  let heroGone = false, atContact = false, atFooter = false;
  const update = () => btn.classList.toggle('float-cta-visible', heroGone && !atContact && !atFooter);

  new IntersectionObserver(
    (e) => { heroGone = !e[0].isIntersecting; update(); },
    { threshold: 0.1 }
  ).observe(hero);

  new IntersectionObserver(
    (e) => { atContact = e[0].isIntersecting; update(); },
    { threshold: 0.25 }
  ).observe(contact);

  const footer = document.querySelector('footer');
  if (footer) {
    new IntersectionObserver(
      (e) => { atFooter = e[0].isIntersecting; update(); },
      { threshold: 0.05 }
    ).observe(footer);
  }
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
  if (window.matchMedia('(pointer: coarse)').matches) return; // mobile memory diet
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

/* Sprint 49 — contact sparkle, QR scanline, scroll echo lines --------------- */

function initContactItemSparkle() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('.contact-item, .contact-link, .contact-row').forEach((item) => {
    item.addEventListener('mouseenter', () => {
      item.style.position = item.style.position || 'relative';
      for (let i = 0; i < 3; i++) {
        const s = document.createElement('span');
        s.className = 'contact-sparkle';
        s.setAttribute('aria-hidden', 'true');
        s.style.setProperty('--cs-angle', `${120 * i + Math.random() * 40 - 20}deg`);
        s.style.setProperty('--cs-dist', `${22 + Math.random() * 12}px`);
        item.appendChild(s);
        s.addEventListener('animationend', () => s.remove(), { once: true });
      }
    });
  });
}

function initQRScanline() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;
  const card = document.querySelector('.qr-card');
  if (!card) return;
  card.style.position = card.style.position || 'relative';
  const line = document.createElement('div');
  line.className = 'qr-scanline';
  line.setAttribute('aria-hidden', 'true');
  card.appendChild(line);
  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      obs.unobserve(e.target);
      setTimeout(() => {
        line.classList.add('qr-scan-active');
        line.addEventListener('animationend', () => line.classList.remove('qr-scan-active'), { once: true });
      }, 400);
    });
  }, { threshold: 0.5 });
  io.observe(card);
}

function initScrollEchoLines() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let ticking = false;
  let lastY = window.scrollY;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const dy = Math.abs(window.scrollY - lastY);
      if (dy > 60) {
        lastY = window.scrollY;
        const echo = document.createElement('div');
        echo.className = 'scroll-echo';
        echo.setAttribute('aria-hidden', 'true');
        echo.style.setProperty('--ey', `${window.innerHeight / 2}px`);
        document.body.appendChild(echo);
        echo.addEventListener('animationend', () => echo.remove(), { once: true });
      }
      ticking = false;
    });
  }, { passive: true });
}

/* Sprint 50 — aurora bg, process chain bounce, secondary btn hover ripple ----- */

function initAuroraBg() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const hero = document.querySelector('.hero, #hero, .hero-section');
  if (!hero) return;
  hero.style.overflow = hero.style.overflow || 'hidden';
  const colors = [
    'rgba(0,212,200,0.07)',
    'rgba(120,40,200,0.05)',
    'rgba(0,180,220,0.06)',
  ];
  colors.forEach((color, i) => {
    const band = document.createElement('div');
    band.className = `aurora-band aurora-band--${i}`;
    band.setAttribute('aria-hidden', 'true');
    band.style.setProperty('--ab-color', color);
    band.style.setProperty('--ab-dur', `${14 + i * 4}s`);
    band.style.setProperty('--ab-delay', `${i * -3}s`);
    hero.insertBefore(band, hero.firstChild);
  });
}

function initProcessChainBounce() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;
  const steps = document.querySelectorAll('.process-step, .step');
  if (!steps.length) return;
  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      obs.unobserve(e.target);
      steps.forEach((step, i) => {
        setTimeout(() => {
          step.classList.add('step-chain-bounce');
          step.addEventListener('animationend', () => step.classList.remove('step-chain-bounce'), { once: true });
        }, i * 180);
      });
    });
  }, { threshold: 0.25 });
  if (steps[0]) io.observe(steps[0]);
}

function initSecondaryBtnRipple() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('.btn-secondary, .btn-outline, .btn-ghost').forEach((btn) => {
    btn.style.position = btn.style.position || 'relative';
    btn.style.overflow = btn.style.overflow || 'hidden';
    btn.addEventListener('mouseenter', () => {
      const ring = document.createElement('span');
      ring.className = 'btn-hover-ring';
      ring.setAttribute('aria-hidden', 'true');
      btn.appendChild(ring);
      ring.addEventListener('animationend', () => ring.remove(), { once: true });
    });
  });
}

/* Sprint 51 — parallax bento cards, time-of-day tint, kicker hover glow ----- */

function initParallaxBentoCards() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(min-width: 768px)').matches) return;
  const cards = document.querySelectorAll('.bento-card');
  if (!cards.length) return;
  let raf = null;
  window.addEventListener('scroll', () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = null;
      const scroll = window.scrollY;
      cards.forEach((card, i) => {
        const speed = ((i % 3) - 1) * 0.04;
        const y = Math.min(40, Math.max(-40, scroll * speed));
        card.style.setProperty('--pbc-y', `${y}px`);
      });
    });
  }, { passive: true });
}

function initTimeOfDayTint() {
  const hero = document.querySelector('.hero, #hero, .hero-section');
  if (!hero) return;
  const hour = new Date().getHours();
  let period;
  if (hour >= 5 && hour < 10) period = 'dawn';
  else if (hour >= 10 && hour < 16) period = 'day';
  else if (hour >= 16 && hour < 20) period = 'dusk';
  else period = 'night';
  const tint = document.createElement('div');
  tint.className = `hero-tint-layer hero-tint-${period}`;
  tint.setAttribute('aria-hidden', 'true');
  hero.insertBefore(tint, hero.firstChild);
}

function initKickerHoverGlow() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('.section-kicker, .kicker, .kicker-label').forEach((k) => {
    k.classList.add('kicker-hover-glow');
  });
}

/* Sprint 52 — custom scrollbar, card focus ring, section counter ------------ */

function initCustomScrollbar() {
  if (!('CSS' in window) || !CSS.supports('scrollbar-width', 'thin')) {
    document.documentElement.classList.add('custom-scrollbar');
  } else {
    document.documentElement.classList.add('custom-scrollbar');
  }
}

function initCardFocusRing() {
  document.querySelectorAll('.bento-card, .pricing-card, .btn, .nav-link, .faq-question').forEach((el) => {
    el.classList.add('focus-ring-enhanced');
  });
}

function initSectionCounter() {
  if (window.matchMedia('(max-width: 767px)').matches) return;
  const sections = document.querySelectorAll('.section, .ba-section, .hero');
  if (sections.length < 2) return;
  const counter = document.createElement('div');
  counter.className = 'section-counter';
  counter.setAttribute('aria-hidden', 'true');
  document.body.appendChild(counter);
  const total = String(sections.length).padStart(2, '0');
  const update = (i) => {
    counter.textContent = `${String(i + 1).padStart(2, '0')} / ${total}`;
    counter.classList.remove('counter-pop');
    void counter.offsetWidth;
    counter.classList.add('counter-pop');
    counter.addEventListener('animationend', () => counter.classList.remove('counter-pop'), { once: true });
  };
  sections.forEach((section, i) => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) update(i); });
    }, { threshold: 0.35 });
    io.observe(section);
  });
  update(0);
}

/* ------------------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  // Each init is isolated so a failure in one (e.g. a blocked CDN) can't
  // take down the rest of the page's interactivity.
  const inits = [
    initSmoothScroll, initScrollVelocityCinema,                           // Cinematic spine — must run first
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
    initContactItemSparkle, initQRScanline, initScrollEchoLines,
    initAuroraBg, initProcessChainBounce, initSecondaryBtnRipple,
    initParallaxBentoCards, initTimeOfDayTint, initKickerHoverGlow,
    initCustomScrollbar, initCardFocusRing, initSectionCounter,
    initNeonFlickerText, initCardStackDepth, initScrollProgressRing,  // Sprint 53
    initWordRevealWave, initCardGlintSweep, initStaggerListReveal,    // Sprint 54
    initSectionLineAccent, initFooterWave, initMouseGlowFollower,     // Sprint 55
    initPageClickRipple, initImageClipReveal, initPricingCountdown,   // Sprint 56
    initHeroGradientRing, initKeyboardNav, initDynamicThemeColor,     // Sprint 57
    initPageLeaveGreeting, initScrollColorShift, initInputTypingIndicator, // Sprint 58
    initLivePreviewPanel, initScrollNextHint, initHoverCardLightBeam,     // Sprint 59
    initHeroTextShadowMouse, initScrollMomentumDot, initCtaWaveHover,    // Sprint 60
    initHeroSubtitleUnderline, initSectionDimmer, initPricePingPulse,   // Sprint 61
    initDotGridBg, initTagCloudHover, initSectionEntrySheen,           // Sprint 62
    initNavHoverScale, initScrollBlobTrack, initScrollActiveBorder,    // Sprint 63
    initBlobCursorBlend, initSectionWatermark, initNavMorphPill,       // Sprint 64
    initBorderBeamBtn, initScrollRippleSection, initStatGlowReveal,    // Sprint 65
    initCharWaveReveal, initBtnFillHover, initProgressiveTextReveal,   // Sprint 66
    initMosaicImgReveal, initHeroWordCycle, initCardPeelCorner,        // Sprint 67
    initHoverCharRepel, initScaleReveal, initAttentionPulse,           // Sprint 68
    initBlobMorphHero, initScrollTimelineBar, initRainbowTextHue,      // Sprint 69
    initDepthParallaxLayers, initTextStrokeReveal, initSectionHoverGlow, // Sprint 70
    initCursorTextLabel, initSplitDualReveal, initScrollFloodFill,      // Sprint 71
    initNeonLinkUnderline, initScrollRevealRotate, initVelocitySkew,   // Sprint 72
    initGridDiagonalReveal, initCardHoverDepth, initScrollMeter,       // Sprint 73
    initHeroScanline, initClipRevealSlide, initHighlightTextMark,      // Sprint 74
    initSpringClickEffect, initScrollTextParallax, initGlobalFocusGlow, // Sprint 75
    initSVGPathDraw, initPerspectiveReveal, initTooltipHover,          // Sprint 76
    initScrollElevation, initFeatureIconPulse, initGlowHoverText,      // Sprint 77
    initRadialReveal, initLazyImageFade, initScrollFogEffect,          // Sprint 78
    initMagneticButton, initCounterAnimation, initCard3DTilt,          // Sprint 79
    initTypingEffect, initScrollProgressCounter, initAmbientGlow,      // Sprint 80
    initStaggerListReveal, initHoverShimmer, initScrollSnapDots,       // Sprint 81
    initParallaxHeroText, initCardFlipReveal, initScrollHueShift,     // Sprint 82
    initNoiseTextureOverlay, initBtnRipple, initHeroScrollBlur,       // Sprint 83
    initFloatingLabelInput, initFadeUpReveal, initCursorTrail,        // Sprint 84
    initTextScrambleHover, initBtnBorderDraw, initScrollBandReveal,   // Sprint 85
    initSpotlightHover, initScrollInkBlot, initWordPopIn,             // Sprint 86
    initCardShadowDepth, initScrollColorBand, initPulseBadge,         // Sprint 87
    initGlitchTextHover, initScrollZoomSection, initBtnLiquidFill,    // Sprint 88
    initAuroraBgSection, initUnderlineMorph, initScrollScaleText,     // Sprint 89
    initCardStackHover, initParticleBurst, initSectionEdgeGlow,       // Sprint 90
    initTextRevealMask, initHoverBorderGlow, initScrollOpacityFade,   // Sprint 91
    initHeroGridLines, initBtnConfetti, initScrollSlideFromSide,      // Sprint 92
    initHoverColorShift, initScrollDepthBlur, initBtnShake,           // Sprint 93
    initFloatingActionBtn, initDotPatternBg, initHoverScaleIcon,      // Sprint 94
    initSectionDividerWave, initScrollProgressRing, initTextHighlightSweep, // Sprint 95
    initHoverGlowTrail, initScrollLetterSpacingMorph, initBtnElasticBounce, // Sprint 96
    initMorphingBlob, initScrollParallaxCards, initTextSplitReveal,         // Sprint 97
    initCursorSpotlight, initScrollClipReveal, initHoverBorderTrace,        // Sprint 98
    initScrollRevealScale, initHoverTilt3D, initNeonLineDraw,               // Sprint 99
    initCinematicScrollWipe, initHeroParticleBurst, initCascadeReveal,      // Sprint 100
    initScrollFadeBlur, initHoverColorPop, initBtnGlowPulse,               // Sprint 101
    initScrollSkewEntry, initImageParallaxLayer, initHoverUnderlineExpand,  // Sprint 102
    initScrollRotateIn, initHoverShadowLift, initTextGradientShift,         // Sprint 103
    initScrollFlipReveal, initHoverIconSpin,                                // Sprint 104
    initScrollStaggerGrid, initHoverCardShimmer, initSectionCountUp,        // Sprint 105
    initScrollZoomFade, initHoverBorderGlowPulse, initTypewriterCursor,     // Sprint 106
    initScrollWaveReveal, initHoverFloatingLabel, initBtnMagneticPull,      // Sprint 107
    initScrollBounceIn, initHoverTextOutline, initSectionNoiseLayer,        // Sprint 108
    initScrollPendulumSwing, initHoverNeonBadge,                            // Sprint 109
    initScrollDoorOpen, initHoverCardDepthRing, initTextShimmerWave,        // Sprint 110
    initScrollAccordionReveal, initHoverGlowIconRing,                       // Sprint 111
    initScrollSplitWipe, initHoverCardOutlineDraw,                          // Sprint 112
    initScrollTypewriterReveal, initHoverFillSweep,                         // Sprint 113
    initScrollZoomBlurReveal, initHoverTextPop,                             // Sprint 114
    initScrollSlideUpFade, initHoverCardGlowBorder, initTextRevealMaskV2,   // Sprint 115
    initScrollElasticEntry, initHoverRainbowBorder,                         // Sprint 116
    initScrollOrbitReveal, initHoverInkSplatter,                            // Sprint 117
    initScrollPendulumEntry, initHoverGlowTrailV2,                          // Sprint 118
    initScrollShutterReveal, initHoverMagneticText,                         // Sprint 119
    initScrollPrismSplit, initHoverDepthShadow,                             // Sprint 120
    initScrollLensZoom, initHoverSpotlight,                                 // Sprint 121
    initScrollTypewriterV2, initHoverColorShift,                            // Sprint 122
    initScrollCurtainLift, initHoverBorderDash,                             // Sprint 123
    initScrollWaveText, initHoverNeonGlow,                                   // Sprint 124
    initScrollStackReveal, initHoverShimmerBorder,                          // Sprint 125
    initScrollMorphPath, initHoverLiquidBtn,                                // Sprint 126
    initScrollFanCards, initHoverRippleExpand,                              // Sprint 127
    initScrollGlitchEntry, initHoverChromaticAberration,                    // Sprint 128
    initScrollAccordionStagger, initHoverGlowIconRingV2,                    // Sprint 129
    initScrollTiltCard, initHoverBorderBeam,                                // Sprint 130
    initScrollRevealCounter, initHoverUnderlineWave,                        // Sprint 131
    initScrollSpringPop, initHoverGradientText,                             // Sprint 132
    initScrollCascadeFade, initHoverIconBounce,                             // Sprint 133
    initScrollZoomBlurIn, initHoverTextScramble,                            // Sprint 134
    initScrollFlipX, initHoverBorderGlowSweep,                              // Sprint 135
    initScrollBlurPanel, initHoverScalePop, initBgCometTrail,               // Sprint 136
    initScrollRevealWords, initHoverGlowRing, initBgInkWash,                // Sprint 137
    initScrollFadeSlide, initHoverMagneticGlow, initBgAmbientWave,          // Sprint 138
    initScrollCountMorph, initHoverNeonBorderTrail, initBgGridReveal,       // Sprint 139
    initScrollMultiParallax, initHoverSpotlightReveal, initBgAuroraPulse,  // Sprint 140
    initScrollBlurSharp, initHover3DDepthTilt, initBgNoiseTexture,         // Sprint 141
    initScrollStaggerChars, initHoverGlowOrb, initBgScanlineOverlay,       // Sprint 142
    initScrollTextStrokeFill, initHoverMorphBorder, initBgRadialVignette,  // Sprint 143
    initScrollClipSlide, initHoverImageShimmer, initBgGradientDrift,       // Sprint 144
    initScrollElasticScale, initHoverBorderPulse, initBgDepthFog,          // Sprint 145
    initPaymentLinks,                                                     // Payment
    initParticleWord,                                                     // Sprint 152
    initSmsComposer,                                                      // Sprint 151
    initStatsCountUp, initMagneticButtons, initTestimonialsAmbient,       // Sprint 150
    initTestimonialsReveal, initTestimonialCardShine,                     // Sprint 149
    initLiveAvailabilityPing, initTryItDemo, initSonarPing,               // Sprint 148
  ];
  for (const init of inits) {
    try { init(); } catch (err) { console.error(`${init.name} failed:`, err); }
  }

  // ScrollTrigger positions are computed when each trigger is created, but the page
  // keeps shifting afterward: the 300vh #dive video section, late web fonts, and a
  // lot of JS-injected DOM all change layout. Without a refresh, downstream triggers
  // (e.g. the pricing-grid entrance) point at stale scroll positions and never fire —
  // leaving those cards stuck at the GSAP-inline opacity:0. Refresh after the inits
  // build their triggers, and again whenever layout settles.
  const safeRefresh = () => {
    if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
  };
  safeRefresh();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(safeRefresh);
  window.addEventListener('load', safeRefresh);

  // Safety net: base CSS classes like .scroll-zoom-fade set opacity:0/blur/clip-path
  // directly (not just in keyframes), and 145 sprints stacked these on every section,
  // heading, and card. Only one CSS animation wins the cascade; others leave their
  // pre-reveal hidden state stuck. sections also have overflow:hidden which prevents
  // child IO observers from triggering reveals.
  //
  // Two-phase fix preserving all hover effects:
  //   Phase 1 — inline !important styles force visibility immediately (beats base CSS).
  //   Phase 2 — 2 rAFs later, strip the scroll-reveal classes so the element's natural
  //   CSS is visible and hover transitions/transforms/glows work unobstructed.
  (function revealSafetyNet() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Matches both animation-based (scroll-*) and transition-based reveal classes
    // (-reveal, -reveal-elem, -reveal-el suffixes) so cards using CSS transitions
    // are detected by scan() and stripped in Phase 2.
    // img-clip-hidden included so the footer logo (clipped 100%) is unclipped by bypass().
    const SCROLL_RE = /^scroll-|-reveal(-elem|-el)?$|^(clip-slide|elastic-scale|word-wave|stagger-chars|text-stroke-fill|img-clip-hidden)$/;
    const done = new WeakSet();

    // Pre-cache reveal candidates once — avoids querySelectorAll('[class]') on
    // every scroll event and every 600ms interval tick. Pruned as elements resolve.
    let candidates = Array.from(document.querySelectorAll('[class]')).filter(
      el => [...el.classList].some(c => SCROLL_RE.test(c) && !c.includes('--'))
    );

    function isHidden(cs) {
      return parseFloat(cs.opacity) < 0.5
        || cs.visibility === 'hidden'
        || (cs.clipPath !== 'none' && cs.clipPath !== '')
        || cs.filter.includes('blur');
    }

    function bypass(el) {
      if (done.has(el)) return;
      done.add(el);
      // Phase 1: inline !important beats base-class hidden states and running animations
      el.style.setProperty('opacity', '1', 'important');
      el.style.setProperty('clip-path', 'none', 'important');
      el.style.setProperty('filter', 'none', 'important');
      el.style.setProperty('transform', 'none', 'important');
      el.style.setProperty('visibility', 'visible', 'important');
      el.style.setProperty('animation', 'none', 'important');
      // Phase 2: strip scroll-reveal classes so element is naturally visible
      // and hover effects (transitions, transforms, glow filters) work again.
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const scrollBases = new Set([...el.classList].filter(c => SCROLL_RE.test(c) && !c.includes('--')));
        [...el.classList].forEach(c => {
          if (scrollBases.has(c)) { el.classList.remove(c); return; }
          const base = c.replace(/--(active|in|visible)$/, '');
          if (scrollBases.has(base)) el.classList.remove(c);
        });
        el.style.removeProperty('opacity');
        el.style.removeProperty('clip-path');
        el.style.removeProperty('filter');
        el.style.removeProperty('transform');
        el.style.removeProperty('visibility');
        el.style.removeProperty('animation');
      }));
    }

    function scan(inViewOnly) {
      const vh = window.innerHeight;
      // Iterate pre-cached candidates; prune bypassed ones so the list shrinks over time.
      candidates = candidates.filter(el => {
        if (done.has(el)) return false;
        if (inViewOnly) {
          const r = el.getBoundingClientRect();
          if (r.width < 1 || r.height < 1) return true;
          if (r.top > vh + 120 || r.bottom < -120) return true;
        }
        if (isHidden(getComputedStyle(el))) bypass(el);
        return !done.has(el);
      });
    }

    let ticking = false;
    const onScroll = () => {
      if (!candidates.length) { window.removeEventListener('scroll', onScroll); return; }
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { scan(true); ticking = false; });
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    setTimeout(() => scan(true), 400);
    const sweepId = setInterval(() => scan(true), 600);
    setTimeout(() => { scan(false); clearInterval(sweepId); }, 3000);
    setTimeout(() => {
      scan(false);
      window.removeEventListener('scroll', onScroll); // all done — stop listening
    }, 6000);
  }());
});

/* Sprint 53 — neon flicker text, card stack depth, scroll progress ring ------ */

function initNeonFlickerText() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const targets = document.querySelectorAll('.count-num, .hero-price, .bento-card .section-kicker');
  if (!targets.length) return;
  targets.forEach((el) => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(el);
        el.classList.add('neon-flicker');
        el.addEventListener('animationend', () => el.classList.remove('neon-flicker'), { once: true });
      });
    }, { threshold: 0.6 });
    io.observe(el);
  });
}

function initCardStackDepth() {
  const grid = document.querySelector('.pricing-grid, .pricing-cards');
  if (!grid) return;
  const cards = Array.from(grid.querySelectorAll('.pricing-card'));
  if (cards.length < 2) return;
  grid.style.perspective = '1200px';
  cards.forEach((card) => {
    card.addEventListener('mouseenter', () => {
      cards.forEach((c) => { if (c !== card) c.classList.add('stack-back'); });
    });
    card.addEventListener('mouseleave', () => {
      cards.forEach((c) => c.classList.remove('stack-back'));
    });
  });
}

function initScrollProgressRing() {
  const btn = document.getElementById('scroll-top') || document.querySelector('.scroll-to-top, .back-to-top, [data-scroll-top]');
  if (!btn) return;
  const SIZE = 44, R = 18;
  const CIRC = 2 * Math.PI * R;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', SIZE);
  svg.setAttribute('height', SIZE);
  svg.setAttribute('viewBox', `0 0 ${SIZE} ${SIZE}`);
  svg.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:1;';
  svg.setAttribute('aria-hidden', 'true');
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', SIZE / 2);
  circle.setAttribute('cy', SIZE / 2);
  circle.setAttribute('r', R);
  circle.setAttribute('fill', 'none');
  circle.setAttribute('stroke', 'rgba(0,212,200,0.8)');
  circle.setAttribute('stroke-width', '2.5');
  circle.setAttribute('stroke-dasharray', CIRC);
  circle.setAttribute('stroke-dashoffset', CIRC);
  circle.setAttribute('stroke-linecap', 'round');
  circle.style.transform = 'rotate(-90deg)';
  circle.style.transformOrigin = '50% 50%';
  svg.appendChild(circle);
  btn.style.position = 'relative';
  btn.appendChild(svg);
  const update = () => {
    const doc = document.documentElement;
    const pct = doc.scrollTop / (doc.scrollHeight - doc.clientHeight) || 0;
    circle.setAttribute('stroke-dashoffset', CIRC * (1 - Math.min(pct, 1)));
  };
  window.addEventListener('scroll', update, { passive: true });
  update();
}

/* Sprint 54 — word reveal wave, card glint sweep, stagger list reveal --------- */

function initWordRevealWave() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const paras = document.querySelectorAll('.section-body p, .hero-subtitle, .about-body p');
  if (!paras.length) return;
  paras.forEach((p) => {
    const words = p.textContent.trim().split(/\s+/);
    if (words.length < 3) return;
    p.innerHTML = words.map((w, i) =>
      `<span class="word-wave" style="--wi:${i}">${w}</span>`
    ).join(' ');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(p);
        p.querySelectorAll('.word-wave').forEach((span) => span.classList.add('word-wave--in'));
      });
    }, { threshold: 0.3 });
    io.observe(p);
  });
}

function initCardGlintSweep() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  document.querySelectorAll('.bento-card, .pricing-card').forEach((card) => {
    const glint = document.createElement('div');
    glint.className = 'card-glint';
    glint.setAttribute('aria-hidden', 'true');
    card.appendChild(glint);
    card.addEventListener('mouseenter', () => {
      glint.classList.remove('card-glint--active');
      void glint.offsetWidth;
      glint.classList.add('card-glint--active');
    });
    glint.addEventListener('animationend', () => glint.classList.remove('card-glint--active'));
  });
}

function initStaggerListReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const lists = document.querySelectorAll('.contact-list, .format-tags, .service-list');
  if (!lists.length) return;
  lists.forEach((list) => {
    const items = list.querySelectorAll('li, .format-tag, .service-tag');
    if (!items.length) return;
    items.forEach((item, i) => item.style.setProperty('--li', i));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(list);
        items.forEach((item) => item.classList.add('stagger-slide-in'));
      });
    }, { threshold: 0.25 });
    io.observe(list);
  });
}

/* Sprint 55 — section line accent, footer wave, mouse glow follower ---------- */

function initSectionLineAccent() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('.section, .ba-section').forEach((section) => {
    const line = document.createElement('div');
    line.className = 'section-line-accent';
    line.setAttribute('aria-hidden', 'true');
    const kicker = section.querySelector('.section-kicker');
    if (kicker) {
      kicker.parentNode.insertBefore(line, kicker);
    } else {
      section.insertBefore(line, section.firstChild);
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(section);
        line.classList.add('section-line-accent--in');
      });
    }, { threshold: 0.2 });
    io.observe(section);
  });
}

function initFooterWave() {
  const footer = document.querySelector('footer, .footer, .site-footer');
  if (!footer) return;
  const wrap = document.createElement('div');
  wrap.className = 'footer-wave-wrap';
  wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML = '<svg class="footer-wave-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2880 48" preserveAspectRatio="none"><path d="M0,24 C240,48 480,0 720,24 C960,48 1200,0 1440,24 C1680,48 1920,0 2160,24 C2400,48 2640,0 2880,24 L2880,48 L0,48 Z" fill="rgba(0,212,200,0.055)"/></svg>';
  footer.insertBefore(wrap, footer.firstChild);
}

function initMouseGlowFollower() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const glow = document.createElement('div');
  glow.className = 'mouse-glow-follower';
  glow.setAttribute('aria-hidden', 'true');
  document.body.appendChild(glow);
  let mx = window.innerWidth / 2, my = window.innerHeight / 2;
  let cx = mx, cy = my;
  document.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
  const tick = () => {
    cx += (mx - cx) * 0.08;
    cy += (my - cy) * 0.08;
    glow.style.transform = `translate(${Math.round(cx)}px,${Math.round(cy)}px)`;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* Sprint 56 — page click ripple, image clip reveal, pricing countdown --------- */

function initPageClickRipple() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.addEventListener('click', (e) => {
    const ring = document.createElement('div');
    ring.className = 'page-click-ripple';
    ring.style.cssText = `left:${e.clientX}px;top:${e.clientY}px;`;
    ring.setAttribute('aria-hidden', 'true');
    document.body.appendChild(ring);
    ring.addEventListener('animationend', () => ring.remove(), { once: true });
  });
}

function initImageClipReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const imgs = document.querySelectorAll('img:not(.ba-img):not([data-no-reveal])');
  if (!imgs.length) return;
  imgs.forEach((img) => {
    img.classList.add('img-clip-hidden');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(img);
        img.classList.add('img-clip-reveal');
        img.addEventListener('transitionend', () => img.classList.remove('img-clip-hidden', 'img-clip-reveal'), { once: true });
      });
    }, { threshold: 0.15 });
    io.observe(img);
  });
}

function initPricingCountdown() {
  const pricing = document.querySelector('.pricing-section, .pricing, #pricing');
  if (!pricing) return;
  const anchor = pricing.querySelector('.pricing-grid, .pricing-cards') || pricing;
  const wrap = document.createElement('div');
  wrap.className = 'pricing-countdown';
  wrap.setAttribute('aria-live', 'off');
  anchor.insertAdjacentElement('afterend', wrap);
  const render = () => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const rem = Math.max(0, midnight - now);
    const h = String(Math.floor(rem / 3600000)).padStart(2, '0');
    const m = String(Math.floor((rem % 3600000) / 60000)).padStart(2, '0');
    const s = String(Math.floor((rem % 60000) / 1000)).padStart(2, '0');
    wrap.innerHTML = `<span class="cd-label">Offer resets in</span><span class="cd-time"><span class="cd-seg">${h}</span><span class="cd-sep">:</span><span class="cd-seg">${m}</span><span class="cd-sep">:</span><span class="cd-seg">${s}</span></span>`;
  };
  render();
  setInterval(render, 1000);
}

/* Sprint 57 — hero gradient ring, keyboard nav, dynamic theme color ----------- */

function initHeroGradientRing() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const hero = document.querySelector('.hero, .hero-section, #hero');
  if (!hero) return;
  const ring = document.createElement('div');
  ring.className = 'hero-gradient-ring';
  ring.setAttribute('aria-hidden', 'true');
  hero.appendChild(ring);
}

function initKeyboardNav() {
  const sections = Array.from(document.querySelectorAll('.section, .hero, .ba-section'));
  if (sections.length < 2) return;
  let current = 0;
  const showToast = (section) => {
    const old = document.querySelector('.section-nav-toast');
    if (old) old.remove();
    const label = (section.querySelector('.section-kicker, h1, h2')?.textContent || '').trim().slice(0, 28);
    if (!label) return;
    const toast = document.createElement('div');
    toast.className = 'section-nav-toast';
    toast.textContent = label;
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('section-nav-toast--in'));
    setTimeout(() => {
      toast.classList.remove('section-nav-toast--in');
      toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, 1800);
  };
  const go = (idx) => {
    current = Math.max(0, Math.min(idx, sections.length - 1));
    sections[current].scrollIntoView({ behavior: 'smooth', block: 'start' });
    showToast(sections[current]);
  };
  document.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
    if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); go(current + 1); }
    if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); go(current - 1); }
  });
  sections.forEach((section, i) => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) current = i; });
    }, { threshold: 0.5 });
    io.observe(section);
  });
}

function initDynamicThemeColor() {
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  const palette = ['#0a0a0f', '#0a0f0e', '#08090f', '#0d0a14', '#080d0d'];
  const sections = document.querySelectorAll('.section, .hero, .ba-section');
  sections.forEach((section, i) => {
    const color = palette[i % palette.length];
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) meta.setAttribute('content', color); });
    }, { threshold: 0.4 });
    io.observe(section);
  });
  meta.setAttribute('content', palette[0]);
}

/* Sprint 58 — page leave greeting, scroll color shift, input typing tip ------- */

function initPageLeaveGreeting() {
  const original = document.title;
  document.addEventListener('visibilitychange', () => {
    document.title = document.hidden ? `👋 We'll be here — ${original}` : original;
  });
}

function initScrollColorShift() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const overlay = document.createElement('div');
  overlay.className = 'scroll-color-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  document.body.appendChild(overlay);
  let raf = 0;
  const update = () => {
    const pct = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight) || 0;
    overlay.style.setProperty('--sc-hue', Math.round(pct * 120));
  };
  window.addEventListener('scroll', () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(update);
  }, { passive: true });
  update();
}

function initInputTypingIndicator() {
  const form = document.querySelector('.contact-form, form');
  if (!form) return;
  form.querySelectorAll('input[type="text"], input[type="email"], textarea').forEach((input) => {
    const tip = document.createElement('span');
    tip.className = 'input-tip';
    tip.setAttribute('aria-live', 'polite');
    input.insertAdjacentElement('afterend', tip);
    input.addEventListener('input', () => {
      const len = input.value.trim().length;
      if (len === 0)  { tip.textContent = ''; tip.dataset.state = ''; }
      else if (len < 3)  { tip.textContent = 'Keep going…'; tip.dataset.state = 'weak'; }
      else if (len < 10) { tip.textContent = 'Almost there'; tip.dataset.state = 'ok'; }
      else               { tip.textContent = 'Looking good ✓'; tip.dataset.state = 'good'; }
    });
  });
}

/* Sprint 59 — live textarea preview, scroll-next hint, card light beam ------- */

function initLivePreviewPanel() {
  const textarea = document.querySelector('textarea');
  if (!textarea) return;
  const panel = document.createElement('div');
  panel.className = 'live-preview-panel';
  panel.setAttribute('aria-hidden', 'true');
  panel.innerHTML = '<span class="live-preview-label">Preview</span><p class="live-preview-text"></p>';
  textarea.parentNode.insertBefore(panel, textarea.nextSibling);
  const previewText = panel.querySelector('.live-preview-text');
  textarea.addEventListener('input', () => {
    const val = textarea.value.trim();
    previewText.textContent = val;
    panel.classList.toggle('live-preview-panel--visible', val.length > 0);
  });
}

function initScrollNextHint() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const sections = Array.from(document.querySelectorAll('.section, .hero, .ba-section'));
  if (sections.length < 2) return;
  sections.slice(0, -1).forEach((section, i) => {
    const hint = document.createElement('div');
    hint.className = 'scroll-next-hint';
    hint.textContent = 'Scroll to continue';
    hint.setAttribute('aria-hidden', 'true');
    section.appendChild(hint);
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        hint.classList.add('scroll-next-hint--show');
        setTimeout(() => hint.classList.remove('scroll-next-hint--show'), 2200);
      });
    }, { threshold: 0.7 });
    io.observe(section);
  });
}

function initHoverCardLightBeam() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  document.querySelectorAll('.bento-card').forEach((card) => {
    const beam = document.createElement('div');
    beam.className = 'card-light-beam';
    beam.setAttribute('aria-hidden', 'true');
    card.appendChild(beam);
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--bx', `${((e.clientX - r.left) / r.width * 100).toFixed(1)}%`);
      card.style.setProperty('--by', `${((e.clientY - r.top) / r.height * 100).toFixed(1)}%`);
    });
  });
}

/* Sprint 60 — hero text-shadow mouse parallax, momentum dot, CTA wave hover -- */

function initHeroTextShadowMouse() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const headline = document.querySelector('.hero h1, .hero-title, .hero-headline');
  if (!headline) return;
  const cx = () => window.innerWidth / 2;
  const cy = () => window.innerHeight / 2;
  window.addEventListener('mousemove', (e) => {
    const dx = ((e.clientX - cx()) / cx()) * 7;
    const dy = ((e.clientY - cy()) / cy()) * 5;
    headline.style.textShadow = [
      `${-dx}px ${-dy}px 18px rgba(0,212,200,0.22)`,
      `${dx * 0.4}px ${dy * 0.4}px 36px rgba(127,90,240,0.12)`,
    ].join(', ');
  }, { passive: true });
}

function initScrollMomentumDot() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const dot = document.createElement('div');
  dot.className = 'scroll-momentum-dot';
  dot.setAttribute('aria-hidden', 'true');
  document.body.appendChild(dot);
  let lastY = window.scrollY;
  let hideTimer = 0;
  window.addEventListener('scroll', () => {
    const speed = Math.abs(window.scrollY - lastY);
    lastY = window.scrollY;
    const scale = Math.min(1 + speed * 0.05, 2.8).toFixed(2);
    dot.style.transform = `scale(${scale})`;
    dot.classList.add('scroll-momentum-dot--active');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      dot.classList.remove('scroll-momentum-dot--active');
      dot.style.transform = 'scale(1)';
    }, 200);
  }, { passive: true });
}

function initCtaWaveHover() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('.btn-primary, .btn-cta, .hero-cta .btn, .cta-btn').forEach((btn) => {
    if (!btn.classList.contains('cta-wave')) {
      btn.classList.add('cta-wave');
    }
  });
}

/* Sprint 61 — hero subtitle underline, section dimmer, price ping pulse ------- */

function initHeroSubtitleUnderline() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const subtitle = document.querySelector('.hero-subtitle, .hero-sub, .hero .subtitle');
  if (!subtitle) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(subtitle);
      subtitle.classList.add('hero-subtitle--underlined');
    });
  }, { threshold: 0.5 });
  io.observe(subtitle);
}

function initSectionDimmer() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const sections = document.querySelectorAll('.section, .ba-section');
  if (sections.length < 2) return;
  sections.forEach((section) => {
    section.classList.add('section-dimmable');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        section.classList.toggle('section-dimmable--active', e.isIntersecting);
      });
    }, { threshold: 0.35 });
    io.observe(section);
  });
}

function initPricePingPulse() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const prices = document.querySelectorAll('.price, .pricing-amount, .price-value, .price-num');
  if (!prices.length) return;
  const ping = (el) => {
    el.classList.remove('price-ping--active');
    void el.offsetWidth;
    el.classList.add('price-ping--active');
    el.addEventListener('animationend', () => el.classList.remove('price-ping--active'), { once: true });
  };
  prices.forEach((price, i) => {
    price.classList.add('price-ping');
    setTimeout(() => ping(price), 2000 + i * 350);
    setInterval(() => ping(price), 5000 + i * 350);
  });
}

/* Sprint 62 — dot grid bg, tag cloud hover push, section entry sheen --------- */

function initDotGridBg() {
  const grid = document.createElement('div');
  grid.className = 'dot-grid-overlay';
  grid.setAttribute('aria-hidden', 'true');
  document.body.insertBefore(grid, document.body.firstChild);
}

function initTagCloudHover() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  document.querySelectorAll('.format-tags, .service-tags, .tag-group').forEach((container) => {
    const tags = Array.from(container.querySelectorAll('.format-tag, .tag, li'));
    if (tags.length < 2) return;
    container.addEventListener('mousemove', (e) => {
      const cr = container.getBoundingClientRect();
      const mx = e.clientX - cr.left;
      const my = e.clientY - cr.top;
      tags.forEach((tag) => {
        const tr = tag.getBoundingClientRect();
        const tx = (tr.left - cr.left) + tr.width / 2;
        const ty = (tr.top - cr.top) + tr.height / 2;
        const dx = tx - mx, dy = ty - my;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = Math.max(0, 55 - dist) / 55;
        tag.style.transform = `translate(${(dx / dist) * force * 10}px, ${(dy / dist) * force * 7}px)`;
      });
    });
    container.addEventListener('mouseleave', () => {
      tags.forEach((tag) => { tag.style.transform = ''; });
    });
  });
}

function initSectionEntrySheen() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('.section, .ba-section').forEach((section) => {
    const sheen = document.createElement('div');
    sheen.className = 'section-entry-sheen';
    sheen.setAttribute('aria-hidden', 'true');
    section.appendChild(sheen);
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(section);
        sheen.classList.add('section-entry-sheen--active');
        sheen.addEventListener('animationend', () => sheen.remove(), { once: true });
      });
    }, { threshold: 0.15 });
    io.observe(section);
  });
}

/* Sprint 63 — nav hover scale, scroll blob tracker, active section border --- */

function initNavHoverScale() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  const nav = document.querySelector('nav, .nav, .navbar');
  if (!nav) return;
  const links = Array.from(nav.querySelectorAll('a, .nav-link'));
  if (links.length < 2) return;
  links.forEach((link) => {
    link.addEventListener('mouseenter', () => {
      links.forEach((l) => {
        l.style.transform = l === link ? 'scale(1.08)' : 'scale(0.93)';
        l.style.opacity = l === link ? '1' : '0.6';
      });
    });
    link.addEventListener('mouseleave', () => {
      links.forEach((l) => { l.style.transform = ''; l.style.opacity = ''; });
    });
  });
}

function initScrollBlobTrack() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const blob = document.createElement('div');
  blob.className = 'scroll-blob-track';
  blob.setAttribute('aria-hidden', 'true');
  document.body.appendChild(blob);
  let cy = 0;
  const update = () => {
    const pct = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight) || 0;
    const targetY = pct * (window.innerHeight * 0.6) - window.innerHeight * 0.3;
    cy += (targetY - cy) * 0.06;
    blob.style.transform = `translateY(${Math.round(cy)}px)`;
    requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

function initScrollActiveBorder() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia('(max-width: 767px)').matches) return;
  document.querySelectorAll('.section, .ba-section').forEach((section) => {
    section.classList.add('active-border-section');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        section.classList.toggle('active-border-section--active', e.isIntersecting);
      });
    }, { threshold: 0.4 });
    io.observe(section);
  });
}

/* Sprint 64 — blob cursor blend, section watermark, nav morph pill --------- */

function initBlobCursorBlend() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const blob = document.createElement('div');
  blob.className = 'cursor-blend-blob';
  blob.setAttribute('aria-hidden', 'true');
  document.body.appendChild(blob);
  let mx = -300, my = -300, cx = -300, cy = -300;
  document.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; });
  const tick = () => {
    cx += (mx - cx) * 0.1;
    cy += (my - cy) * 0.1;
    blob.style.transform = `translate(${Math.round(cx)}px, ${Math.round(cy)}px) translate(-50%, -50%)`;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function initSectionWatermark() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const marks = [
    ['.section--about, [data-section="about"]', 'PROVEN'],
    ['.section--services, [data-section="services"]', 'LOCAL'],
    ['.section--pricing, [data-section="pricing"]', 'VALUE'],
    ['.section--contact, [data-section="contact"]', 'FAST'],
  ];
  marks.forEach(([sel, word]) => {
    const section = document.querySelector(sel);
    if (!section) return;
    const mark = document.createElement('div');
    mark.className = 'section-watermark';
    mark.setAttribute('aria-hidden', 'true');
    mark.textContent = word;
    section.style.position = section.style.position || 'relative';
    section.appendChild(mark);
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(section);
        mark.classList.add('section-watermark--in');
      });
    }, { threshold: 0.25 });
    io.observe(section);
  });
}

function initNavMorphPill() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const nav = document.querySelector('nav, .nav, .navbar');
  if (!nav) return;
  const links = Array.from(nav.querySelectorAll('a[href^="#"], a.nav-link'));
  if (links.length < 2) return;
  const pill = document.createElement('div');
  pill.className = 'nav-morph-pill';
  pill.setAttribute('aria-hidden', 'true');
  nav.style.position = nav.style.position || 'relative';
  nav.appendChild(pill);
  const moveTo = (link) => {
    const nr = nav.getBoundingClientRect();
    const lr = link.getBoundingClientRect();
    pill.style.width = `${lr.width + 16}px`;
    pill.style.height = `${lr.height + 8}px`;
    pill.style.left = `${lr.left - nr.left - 8}px`;
    pill.style.top = `${lr.top - nr.top - 4}px`;
    pill.style.opacity = '1';
  };
  links.forEach((link) => {
    link.addEventListener('mouseenter', () => moveTo(link));
  });
  nav.addEventListener('mouseleave', () => { pill.style.opacity = '0'; });
}

/* Sprint 65 — border beam btn, scroll ripple, stat glow reveal ------------- */

function initBorderBeamBtn() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('.btn-primary, .cta-btn, .hero-cta').forEach((btn) => {
    btn.classList.add('border-beam-btn');
  });
}

function initScrollRippleSection() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('.section h2, .ba-section h2').forEach((heading) => {
    const parent = heading.parentElement;
    if (!parent) return;
    const savedPos = getComputedStyle(parent).position;
    if (savedPos === 'static') parent.style.position = 'relative';
    const rippleWrap = document.createElement('div');
    rippleWrap.className = 'scroll-ripple-wrap';
    rippleWrap.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 3; i++) {
      const ring = document.createElement('div');
      ring.className = 'scroll-ripple-ring';
      ring.style.setProperty('--ri', i);
      rippleWrap.appendChild(ring);
    }
    parent.insertBefore(rippleWrap, heading);
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(heading);
        rippleWrap.classList.add('scroll-ripple-wrap--fire');
        rippleWrap.addEventListener('animationend', () => rippleWrap.remove(), { once: true });
      });
    }, { threshold: 0.3 });
    io.observe(heading);
  });
}

function initStatGlowReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const stats = document.querySelectorAll('.hero-stat, .trust-stat, .stat-number, [data-stat]');
  if (!stats.length) return;
  stats.forEach((stat, i) => {
    stat.style.setProperty('--si', i);
    stat.classList.add('stat-glow-reveal');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(stat);
        stat.classList.add('stat-glow-reveal--in');
      });
    }, { threshold: 0.5 });
    io.observe(stat);
  });
}

/* Sprint 66 — char wave reveal, btn fill hover, progressive text reveal ----- */

function initCharWaveReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('.section h2, .ba-section h2, .section h3').forEach((el) => {
    if (el.querySelector('span') || el.dataset.charWave) return;
    el.dataset.charWave = '1';
    const text = el.textContent;
    el.innerHTML = text.split('').map((ch, i) =>
      `<span class="char-wave-char" style="--ci:${i}" aria-hidden="true">${ch === ' ' ? '&nbsp;' : ch}</span>`
    ).join('');
    el.setAttribute('aria-label', text);
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(el);
        el.classList.add('char-wave-reveal--in');
      });
    }, { threshold: 0.4 });
    io.observe(el);
  });
}

function initBtnFillHover() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  document.querySelectorAll('.btn-secondary, .btn-outline, a.btn:not(.btn-primary)').forEach((btn) => {
    btn.classList.add('btn-fill-hover');
  });
}

function initProgressiveTextReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('.section p, .ba-section p').forEach((p) => {
    if (p.dataset.progReveal || p.children.length) return;
    p.dataset.progReveal = '1';
    const words = p.textContent.trim().split(/\s+/);
    p.innerHTML = words.map((w, i) =>
      `<span class="prog-word" style="--wi:${i}">${w}</span>`
    ).join(' ');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(p);
        p.classList.add('prog-text-reveal--in');
      });
    }, { threshold: 0.2 });
    io.observe(p);
  });
}

/* Sprint 67 — mosaic image reveal, hero word cycle, card peel corner ------- */

function initMosaicImgReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('.section img, .ba-section img, .about-img, .showcase-img').forEach((img) => {
    if (img.dataset.mosaic) return;
    img.dataset.mosaic = '1';
    const wrap = document.createElement('div');
    wrap.className = 'mosaic-wrap';
    img.parentNode.insertBefore(wrap, img);
    wrap.appendChild(img);
    const cols = 4, rows = 4;
    for (let i = 0; i < cols * rows; i++) {
      const cell = document.createElement('div');
      cell.className = 'mosaic-cell';
      cell.style.cssText = `left:${(i % cols) * 25}%;top:${Math.floor(i / cols) * 25}%;width:25%;height:25%;--mi:${i};`;
      wrap.appendChild(cell);
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(img);
        wrap.classList.add('mosaic-wrap--reveal');
      });
    }, { threshold: 0.2 });
    io.observe(img);
  });
}

function initHeroWordCycle() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const target = document.querySelector('[data-word-cycle], .hero-word-cycle');
  if (!target) return;
  const words = (target.dataset.words || 'Fast,Local,Trusted,Proven').split(',');
  let idx = 0;
  const type = (word) => {
    target.textContent = '';
    let ci = 0;
    const addChar = () => {
      if (ci < word.length) {
        target.textContent += word[ci++];
        setTimeout(addChar, 80);
      } else {
        setTimeout(() => del(word), 1800);
      }
    };
    addChar();
  };
  const del = (word) => {
    let len = word.length;
    const removeChar = () => {
      if (len > 0) {
        target.textContent = word.slice(0, --len);
        setTimeout(removeChar, 50);
      } else {
        idx = (idx + 1) % words.length;
        setTimeout(() => type(words[idx]), 300);
      }
    };
    removeChar();
  };
  type(words[idx]);
}

function initCardPeelCorner() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  document.querySelectorAll('.bento-card, .pricing-card, .service-card').forEach((card) => {
    card.classList.add('card-peel');
  });
}

/* Sprint 68 — hover char repel, scale reveal, attention pulse -------------- */

function initHoverCharRepel() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('.section h2[data-char-wave], .ba-section h2[data-char-wave]').forEach((el) => {
    const chars = Array.from(el.querySelectorAll('.char-wave-char'));
    if (!chars.length) return;
    el.addEventListener('mousemove', (e) => {
      chars.forEach((ch) => {
        const r = ch.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dx = e.clientX - cx, dy = e.clientY - cy;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = Math.max(0, 40 - dist) / 40;
        const px = -(dx / dist) * force * 8;
        const py = -(dy / dist) * force * 5;
        ch.style.transform = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px)`;
      });
    });
    el.addEventListener('mouseleave', () => {
      chars.forEach((ch) => { ch.style.transform = ''; });
    });
  });
}

function initScaleReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('.scale-reveal, .bento-card, .pricing-card').forEach((el) => {
    if (el.dataset.scaleReveal) return;
    el.dataset.scaleReveal = '1';
    el.classList.add('scale-reveal-elem');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(el);
        el.classList.add('scale-reveal-elem--in');
      });
    }, { threshold: 0.15 });
    io.observe(el);
  });
}

function initAttentionPulse() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const targets = document.querySelectorAll('.btn-primary, .hero-cta, .price-total, .trust-number');
  if (!targets.length) return;
  targets.forEach((el, i) => {
    el.style.setProperty('--api', i);
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(el);
        el.classList.add('attention-pulse');
        el.addEventListener('animationend', () => el.classList.remove('attention-pulse'), { once: true });
      });
    }, { threshold: 0.7 });
    io.observe(el);
  });
}

/* Sprint 69 — blob morph hero, scroll timeline bar, rainbow text hue ------- */

function initBlobMorphHero() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const hero = document.querySelector('.hero, .hero-section, [data-section="hero"]');
  if (!hero) return;
  const blob = document.createElement('div');
  blob.className = 'hero-blob-morph';
  blob.setAttribute('aria-hidden', 'true');
  const pos = getComputedStyle(hero).position;
  if (pos === 'static') hero.style.position = 'relative';
  hero.insertBefore(blob, hero.firstChild);
}

function initScrollTimelineBar() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia('(max-width: 1023px)').matches) return;
  const sections = Array.from(document.querySelectorAll('.section, .ba-section'));
  if (sections.length < 2) return;
  const bar = document.createElement('nav');
  bar.className = 'scroll-timeline-bar';
  bar.setAttribute('aria-hidden', 'true');
  const line = document.createElement('div');
  line.className = 'scroll-timeline-line';
  bar.appendChild(line);
  const dots = sections.map(() => {
    const dot = document.createElement('div');
    dot.className = 'scroll-timeline-dot';
    bar.appendChild(dot);
    return dot;
  });
  document.body.appendChild(bar);
  const update = () => {
    const mid = window.scrollY + window.innerHeight / 2;
    sections.forEach((sec, i) => {
      const top = sec.getBoundingClientRect().top + window.scrollY;
      const bot = top + sec.offsetHeight;
      dots[i].classList.toggle('scroll-timeline-dot--active', mid >= top && mid < bot);
    });
  };
  window.addEventListener('scroll', update, { passive: true });
  update();
}

function initRainbowTextHue() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const targets = document.querySelectorAll('.section-kicker, .hero-badge, .badge, [data-rainbow]');
  if (!targets.length) return;
  const update = () => {
    const pct = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight) || 0;
    const hue = Math.round(pct * 120);
    targets.forEach((el) => { el.style.filter = `hue-rotate(${hue}deg)`; });
  };
  window.addEventListener('scroll', update, { passive: true });
  update();
}

/* Sprint 70 — depth parallax layers, text stroke reveal, section hover glow */

function initDepthParallaxLayers() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const layers = Array.from(document.querySelectorAll('[data-depth]'));
  if (!layers.length) return;
  const update = () => {
    const sy = window.scrollY;
    layers.forEach((el) => {
      const depth = parseFloat(el.dataset.depth) || 0.1;
      el.style.transform = `translateY(${(sy * depth).toFixed(1)}px)`;
    });
  };
  window.addEventListener('scroll', update, { passive: true });
  update();
}

function initTextStrokeReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('.section h2, .ba-section h2').forEach((el) => {
    if (el.dataset.strokeReveal || el.dataset.charWave) return;
    el.dataset.strokeReveal = '1';
    el.classList.add('text-stroke-reveal');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(el);
        el.classList.add('text-stroke-reveal--in');
      });
    }, { threshold: 0.4 });
    io.observe(el);
  });
}

function initSectionHoverGlow() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('.section, .ba-section').forEach((section) => {
    const glow = document.createElement('div');
    glow.className = 'section-hover-glow';
    glow.setAttribute('aria-hidden', 'true');
    const pos = getComputedStyle(section).position;
    if (pos === 'static') section.style.position = 'relative';
    section.insertBefore(glow, section.firstChild);
    section.addEventListener('mousemove', (e) => {
      const r = section.getBoundingClientRect();
      glow.style.setProperty('--gx', `${e.clientX - r.left}px`);
      glow.style.setProperty('--gy', `${e.clientY - r.top}px`);
      glow.style.opacity = '1';
    });
    section.addEventListener('mouseleave', () => { glow.style.opacity = '0'; });
  });
}

/* Sprint 71 — cursor text label, split dual reveal, scroll flood fill ------ */

function initCursorTextLabel() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const label = document.createElement('div');
  label.className = 'cursor-text-label';
  label.setAttribute('aria-hidden', 'true');
  document.body.appendChild(label);
  let lx = 0, ly = 0, cx = 0, cy = 0;
  document.addEventListener('mousemove', (e) => { lx = e.clientX; ly = e.clientY; });
  const tick = () => {
    cx += (lx - cx) * 0.15;
    cy += (ly - cy) * 0.15;
    label.style.transform = `translate(${Math.round(cx)}px, ${Math.round(cy)}px)`;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  const TEXT_MAP = [
    ['.bento-card, .pricing-card, .service-card', 'VIEW'],
    ['img, .before-after, .showcase', 'EXPLORE'],
    ['input, textarea, select', 'TYPE'],
    ['a[href], button, .btn, [role="button"]', 'OPEN'],
  ];
  document.addEventListener('mouseover', (e) => {
    let found = '';
    for (const [sel, text] of TEXT_MAP) {
      if (e.target.closest(sel)) { found = text; break; }
    }
    label.textContent = found;
    label.classList.toggle('cursor-text-label--visible', !!found);
  });
}

function initSplitDualReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('.split-dual-reveal').forEach((el) => {
    const wrap = document.createElement('div');
    wrap.className = 'split-dual-wrap';
    el.parentNode.insertBefore(wrap, el);
    const top = document.createElement('div');
    top.className = 'split-dual-half split-dual-top';
    top.setAttribute('aria-hidden', 'true');
    top.innerHTML = el.outerHTML;
    const bot = document.createElement('div');
    bot.className = 'split-dual-half split-dual-bot';
    bot.setAttribute('aria-hidden', 'true');
    bot.innerHTML = el.outerHTML;
    el.setAttribute('aria-hidden', 'true');
    el.style.visibility = 'hidden';
    wrap.appendChild(top);
    wrap.appendChild(bot);
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(el);
        wrap.classList.add('split-dual-wrap--in');
      });
    }, { threshold: 0.4 });
    io.observe(el);
  });
}

function initScrollFloodFill() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('.section, .ba-section').forEach((section) => {
    const flood = document.createElement('div');
    flood.className = 'scroll-flood-fill';
    flood.setAttribute('aria-hidden', 'true');
    const pos = getComputedStyle(section).position;
    if (pos === 'static') section.style.position = 'relative';
    section.insertBefore(flood, section.firstChild);
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(section);
        flood.classList.add('scroll-flood-fill--in');
        flood.addEventListener('animationend', () => flood.remove(), { once: true });
      });
    }, { threshold: 0.15 });
    io.observe(section);
  });
}

/* Sprint 72 — neon link underline, scroll reveal rotate, velocity skew ----- */

function initNeonLinkUnderline() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  document.querySelectorAll('nav a, .footer-links a, .contact-links a').forEach((link) => {
    link.classList.add('neon-link');
  });
}

function initScrollRevealRotate() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('.rotate-reveal, .bento-card:not([data-scaleReveal])').forEach((el) => {
    if (el.dataset.rotateReveal) return;
    el.dataset.rotateReveal = '1';
    el.classList.add('rotate-reveal-elem');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(el);
        el.classList.add('rotate-reveal-elem--in');
      });
    }, { threshold: 0.15 });
    io.observe(el);
  });
}

function initVelocitySkew() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const targets = document.querySelectorAll('.bento-card, .pricing-card, .service-card, .process-step');
  if (!targets.length) return;
  let lastY = window.scrollY, velocity = 0, current = 0;
  const update = () => {
    const now = window.scrollY;
    velocity += (now - lastY - velocity) * 0.3;
    lastY = now;
    current += (-velocity * 0.018 - current) * 0.12;
    const skew = Math.max(-4, Math.min(4, current));
    targets.forEach((el) => { el.style.transform = `skewY(${skew.toFixed(2)}deg)`; });
    requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

/* Sprint 73 — grid diagonal reveal, card hover depth, scroll meter --------- */

function initGridDiagonalReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('.bento-grid, .pricing-grid, .services-grid, .process-grid').forEach((grid) => {
    const items = Array.from(grid.children);
    if (items.length < 2) return;
    const cols = Math.round(grid.getBoundingClientRect().width / (items[0].getBoundingClientRect().width || 300)) || 3;
    items.forEach((item, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      item.style.setProperty('--di', row + col);
      item.classList.add('grid-diag-reveal');
    });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(grid);
        items.forEach((item) => item.classList.add('grid-diag-reveal--in'));
      });
    }, { threshold: 0.1 });
    io.observe(grid);
  });
}

function initCardHoverDepth() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  document.querySelectorAll('.bento-card, .pricing-card, .service-card').forEach((card) => {
    card.classList.add('card-hover-depth');
  });
}

function initScrollMeter() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia('(max-width: 767px)').matches) return;
  const meter = document.createElement('div');
  meter.className = 'scroll-meter';
  meter.setAttribute('aria-hidden', 'true');
  const fill = document.createElement('div');
  fill.className = 'scroll-meter-fill';
  meter.appendChild(fill);
  document.body.appendChild(meter);
  const update = () => {
    const pct = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight) || 0;
    fill.style.height = `${(pct * 100).toFixed(1)}%`;
  };
  window.addEventListener('scroll', update, { passive: true });
  update();
}

/* Sprint 74 — hero scanline, clip reveal slide, highlight text mark --------- */

function initHeroScanline() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const hero = document.querySelector('.hero, .hero-section, [data-section="hero"]');
  if (!hero) return;
  const scan = document.createElement('div');
  scan.className = 'hero-scanline';
  scan.setAttribute('aria-hidden', 'true');
  const pos = getComputedStyle(hero).position;
  if (pos === 'static') hero.style.position = 'relative';
  hero.appendChild(scan);
}

function initClipRevealSlide() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('.wipe-reveal, .section-kicker, .hero-badge').forEach((el) => {
    if (el.dataset.wipeReveal) return;
    el.dataset.wipeReveal = '1';
    el.classList.add('clip-wipe-elem');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(el);
        el.classList.add('clip-wipe-elem--in');
      });
    }, { threshold: 0.3 });
    io.observe(el);
  });
}

function initHighlightTextMark() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('mark, .text-highlight, .highlight-mark').forEach((el) => {
    if (el.dataset.hlMark) return;
    el.dataset.hlMark = '1';
    el.classList.add('hl-mark-elem');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(el);
        el.classList.add('hl-mark-elem--in');
      });
    }, { threshold: 0.5 });
    io.observe(el);
  });
}

/* Sprint 75 — spring click effect, scroll text parallax, global focus glow -- */

function initSpringClickEffect() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('.btn-primary, .btn-secondary, .btn, button:not([disabled])').forEach((btn) => {
    btn.addEventListener('mousedown', () => {
      btn.classList.add('spring-click');
      btn.addEventListener('animationend', () => btn.classList.remove('spring-click'), { once: true });
    });
  });
}

function initScrollTextParallax() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const targets = Array.from(document.querySelectorAll('[data-speed]'));
  if (!targets.length) return;
  const update = () => {
    const sy = window.scrollY;
    targets.forEach((el) => {
      const speed = parseFloat(el.dataset.speed) || 0.1;
      const rect = el.getBoundingClientRect();
      const centerY = rect.top + rect.height / 2 + sy - window.innerHeight / 2;
      el.style.transform = `translateY(${(centerY * speed * -0.15).toFixed(1)}px)`;
    });
  };
  window.addEventListener('scroll', update, { passive: true });
  update();
}

function initGlobalFocusGlow() {
  const style = document.createElement('style');
  style.textContent = `
    :focus-visible {
      outline: 2px solid rgba(0,212,200,0.8) !important;
      outline-offset: 3px !important;
      box-shadow: 0 0 0 4px rgba(0,212,200,0.15), 0 0 12px rgba(0,212,200,0.2) !important;
      border-radius: 4px;
    }
  `;
  document.head.appendChild(style);
}

/* Sprint 76 — SVG path draw, perspective reveal, tooltip hover -------------- */

function initSVGPathDraw() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('svg path.draw-path, svg .draw-path').forEach((path) => {
    const len = path.getTotalLength ? path.getTotalLength() : 200;
    path.style.strokeDasharray = len;
    path.style.strokeDashoffset = len;
    path.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)';
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(path);
        path.style.strokeDashoffset = '0';
      });
    }, { threshold: 0.3 });
    io.observe(path);
  });
}

function initPerspectiveReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('.perspective-reveal, .section > .section-inner, .section > .container').forEach((el) => {
    if (el.dataset.perspReveal) return;
    el.dataset.perspReveal = '1';
    el.classList.add('persp-reveal-elem');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(el);
        el.classList.add('persp-reveal-elem--in');
      });
    }, { threshold: 0.12 });
    io.observe(el);
  });
}

function initTooltipHover() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  const tip = document.createElement('div');
  tip.className = 'tooltip-popover';
  tip.setAttribute('role', 'tooltip');
  tip.setAttribute('aria-live', 'polite');
  document.body.appendChild(tip);
  let lx = 0, ly = 0;
  document.addEventListener('mousemove', (e) => {
    lx = e.clientX; ly = e.clientY;
    tip.style.transform = `translate(${lx + 14}px, ${ly - 32}px)`;
  });
  document.querySelectorAll('[data-tooltip]').forEach((el) => {
    el.addEventListener('mouseenter', () => {
      tip.textContent = el.dataset.tooltip;
      tip.classList.add('tooltip-popover--visible');
    });
    el.addEventListener('mouseleave', () => {
      tip.classList.remove('tooltip-popover--visible');
    });
  });
}

/* Sprint 77 — scroll elevation, feature icon pulse, glow hover text --------- */

function initScrollElevation() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cards = document.querySelectorAll('.bento-card, .pricing-card, .service-card');
  if (!cards.length) return;
  const update = () => {
    const pct = Math.min(window.scrollY / 800, 1);
    const blur = (4 + pct * 8).toFixed(1);
    const spread = (0 + pct * 4).toFixed(1);
    const alpha = (0.1 + pct * 0.15).toFixed(2);
    const shadow = `0 ${(4 + pct * 12).toFixed(0)}px ${blur}px ${spread}px rgba(0,0,0,${alpha})`;
    cards.forEach((c) => { c.style.boxShadow = shadow; });
  };
  window.addEventListener('scroll', update, { passive: true });
  update();
}

function initFeatureIconPulse() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const icons = document.querySelectorAll('.feature-icon, .step-icon, .bento-icon, .service-icon, .process-icon');
  if (!icons.length) return;
  icons.forEach((icon, i) => {
    icon.style.setProperty('--fip', i);
    icon.classList.add('feature-icon-pulse');
  });
}

function initGlowHoverText() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  document.querySelectorAll('.glow-hover-text, .section-kicker, .hero-badge').forEach((el) => {
    el.classList.add('glow-hover-text-elem');
  });
}

/* Sprint 78 — radial reveal, lazy image fade, scroll fog effect --------------- */

function initRadialReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll(
    '.bento-card, .pricing-card, .service-card, .feature-card, .testimonial-card, .ba-card'
  );
  if (!els.length) return;
  els.forEach((el, i) => {
    if (el.dataset.radialReveal) return;
    el.dataset.radialReveal = '1';
    el.style.setProperty('--ri78', i);
    el.classList.add('radial-reveal-el');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          el.classList.add('radial-reveal-el--visible');
          io.unobserve(el);
        }
      });
    }, { threshold: 0.15 });
    io.observe(el);
  });
}

function initLazyImageFade() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const imgs = document.querySelectorAll('img[loading="lazy"]');
  if (!imgs.length) return;
  imgs.forEach((img) => {
    if (img.dataset.lazyFade) return;
    img.dataset.lazyFade = '1';
    if (!img.complete) {
      img.style.opacity = '0';
      img.style.transition = 'opacity 0.6s ease';
      img.addEventListener('load', () => { img.style.opacity = '1'; }, { once: true });
    }
  });
}

function initScrollFogEffect() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const sections = document.querySelectorAll('.section, .ba-section, .bento-section');
  if (!sections.length) return;
  sections.forEach((section) => {
    if (section.dataset.fogEffect) return;
    section.dataset.fogEffect = '1';
    section.classList.add('scroll-fog-section');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        section.classList.toggle('scroll-fog-section--visible', e.isIntersecting);
      });
    }, { threshold: 0.1 });
    io.observe(section);
  });
}

/* Sprint 79 — magnetic button, counter animation, 3D card tilt --------------- */

function initMagneticButton() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const btns = document.querySelectorAll('.btn, .cta-btn, .hero-cta, .magnetic-btn');
  if (!btns.length) return;
  btns.forEach((btn) => {
    if (btn.dataset.magnetic) return;
    btn.dataset.magnetic = '1';
    btn.style.transition = 'transform 0.3s cubic-bezier(0.23, 1, 0.32, 1)';
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) * 0.35;
      const dy = (e.clientY - cy) * 0.35;
      btn.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'translate(0px, 0px)';
    });
  });
}

function initCounterAnimation() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll('.count-num, .stat-number, .counter, [data-count]');
  if (!els.length) return;
  els.forEach((el) => {
    if (el.dataset.counterDone) return;
    const raw = el.dataset.count || el.textContent.replace(/[^0-9.]/g, '');
    const target = parseFloat(raw);
    if (isNaN(target)) return;
    el.dataset.counterDone = '1';
    const suffix = el.textContent.replace(/[0-9.]/g, '').trim();
    el.textContent = '0' + (suffix ? suffix : '');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(el);
        const dur = 1400;
        const start = performance.now();
        const tick = (now) => {
          const p = Math.min((now - start) / dur, 1);
          const ease = 1 - Math.pow(1 - p, 3);
          const val = target < 10 ? (target * ease).toFixed(1) : Math.round(target * ease);
          el.textContent = val + (suffix ? suffix : '');
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.5 });
    io.observe(el);
  });
}

function initCard3DTilt() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cards = document.querySelectorAll('.bento-card, .pricing-card, .testimonial-card');
  if (!cards.length) return;
  cards.forEach((card) => {
    if (card.dataset.tilt3d) return;
    card.dataset.tilt3d = '1';
    card.style.transformStyle = 'preserve-3d';
    card.style.transition = 'transform 0.15s ease';
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `perspective(600px) rotateX(${(-y * 10).toFixed(1)}deg) rotateY(${(x * 10).toFixed(1)}deg)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(600px) rotateX(0deg) rotateY(0deg)';
    });
  });
}

/* Sprint 80 — typing effect, scroll progress counter, ambient glow ----------- */

function initTypingEffect() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll('[data-type], .typing-text, .hero-tagline');
  if (!els.length) return;
  els.forEach((el) => {
    if (el.dataset.typingDone) return;
    el.dataset.typingDone = '1';
    const text = el.dataset.type || el.textContent.trim();
    if (!text) return;
    el.textContent = '';
    el.style.borderRight = '2px solid currentColor';
    el.style.display = 'inline-block';
    let i = 0;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(el);
        const type = () => {
          if (i <= text.length) {
            el.textContent = text.slice(0, i);
            i++;
            setTimeout(type, 45);
          } else {
            setTimeout(() => { el.style.borderRight = 'none'; }, 800);
          }
        };
        type();
      });
    }, { threshold: 0.5 });
    io.observe(el);
  });
}

function initScrollProgressCounter() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const wrap = document.createElement('div');
  wrap.className = 'scroll-progress-counter';
  wrap.setAttribute('aria-hidden', 'true');
  document.body.appendChild(wrap);
  const update = () => {
    const pct = Math.round(
      (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
    ) || 0;
    wrap.textContent = `${Math.min(pct, 100)}%`;
    wrap.style.opacity = window.scrollY > 60 ? '1' : '0';
  };
  window.addEventListener('scroll', update, { passive: true });
  update();
}

function initAmbientGlow() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const blob = document.createElement('div');
  blob.className = 'ambient-glow-cursor';
  blob.setAttribute('aria-hidden', 'true');
  document.body.appendChild(blob);
  let tx = -200, ty = -200, cx = -200, cy = -200;
  const update = () => {
    cx += (tx - cx) * 0.08;
    cy += (ty - cy) * 0.08;
    blob.style.transform = `translate(${cx.toFixed(1)}px, ${cy.toFixed(1)}px)`;
    requestAnimationFrame(update);
  };
  window.addEventListener('mousemove', (e) => { tx = e.clientX; ty = e.clientY; });
  requestAnimationFrame(update);
}

/* Sprint 81 — stagger list reveal, hover shimmer, scroll snap dots ----------- */

function initStaggerListReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const lists = document.querySelectorAll('ul, ol, .list, .feature-list, .checklist');
  if (!lists.length) return;
  lists.forEach((list) => {
    if (list.dataset.staggerList) return;
    const items = Array.from(list.children);
    if (items.length < 2) return;
    list.dataset.staggerList = '1';
    items.forEach((item, i) => {
      item.style.setProperty('--sli', i);
      item.classList.add('stagger-list-item');
    });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(list);
        items.forEach((item) => item.classList.add('stagger-list-item--visible'));
      });
    }, { threshold: 0.2 });
    io.observe(list);
  });
}

function initHoverShimmer() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  const els = document.querySelectorAll(
    '.btn, .cta-btn, .hero-cta, .bento-card, .pricing-card, .nav-link'
  );
  if (!els.length) return;
  els.forEach((el) => {
    if (el.dataset.shimmer) return;
    el.dataset.shimmer = '1';
    el.classList.add('hover-shimmer-el');
  });
}

function initScrollSnapDots() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const sections = Array.from(
    document.querySelectorAll('.section, .ba-section, .bento-section')
  ).filter((s) => s.id);
  if (sections.length < 3) return;
  const nav = document.createElement('nav');
  nav.className = 'scroll-snap-dots';
  nav.setAttribute('aria-label', 'Page sections');
  sections.forEach((section, i) => {
    const dot = document.createElement('a');
    dot.className = 'scroll-snap-dot';
    dot.href = `#${section.id}`;
    dot.setAttribute('aria-label', `Section ${i + 1}`);
    nav.appendChild(dot);
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        dot.classList.toggle('scroll-snap-dot--active', e.isIntersecting);
      });
    }, { threshold: 0.5 });
    io.observe(section);
  });
  document.body.appendChild(nav);
}

/* Sprint 82 — parallax hero text, card flip reveal, scroll hue shift --------- */

function initParallaxHeroText() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia('(max-width: 767px)').matches) return;
  const layers = document.querySelectorAll(
    '.hero-title, .hero-subtitle, .hero-tagline, .hero-badge, .hero-kicker'
  );
  if (!layers.length) return;
  const depths = [0.04, 0.07, 0.1, 0.03, 0.05];
  layers.forEach((el, i) => {
    el.style.willChange = 'transform';
    el.style.transition = 'transform 0.1s linear';
  });
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    layers.forEach((el, i) => {
      const d = depths[i % depths.length];
      el.style.transform = `translateY(${(y * d).toFixed(1)}px)`;
    });
  }, { passive: true });
}

function initCardFlipReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cards = document.querySelectorAll(
    '.bento-card, .service-card, .feature-card, .step-card'
  );
  if (!cards.length) return;
  cards.forEach((card, i) => {
    if (card.dataset.flipReveal) return;
    card.dataset.flipReveal = '1';
    card.style.setProperty('--cfi', i);
    card.classList.add('card-flip-reveal');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(card);
        card.classList.add('card-flip-reveal--visible');
      });
    }, { threshold: 0.2 });
    io.observe(card);
  });
}

function initScrollHueShift() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const targets = document.querySelectorAll('.section-kicker, .hero-badge, .kicker, .tag');
  if (!targets.length) return;
  targets.forEach((el) => el.classList.add('scroll-hue-shift-el'));
  const update = () => {
    const pct = Math.min(window.scrollY / (document.documentElement.scrollHeight - window.innerHeight), 1);
    const hue = Math.round(pct * 60);
    document.documentElement.style.setProperty('--scroll-hue', hue);
  };
  window.addEventListener('scroll', update, { passive: true });
  update();
}

/* Sprint 83 — noise texture overlay, button ripple, hero scroll blur --------- */

function initNoiseTextureOverlay() {
  if (window.matchMedia('(pointer: coarse)').matches) return; // mobile memory diet
  if (document.querySelector('.noise-overlay')) return;
  const el = document.createElement('div');
  el.className = 'noise-overlay';
  el.setAttribute('aria-hidden', 'true');
  document.body.appendChild(el);
}

function initBtnRipple() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const btns = document.querySelectorAll('.btn, .cta-btn, .hero-cta');
  if (!btns.length) return;
  btns.forEach((btn) => {
    if (btn.dataset.ripple) return;
    btn.dataset.ripple = '1';
    btn.style.position = btn.style.position || 'relative';
    btn.style.overflow = 'hidden';
    btn.addEventListener('click', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const size = Math.max(rect.width, rect.height) * 2.2;
      const ripple = document.createElement('span');
      ripple.className = 'btn-ripple-wave';
      ripple.style.cssText = `width:${size}px;height:${size}px;left:${x - size / 2}px;top:${y - size / 2}px`;
      btn.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
    });
  });
}

function initHeroScrollBlur() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia('(max-width: 767px)').matches) return;
  const hero = document.querySelector('.hero, .hero-section, #hero, [data-hero]');
  if (!hero) return;
  const heroH = hero.offsetHeight || window.innerHeight;
  window.addEventListener('scroll', () => {
    const ratio = Math.min(window.scrollY / heroH, 1);
    const blur = (ratio * 6).toFixed(1);
    const opacity = (1 - ratio * 0.4).toFixed(2);
    hero.style.filter = `blur(${blur}px)`;
    hero.style.opacity = opacity;
  }, { passive: true });
}

/* Sprint 84 — floating label input, fade-up reveal, cursor trail ------------- */

function initFloatingLabelInput() {
  const inputs = document.querySelectorAll('input[placeholder], textarea[placeholder]');
  if (!inputs.length) return;
  inputs.forEach((input) => {
    if (input.dataset.floatLabel) return;
    input.dataset.floatLabel = '1';
    const wrap = input.parentElement;
    if (!wrap) return;
    input.classList.add('float-label-input');
    const toggleActive = () => {
      input.classList.toggle('float-label-input--active', !!input.value || document.activeElement === input);
    };
    input.addEventListener('focus', toggleActive);
    input.addEventListener('blur', toggleActive);
    input.addEventListener('input', toggleActive);
    toggleActive();
  });
}

function initFadeUpReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const targets = document.querySelectorAll(
    'h1, h2, h3, h4, p.lead, .section-desc, .hero-sub, .hero-description'
  );
  if (!targets.length) return;
  targets.forEach((el, i) => {
    if (el.dataset.fadeUp) return;
    el.dataset.fadeUp = '1';
    el.style.setProperty('--fui', i % 6);
    el.classList.add('fade-up-reveal');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(el);
        el.classList.add('fade-up-reveal--visible');
      });
    }, { threshold: 0.15 });
    io.observe(el);
  });
}

function initCursorTrail() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const TRAIL = 8;
  const dots = Array.from({ length: TRAIL }, (_, i) => {
    const d = document.createElement('div');
    d.className = 'cursor-trail-dot';
    d.style.setProperty('--cti', i);
    d.setAttribute('aria-hidden', 'true');
    document.body.appendChild(d);
    return d;
  });
  const pts = dots.map(() => ({ x: -100, y: -100 }));
  let mouse = { x: -100, y: -100 };
  window.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
  const tick = () => {
    pts[0].x += (mouse.x - pts[0].x) * 0.35;
    pts[0].y += (mouse.y - pts[0].y) * 0.35;
    for (let i = 1; i < TRAIL; i++) {
      pts[i].x += (pts[i - 1].x - pts[i].x) * 0.45;
      pts[i].y += (pts[i - 1].y - pts[i].y) * 0.45;
    }
    dots.forEach((d, i) => {
      d.style.transform = `translate(${pts[i].x.toFixed(1)}px, ${pts[i].y.toFixed(1)}px)`;
    });
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* Sprint 85 — text scramble hover, button border draw, scroll band reveal ---- */

function initTextScrambleHover() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&';
  const els = document.querySelectorAll(
    '.nav a, .nav-link, .section-kicker, .hero-badge, .kicker, [data-scramble]'
  );
  if (!els.length) return;
  els.forEach((el) => {
    if (el.dataset.scrambleInit) return;
    el.dataset.scrambleInit = '1';
    const orig = el.textContent.trim();
    let raf = null;
    el.addEventListener('mouseenter', () => {
      cancelAnimationFrame(raf);
      let iter = 0;
      const tick = () => {
        el.textContent = orig.split('').map((ch, i) => {
          if (i < iter) return orig[i];
          if (ch === ' ') return ' ';
          return CHARS[Math.floor(Math.random() * CHARS.length)];
        }).join('');
        if (iter < orig.length) {
          iter += 0.4;
          raf = requestAnimationFrame(tick);
        } else {
          el.textContent = orig;
        }
      };
      raf = requestAnimationFrame(tick);
    });
    el.addEventListener('mouseleave', () => {
      cancelAnimationFrame(raf);
      el.textContent = orig;
    });
  });
}

function initBtnBorderDraw() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const btns = document.querySelectorAll('.btn, .cta-btn, .hero-cta, .outline-btn');
  if (!btns.length) return;
  btns.forEach((btn) => {
    if (btn.dataset.borderDraw) return;
    btn.dataset.borderDraw = '1';
    btn.classList.add('btn-border-draw');
  });
}

function initScrollBandReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const sections = document.querySelectorAll('.section, .ba-section, .bento-section');
  if (!sections.length) return;
  sections.forEach((section, i) => {
    if (section.dataset.bandReveal) return;
    section.dataset.bandReveal = '1';
    section.style.setProperty('--sbri', i % 2 === 0 ? '0' : '1');
    section.classList.add('scroll-band-reveal');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        section.classList.toggle('scroll-band-reveal--visible', e.isIntersecting);
      });
    }, { threshold: 0.08 });
    io.observe(section);
  });
}

/* Sprint 86 — spotlight hover, scroll ink blot, word pop-in ----------------- */

function initSpotlightHover() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const panels = document.querySelectorAll(
    '.bento-card, .pricing-card, .feature-card, .testimonial-card, .service-card'
  );
  if (!panels.length) return;
  panels.forEach((panel) => {
    if (panel.dataset.spotlight) return;
    panel.dataset.spotlight = '1';
    panel.classList.add('spotlight-panel');
    panel.addEventListener('mousemove', (e) => {
      const rect = panel.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width * 100).toFixed(1);
      const y = ((e.clientY - rect.top) / rect.height * 100).toFixed(1);
      panel.style.setProperty('--sx', `${x}%`);
      panel.style.setProperty('--sy', `${y}%`);
      panel.classList.add('spotlight-panel--active');
    });
    panel.addEventListener('mouseleave', () => {
      panel.classList.remove('spotlight-panel--active');
    });
  });
}

function initScrollInkBlot() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const markers = document.querySelectorAll(
    '.section-kicker, .kicker, .hero-badge, .badge, [data-ink]'
  );
  if (!markers.length) return;
  markers.forEach((el) => {
    if (el.dataset.inkBlot) return;
    el.dataset.inkBlot = '1';
    el.classList.add('ink-blot-el');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(el);
        el.classList.add('ink-blot-el--reveal');
      });
    }, { threshold: 0.6 });
    io.observe(el);
  });
}

function initWordPopIn() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const targets = document.querySelectorAll('.hero-title, h2, h3');
  if (!targets.length) return;
  targets.forEach((el) => {
    if (el.dataset.wordPop) return;
    el.dataset.wordPop = '1';
    const words = el.innerHTML.split(/(\s+)/);
    el.innerHTML = words.map((w, i) =>
      /^\s+$/.test(w)
        ? w
        : `<span class="word-pop" style="--wpi:${i}">${w}</span>`
    ).join('');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(el);
        el.querySelectorAll('.word-pop').forEach((span) => span.classList.add('word-pop--visible'));
      });
    }, { threshold: 0.3 });
    io.observe(el);
  });
}

/* Sprint 87 — card shadow depth on hover, scroll color band, pulse badge ----- */

function initCardShadowDepth() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cards = document.querySelectorAll(
    '.bento-card, .pricing-card, .feature-card, .testimonial-card, .service-card'
  );
  if (!cards.length) return;
  cards.forEach((card) => {
    if (card.dataset.shadowDepth) return;
    card.dataset.shadowDepth = '1';
    card.style.transition = (card.style.transition ? card.style.transition + ', ' : '') +
      'box-shadow 0.35s ease, transform 0.35s ease';
    card.addEventListener('mouseenter', () => {
      card.style.boxShadow = '0 24px 48px -8px rgba(0,0,0,0.45), 0 0 0 1px rgba(0,212,200,0.15)';
      card.style.transform = (card.style.transform || '') + ' translateY(-4px)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.boxShadow = '';
      card.style.transform = (card.style.transform || '').replace(' translateY(-4px)', '').trim();
    });
  });
}

function initScrollColorBand() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const band = document.createElement('div');
  band.className = 'scroll-color-band';
  band.setAttribute('aria-hidden', 'true');
  document.body.appendChild(band);
  const update = () => {
    const pct = Math.min(
      window.scrollY / (document.documentElement.scrollHeight - window.innerHeight), 1
    );
    band.style.transform = `scaleX(${pct.toFixed(3)})`;
  };
  window.addEventListener('scroll', update, { passive: true });
  update();
}

function initPulseBadge() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const badges = document.querySelectorAll(
    '.badge, .hero-badge, .status-badge, .new-badge, [data-badge]'
  );
  if (!badges.length) return;
  badges.forEach((badge) => {
    if (badge.dataset.pulseBadge) return;
    badge.dataset.pulseBadge = '1';
    badge.classList.add('pulse-badge-el');
  });
}

/* Sprint 88 — glitch text hover, scroll zoom section, btn liquid fill -------- */

function initGlitchTextHover() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll('.hero-title, h2, .section-title, [data-glitch]');
  if (!els.length) return;
  els.forEach((el) => {
    if (el.dataset.glitchInit) return;
    el.dataset.glitchInit = '1';
    el.classList.add('glitch-text-el');
    el.setAttribute('data-text', el.textContent.trim());
    el.addEventListener('mouseenter', () => el.classList.add('glitch-text-el--active'));
    el.addEventListener('mouseleave', () => el.classList.remove('glitch-text-el--active'));
  });
}

function initScrollZoomSection() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia('(max-width: 767px)').matches) return;
  const sections = document.querySelectorAll('.section, .ba-section');
  if (!sections.length) return;
  const update = () => {
    sections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const dist = Math.abs(center - window.innerHeight / 2);
      const maxDist = window.innerHeight * 0.8;
      const scale = 0.97 + 0.03 * Math.max(0, 1 - dist / maxDist);
      section.style.transform = `scale(${scale.toFixed(3)})`;
      section.style.transformOrigin = 'center center';
    });
  };
  window.addEventListener('scroll', update, { passive: true });
  update();
}

function initBtnLiquidFill() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const btns = document.querySelectorAll('.btn, .cta-btn, .hero-cta, .primary-btn');
  if (!btns.length) return;
  btns.forEach((btn) => {
    if (btn.dataset.liquidFill) return;
    btn.dataset.liquidFill = '1';
    btn.classList.add('btn-liquid-fill');
  });
}

/* Sprint 89 — aurora bg section, underline morph, scroll scale text ---------- */

function initAuroraBgSection() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const hero = document.querySelector('.hero, .hero-section, #hero');
  if (!hero) return;
  if (hero.dataset.aurora) return;
  hero.dataset.aurora = '1';
  const aurora = document.createElement('div');
  aurora.className = 'aurora-bg';
  aurora.setAttribute('aria-hidden', 'true');
  aurora.innerHTML = '<div class="aurora-blob aurora-blob--1"></div>' +
    '<div class="aurora-blob aurora-blob--2"></div>' +
    '<div class="aurora-blob aurora-blob--3"></div>';
  hero.insertAdjacentElement('afterbegin', aurora);
}

function initUnderlineMorph() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const links = document.querySelectorAll('a:not(.btn):not(.cta-btn):not(.nav-link):not([data-no-underline])');
  if (!links.length) return;
  links.forEach((link) => {
    if (link.dataset.underlineMorph) return;
    if (link.closest('nav')) return;
    link.dataset.underlineMorph = '1';
    link.classList.add('underline-morph-link');
  });
}

function initScrollScaleText() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia('(max-width: 767px)').matches) return;
  const hero = document.querySelector('.hero-title, h1');
  if (!hero) return;
  window.addEventListener('scroll', () => {
    const pct = Math.min(window.scrollY / (window.innerHeight * 0.6), 1);
    const scale = 1 + pct * 0.12;
    const opacity = Math.max(1 - pct * 1.4, 0);
    hero.style.transform = `scale(${scale.toFixed(3)})`;
    hero.style.opacity = opacity.toFixed(2);
    hero.style.transformOrigin = 'center top';
  }, { passive: true });
}

/* Sprint 90 — card stack hover, particle burst click, section edge glow ------ */

function initCardStackHover() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const grids = document.querySelectorAll(
    '.bento-grid, .cards-grid, .features-grid, .pricing-grid, .services-grid'
  );
  if (!grids.length) return;
  grids.forEach((grid) => {
    if (grid.dataset.stackHover) return;
    grid.dataset.stackHover = '1';
    const cards = Array.from(grid.children);
    if (cards.length < 2) return;
    cards.forEach((card, i) => {
      card.addEventListener('mouseenter', () => {
        cards.forEach((c, j) => {
          if (c === card) {
            c.style.zIndex = '10';
            c.style.transform = 'scale(1.03)';
          } else {
            const dist = Math.abs(j - i);
            c.style.opacity = String(Math.max(0.55, 1 - dist * 0.15));
            c.style.transform = `scale(${(1 - dist * 0.015).toFixed(3)})`;
          }
        });
      });
      card.addEventListener('mouseleave', () => {
        cards.forEach((c) => {
          c.style.zIndex = '';
          c.style.transform = '';
          c.style.opacity = '';
        });
      });
    });
  });
}

function initParticleBurst() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const btns = document.querySelectorAll('.btn, .cta-btn, .hero-cta');
  if (!btns.length) return;
  btns.forEach((btn) => {
    if (btn.dataset.particleBurst) return;
    btn.dataset.particleBurst = '1';
    btn.addEventListener('click', (e) => {
      const rect = btn.getBoundingClientRect();
      const ox = e.clientX - rect.left;
      const oy = e.clientY - rect.top;
      for (let i = 0; i < 10; i++) {
        const p = document.createElement('span');
        p.className = 'particle-burst-dot';
        const angle = (i / 10) * Math.PI * 2;
        const dist = 28 + Math.random() * 22;
        p.style.cssText = `left:${ox}px;top:${oy}px;--pbx:${(Math.cos(angle) * dist).toFixed(1)}px;--pby:${(Math.sin(angle) * dist).toFixed(1)}px`;
        btn.appendChild(p);
        p.addEventListener('animationend', () => p.remove(), { once: true });
      }
    });
  });
}

function initSectionEdgeGlow() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const sections = document.querySelectorAll('.section, .ba-section, .bento-section');
  if (!sections.length) return;
  sections.forEach((section) => {
    if (section.dataset.edgeGlow) return;
    section.dataset.edgeGlow = '1';
    section.classList.add('section-edge-glow');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        section.classList.toggle('section-edge-glow--active', e.isIntersecting);
      });
    }, { threshold: 0.3 });
    io.observe(section);
  });
}

/* Sprint 91 — text reveal mask, hover border glow, scroll opacity fade ------- */

function initTextRevealMask() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const targets = document.querySelectorAll(
    '.section-title, .hero-subtitle, .lead, .section-desc, [data-mask-reveal]'
  );
  if (!targets.length) return;
  targets.forEach((el, i) => {
    if (el.dataset.maskReveal) return;
    el.dataset.maskReveal = '1';
    el.style.setProperty('--mri', i % 5);
    el.classList.add('text-reveal-mask');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(el);
        el.classList.add('text-reveal-mask--visible');
      });
    }, { threshold: 0.2 });
    io.observe(el);
  });
}

function initHoverBorderGlow() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  const els = document.querySelectorAll(
    '.bento-card, .pricing-card, .feature-card, .service-card, .testimonial-card'
  );
  if (!els.length) return;
  els.forEach((el) => {
    if (el.dataset.borderGlow) return;
    el.dataset.borderGlow = '1';
    el.classList.add('hover-border-glow');
  });
}

function initScrollOpacityFade() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll(
    '.section-kicker, .hero-badge, .badge, .tag, .step-number'
  );
  if (!els.length) return;
  els.forEach((el) => {
    if (el.dataset.opacityFade) return;
    el.dataset.opacityFade = '1';
    el.classList.add('scroll-opacity-fade');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        el.classList.toggle('scroll-opacity-fade--visible', e.isIntersecting);
      });
    }, { threshold: 0.4 });
    io.observe(el);
  });
}

/* Sprint 92 — hero grid lines, btn confetti, scroll slide from side ---------- */

function initHeroGridLines() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const hero = document.querySelector('.hero, .hero-section, #hero');
  if (!hero || hero.dataset.gridLines) return;
  hero.dataset.gridLines = '1';
  const grid = document.createElement('div');
  grid.className = 'hero-grid-lines';
  grid.setAttribute('aria-hidden', 'true');
  hero.insertAdjacentElement('afterbegin', grid);
}

function initBtnConfetti() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const COLORS = ['#00d4c8', '#7b5cfa', '#ff6b6b', '#ffd166', '#0fa'];
  const btns = document.querySelectorAll('.btn, .cta-btn, .hero-cta');
  if (!btns.length) return;
  btns.forEach((btn) => {
    if (btn.dataset.confetti) return;
    btn.dataset.confetti = '1';
    btn.addEventListener('click', (e) => {
      const rect = btn.getBoundingClientRect();
      const ox = e.clientX - rect.left;
      const oy = e.clientY - rect.top;
      for (let i = 0; i < 14; i++) {
        const c = document.createElement('span');
        c.className = 'confetti-piece';
        const angle = Math.random() * Math.PI * 2;
        const dist = 30 + Math.random() * 40;
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];
        const size = 4 + Math.random() * 4;
        c.style.cssText = `left:${ox}px;top:${oy}px;width:${size}px;height:${size}px;background:${color};--cpx:${(Math.cos(angle) * dist).toFixed(1)}px;--cpy:${(Math.sin(angle) * dist).toFixed(1)}px;--cpr:${Math.floor(Math.random() * 360)}deg`;
        btn.appendChild(c);
        c.addEventListener('animationend', () => c.remove(), { once: true });
      }
    });
  });
}

function initScrollSlideFromSide() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll(
    '.feature-card, .step-card, .testimonial-card, .process-card, [data-slide-side]'
  );
  if (!els.length) return;
  els.forEach((el, i) => {
    if (el.dataset.slideSide) return;
    el.dataset.slideSide = '1';
    const fromRight = i % 2 === 1;
    el.style.setProperty('--ssdir', fromRight ? '1' : '-1');
    el.style.setProperty('--ssi', i);
    el.classList.add('scroll-slide-side');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(el);
        el.classList.add('scroll-slide-side--visible');
      });
    }, { threshold: 0.15 });
    io.observe(el);
  });
}

/* Sprint 93 — hover color shift card, scroll depth blur, btn shake ----------- */

function initHoverColorShift() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  const els = document.querySelectorAll(
    '.bento-card, .feature-card, .service-card, .pricing-card'
  );
  if (!els.length) return;
  els.forEach((el, i) => {
    if (el.dataset.colorShift) return;
    el.dataset.colorShift = '1';
    const hues = [180, 210, 270, 330, 160];
    const hue = hues[i % hues.length];
    el.addEventListener('mouseenter', () => {
      el.style.transition = 'background 0.5s ease, filter 0.5s ease';
      el.style.filter = `hue-rotate(${hue - 180}deg) brightness(1.04)`;
    });
    el.addEventListener('mouseleave', () => {
      el.style.filter = '';
    });
  });
}

function initScrollDepthBlur() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia('(max-width: 767px)').matches) return;
  const cards = document.querySelectorAll(
    '.bento-card, .pricing-card, .feature-card, .service-card'
  );
  if (!cards.length) return;
  const update = () => {
    cards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      const centerY = rect.top + rect.height / 2;
      const dist = Math.abs(centerY - window.innerHeight / 2);
      const blur = Math.min((dist / window.innerHeight) * 3, 2.5);
      card.style.filter = `blur(${blur.toFixed(1)}px)`;
      card.style.transition = 'filter 0.2s ease';
    });
  };
  window.addEventListener('scroll', update, { passive: true });
  update();
}

function initBtnShake() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const btns = document.querySelectorAll('.btn, .cta-btn, .hero-cta');
  if (!btns.length) return;
  btns.forEach((btn) => {
    if (btn.dataset.btnShake) return;
    btn.dataset.btnShake = '1';
    btn.addEventListener('click', () => {
      btn.classList.remove('btn-shake-anim');
      void btn.offsetWidth;
      btn.classList.add('btn-shake-anim');
      btn.addEventListener('animationend', () => btn.classList.remove('btn-shake-anim'), { once: true });
    });
  });
}

/* Sprint 94 — floating action btn, dot pattern bg, hover scale icon ---------- */

function initFloatingActionBtn() {
  if (document.querySelector('.fab-scroll-top')) return;
  const fab = document.createElement('button');
  fab.className = 'fab-scroll-top';
  fab.setAttribute('aria-label', 'Scroll to top');
  fab.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 15V5M5 10l5-5 5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  document.body.appendChild(fab);
  const toggle = () => {
    fab.classList.toggle('fab-scroll-top--visible', window.scrollY > 400);
  };
  window.addEventListener('scroll', toggle, { passive: true });
  fab.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  toggle();
}

function initDotPatternBg() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const sections = document.querySelectorAll(
    '.section:nth-child(odd), .ba-section:nth-child(odd), .bento-section:nth-child(even)'
  );
  if (!sections.length) return;
  sections.forEach((section) => {
    if (section.dataset.dotPattern) return;
    section.dataset.dotPattern = '1';
    section.classList.add('dot-pattern-section');
  });
}

function initHoverScaleIcon() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const icons = document.querySelectorAll(
    '.feature-icon, .step-icon, .bento-icon, .service-icon, .process-icon, .icon, svg.icon'
  );
  if (!icons.length) return;
  icons.forEach((icon) => {
    if (icon.dataset.hoverScale) return;
    icon.dataset.hoverScale = '1';
    const parent = icon.closest('a, button, .bento-card, .feature-card, .step-card, .service-card');
    if (!parent) return;
    parent.addEventListener('mouseenter', () => {
      icon.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
      icon.style.transform = 'scale(1.2) rotate(-5deg)';
    });
    parent.addEventListener('mouseleave', () => {
      icon.style.transform = 'scale(1) rotate(0deg)';
    });
  });
}

/* Sprint 95 — section divider wave, scroll progress ring, text highlight sweep */

function initSectionDividerWave() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const sections = document.querySelectorAll('.section, .ba-section');
  if (!sections.length) return;
  sections.forEach((section, i) => {
    if (section.dataset.dividerWave) return;
    if (i === 0) return;
    section.dataset.dividerWave = '1';
    const wave = document.createElement('div');
    wave.className = 'section-divider-wave';
    wave.setAttribute('aria-hidden', 'true');
    wave.innerHTML = `<svg viewBox="0 0 1200 60" preserveAspectRatio="none" aria-hidden="true"><path d="M0,30 C300,60 900,0 1200,30 L1200,0 L0,0 Z" fill="currentColor"/></svg>`;
    section.insertAdjacentElement('afterbegin', wave);
  });
}

function initScrollProgressRing() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (document.querySelector('.scroll-progress-ring')) return;
  const SIZE = 44;
  const R = 18;
  const CIRC = 2 * Math.PI * R;
  const wrap = document.createElement('div');
  wrap.className = 'scroll-progress-ring';
  wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML = `<svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}"><circle cx="${SIZE/2}" cy="${SIZE/2}" r="${R}" fill="none" stroke="rgba(0,212,200,0.15)" stroke-width="2.5"/><circle class="spr-fill" cx="${SIZE/2}" cy="${SIZE/2}" r="${R}" fill="none" stroke="#00d4c8" stroke-width="2.5" stroke-dasharray="${CIRC}" stroke-dashoffset="${CIRC}" stroke-linecap="round" transform="rotate(-90 ${SIZE/2} ${SIZE/2})"/></svg>`;
  document.body.appendChild(wrap);
  const fill = wrap.querySelector('.spr-fill');
  const update = () => {
    const pct = Math.min(window.scrollY / (document.documentElement.scrollHeight - window.innerHeight), 1);
    fill.style.strokeDashoffset = String(CIRC * (1 - pct));
    wrap.style.opacity = window.scrollY > 80 ? '1' : '0';
  };
  window.addEventListener('scroll', update, { passive: true });
  update();
}

function initTextHighlightSweep() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll(
    '.highlight, strong, b, [data-highlight], .accent-text'
  );
  if (!els.length) return;
  els.forEach((el) => {
    if (el.dataset.highlightSweep) return;
    el.dataset.highlightSweep = '1';
    el.classList.add('text-highlight-sweep');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(el);
        el.classList.add('text-highlight-sweep--active');
      });
    }, { threshold: 0.6 });
    io.observe(el);
  });
}

/* Sprint 96 — hover glow trail, scroll letter-spacing morph, btn elastic bounce */

function initHoverGlowTrail() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(pointer: fine)').matches) return;
  const targets = document.querySelectorAll(
    '.card, .service-card, .ba-card, .hero, [data-glow-trail]'
  );
  if (!targets.length) return;
  targets.forEach((el) => {
    if (el.dataset.glowTrail) return;
    el.dataset.glowTrail = '1';
    const glow = document.createElement('div');
    glow.className = 'hover-glow-trail';
    glow.setAttribute('aria-hidden', 'true');
    el.style.position = el.style.position || 'relative';
    el.style.overflow = el.style.overflow || 'hidden';
    el.appendChild(glow);
    let raf = 0;
    let cx = 0, cy = 0, tx = 0, ty = 0;
    const lerp = (a, b, t) => a + (b - a) * t;
    const tick = () => {
      cx = lerp(cx, tx, 0.12);
      cy = lerp(cy, ty, 0.12);
      glow.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
      raf = requestAnimationFrame(tick);
    };
    el.addEventListener('mouseenter', () => {
      glow.style.opacity = '1';
      raf = requestAnimationFrame(tick);
    }, { passive: true });
    el.addEventListener('mouseleave', () => {
      glow.style.opacity = '0';
      cancelAnimationFrame(raf);
    }, { passive: true });
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      tx = e.clientX - r.left;
      ty = e.clientY - r.top;
    }, { passive: true });
  });
}

function initScrollLetterSpacingMorph() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const headings = document.querySelectorAll('h1, h2, h3, .section-title, .hero-title');
  if (!headings.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const el = e.target;
      if (e.isIntersecting) {
        el.classList.add('ls-morph--in');
        el.classList.remove('ls-morph--out');
      } else if (el.classList.contains('ls-morph--in')) {
        el.classList.add('ls-morph--out');
        el.classList.remove('ls-morph--in');
      }
    });
  }, { threshold: 0.3, rootMargin: '-10% 0px' });
  headings.forEach((h) => {
    if (h.dataset.lsMorph) return;
    h.dataset.lsMorph = '1';
    h.classList.add('ls-morph');
    io.observe(h);
  });
}

function initBtnElasticBounce() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const btns = document.querySelectorAll(
    '.btn, button, .cta-btn, [data-elastic-bounce], input[type="submit"]'
  );
  if (!btns.length) return;
  btns.forEach((btn) => {
    if (btn.dataset.elasticBounce) return;
    btn.dataset.elasticBounce = '1';
    btn.classList.add('btn-elastic-bounce');
    btn.addEventListener('mouseenter', () => {
      btn.classList.remove('btn-elastic-bounce--active');
      void btn.offsetWidth;
      btn.classList.add('btn-elastic-bounce--active');
    }, { passive: true });
    btn.addEventListener('animationend', () => {
      btn.classList.remove('btn-elastic-bounce--active');
    }, { passive: true });
  });
}

/* Sprint 97 — morphing blob, scroll parallax cards, text split reveal */

function initMorphingBlob() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (document.querySelector('.morphing-blob')) return;
  const targets = document.querySelectorAll('.hero, .ba-section, .section');
  if (!targets.length) return;
  const host = targets[0];
  host.style.position = host.style.position || 'relative';
  host.style.overflow = host.style.overflow || 'hidden';
  const blob = document.createElement('div');
  blob.className = 'morphing-blob';
  blob.setAttribute('aria-hidden', 'true');
  host.insertAdjacentElement('afterbegin', blob);
}

function initScrollParallaxCards() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cards = document.querySelectorAll('.card, .service-card, .ba-card, [data-parallax-card]');
  if (cards.length < 2) return;
  const speeds = [0.04, -0.04, 0.06, -0.06, 0.03, -0.03];
  cards.forEach((card, i) => {
    if (card.dataset.parallaxCard) return;
    card.dataset.parallaxCard = '1';
    const speed = speeds[i % speeds.length];
    let lastY = 0;
    const update = () => {
      const r = card.getBoundingClientRect();
      const mid = window.innerHeight / 2;
      const offset = (r.top + r.height / 2 - mid) * speed;
      card.style.transform = `translateY(${offset}px)`;
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          window.addEventListener('scroll', update, { passive: true });
          update();
        } else {
          window.removeEventListener('scroll', update);
        }
      });
    }, { rootMargin: '100px 0px' });
    io.observe(card);
  });
}

function initTextSplitReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const targets = document.querySelectorAll('.section-title, .hero-title, [data-split-reveal]');
  if (!targets.length) return;
  targets.forEach((el) => {
    if (el.dataset.splitReveal) return;
    el.dataset.splitReveal = '1';
    const text = el.textContent.trim();
    if (!text) return;
    el.setAttribute('aria-label', text);
    const chars = text.split('').map((ch, i) => {
      const span = document.createElement('span');
      span.className = 'split-char';
      span.style.setProperty('--sci', String(i));
      span.setAttribute('aria-hidden', 'true');
      span.textContent = ch === ' ' ? ' ' : ch;
      return span;
    });
    el.textContent = '';
    chars.forEach((s) => el.appendChild(s));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(el);
        el.classList.add('split-reveal--active');
      });
    }, { threshold: 0.4 });
    io.observe(el);
  });
}

/* Sprint 98 — cursor spotlight, scroll clip reveal, hover border trace */

function initCursorSpotlight() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(pointer: fine)').matches) return;
  if (document.querySelector('.cursor-spotlight')) return;
  const spot = document.createElement('div');
  spot.className = 'cursor-spotlight';
  spot.setAttribute('aria-hidden', 'true');
  document.body.appendChild(spot);
  let cx = -999, cy = -999, tx = -999, ty = -999;
  let rafId = 0;
  const lerp = (a, b, t) => a + (b - a) * t;
  const tick = () => {
    cx = lerp(cx, tx, 0.08);
    cy = lerp(cy, ty, 0.08);
    spot.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
    rafId = requestAnimationFrame(tick);
  };
  document.addEventListener('mousemove', (e) => {
    tx = e.clientX;
    ty = e.clientY;
    spot.style.opacity = '1';
  }, { passive: true });
  document.addEventListener('mouseleave', () => {
    spot.style.opacity = '0';
  }, { passive: true });
  rafId = requestAnimationFrame(tick);
}

function initScrollClipReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll(
    '.card, .service-card, .ba-card, img, figure, [data-clip-reveal]'
  );
  if (!els.length) return;
  els.forEach((el) => {
    if (el.dataset.clipReveal) return;
    el.dataset.clipReveal = '1';
    el.classList.add('clip-reveal');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(el);
        el.classList.add('clip-reveal--active');
      });
    }, { threshold: 0.15 });
    io.observe(el);
  });
}

function initHoverBorderTrace() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(pointer: fine)').matches) return;
  const els = document.querySelectorAll(
    '.card, .service-card, .ba-card, .btn, button, [data-border-trace]'
  );
  if (!els.length) return;
  els.forEach((el) => {
    if (el.dataset.borderTrace) return;
    el.dataset.borderTrace = '1';
    el.classList.add('border-trace');
    el.addEventListener('mouseenter', () => {
      el.classList.add('border-trace--active');
    }, { passive: true });
    el.addEventListener('mouseleave', () => {
      el.classList.remove('border-trace--active');
    }, { passive: true });
  });
}

/* Sprint 99 — scroll reveal scale, hover tilt 3D, neon line draw */

function initScrollRevealScale() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll(
    '.section-title, .hero-title, h2, h3, p, .card, .service-card, [data-reveal-scale]'
  );
  if (!els.length) return;
  els.forEach((el) => {
    if (el.dataset.revealScale) return;
    el.dataset.revealScale = '1';
    el.classList.add('scroll-reveal-scale');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(el);
        el.classList.add('scroll-reveal-scale--active');
      });
    }, { threshold: 0.2 });
    io.observe(el);
  });
}

function initHoverTilt3D() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(pointer: fine)').matches) return;
  const cards = document.querySelectorAll('.card, .service-card, .ba-card, [data-tilt]');
  if (!cards.length) return;
  cards.forEach((card) => {
    if (card.dataset.tilt3d) return;
    card.dataset.tilt3d = '1';
    card.classList.add('hover-tilt-3d');
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width  - 0.5;
      const py = (e.clientY - r.top)  / r.height - 0.5;
      card.style.transform = `perspective(600px) rotateX(${-py * 12}deg) rotateY(${px * 12}deg) scale(1.02)`;
    }, { passive: true });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    }, { passive: true });
  });
}

function initNeonLineDraw() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (document.querySelector('.neon-line-draw')) return;
  const sections = document.querySelectorAll('.section, .ba-section');
  if (!sections.length) return;
  sections.forEach((section, i) => {
    if (i % 3 !== 0) return;
    if (section.dataset.neonLine) return;
    section.dataset.neonLine = '1';
    const line = document.createElement('div');
    line.className = 'neon-line-draw';
    line.setAttribute('aria-hidden', 'true');
    section.appendChild(line);
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(section);
        line.classList.add('neon-line-draw--active');
      });
    }, { threshold: 0.3 });
    io.observe(section);
  });
}

/* Sprint 100 — MILESTONE — cinematic scroll wipe, hero particle burst, cascade reveal */

function initCinematicScrollWipe() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const sections = document.querySelectorAll('.section, .ba-section');
  if (!sections.length) return;
  sections.forEach((section) => {
    if (section.dataset.cinematicWipe) return;
    section.dataset.cinematicWipe = '1';
    const curtain = document.createElement('div');
    curtain.className = 'cinematic-wipe-curtain';
    curtain.setAttribute('aria-hidden', 'true');
    section.style.position = section.style.position || 'relative';
    section.style.overflow = section.style.overflow || 'hidden';
    section.insertAdjacentElement('afterbegin', curtain);
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(section);
        curtain.classList.add('cinematic-wipe-curtain--out');
        curtain.addEventListener('animationend', () => curtain.remove(), { once: true });
      });
    }, { threshold: 0.1 });
    io.observe(section);
  });
}

function initHeroParticleBurst() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (document.querySelector('.hero-burst-canvas')) return;
  const hero = document.querySelector('.hero, [data-hero]');
  if (!hero) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'hero-burst-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  hero.insertAdjacentElement('afterbegin', canvas);
  const ctx = canvas.getContext('2d');
  const resize = () => {
    canvas.width = hero.offsetWidth;
    canvas.height = hero.offsetHeight;
  };
  resize();
  window.addEventListener('resize', resize, { passive: true });

  const COLORS = ['#00d4c8', '#7b5cfa', '#ffffff', '#00ffd5'];
  const particles = [];
  const NUM = 60;

  for (let i = 0; i < NUM; i++) {
    particles.push({
      x: canvas.width * 0.5,
      y: canvas.height * 0.5,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      r: Math.random() * 2 + 0.5,
      life: Math.random() * 0.6 + 0.4,
      decay: Math.random() * 0.008 + 0.004,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    });
  }

  let rafId;
  const tick = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = 0;
    particles.forEach((p) => {
      if (p.life <= 0) return;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      p.life -= p.decay;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      alive++;
    });
    ctx.globalAlpha = 1;
    if (alive > 0) rafId = requestAnimationFrame(tick);
  };

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(hero);
      particles.forEach((p) => {
        p.x = canvas.width * 0.5;
        p.y = canvas.height * 0.5;
        p.life = Math.random() * 0.6 + 0.4;
      });
      cancelAnimationFrame(rafId);
      tick();
    });
  }, { threshold: 0.3 });
  io.observe(hero);
}

function initCascadeReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const groups = document.querySelectorAll('.section, .ba-section, [data-cascade]');
  if (!groups.length) return;
  groups.forEach((group) => {
    if (group.dataset.cascadeReveal) return;
    group.dataset.cascadeReveal = '1';
    const children = Array.from(group.children).filter((c) => !c.classList.contains('cinematic-wipe-curtain') && !c.classList.contains('morphing-blob'));
    if (!children.length) return;
    children.forEach((child, i) => {
      if (child.dataset.cascadeChild) return;
      child.dataset.cascadeChild = '1';
      child.classList.add('cascade-child');
      child.style.setProperty('--cci', String(i));
    });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(group);
        group.classList.add('cascade-reveal--active');
      });
    }, { threshold: 0.1 });
    io.observe(group);
  });
}

/* Sprint 101 — scroll fade-blur, hover color pop, btn glow pulse */

function initScrollFadeBlur() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll('p, li, blockquote, .caption, [data-fade-blur]');
  if (!els.length) return;
  els.forEach((el) => {
    if (el.dataset.fadeBlur) return;
    el.dataset.fadeBlur = '1';
    el.classList.add('scroll-fade-blur');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(el);
        el.classList.add('scroll-fade-blur--active');
      });
    }, { threshold: 0.25 });
    io.observe(el);
  });
}

function initHoverColorPop() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(pointer: fine)').matches) return;
  const icons = document.querySelectorAll(
    'svg, img[alt], .icon, [data-color-pop]'
  );
  if (!icons.length) return;
  icons.forEach((el) => {
    if (el.dataset.colorPop) return;
    el.dataset.colorPop = '1';
    el.classList.add('hover-color-pop');
    el.addEventListener('mouseenter', () => {
      el.classList.add('hover-color-pop--active');
    }, { passive: true });
    el.addEventListener('mouseleave', () => {
      el.classList.remove('hover-color-pop--active');
    }, { passive: true });
  });
}

function initBtnGlowPulse() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const btns = document.querySelectorAll('.btn, .cta-btn, [data-glow-pulse]');
  if (!btns.length) return;
  btns.forEach((btn) => {
    if (btn.dataset.glowPulse) return;
    btn.dataset.glowPulse = '1';
    btn.classList.add('btn-glow-pulse');
  });
}

/* Sprint 102 — scroll skew entry, image parallax layer, hover underline expand */

function initScrollSkewEntry() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll(
    '.card, .service-card, [data-skew-entry]'
  );
  if (!els.length) return;
  els.forEach((el, i) => {
    if (el.dataset.skewEntry) return;
    el.dataset.skewEntry = '1';
    el.classList.add('scroll-skew-entry');
    el.style.setProperty('--ske-dir', i % 2 === 0 ? '1' : '-1');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(el);
        el.classList.add('scroll-skew-entry--active');
      });
    }, { threshold: 0.2 });
    io.observe(el);
  });
}

function initImageParallaxLayer() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const images = document.querySelectorAll(
    '.hero img, .ba-card img, figure img, [data-parallax-img]'
  );
  if (!images.length) return;
  images.forEach((img) => {
    if (img.dataset.parallaxLayer) return;
    img.dataset.parallaxLayer = '1';
    img.classList.add('img-parallax-layer');
    const update = () => {
      const r = img.getBoundingClientRect();
      const mid = window.innerHeight / 2;
      const offset = (r.top + r.height / 2 - mid) * 0.08;
      img.style.transform = `translateY(${offset}px) scale(1.06)`;
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          window.addEventListener('scroll', update, { passive: true });
          update();
        } else {
          window.removeEventListener('scroll', update);
          img.style.transform = '';
        }
      });
    }, { rootMargin: '100px 0px' });
    io.observe(img);
  });
}

function initHoverUnderlineExpand() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const links = document.querySelectorAll(
    'a:not(.btn):not(.cta-btn), nav a, .nav-link, [data-underline-expand]'
  );
  if (!links.length) return;
  links.forEach((el) => {
    if (el.dataset.underlineExpand) return;
    el.dataset.underlineExpand = '1';
    el.classList.add('hover-underline-expand');
  });
}

/* Sprint 103 — scroll rotate-in, hover shadow lift, text gradient shift */

function initScrollRotateIn() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll(
    '.card, .service-card, .ba-card, figure, [data-rotate-in]'
  );
  if (!els.length) return;
  els.forEach((el, i) => {
    if (el.dataset.rotateIn) return;
    el.dataset.rotateIn = '1';
    el.classList.add('scroll-rotate-in');
    el.style.setProperty('--sri-deg', i % 2 === 0 ? '-4deg' : '4deg');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(el);
        el.classList.add('scroll-rotate-in--active');
      });
    }, { threshold: 0.15 });
    io.observe(el);
  });
}

function initHoverShadowLift() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll(
    '.card, .service-card, .ba-card, [data-shadow-lift]'
  );
  if (!els.length) return;
  els.forEach((el) => {
    if (el.dataset.shadowLift) return;
    el.dataset.shadowLift = '1';
    el.classList.add('hover-shadow-lift');
  });
}

function initTextGradientShift() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const headings = document.querySelectorAll(
    'h1, h2, .section-title, .hero-title, [data-gradient-shift]'
  );
  if (!headings.length) return;
  headings.forEach((el) => {
    if (el.dataset.gradientShift) return;
    el.dataset.gradientShift = '1';
    el.classList.add('text-gradient-shift');
  });
}

/* Sprint 104 — scroll flip reveal, hover icon spin, bg aurora drift */

function initScrollFlipReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll('.card, .service-card, [data-flip-reveal]');
  if (!els.length) return;
  els.forEach((el) => {
    if (el.dataset.flipReveal2) return;
    el.dataset.flipReveal2 = '1';
    el.classList.add('scroll-flip-reveal');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(el);
        el.classList.add('scroll-flip-reveal--active');
      });
    }, { threshold: 0.2 });
    io.observe(el);
  });
}

function initHoverIconSpin() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(pointer: fine)').matches) return;
  const icons = document.querySelectorAll(
    '.card svg, .service-card svg, .nav svg, [data-icon-spin]'
  );
  if (!icons.length) return;
  icons.forEach((el) => {
    if (el.dataset.iconSpin) return;
    el.dataset.iconSpin = '1';
    el.classList.add('hover-icon-spin');
    el.closest('.card, .service-card, a, button')?.addEventListener('mouseenter', () => {
      el.classList.add('hover-icon-spin--active');
    }, { passive: true });
    el.closest('.card, .service-card, a, button')?.addEventListener('mouseleave', () => {
      el.classList.remove('hover-icon-spin--active');
    }, { passive: true });
  });
}

function initBgAuroraDrift() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (document.querySelector('.bg-aurora-drift')) return;
  const hero = document.querySelector('.hero, [data-hero]');
  if (!hero) return;
  hero.style.position = hero.style.position || 'relative';
  hero.style.overflow = hero.style.overflow || 'hidden';
  const aurora = document.createElement('div');
  aurora.className = 'bg-aurora-drift';
  aurora.setAttribute('aria-hidden', 'true');
  hero.insertAdjacentElement('afterbegin', aurora);
}

/* Sprint 105 — scroll stagger grid, hover card shimmer, section count-up */

function initScrollStaggerGrid() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const grids = document.querySelectorAll(
    '.grid, .cards-grid, .services-grid, [data-stagger-grid]'
  );
  if (!grids.length) return;
  grids.forEach((grid) => {
    if (grid.dataset.staggerGrid) return;
    grid.dataset.staggerGrid = '1';
    const children = Array.from(grid.children);
    children.forEach((child, i) => {
      if (child.dataset.staggerItem) return;
      child.dataset.staggerItem = '1';
      child.classList.add('stagger-grid-item');
      child.style.setProperty('--sgi', String(i));
    });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(grid);
        grid.classList.add('stagger-grid--active');
      });
    }, { threshold: 0.1 });
    io.observe(grid);
  });
}

function initHoverCardShimmer() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(pointer: fine)').matches) return;
  const cards = document.querySelectorAll('.card, .service-card, .ba-card, [data-shimmer]');
  if (!cards.length) return;
  cards.forEach((card) => {
    if (card.dataset.cardShimmer) return;
    card.dataset.cardShimmer = '1';
    const shimmer = document.createElement('div');
    shimmer.className = 'hover-card-shimmer-layer';
    shimmer.setAttribute('aria-hidden', 'true');
    card.style.position = card.style.position || 'relative';
    card.style.overflow = card.style.overflow || 'hidden';
    card.appendChild(shimmer);
    card.addEventListener('mouseenter', () => {
      shimmer.classList.add('hover-card-shimmer-layer--active');
      shimmer.addEventListener('animationend', () => {
        shimmer.classList.remove('hover-card-shimmer-layer--active');
      }, { once: true });
    }, { passive: true });
  });
}

function initSectionCountUp() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const nums = document.querySelectorAll('[data-count-up], .stat-number, .counter');
  if (!nums.length) return;
  nums.forEach((el) => {
    if (el.dataset.countUpDone) return;
    const target = parseFloat(el.dataset.countUp || el.textContent.replace(/[^0-9.]/g, ''));
    if (isNaN(target)) return;
    el.dataset.countUpDone = '1';
    const suffix = el.textContent.replace(/[0-9.]/g, '').trim();
    const duration = 1200;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(el);
        const start = performance.now();
        const tick = (now) => {
          const t = Math.min((now - start) / duration, 1);
          const ease = 1 - Math.pow(1 - t, 3);
          const val = target * ease;
          el.textContent = (Number.isInteger(target) ? Math.round(val) : val.toFixed(1)) + suffix;
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.5 });
    io.observe(el);
  });
}

/* Sprint 106 — scroll zoom-fade, hover border glow pulse, typewriter cursor */

function initScrollZoomFade() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll(
    '.hero-title, .section-title, h1, h2, [data-zoom-fade]'
  );
  if (!els.length) return;
  els.forEach((el) => {
    if (el.dataset.zoomFade) return;
    el.dataset.zoomFade = '1';
    el.classList.add('scroll-zoom-fade');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(el);
        el.classList.add('scroll-zoom-fade--active');
      });
    }, { threshold: 0.3 });
    io.observe(el);
  });
}

function initHoverBorderGlowPulse() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll(
    '.card, .service-card, .ba-card, [data-border-glow-pulse]'
  );
  if (!els.length) return;
  els.forEach((el) => {
    if (el.dataset.borderGlowPulse) return;
    el.dataset.borderGlowPulse = '1';
    el.classList.add('hover-border-glow-pulse');
    el.addEventListener('mouseenter', () => {
      el.classList.add('hover-border-glow-pulse--active');
    }, { passive: true });
    el.addEventListener('mouseleave', () => {
      el.classList.remove('hover-border-glow-pulse--active');
    }, { passive: true });
  });
}

function initTypewriterCursor() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const el = document.querySelector(
    '.hero-title, h1, [data-typewriter]'
  );
  if (!el || el.dataset.typewriter) return;
  el.dataset.typewriter = '1';
  const cursor = document.createElement('span');
  cursor.className = 'typewriter-cursor';
  cursor.setAttribute('aria-hidden', 'true');
  cursor.textContent = '|';
  el.appendChild(cursor);
}

/* Sprint 107 — scroll wave reveal, hover floating label, btn magnetic pull */

function initScrollWaveReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const rows = document.querySelectorAll(
    '.row, .flex-row, [data-wave-reveal]'
  );
  if (!rows.length) return;
  rows.forEach((row) => {
    if (row.dataset.waveReveal2) return;
    row.dataset.waveReveal2 = '1';
    const children = Array.from(row.children);
    children.forEach((child, i) => {
      if (child.dataset.waveChild) return;
      child.dataset.waveChild = '1';
      child.classList.add('wave-reveal-child');
      child.style.setProperty('--wrc-i', String(i));
    });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(row);
        row.classList.add('wave-reveal--active');
      });
    }, { threshold: 0.15 });
    io.observe(row);
  });
}

function initHoverFloatingLabel() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const inputs = document.querySelectorAll(
    'input[type="text"], input[type="email"], input[type="tel"], textarea, [data-float-label]'
  );
  if (!inputs.length) return;
  inputs.forEach((input) => {
    if (input.dataset.floatLabel) return;
    const wrap = input.parentElement;
    if (!wrap) return;
    input.dataset.floatLabel = '1';
    input.classList.add('float-label-input');
    const check = () => {
      if (input.value || document.activeElement === input) {
        input.classList.add('float-label-input--filled');
      } else {
        input.classList.remove('float-label-input--filled');
      }
    };
    input.addEventListener('focus', check, { passive: true });
    input.addEventListener('blur', check, { passive: true });
    input.addEventListener('input', check, { passive: true });
    check();
  });
}

function initBtnMagneticPull() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(pointer: fine)').matches) return;
  const btns = document.querySelectorAll('.btn, .cta-btn, [data-magnetic]');
  if (!btns.length) return;
  btns.forEach((btn) => {
    if (btn.dataset.magnetic) return;
    btn.dataset.magnetic = '1';
    btn.addEventListener('mousemove', (e) => {
      const r = btn.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width  / 2)) * 0.25;
      const dy = (e.clientY - (r.top  + r.height / 2)) * 0.25;
      btn.style.transform = `translate(${dx}px, ${dy}px)`;
    }, { passive: true });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
    }, { passive: true });
  });
}

/* Sprint 108 — scroll bounce-in, hover text outline, section noise layer */

function initScrollBounceIn() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll(
    '.btn, .cta-btn, .badge, .tag, [data-bounce-in]'
  );
  if (!els.length) return;
  els.forEach((el, i) => {
    if (el.dataset.bounceIn) return;
    el.dataset.bounceIn = '1';
    el.classList.add('scroll-bounce-in');
    el.style.setProperty('--sbi', String(i));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(el);
        el.classList.add('scroll-bounce-in--active');
      });
    }, { threshold: 0.5 });
    io.observe(el);
  });
}

function initHoverTextOutline() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(pointer: fine)').matches) return;
  const headings = document.querySelectorAll(
    'h2, h3, .section-title, [data-text-outline]'
  );
  if (!headings.length) return;
  headings.forEach((el) => {
    if (el.dataset.textOutline) return;
    el.dataset.textOutline = '1';
    el.classList.add('hover-text-outline');
  });
}

function initSectionNoiseLayer() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia('(pointer: coarse)').matches) return; // mobile memory diet
  if (document.querySelector('.section-noise-layer')) return;
  const target = document.querySelector('.hero, body');
  if (!target) return;
  const noise = document.createElement('div');
  noise.className = 'section-noise-layer';
  noise.setAttribute('aria-hidden', 'true');
  if (target.tagName === 'BODY') {
    document.body.insertAdjacentElement('afterbegin', noise);
  } else {
    target.style.position = target.style.position || 'relative';
    target.insertAdjacentElement('afterbegin', noise);
  }
}

/* Sprint 109 — scroll pendulum swing, hover neon badge, bg starfield */

function initScrollPendulumSwing() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll('.card, .service-card, [data-pendulum]');
  if (!els.length) return;
  els.forEach((el, i) => {
    if (el.dataset.pendulum) return;
    el.dataset.pendulum = '1';
    el.classList.add('scroll-pendulum');
    el.style.setProperty('--sp-dir', i % 2 === 0 ? '1' : '-1');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(el);
        el.classList.add('scroll-pendulum--active');
      });
    }, { threshold: 0.2 });
    io.observe(el);
  });
}

function initHoverNeonBadge() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const badges = document.querySelectorAll(
    '.badge, .tag, .label, .chip, [data-neon-badge]'
  );
  if (!badges.length) return;
  badges.forEach((el) => {
    if (el.dataset.neonBadge) return;
    el.dataset.neonBadge = '1';
    el.classList.add('hover-neon-badge');
  });
}

function initBgStarfield() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (document.querySelector('.bg-starfield')) return;
  const hero = document.querySelector('.hero, [data-hero]');
  if (!hero) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'bg-starfield';
  canvas.setAttribute('aria-hidden', 'true');
  hero.style.position = hero.style.position || 'relative';
  hero.style.overflow = hero.style.overflow || 'hidden';
  hero.insertAdjacentElement('afterbegin', canvas);
  const ctx = canvas.getContext('2d');
  const stars = [];
  const NUM = 120;

  const resize = () => {
    canvas.width = hero.offsetWidth;
    canvas.height = hero.offsetHeight;
  };
  resize();
  window.addEventListener('resize', resize, { passive: true });

  for (let i = 0; i < NUM; i++) {
    stars.push({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.2 + 0.3,
      speed: Math.random() * 0.0002 + 0.0001,
      opacity: Math.random() * 0.6 + 0.2,
      phase: Math.random() * Math.PI * 2,
    });
  }

  let frame = 0;
  const tick = () => {
    frame++;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach((s) => {
      const twinkle = s.opacity * (0.6 + 0.4 * Math.sin(frame * s.speed * 60 + s.phase));
      ctx.globalAlpha = twinkle;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(s.x * canvas.width, s.y * canvas.height, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    requestAnimationFrame(tick);
  };
  tick();
}

/* Sprint 110 — scroll door open, hover card depth ring, text shimmer wave */

function initScrollDoorOpen() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const sections = document.querySelectorAll('.section, .ba-section, [data-door-open]');
  if (!sections.length) return;
  sections.forEach((section) => {
    if (section.dataset.doorOpen) return;
    section.dataset.doorOpen = '1';
    section.style.position = section.style.position || 'relative';
    section.style.overflow = section.style.overflow || 'hidden';
    const left = document.createElement('div');
    const right = document.createElement('div');
    left.className = 'door-panel door-panel--left';
    right.className = 'door-panel door-panel--right';
    left.setAttribute('aria-hidden', 'true');
    right.setAttribute('aria-hidden', 'true');
    section.insertAdjacentElement('afterbegin', left);
    section.insertAdjacentElement('afterbegin', right);
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(section);
        section.classList.add('door-open--active');
        const cleanup = () => { left.remove(); right.remove(); };
        left.addEventListener('animationend', cleanup, { once: true });
      });
    }, { threshold: 0.2 });
    io.observe(section);
  });
}

function initHoverCardDepthRing() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(pointer: fine)').matches) return;
  const cards = document.querySelectorAll('.card, .service-card, .ba-card, [data-depth-ring]');
  if (!cards.length) return;
  cards.forEach((card) => {
    if (card.dataset.depthRing) return;
    card.dataset.depthRing = '1';
    card.classList.add('hover-card-depth-ring');
  });
}

function initTextShimmerWave() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll(
    '.hero-subtitle, .section-subtitle, [data-shimmer-wave]'
  );
  if (!els.length) return;
  els.forEach((el) => {
    if (el.dataset.shimmerWave) return;
    el.dataset.shimmerWave = '1';
    el.classList.add('text-shimmer-wave');
  });
}

/* Sprint 111 — scroll accordion reveal, hover glow icon ring, bg mesh gradient */

function initScrollAccordionReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const lists = document.querySelectorAll('ul, ol, [data-accordion-reveal]');
  if (!lists.length) return;
  lists.forEach((list) => {
    if (list.dataset.accordionReveal) return;
    const items = list.querySelectorAll('li');
    if (!items.length) return;
    list.dataset.accordionReveal = '1';
    items.forEach((li, i) => {
      if (li.dataset.accordionItem) return;
      li.dataset.accordionItem = '1';
      li.classList.add('accordion-reveal-item');
      li.style.setProperty('--ari', String(i));
    });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(list);
        list.classList.add('accordion-reveal--active');
      });
    }, { threshold: 0.15 });
    io.observe(list);
  });
}

function initHoverGlowIconRing() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(pointer: fine)').matches) return;
  const icons = document.querySelectorAll(
    '.icon-wrap, .icon-box, [data-glow-icon-ring], .card svg'
  );
  if (!icons.length) return;
  icons.forEach((el) => {
    if (el.dataset.glowIconRing) return;
    el.dataset.glowIconRing = '1';
    el.classList.add('hover-glow-icon-ring');
    const parent = el.closest('.card, .service-card, a, button') || el;
    parent.addEventListener('mouseenter', () => {
      el.classList.add('hover-glow-icon-ring--active');
    }, { passive: true });
    parent.addEventListener('mouseleave', () => {
      el.classList.remove('hover-glow-icon-ring--active');
    }, { passive: true });
  });
}

function initBgMeshGradient() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (document.querySelector('.bg-mesh-gradient')) return;
  const section = document.querySelector('.section:last-of-type, .ba-section:last-of-type, footer');
  if (!section) return;
  section.style.position = section.style.position || 'relative';
  section.style.overflow = section.style.overflow || 'hidden';
  const mesh = document.createElement('div');
  mesh.className = 'bg-mesh-gradient';
  mesh.setAttribute('aria-hidden', 'true');
  section.insertAdjacentElement('afterbegin', mesh);
}

/* Sprint 112 — scroll split wipe, hover card outline draw, bg gradient orbs */

function initScrollSplitWipe() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const headings = document.querySelectorAll('h1, h2, .section-title, [data-split-wipe]');
  if (!headings.length) return;
  headings.forEach((el) => {
    if (el.dataset.splitWipe) return;
    el.dataset.splitWipe = '1';
    el.classList.add('scroll-split-wipe');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(el);
        el.classList.add('scroll-split-wipe--active');
      });
    }, { threshold: 0.4 });
    io.observe(el);
  });
}

function initHoverCardOutlineDraw() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(pointer: fine)').matches) return;
  const cards = document.querySelectorAll('.card, .service-card, .ba-card, [data-outline-draw]');
  if (!cards.length) return;
  cards.forEach((card) => {
    if (card.dataset.outlineDraw) return;
    card.dataset.outlineDraw = '1';
    card.classList.add('hover-card-outline-draw');
    card.addEventListener('mouseenter', () => {
      card.classList.add('hover-card-outline-draw--active');
    }, { passive: true });
    card.addEventListener('mouseleave', () => {
      card.classList.remove('hover-card-outline-draw--active');
    }, { passive: true });
  });
}

function initBgGradientOrbs() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (document.querySelector('.bg-gradient-orb')) return;
  const ORB_CONFIG = [
    { top: '10%', left: '5%',  size: '35vw', color: 'rgba(0,212,200,0.07)',  dur: '14s' },
    { top: '60%', left: '70%', size: '30vw', color: 'rgba(123,92,250,0.06)', dur: '18s' },
    { top: '40%', left: '40%', size: '25vw', color: 'rgba(0,255,213,0.04)',  dur: '22s' },
  ];
  ORB_CONFIG.forEach((cfg, i) => {
    const orb = document.createElement('div');
    orb.className = 'bg-gradient-orb';
    orb.setAttribute('aria-hidden', 'true');
    orb.style.cssText = `top:${cfg.top};left:${cfg.left};width:${cfg.size};height:${cfg.size};background:radial-gradient(circle,${cfg.color} 0%,transparent 70%);animation-duration:${cfg.dur};animation-delay:${i * -4}s`;
    document.body.appendChild(orb);
  });
}

/* Sprint 113 — scroll typewriter reveal, hover fill sweep, bg radial pulse */

function initScrollTypewriterReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll(
    '.hero-subtitle, .section-subtitle, [data-typewriter-reveal]'
  );
  if (!els.length) return;
  els.forEach((el) => {
    if (el.dataset.typewriterReveal) return;
    el.dataset.typewriterReveal = '1';
    const text = el.textContent.trim();
    if (!text) return;
    el.setAttribute('aria-label', text);
    el.textContent = '';
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(el);
        let i = 0;
        const type = () => {
          if (i > text.length) return;
          el.textContent = text.slice(0, i);
          i++;
          setTimeout(type, 28);
        };
        type();
      });
    }, { threshold: 0.5 });
    io.observe(el);
  });
}

function initHoverFillSweep() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const btns = document.querySelectorAll(
    '.btn, .cta-btn, button, [data-fill-sweep]'
  );
  if (!btns.length) return;
  btns.forEach((btn) => {
    if (btn.dataset.fillSweep) return;
    btn.dataset.fillSweep = '1';
    btn.classList.add('hover-fill-sweep');
  });
}

function initBgRadialPulse() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (document.querySelector('.bg-radial-pulse')) return;
  const hero = document.querySelector('.hero, [data-hero]');
  if (!hero) return;
  hero.style.position = hero.style.position || 'relative';
  const pulse = document.createElement('div');
  pulse.className = 'bg-radial-pulse';
  pulse.setAttribute('aria-hidden', 'true');
  hero.insertAdjacentElement('afterbegin', pulse);
}

/* Sprint 114 — scroll zoom-blur reveal, hover text pop, bg grid lines */

function initScrollZoomBlurReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll(
    'img, figure, video, [data-zoom-blur-reveal]'
  );
  if (!els.length) return;
  els.forEach((el) => {
    if (el.dataset.zoomBlurReveal) return;
    el.dataset.zoomBlurReveal = '1';
    el.classList.add('scroll-zoom-blur-reveal');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(el);
        el.classList.add('scroll-zoom-blur-reveal--active');
      });
    }, { threshold: 0.2 });
    io.observe(el);
  });
}

function initHoverTextPop() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(pointer: fine)').matches) return;
  const els = document.querySelectorAll(
    '.card h3, .service-card h3, .card h4, [data-text-pop]'
  );
  if (!els.length) return;
  els.forEach((el) => {
    if (el.dataset.textPop) return;
    el.dataset.textPop = '1';
    const parent = el.closest('.card, .service-card') || el;
    parent.addEventListener('mouseenter', () => {
      el.classList.add('hover-text-pop--active');
    }, { passive: true });
    parent.addEventListener('mouseleave', () => {
      el.classList.remove('hover-text-pop--active');
    }, { passive: true });
  });
}

function initBgGridLines() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (document.querySelector('.bg-grid-lines')) return;
  const grid = document.createElement('div');
  grid.className = 'bg-grid-lines';
  grid.setAttribute('aria-hidden', 'true');
  document.body.insertAdjacentElement('afterbegin', grid);
}

/* Sprint 115 — scroll slide-up fade, hover card glow border, text reveal mask v2 */

function initScrollSlideUpFade() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll(
    '.card > *, .service-card > *, [data-slide-up-fade]'
  );
  if (!els.length) return;
  els.forEach((el, i) => {
    if (el.dataset.slideUpFade) return;
    el.dataset.slideUpFade = '1';
    el.classList.add('scroll-slide-up-fade');
    el.style.setProperty('--sufi', String(i % 6));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(el);
        el.classList.add('scroll-slide-up-fade--active');
      });
    }, { threshold: 0.3 });
    io.observe(el);
  });
}

function initHoverCardGlowBorder() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cards = document.querySelectorAll('.card, .service-card, .ba-card, [data-glow-border]');
  if (!cards.length) return;
  cards.forEach((card) => {
    if (card.dataset.glowBorder) return;
    card.dataset.glowBorder = '1';
    card.classList.add('hover-card-glow-border');
  });
}

function initTextRevealMaskV2() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll('[data-reveal-mask], .reveal-mask');
  if (!els.length) return;
  els.forEach((el) => {
    if (el.dataset.revealMaskV2) return;
    el.dataset.revealMaskV2 = '1';
    el.classList.add('text-reveal-mask-v2');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(el);
        el.classList.add('text-reveal-mask-v2--active');
      });
    }, { threshold: 0.5 });
    io.observe(el);
  });
}

/* Sprint 116 — scroll elastic entry, hover rainbow border, bg dot matrix */

function initScrollElasticEntry() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll(
    '.section-title, h2, h3, [data-elastic-entry]'
  );
  if (!els.length) return;
  els.forEach((el) => {
    if (el.dataset.elasticEntry) return;
    el.dataset.elasticEntry = '1';
    el.classList.add('scroll-elastic-entry');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(el);
        el.classList.add('scroll-elastic-entry--active');
      });
    }, { threshold: 0.3 });
    io.observe(el);
  });
}

function initHoverRainbowBorder() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cards = document.querySelectorAll('.card, .service-card, [data-rainbow-border]');
  if (!cards.length) return;
  cards.forEach((card) => {
    if (card.dataset.rainbowBorder) return;
    card.dataset.rainbowBorder = '1';
    card.classList.add('hover-rainbow-border');
    card.addEventListener('mouseenter', () => {
      card.classList.add('hover-rainbow-border--active');
    }, { passive: true });
    card.addEventListener('mouseleave', () => {
      card.classList.remove('hover-rainbow-border--active');
    }, { passive: true });
  });
}

function initBgDotMatrix() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (document.querySelector('.bg-dot-matrix')) return;
  const dot = document.createElement('div');
  dot.className = 'bg-dot-matrix';
  dot.setAttribute('aria-hidden', 'true');
  document.body.insertAdjacentElement('afterbegin', dot);
}

/* Sprint 117 — scroll orbit reveal, hover ink splatter, bg scan line */

function initScrollOrbitReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll('.card, .service-card, [data-orbit-reveal]');
  if (!els.length) return;
  els.forEach((el, i) => {
    if (el.dataset.orbitReveal) return;
    el.dataset.orbitReveal = '1';
    el.classList.add('scroll-orbit-reveal');
    el.style.setProperty('--orbit-i', i);
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(el);
        el.classList.add('scroll-orbit-reveal--active');
      });
    }, { threshold: 0.2 });
    io.observe(el);
  });
}

function initHoverInkSplatter() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(pointer: fine)').matches) return;
  const btns = document.querySelectorAll('.btn, button, [data-ink-splatter]');
  if (!btns.length) return;
  btns.forEach((btn) => {
    if (btn.dataset.inkSplatter) return;
    btn.dataset.inkSplatter = '1';
    btn.style.overflow = 'hidden';
    btn.style.position = btn.style.position || 'relative';
    btn.addEventListener('click', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const ink = document.createElement('span');
      ink.className = 'ink-splatter-dot';
      ink.style.left = x + 'px';
      ink.style.top = y + 'px';
      btn.appendChild(ink);
      ink.addEventListener('animationend', () => ink.remove(), { once: true });
    }, { passive: true });
  });
}

function initBgScanLine() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (document.querySelector('.bg-scan-line')) return;
  const el = document.createElement('div');
  el.className = 'bg-scan-line';
  el.setAttribute('aria-hidden', 'true');
  document.body.insertAdjacentElement('afterbegin', el);
}

/* Sprint 118 — scroll pendulum entry, hover glow trail v2, bg firefly */

function initScrollPendulumEntry() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll('p, li, [data-pendulum-entry]');
  if (!els.length) return;
  els.forEach((el, i) => {
    if (el.dataset.pendulumEntry) return;
    el.dataset.pendulumEntry = '1';
    el.classList.add('scroll-pendulum-entry');
    el.style.setProperty('--pe-i', i % 8);
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(el);
        el.classList.add('scroll-pendulum-entry--active');
      });
    }, { threshold: 0.25 });
    io.observe(el);
  });
}

function initHoverGlowTrailV2() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(pointer: fine)').matches) return;
  const targets = document.querySelectorAll('.card, .service-card, [data-glow-trail-v2]');
  if (!targets.length) return;
  targets.forEach((el) => {
    if (el.dataset.glowTrailV2) return;
    el.dataset.glowTrailV2 = '1';
    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      el.style.setProperty('--gtv2-x', x + '%');
      el.style.setProperty('--gtv2-y', y + '%');
      el.classList.add('glow-trail-v2--active');
    }, { passive: true });
    el.addEventListener('mouseleave', () => {
      el.classList.remove('glow-trail-v2--active');
    }, { passive: true });
  });
}

function initBgFirefly() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (document.querySelector('.bg-firefly-wrap')) return;
  const wrap = document.createElement('div');
  wrap.className = 'bg-firefly-wrap';
  wrap.setAttribute('aria-hidden', 'true');
  const count = 18;
  for (let i = 0; i < count; i++) {
    const dot = document.createElement('span');
    dot.className = 'bg-firefly-dot';
    dot.style.setProperty('--ff-x', (Math.random() * 100).toFixed(1) + '%');
    dot.style.setProperty('--ff-y', (Math.random() * 100).toFixed(1) + '%');
    dot.style.setProperty('--ff-d', (2.5 + Math.random() * 5).toFixed(2) + 's');
    dot.style.setProperty('--ff-delay', (Math.random() * 5).toFixed(2) + 's');
    wrap.appendChild(dot);
  }
  document.body.insertAdjacentElement('afterbegin', wrap);
}

/* Sprint 119 — scroll shutter reveal, hover magnetic text, bg aurora v2 */

function initScrollShutterReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll('img, .hero-visual, [data-shutter-reveal]');
  if (!els.length) return;
  els.forEach((el) => {
    if (el.dataset.shutterReveal) return;
    el.dataset.shutterReveal = '1';
    el.classList.add('scroll-shutter-reveal');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(el);
        el.classList.add('scroll-shutter-reveal--active');
      });
    }, { threshold: 0.3 });
    io.observe(el);
  });
}

function initHoverMagneticText() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(pointer: fine)').matches) return;
  const els = document.querySelectorAll('.section-title, h2, [data-magnetic-text]');
  if (!els.length) return;
  els.forEach((el) => {
    if (el.dataset.magneticText) return;
    el.dataset.magneticText = '1';
    let rafId = null;
    el.addEventListener('mousemove', (e) => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = (e.clientX - cx) / rect.width * 10;
        const dy = (e.clientY - cy) / rect.height * 6;
        el.style.transform = `translate(${dx}px, ${dy}px)`;
      });
    }, { passive: true });
    el.addEventListener('mouseleave', () => {
      if (rafId) cancelAnimationFrame(rafId);
      el.style.transform = '';
    }, { passive: true });
  });
}

function initBgAuroraV2() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (document.querySelector('.bg-aurora-v2')) return;
  const el = document.createElement('div');
  el.className = 'bg-aurora-v2';
  el.setAttribute('aria-hidden', 'true');
  document.body.insertAdjacentElement('afterbegin', el);
}

/* Sprint 120 — scroll prism split, hover depth shadow, bg nebula */

function initScrollPrismSplit() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll('.section-title, h1, h2, [data-prism-split]');
  if (!els.length) return;
  els.forEach((el) => {
    if (el.dataset.prismSplit) return;
    el.dataset.prismSplit = '1';
    el.classList.add('scroll-prism-split');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(el);
        el.classList.add('scroll-prism-split--active');
      });
    }, { threshold: 0.35 });
    io.observe(el);
  });
}

function initHoverDepthShadow() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(pointer: fine)').matches) return;
  const cards = document.querySelectorAll('.card, .service-card, [data-depth-shadow]');
  if (!cards.length) return;
  cards.forEach((card) => {
    if (card.dataset.depthShadow) return;
    card.dataset.depthShadow = '1';
    let rafId = null;
    card.addEventListener('mousemove', (e) => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect();
        const rx = ((e.clientY - rect.top) / rect.height - 0.5) * 16;
        const ry = ((e.clientX - rect.left) / rect.width - 0.5) * -16;
        const sx = ((e.clientX - rect.left) / rect.width - 0.5) * 20;
        const sy = ((e.clientY - rect.top) / rect.height - 0.5) * 20;
        card.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg)`;
        card.style.boxShadow = `${sx}px ${sy}px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,212,200,0.1)`;
      });
    }, { passive: true });
    card.addEventListener('mouseleave', () => {
      if (rafId) cancelAnimationFrame(rafId);
      card.style.transform = '';
      card.style.boxShadow = '';
    }, { passive: true });
  });
}

function initBgNebula() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (document.querySelector('.bg-nebula')) return;
  const el = document.createElement('div');
  el.className = 'bg-nebula';
  el.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 3; i++) {
    const orb = document.createElement('span');
    orb.className = 'bg-nebula__orb';
    orb.style.setProperty('--nb-i', i);
    el.appendChild(orb);
  }
  document.body.insertAdjacentElement('afterbegin', el);
}

/* Sprint 121 — scroll lens zoom, hover spotlight, bg vhs noise */

function initScrollLensZoom() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll('.card, .service-card, [data-lens-zoom]');
  if (!els.length) return;
  els.forEach((el) => {
    if (el.dataset.lensZoom) return;
    el.dataset.lensZoom = '1';
    el.classList.add('scroll-lens-zoom');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(el);
        el.classList.add('scroll-lens-zoom--active');
      });
    }, { threshold: 0.25 });
    io.observe(el);
  });
}

function initHoverSpotlight() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(pointer: fine)').matches) return;
  const sections = document.querySelectorAll('section, [data-spotlight]');
  if (!sections.length) return;
  sections.forEach((sec) => {
    if (sec.dataset.spotlight) return;
    sec.dataset.spotlight = '1';
    sec.classList.add('hover-spotlight');
    sec.addEventListener('mousemove', (e) => {
      const rect = sec.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      sec.style.setProperty('--sl-x', x + 'px');
      sec.style.setProperty('--sl-y', y + 'px');
      sec.classList.add('hover-spotlight--active');
    }, { passive: true });
    sec.addEventListener('mouseleave', () => {
      sec.classList.remove('hover-spotlight--active');
    }, { passive: true });
  });
}

function initBgVhsNoise() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia('(pointer: coarse)').matches) return; // mobile memory diet
  if (document.querySelector('.bg-vhs-noise')) return;
  const el = document.createElement('div');
  el.className = 'bg-vhs-noise';
  el.setAttribute('aria-hidden', 'true');
  document.body.insertAdjacentElement('afterbegin', el);
}

/* Sprint 122 — scroll typewriter v2, hover color shift, bg plasma */

function initScrollTypewriterV2() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll('[data-typewriter-v2]');
  if (!els.length) return;
  els.forEach((el) => {
    if (el.dataset.typewriterV2Init) return;
    el.dataset.typewriterV2Init = '1';
    const text = el.textContent;
    el.textContent = '';
    el.classList.add('scroll-typewriter-v2');
    let started = false;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting || started) return;
        started = true;
        io.unobserve(el);
        let i = 0;
        const tick = () => {
          if (i <= text.length) {
            el.textContent = text.slice(0, i);
            i++;
            requestAnimationFrame(() => setTimeout(tick, 38));
          }
        };
        tick();
      });
    }, { threshold: 0.5 });
    io.observe(el);
  });
}

function initHoverColorShift() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll('.btn, .section-title, [data-color-shift]');
  if (!els.length) return;
  els.forEach((el) => {
    if (el.dataset.colorShift) return;
    el.dataset.colorShift = '1';
    el.classList.add('hover-color-shift');
  });
}

function initBgPlasma() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (document.querySelector('.bg-plasma')) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'bg-plasma';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.insertAdjacentElement('afterbegin', canvas);
  const ctx = canvas.getContext('2d');
  let t = 0;
  const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
  resize();
  window.addEventListener('resize', resize, { passive: true });
  const draw = () => {
    const w = canvas.width, h = canvas.height;
    const img = ctx.createImageData(w, h);
    const d = img.data;
    for (let y = 0; y < h; y += 4) {
      for (let x = 0; x < w; x += 4) {
        const v = Math.sin(x / 80 + t) + Math.sin(y / 60 + t * 0.7) + Math.sin((x + y) / 100 + t * 0.5);
        const r = Math.floor((Math.sin(v * Math.PI) + 1) * 4);
        const g = Math.floor((Math.sin(v * Math.PI + 2) + 1) * 6);
        const b = Math.floor((Math.sin(v * Math.PI + 4) + 1) * 8);
        for (let dy = 0; dy < 4 && y + dy < h; dy++) {
          for (let dx = 0; dx < 4 && x + dx < w; dx++) {
            const idx = ((y + dy) * w + (x + dx)) * 4;
            d[idx] = r; d[idx + 1] = g; d[idx + 2] = b; d[idx + 3] = 255;
          }
        }
      }
    }
    ctx.putImageData(img, 0, 0);
    t += 0.008;
    requestAnimationFrame(draw);
  };
  draw();
}

/* Sprint 123 — scroll curtain lift, hover border dash, bg grid pulse */

function initScrollCurtainLift() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll('section, .section-wrap, [data-curtain-lift]');
  if (!els.length) return;
  els.forEach((el) => {
    if (el.dataset.curtainLift) return;
    el.dataset.curtainLift = '1';
    el.classList.add('scroll-curtain-lift');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(el);
        el.classList.add('scroll-curtain-lift--active');
      });
    }, { threshold: 0.15 });
    io.observe(el);
  });
}

function initHoverBorderDash() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll('.card, .service-card, [data-border-dash]');
  if (!els.length) return;
  els.forEach((el) => {
    if (el.dataset.borderDash) return;
    el.dataset.borderDash = '1';
    el.classList.add('hover-border-dash');
  });
}

function initBgGridPulse() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (document.querySelector('.bg-grid-pulse')) return;
  const el = document.createElement('div');
  el.className = 'bg-grid-pulse';
  el.setAttribute('aria-hidden', 'true');
  document.body.insertAdjacentElement('afterbegin', el);
}

/* Sprint 124 — scroll wave text, hover neon glow, bg constellation */

function initScrollWaveText() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll('.section-title, h2, [data-wave-text]');
  if (!els.length) return;
  els.forEach((el) => {
    if (el.dataset.waveText) return;
    el.dataset.waveText = '1';
    const text = el.textContent.trim();
    el.textContent = '';
    el.setAttribute('aria-label', text);
    text.split('').forEach((ch, i) => {
      const span = document.createElement('span');
      span.textContent = ch === ' ' ? ' ' : ch;
      span.className = 'wave-text-char';
      span.style.setProperty('--wtc-i', i);
      span.setAttribute('aria-hidden', 'true');
      el.appendChild(span);
    });
    el.classList.add('scroll-wave-text');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(el);
        el.classList.add('scroll-wave-text--active');
      });
    }, { threshold: 0.4 });
    io.observe(el);
  });
}

function initHoverNeonGlow() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll('.btn, [data-neon-glow]');
  if (!els.length) return;
  els.forEach((el) => {
    if (el.dataset.neonGlow) return;
    el.dataset.neonGlow = '1';
    el.classList.add('hover-neon-glow');
  });
}

function initBgConstellation() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (document.querySelector('.bg-constellation')) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'bg-constellation';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.insertAdjacentElement('afterbegin', canvas);
  const ctx = canvas.getContext('2d');
  const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
  resize();
  window.addEventListener('resize', resize, { passive: true });
  const stars = Array.from({ length: 60 }, () => ({
    x: Math.random(), y: Math.random(),
    vx: (Math.random() - 0.5) * 0.0002, vy: (Math.random() - 0.5) * 0.0002,
  }));
  const draw = () => {
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    stars.forEach((s) => {
      s.x = (s.x + s.vx + 1) % 1;
      s.y = (s.y + s.vy + 1) % 1;
    });
    stars.forEach((a, i) => {
      stars.forEach((b, j) => {
        if (j <= i) return;
        const dx = (a.x - b.x) * w, dy = (a.y - b.y) * h;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 120) return;
        ctx.beginPath();
        ctx.moveTo(a.x * w, a.y * h);
        ctx.lineTo(b.x * w, b.y * h);
        ctx.strokeStyle = `rgba(0,212,200,${0.12 * (1 - dist / 120)})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      });
      ctx.beginPath();
      ctx.arc(a.x * w, a.y * h, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,212,200,0.4)';
      ctx.fill();
    });
    requestAnimationFrame(draw);
  };
  draw();
}

/* Sprint 125 — scroll stack reveal, hover shimmer border, bg matrix rain */

function initScrollStackReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const groups = document.querySelectorAll('.cards-grid, .services-grid, [data-stack-reveal]');
  if (!groups.length) return;
  groups.forEach((group) => {
    if (group.dataset.stackReveal) return;
    group.dataset.stackReveal = '1';
    const children = Array.from(group.children);
    children.forEach((child, i) => {
      child.classList.add('stack-reveal-item');
      child.style.setProperty('--sri', i);
    });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(group);
        group.classList.add('stack-reveal--active');
      });
    }, { threshold: 0.1 });
    io.observe(group);
  });
}

function initHoverShimmerBorder() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll('.card, .service-card, [data-shimmer-border]');
  if (!els.length) return;
  els.forEach((el) => {
    if (el.dataset.shimmerBorder) return;
    el.dataset.shimmerBorder = '1';
    el.classList.add('hover-shimmer-border');
  });
}

function initBgMatrixRain() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (document.querySelector('.bg-matrix-rain')) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'bg-matrix-rain';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.insertAdjacentElement('afterbegin', canvas);
  const ctx = canvas.getContext('2d');
  const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
  resize();
  window.addEventListener('resize', resize, { passive: true });
  const cols = Math.floor(canvas.width / 18);
  const drops = Array.from({ length: cols }, () => Math.random() * -50);
  const chars = '0I10::.∙·';
  const draw = () => {
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = '11px monospace';
    drops.forEach((y, i) => {
      const ch = chars[Math.floor(Math.random() * chars.length)];
      const alpha = 0.06 + Math.random() * 0.06;
      ctx.fillStyle = `rgba(0,212,200,${alpha})`;
      ctx.fillText(ch, i * 18, y * 18);
      if (y * 18 > canvas.height && Math.random() > 0.975) drops[i] = 0;
      else drops[i] = y + 0.4;
    });
    requestAnimationFrame(draw);
  };
  draw();
}

/* Sprint 126 — scroll morph path, hover liquid btn, bg gradient flow */

function initScrollMorphPath() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll('.section-title, h2, h3, [data-morph-path]');
  if (!els.length) return;
  els.forEach((el) => {
    if (el.dataset.morphPath) return;
    el.dataset.morphPath = '1';
    el.classList.add('scroll-morph-path');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(el);
        el.classList.add('scroll-morph-path--active');
      });
    }, { threshold: 0.4 });
    io.observe(el);
  });
}

function initHoverLiquidBtn() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(pointer: fine)').matches) return;
  const btns = document.querySelectorAll('.btn, button, [data-liquid-btn]');
  if (!btns.length) return;
  btns.forEach((btn) => {
    if (btn.dataset.liquidBtn) return;
    btn.dataset.liquidBtn = '1';
    btn.classList.add('hover-liquid-btn');
    btn.addEventListener('mouseenter', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width * 100).toFixed(1);
      const y = ((e.clientY - rect.top) / rect.height * 100).toFixed(1);
      btn.style.setProperty('--lbx', x + '%');
      btn.style.setProperty('--lby', y + '%');
      btn.classList.add('hover-liquid-btn--active');
    }, { passive: true });
    btn.addEventListener('mouseleave', () => {
      btn.classList.remove('hover-liquid-btn--active');
    }, { passive: true });
  });
}

function initBgGradientFlow() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (document.querySelector('.bg-gradient-flow')) return;
  const el = document.createElement('div');
  el.className = 'bg-gradient-flow';
  el.setAttribute('aria-hidden', 'true');
  document.body.insertAdjacentElement('afterbegin', el);
}

/* Sprint 127 — scroll fan cards, hover ripple expand, bg holo foil */

function initScrollFanCards() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const groups = document.querySelectorAll('.cards-grid, .services-grid, [data-fan-cards]');
  if (!groups.length) return;
  groups.forEach((group) => {
    if (group.dataset.fanCards) return;
    group.dataset.fanCards = '1';
    const items = Array.from(group.children);
    const mid = (items.length - 1) / 2;
    items.forEach((item, i) => {
      item.classList.add('fan-card-item');
      item.style.setProperty('--fc-i', i);
      item.style.setProperty('--fc-rot', ((i - mid) * 4).toFixed(1) + 'deg');
    });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(group);
        group.classList.add('fan-cards--active');
      });
    }, { threshold: 0.1 });
    io.observe(group);
  });
}

function initHoverRippleExpand() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll('.card, .service-card, [data-ripple-expand]');
  if (!els.length) return;
  els.forEach((el) => {
    if (el.dataset.rippleExpand) return;
    el.dataset.rippleExpand = '1';
    el.style.overflow = 'hidden';
    el.style.position = el.style.position || 'relative';
    el.addEventListener('mouseenter', (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const ripple = document.createElement('span');
      ripple.className = 'ripple-expand-dot';
      ripple.style.left = x + 'px';
      ripple.style.top = y + 'px';
      el.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
    }, { passive: true });
  });
}

function initBgHoloFoil() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (document.querySelector('.bg-holo-foil')) return;
  const el = document.createElement('div');
  el.className = 'bg-holo-foil';
  el.setAttribute('aria-hidden', 'true');
  document.body.insertAdjacentElement('afterbegin', el);
}

/* Sprint 128 — scroll glitch entry, hover chromatic aberration, bg particle field */

function initScrollGlitchEntry() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll('.section-title, h2, [data-glitch-entry]');
  if (!els.length) return;
  els.forEach((el) => {
    if (el.dataset.glitchEntry) return;
    el.dataset.glitchEntry = '1';
    el.classList.add('scroll-glitch-entry');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(el);
        el.classList.add('scroll-glitch-entry--active');
        el.addEventListener('animationend', () => {
          el.classList.remove('scroll-glitch-entry--active', 'scroll-glitch-entry');
        }, { once: true });
      });
    }, { threshold: 0.4 });
    io.observe(el);
  });
}

function initHoverChromaticAberration() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(pointer: fine)').matches) return;
  const els = document.querySelectorAll('.section-title, h1, h2, [data-chromatic]');
  if (!els.length) return;
  els.forEach((el) => {
    if (el.dataset.chromatic) return;
    el.dataset.chromatic = '1';
    el.classList.add('hover-chromatic');
  });
}

function initBgParticleField() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (document.querySelector('.bg-particle-field')) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'bg-particle-field';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.insertAdjacentElement('afterbegin', canvas);
  const ctx = canvas.getContext('2d');
  const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
  resize();
  window.addEventListener('resize', resize, { passive: true });
  const particles = Array.from({ length: 80 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: 1 + Math.random() * 2,
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4,
    alpha: 0.1 + Math.random() * 0.25,
  }));
  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p) => {
      p.x = (p.x + p.vx + canvas.width) % canvas.width;
      p.y = (p.y + p.vy + canvas.height) % canvas.height;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,212,200,${p.alpha})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  };
  draw();
}

/* Sprint 129 — scroll accordion stagger, hover glow icon ring v2, bg circuit trace */

function initScrollAccordionStagger() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const lists = document.querySelectorAll('ul, ol, [data-accordion-stagger]');
  if (!lists.length) return;
  lists.forEach((list) => {
    if (list.dataset.accordionStagger) return;
    list.dataset.accordionStagger = '1';
    const items = Array.from(list.querySelectorAll('li'));
    if (!items.length) return;
    items.forEach((li, i) => {
      li.classList.add('accordion-stagger-item');
      li.style.setProperty('--asi', i);
    });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(list);
        list.classList.add('accordion-stagger--active');
      });
    }, { threshold: 0.15 });
    io.observe(list);
  });
}

function initHoverGlowIconRingV2() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const icons = document.querySelectorAll('svg, img[src*="icon"], [data-glow-icon-v2]');
  if (!icons.length) return;
  icons.forEach((icon) => {
    if (icon.dataset.glowIconV2) return;
    icon.dataset.glowIconV2 = '1';
    icon.classList.add('hover-glow-icon-v2');
  });
}

function initBgCircuitTrace() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (document.querySelector('.bg-circuit-trace')) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'bg-circuit-trace';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.insertAdjacentElement('afterbegin', canvas);
  const ctx = canvas.getContext('2d');
  const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
  resize();
  window.addEventListener('resize', resize, { passive: true });
  const traces = Array.from({ length: 12 }, (_, i) => ({
    x: (Math.random() * canvas.width) | 0,
    y: (Math.random() * canvas.height) | 0,
    len: 60 + Math.random() * 120,
    dir: Math.random() > 0.5 ? 'h' : 'v',
    progress: 0,
    speed: 0.5 + Math.random() * 1,
    alpha: 0.05 + Math.random() * 0.08,
    delay: Math.random() * 120,
  }));
  let frame = 0;
  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    frame++;
    traces.forEach((t) => {
      if (frame < t.delay) return;
      t.progress = Math.min(t.progress + t.speed, t.len);
      ctx.beginPath();
      if (t.dir === 'h') {
        ctx.moveTo(t.x, t.y);
        ctx.lineTo(t.x + t.progress, t.y);
      } else {
        ctx.moveTo(t.x, t.y);
        ctx.lineTo(t.x, t.y + t.progress);
      }
      ctx.strokeStyle = `rgba(0,212,200,${t.alpha})`;
      ctx.lineWidth = 1;
      ctx.stroke();
      if (t.progress >= t.len) {
        t.x = (Math.random() * canvas.width) | 0;
        t.y = (Math.random() * canvas.height) | 0;
        t.progress = 0;
        t.delay = frame + Math.random() * 60;
      }
    });
    requestAnimationFrame(draw);
  };
  draw();
}

/* Sprint 130 — scroll tilt card, hover border beam, bg lava lamp */

function initScrollTiltCard() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll('.card, .service-card, [data-tilt-card]');
  if (!els.length) return;
  els.forEach((el, i) => {
    if (el.dataset.tiltCard) return;
    el.dataset.tiltCard = '1';
    el.classList.add('scroll-tilt-card');
    el.style.setProperty('--tc-i', i % 2 === 0 ? '1' : '-1');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(el);
        el.classList.add('scroll-tilt-card--active');
      });
    }, { threshold: 0.2 });
    io.observe(el);
  });
}

function initHoverBorderBeam() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll('.btn, .card, [data-border-beam]');
  if (!els.length) return;
  els.forEach((el) => {
    if (el.dataset.borderBeam) return;
    el.dataset.borderBeam = '1';
    el.classList.add('hover-border-beam');
  });
}

function initBgLavaLamp() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (document.querySelector('.bg-lava-lamp')) return;
  const wrap = document.createElement('div');
  wrap.className = 'bg-lava-lamp';
  wrap.setAttribute('aria-hidden', 'true');
  const blobs = [
    { c: '#00d4c8', w: 420, h: 420, tx: '10%', ty: '5%', d: '16s' },
    { c: '#7b5cfa', w: 360, h: 360, tx: '65%', ty: '40%', d: '22s' },
    { c: '#ff6b9d', w: 300, h: 300, tx: '30%', ty: '70%', d: '18s' },
  ];
  blobs.forEach((b, i) => {
    const el = document.createElement('div');
    el.className = 'bg-lava-lamp__blob';
    el.style.cssText = `width:${b.w}px;height:${b.h}px;background:${b.c};left:${b.tx};top:${b.ty};animation-duration:${b.d};animation-delay:-${i * 5}s`;
    wrap.appendChild(el);
  });
  document.body.insertAdjacentElement('afterbegin', wrap);
}

/* Sprint 131 — scroll reveal counter, hover underline wave, bg static burst */

function initScrollRevealCounter() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll('[data-count-to]');
  if (!els.length) return;
  els.forEach((el) => {
    if (el.dataset.countInit) return;
    el.dataset.countInit = '1';
    const target = parseInt(el.dataset.countTo, 10);
    if (isNaN(target)) return;
    const duration = 1400;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(el);
        const start = performance.now();
        const tick = (now) => {
          const elapsed = Math.min(now - start, duration);
          const progress = 1 - Math.pow(1 - elapsed / duration, 3);
          el.textContent = Math.round(progress * target).toLocaleString();
          if (elapsed < duration) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.5 });
    io.observe(el);
  });
}

function initHoverUnderlineWave() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll('a, .nav-link, [data-underline-wave]');
  if (!els.length) return;
  els.forEach((el) => {
    if (el.dataset.underlineWave) return;
    el.dataset.underlineWave = '1';
    el.classList.add('hover-underline-wave');
  });
}

function initBgStaticBurst() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (document.querySelector('.bg-static-burst')) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'bg-static-burst';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.insertAdjacentElement('afterbegin', canvas);
  const ctx = canvas.getContext('2d');
  const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
  resize();
  window.addEventListener('resize', resize, { passive: true });
  let t = 0;
  const draw = () => {
    if (t % 4 === 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const count = 60;
      for (let i = 0; i < count; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const r = Math.random() * 2;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,212,200,${0.04 + Math.random() * 0.06})`;
        ctx.fill();
      }
    }
    t++;
    requestAnimationFrame(draw);
  };
  draw();
}

/* Sprint 132 — scroll spring pop, hover gradient text, bg warp grid */

function initScrollSpringPop() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll('.card, .service-card, [data-spring-pop]');
  if (!els.length) return;
  els.forEach((el, i) => {
    if (el.dataset.springPop) return;
    el.dataset.springPop = '1';
    el.classList.add('scroll-spring-pop');
    el.style.setProperty('--spp-i', i % 6);
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(el);
        el.classList.add('scroll-spring-pop--active');
      });
    }, { threshold: 0.2 });
    io.observe(el);
  });
}

function initHoverGradientText() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll('.section-title, h1, h2, [data-gradient-text]');
  if (!els.length) return;
  els.forEach((el) => {
    if (el.dataset.gradientText) return;
    el.dataset.gradientText = '1';
    el.classList.add('hover-gradient-text');
  });
}

function initBgWarpGrid() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (document.querySelector('.bg-warp-grid')) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'bg-warp-grid';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.insertAdjacentElement('afterbegin', canvas);
  const ctx = canvas.getContext('2d');
  const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
  resize();
  window.addEventListener('resize', resize, { passive: true });
  let t = 0;
  const STEP = 48;
  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(0,212,200,0.06)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= canvas.width; x += STEP) {
      ctx.beginPath();
      for (let y = 0; y <= canvas.height; y += 4) {
        const warp = Math.sin((y / canvas.height) * Math.PI * 2 + t) * 6;
        if (y === 0) ctx.moveTo(x + warp, y);
        else ctx.lineTo(x + warp, y);
      }
      ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += STEP) {
      ctx.beginPath();
      for (let x = 0; x <= canvas.width; x += 4) {
        const warp = Math.sin((x / canvas.width) * Math.PI * 2 + t * 0.7) * 6;
        if (x === 0) ctx.moveTo(x, y + warp);
        else ctx.lineTo(x, y + warp);
      }
      ctx.stroke();
    }
    t += 0.012;
    requestAnimationFrame(draw);
  };
  draw();
}

/* Sprint 133 — scroll cascade fade, hover icon bounce, bg hex grid */

function initScrollCascadeFade() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const containers = document.querySelectorAll('section, .section-wrap, [data-cascade-fade]');
  if (!containers.length) return;
  containers.forEach((container) => {
    if (container.dataset.cascadeFade) return;
    container.dataset.cascadeFade = '1';
    const children = Array.from(container.children);
    children.forEach((child, i) => {
      if (child.dataset.cascadeChild) return;
      child.dataset.cascadeChild = '1';
      child.classList.add('cascade-fade-child');
      child.style.setProperty('--cfc-i', i);
    });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(container);
        container.classList.add('cascade-fade--active');
      });
    }, { threshold: 0.1 });
    io.observe(container);
  });
}

function initHoverIconBounce() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const icons = document.querySelectorAll('svg, img[alt*="icon"], [data-icon-bounce]');
  if (!icons.length) return;
  icons.forEach((icon) => {
    if (icon.dataset.iconBounce) return;
    icon.dataset.iconBounce = '1';
    icon.classList.add('hover-icon-bounce');
  });
}

function initBgHexGrid() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (document.querySelector('.bg-hex-grid')) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'bg-hex-grid';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.insertAdjacentElement('afterbegin', canvas);
  const ctx = canvas.getContext('2d');
  const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
  resize();
  window.addEventListener('resize', resize, { passive: true });
  const R = 30;
  const W = R * 2;
  const H = Math.sqrt(3) * R;
  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(0,212,200,0.05)';
    ctx.lineWidth = 0.7;
    for (let row = -1; row < canvas.height / H + 1; row++) {
      for (let col = -1; col < canvas.width / (W * 0.75) + 1; col++) {
        const x = col * W * 0.75;
        const y = row * H + (col % 2 === 0 ? 0 : H / 2);
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const angle = (Math.PI / 3) * k - Math.PI / 6;
          const px = x + R * Math.cos(angle);
          const py = y + R * Math.sin(angle);
          if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }
    }
  };
  draw();
  window.addEventListener('resize', draw, { passive: true });
}

/* Sprint 134 — scroll zoom blur in, hover text scramble, bg pulse ring */

function initScrollZoomBlurIn() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll('img, video, .hero-visual, [data-zoom-blur-in]');
  if (!els.length) return;
  els.forEach((el) => {
    if (el.dataset.zoomBlurIn) return;
    el.dataset.zoomBlurIn = '1';
    el.classList.add('scroll-zoom-blur-in');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(el);
        el.classList.add('scroll-zoom-blur-in--active');
      });
    }, { threshold: 0.3 });
    io.observe(el);
  });
}

function initHoverTextScramble() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(pointer: fine)').matches) return;
  const els = document.querySelectorAll('.btn, [data-text-scramble]');
  if (!els.length) return;
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
  els.forEach((el) => {
    if (el.dataset.textScramble) return;
    el.dataset.textScramble = '1';
    const original = el.textContent;
    let rafId = null;
    let frame = 0;
    el.addEventListener('mouseenter', () => {
      frame = 0;
      const scramble = () => {
        el.textContent = original.split('').map((ch, i) => {
          if (ch === ' ') return ' ';
          if (frame / 2 > i) return original[i];
          return chars[Math.floor(Math.random() * chars.length)];
        }).join('');
        frame++;
        if (frame < original.length * 2) rafId = requestAnimationFrame(scramble);
        else el.textContent = original;
      };
      rafId = requestAnimationFrame(scramble);
    }, { passive: true });
    el.addEventListener('mouseleave', () => {
      if (rafId) cancelAnimationFrame(rafId);
      el.textContent = original;
    }, { passive: true });
  });
}

function initBgPulseRing() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (document.querySelector('.bg-pulse-ring')) return;
  const wrap = document.createElement('div');
  wrap.className = 'bg-pulse-ring';
  wrap.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 3; i++) {
    const ring = document.createElement('span');
    ring.className = 'bg-pulse-ring__ring';
    ring.style.setProperty('--pr-i', i);
    wrap.appendChild(ring);
  }
  document.body.insertAdjacentElement('afterbegin', wrap);
}

/* Sprint 135 — scroll flip x, hover border glow sweep, bg rain drops */

function initScrollFlipX() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll('.card, .service-card, [data-flip-x]');
  if (!els.length) return;
  els.forEach((el, i) => {
    if (el.dataset.flipX) return;
    el.dataset.flipX = '1';
    el.classList.add('scroll-flip-x');
    el.style.setProperty('--fx-i', i);
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(el);
        el.classList.add('scroll-flip-x--active');
      });
    }, { threshold: 0.25 });
    io.observe(el);
  });
}

function initHoverBorderGlowSweep() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(pointer: fine)').matches) return;
  const els = document.querySelectorAll('.card, .service-card, [data-border-glow-sweep]');
  if (!els.length) return;
  els.forEach((el) => {
    if (el.dataset.borderGlowSweep) return;
    el.dataset.borderGlowSweep = '1';
    el.classList.add('hover-border-glow-sweep');
    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width * 100).toFixed(1);
      const y = ((e.clientY - rect.top) / rect.height * 100).toFixed(1);
      el.style.setProperty('--bgs-x', x + '%');
      el.style.setProperty('--bgs-y', y + '%');
    }, { passive: true });
  });
}

function initBgRainDrops() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (document.querySelector('.bg-rain-drops')) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'bg-rain-drops';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.insertAdjacentElement('afterbegin', canvas);
  const ctx = canvas.getContext('2d');
  const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
  resize();
  window.addEventListener('resize', resize, { passive: true });
  const drops = Array.from({ length: 40 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    len: 10 + Math.random() * 20,
    speed: 1.5 + Math.random() * 2.5,
    alpha: 0.04 + Math.random() * 0.06,
  }));
  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drops.forEach((d) => {
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - 1, d.y + d.len);
      ctx.strokeStyle = `rgba(0,212,200,${d.alpha})`;
      ctx.lineWidth = 0.8;
      ctx.stroke();
      d.y += d.speed;
      if (d.y > canvas.height) {
        d.y = -d.len;
        d.x = Math.random() * canvas.width;
      }
    });
    requestAnimationFrame(draw);
  };
  draw();
}

/* Sprint 136 — scroll blur panel, hover scale pop, bg comet trail */

function initScrollBlurPanel() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll('section, .panel, [data-blur-panel]');
  if (!els.length) return;
  els.forEach((el) => {
    if (el.dataset.blurPanel) return;
    el.dataset.blurPanel = '1';
    el.classList.add('scroll-blur-panel');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(el);
        el.classList.add('scroll-blur-panel--active');
      });
    }, { threshold: 0.15 });
    io.observe(el);
  });
}

function initHoverScalePop() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll('.card, .service-card, [data-scale-pop]');
  if (!els.length) return;
  els.forEach((el) => {
    if (el.dataset.scalePop) return;
    el.dataset.scalePop = '1';
    el.classList.add('hover-scale-pop');
  });
}

function initBgCometTrail() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (document.querySelector('.bg-comet-trail')) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'bg-comet-trail';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.insertAdjacentElement('afterbegin', canvas);
  const ctx = canvas.getContext('2d');
  const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
  resize();
  window.addEventListener('resize', resize, { passive: true });
  const comets = Array.from({ length: 5 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height * 0.5,
    vx: 3 + Math.random() * 4,
    vy: 1.5 + Math.random() * 2,
    tail: 80 + Math.random() * 60,
    alpha: 0.15 + Math.random() * 0.15,
    delay: Math.random() * 180,
  }));
  let frame = 0;
  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    frame++;
    comets.forEach((c) => {
      if (frame < c.delay) return;
      const grad = ctx.createLinearGradient(c.x - c.tail, c.y - c.tail * 0.5, c.x, c.y);
      grad.addColorStop(0, `rgba(0,212,200,0)`);
      grad.addColorStop(1, `rgba(0,212,200,${c.alpha})`);
      ctx.beginPath();
      ctx.moveTo(c.x - c.tail, c.y - c.tail * 0.5);
      ctx.lineTo(c.x, c.y);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      c.x += c.vx;
      c.y += c.vy;
      if (c.x > canvas.width + c.tail || c.y > canvas.height + c.tail) {
        c.x = -c.tail;
        c.y = Math.random() * canvas.height * 0.6;
        c.delay = frame + Math.random() * 120;
      }
    });
    requestAnimationFrame(draw);
  };
  draw();
}

/* Sprint 137 — scroll reveal words, hover glow ring, bg ink wash */

function initScrollRevealWords() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll('[data-reveal-words], .section-body p, .about-body p, .hero-subtitle');
  if (!els.length) return;
  els.forEach((el) => {
    if (el.dataset.revealWords || el.children.length) return;
    el.dataset.revealWords = '1';
    const text = el.textContent.trim();
    const words = text.split(/\s+/);
    if (words.length < 3) return;
    el.textContent = '';
    el.setAttribute('aria-label', text);
    words.forEach((word, i) => {
      if (i > 0) el.appendChild(document.createTextNode(' '));
      const span = document.createElement('span');
      span.textContent = word;
      span.className = 'reveal-word';
      span.style.setProperty('--rw-i', i);
      span.setAttribute('aria-hidden', 'true');
      el.appendChild(span);
    });
    el.classList.add('scroll-reveal-words');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(el);
        el.classList.add('scroll-reveal-words--active');
      });
    }, { threshold: 0.3 });
    io.observe(el);
  });
}

function initHoverGlowRing() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll('.btn, [data-glow-ring]');
  if (!els.length) return;
  els.forEach((el) => {
    if (el.dataset.glowRing) return;
    el.dataset.glowRing = '1';
    el.classList.add('hover-glow-ring');
  });
}

function initBgInkWash() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (document.querySelector('.bg-ink-wash')) return;
  const el = document.createElement('div');
  el.className = 'bg-ink-wash';
  el.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 4; i++) {
    const blob = document.createElement('span');
    blob.className = 'bg-ink-wash__blob';
    blob.style.setProperty('--iw-i', i);
    el.appendChild(blob);
  }
  document.body.insertAdjacentElement('afterbegin', el);
}

/* Sprint 138 — scroll fade-slide, magnetic glow hover, ambient wave bg -------- */

function initScrollFadeSlide() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll('.section__heading, .bento-card, .process__step, .pricing-card');
  if (!els.length) return;
  els.forEach((el, i) => {
    if (el.dataset.fadeSlide) return;
    el.dataset.fadeSlide = '1';
    el.dataset.fadeSlideDir = i % 2 === 0 ? 'left' : 'right';
    el.classList.add('scroll-fade-slide');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(el);
        el.classList.add('scroll-fade-slide--in');
      });
    }, { threshold: 0.15 });
    io.observe(el);
  });
}

function initHoverMagneticGlow() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(pointer: fine)').matches) return;
  const cards = document.querySelectorAll('.bento-card, .pricing-card, .process__step');
  if (!cards.length) return;
  cards.forEach((card) => {
    if (card.dataset.magGlow) return;
    card.dataset.magGlow = '1';
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty('--mg-x', `${x}%`);
      card.style.setProperty('--mg-y', `${y}%`);
      card.classList.add('mag-glow--active');
    });
    card.addEventListener('mouseleave', () => {
      card.classList.remove('mag-glow--active');
    });
  });
}

function initBgAmbientWave() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (document.querySelector('.bg-ambient-wave')) return;
  const el = document.createElement('div');
  el.className = 'bg-ambient-wave';
  el.setAttribute('aria-hidden', 'true');
  document.body.insertAdjacentElement('afterbegin', el);
}

/* Sprint 139 — text morph counter, neon border trail hover, grid reveal bg ---- */

function initScrollCountMorph() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll('[data-count-morph]');
  if (!els.length) return;
  els.forEach((el) => {
    if (el.dataset.countMorphInit) return;
    el.dataset.countMorphInit = '1';
    const target = parseFloat(el.dataset.countMorph) || 0;
    const suffix = el.dataset.countSuffix || '';
    const duration = 1400;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(el);
        const start = performance.now();
        const tick = (now) => {
          const t = Math.min((now - start) / duration, 1);
          const ease = 1 - Math.pow(1 - t, 3);
          const val = target * ease;
          el.textContent = (Number.isInteger(target) ? Math.round(val) : val.toFixed(1)) + suffix;
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.5 });
    io.observe(el);
  });
}

function initHoverNeonBorderTrail() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(pointer: fine)').matches) return;
  const btns = document.querySelectorAll('.btn, [data-neon-trail]');
  if (!btns.length) return;
  btns.forEach((btn) => {
    if (btn.dataset.neonTrail) return;
    btn.dataset.neonTrail = '1';
    btn.classList.add('hover-neon-trail');
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      btn.style.setProperty('--nt-x', `${x}%`);
      btn.style.setProperty('--nt-y', `${y}%`);
    });
  });
}

function initBgGridReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (document.querySelector('.bg-grid-reveal')) return;
  const el = document.createElement('div');
  el.className = 'bg-grid-reveal';
  el.setAttribute('aria-hidden', 'true');
  document.body.insertAdjacentElement('afterbegin', el);
}

/* Sprint 140 — multi-layer scroll parallax, card spotlight reveal, aurora pulse bg */

function initScrollMultiParallax() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const layers = document.querySelectorAll('[data-parallax-speed]');
  if (!layers.length) return;
  let ticking = false;
  const update = () => {
    const sy = window.scrollY;
    layers.forEach((el) => {
      if (el.dataset.parallaxInit) return;
      el.dataset.parallaxInit = '1';
    });
    layers.forEach((el) => {
      const speed = parseFloat(el.dataset.parallaxSpeed) || 0.1;
      el.style.transform = `translateY(${sy * speed}px)`;
    });
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  update();
}

function initHoverSpotlightReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(pointer: fine)').matches) return;
  const cards = document.querySelectorAll('.bento-card, .pricing-card');
  if (!cards.length) return;
  cards.forEach((card) => {
    if (card.dataset.spotReveal) return;
    card.dataset.spotReveal = '1';
    const overlay = document.createElement('div');
    overlay.className = 'spot-reveal-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    card.style.position = 'relative';
    card.appendChild(overlay);
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      overlay.style.setProperty('--sr-x', `${e.clientX - rect.left}px`);
      overlay.style.setProperty('--sr-y', `${e.clientY - rect.top}px`);
      overlay.classList.add('spot-reveal-overlay--active');
    });
    card.addEventListener('mouseleave', () => {
      overlay.classList.remove('spot-reveal-overlay--active');
    });
  });
}

function initBgAuroraPulse() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (document.querySelector('.bg-aurora-pulse')) return;
  const el = document.createElement('div');
  el.className = 'bg-aurora-pulse';
  el.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 3; i++) {
    const band = document.createElement('span');
    band.className = 'bg-aurora-pulse__band';
    band.style.setProperty('--ap-i', i);
    el.appendChild(band);
  }
  document.body.insertAdjacentElement('afterbegin', el);
}

/* Sprint 141 — blur-to-sharp scroll reveal, 3D depth tilt hover, noise overlay bg */

function initScrollBlurSharp() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll('.section__body, .bento-card__body, .process__desc');
  if (!els.length) return;
  els.forEach((el) => {
    if (el.dataset.blurSharp) return;
    el.dataset.blurSharp = '1';
    el.classList.add('scroll-blur-sharp');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(el);
        el.classList.add('scroll-blur-sharp--in');
      });
    }, { threshold: 0.2 });
    io.observe(el);
  });
}

function initHover3DDepthTilt() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(pointer: fine)').matches) return;
  const cards = document.querySelectorAll('.bento-card, .pricing-card');
  if (!cards.length) return;
  cards.forEach((card) => {
    if (card.dataset.tilt3d) return;
    card.dataset.tilt3d = '1';
    card.style.transformStyle = 'preserve-3d';
    card.style.willChange = 'transform';
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const rx = ((e.clientY - cy) / rect.height) * -10;
      const ry = ((e.clientX - cx) / rect.width) * 10;
      card.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.02)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}

function initBgNoiseTexture() {
  if (window.matchMedia('(pointer: coarse)').matches) return; // mobile memory diet
  if (document.querySelector('.bg-noise-texture')) return;
  const el = document.createElement('div');
  el.className = 'bg-noise-texture';
  el.setAttribute('aria-hidden', 'true');
  document.body.insertAdjacentElement('afterbegin', el);
}

/* Sprint 142 — staggered char pop, glow orb hover, scanline bg overlay --------- */

function initScrollStaggerChars() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll('[data-stagger-chars]');
  if (!els.length) return;
  els.forEach((el) => {
    if (el.dataset.staggerCharsInit) return;
    el.dataset.staggerCharsInit = '1';
    const text = el.textContent;
    el.textContent = '';
    el.classList.add('stagger-chars');
    [...text].forEach((ch, i) => {
      const span = document.createElement('span');
      span.className = 'stagger-chars__ch';
      span.style.setProperty('--sc-i', i);
      span.textContent = ch === ' ' ? ' ' : ch;
      el.appendChild(span);
    });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(el);
        el.classList.add('stagger-chars--in');
      });
    }, { threshold: 0.4 });
    io.observe(el);
  });
}

function initHoverGlowOrb() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(pointer: fine)').matches) return;
  const targets = document.querySelectorAll('.btn--primary, [data-glow-orb]');
  if (!targets.length) return;
  targets.forEach((el) => {
    if (el.dataset.glowOrb) return;
    el.dataset.glowOrb = '1';
    const orb = document.createElement('span');
    orb.className = 'glow-orb';
    orb.setAttribute('aria-hidden', 'true');
    el.style.position = 'relative';
    el.style.overflow = 'hidden';
    el.appendChild(orb);
    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      orb.style.left = `${e.clientX - rect.left}px`;
      orb.style.top = `${e.clientY - rect.top}px`;
    });
  });
}

function initBgScanlineOverlay() {
  if (document.querySelector('.bg-scanline-overlay')) return;
  const el = document.createElement('div');
  el.className = 'bg-scanline-overlay';
  el.setAttribute('aria-hidden', 'true');
  document.body.insertAdjacentElement('afterbegin', el);
}

/* Sprint 143 — scroll text stroke fill, morph border hover, radial vignette bg -- */

function initScrollTextStrokeFill() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll('[data-stroke-fill]');
  if (!els.length) return;
  els.forEach((el) => {
    if (el.dataset.strokeFillInit) return;
    el.dataset.strokeFillInit = '1';
    el.classList.add('text-stroke-fill');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(el);
        el.classList.add('text-stroke-fill--in');
      });
    }, { threshold: 0.5 });
    io.observe(el);
  });
}

function initHoverMorphBorder() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll('.btn, .bento-card');
  if (!els.length) return;
  els.forEach((el) => {
    if (el.dataset.morphBorder) return;
    el.dataset.morphBorder = '1';
    el.classList.add('hover-morph-border');
  });
}

function initBgRadialVignette() {
  if (document.querySelector('.bg-radial-vignette')) return;
  const el = document.createElement('div');
  el.className = 'bg-radial-vignette';
  el.setAttribute('aria-hidden', 'true');
  document.body.insertAdjacentElement('afterbegin', el);
}

/* Sprint 144 — clip-path slide reveal, shimmer hover on images, gradient drift bg */

function initScrollClipSlide() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll('[data-clip-slide]');
  if (!els.length) return;
  els.forEach((el) => {
    if (el.dataset.clipSlideInit) return;
    el.dataset.clipSlideInit = '1';
    el.classList.add('clip-slide');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(el);
        el.classList.add('clip-slide--in');
      });
    }, { threshold: 0.15 });
    io.observe(el);
  });
}

function initHoverImageShimmer() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const imgs = document.querySelectorAll('img, [data-shimmer-img]');
  if (!imgs.length) return;
  imgs.forEach((img) => {
    if (img.dataset.shimmerInit) return;
    img.dataset.shimmerInit = '1';
    const wrap = img.parentElement;
    if (!wrap) return;
    wrap.style.position = 'relative';
    wrap.style.overflow = 'hidden';
    const shim = document.createElement('span');
    shim.className = 'img-shimmer';
    shim.setAttribute('aria-hidden', 'true');
    wrap.appendChild(shim);
  });
}

function initBgGradientDrift() {
  if (document.querySelector('.bg-gradient-drift')) return;
  const el = document.createElement('div');
  el.className = 'bg-gradient-drift';
  el.setAttribute('aria-hidden', 'true');
  document.body.insertAdjacentElement('afterbegin', el);
}

/* Sprint 145 — elastic scale-in scroll, border pulse hover, depth fog bg -------- */

function initScrollElasticScale() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll('[data-elastic-scale]');
  if (!els.length) return;
  els.forEach((el, i) => {
    if (el.dataset.elasticScaleInit) return;
    el.dataset.elasticScaleInit = '1';
    el.style.setProperty('--es-delay', `${i * 60}ms`);
    el.classList.add('elastic-scale');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(el);
        el.classList.add('elastic-scale--in');
      });
    }, { threshold: 0.2 });
    io.observe(el);
  });
}

function initHoverBorderPulse() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll('.btn--secondary, [data-border-pulse]');
  if (!els.length) return;
  els.forEach((el) => {
    if (el.dataset.borderPulse) return;
    el.dataset.borderPulse = '1';
    el.classList.add('hover-border-pulse');
  });
}

function initBgDepthFog() {
  if (document.querySelector('.bg-depth-fog')) return;
  const el = document.createElement('div');
  el.className = 'bg-depth-fog';
  el.setAttribute('aria-hidden', 'true');
  document.body.insertAdjacentElement('afterbegin', el);
}

/* Payment — on-site pay options per tier ------------------------------------- */
/*
 * Visitors can pay on-site right now via Zelle to Dominick's published number.
 * OWNER, to add more one-tap methods, fill any of these in (each becomes a real
 * amount-prefilled link automatically):
 *   PAYMENT_LINKS[tier]  — a hosted card checkout (Stripe Payment Link / PayPal.me
 *                          / Cash App / Venmo URL). If set, the button opens it
 *                          directly ("Pay $25 →") for card-on-tap.
 *   PAYMENT_METHODS.cashapp — your $Cashtag (e.g. '$dominick')
 *   PAYMENT_METHODS.venmo   — your Venmo username (e.g. 'dominick-ziola')
 *   PAYMENT_METHODS.paypal  — your PayPal.me handle (e.g. 'dominickziola')
 * Zelle is always shown using the number below (already the site's contact line).
 */
const PAYMENT_LINKS = {
  quick: '',     // $25 — Quick Fix
  clean: '',     // $50 — Clean Package
  buildout: '',  // $75 — Same-Day Buildout
};

const PAYMENT_PHONE = '7736477598';
const PAYMENT_METHODS = {
  zellePhone: '7736477598',   // Zelle by phone — Dominick's published number
  cashapp: '',                // e.g. '$dominick'  → https://cash.app/$dominick/25
  venmo: '',                  // e.g. 'dominick-ziola' → https://venmo.com/u/...?txn=pay&amount=25
  paypal: '',                 // e.g. 'dominickziola'  → https://paypal.me/dominickziola/25
};
const PAYMENT_TIER_LABELS = {
  quick: 'the Quick Fix ($25)',
  clean: 'the Clean Package ($50)',
  buildout: 'a Same-Day Buildout ($75)',
};

function fmtPhone(p) {
  return p.length === 10 ? `(${p.slice(0,3)}) ${p.slice(3,6)}-${p.slice(6)}` : p;
}

function buildPayPanel(tier, price) {
  const panel = document.createElement('div');
  panel.className = 'price-pay-panel';
  panel.hidden = true;

  const rows = [];
  // Zelle — always available (uses the already-published contact number).
  rows.push(
    `<div class="pay-method">
       <span class="pay-method-name">Zelle</span>
       <span class="pay-method-detail">Send <strong>$${price}</strong> to <strong>${fmtPhone(PAYMENT_METHODS.zellePhone)}</strong></span>
     </div>`
  );
  // Optional one-tap app links — only render when the owner has filled a handle.
  if (PAYMENT_METHODS.cashapp) {
    const tag = PAYMENT_METHODS.cashapp.replace(/^\$/, '');
    rows.push(`<a class="pay-method pay-method-link" href="https://cash.app/$${tag}/${price}" target="_blank" rel="noopener"><span class="pay-method-name">Cash App</span><span class="pay-method-detail">Pay $${price} →</span></a>`);
  }
  if (PAYMENT_METHODS.venmo) {
    rows.push(`<a class="pay-method pay-method-link" href="https://venmo.com/u/${PAYMENT_METHODS.venmo}?txn=pay&amount=${price}&note=${encodeURIComponent('I Got A Dom')}" target="_blank" rel="noopener"><span class="pay-method-name">Venmo</span><span class="pay-method-detail">Pay $${price} →</span></a>`);
  }
  if (PAYMENT_METHODS.paypal) {
    rows.push(`<a class="pay-method pay-method-link" href="https://paypal.me/${PAYMENT_METHODS.paypal}/${price}" target="_blank" rel="noopener"><span class="pay-method-name">PayPal</span><span class="pay-method-detail">Pay $${price} →</span></a>`);
  }
  // Card / questions → text (keeps the personal flow).
  const what = PAYMENT_TIER_LABELS[tier] || 'a cleanup';
  const body = `Hi Dominick — I'd like ${what}. Can you send a card link?`;
  rows.push(`<a class="pay-method pay-method-link" href="sms:${PAYMENT_PHONE}?&body=${encodeURIComponent(body)}"><span class="pay-method-name">Card / other</span><span class="pay-method-detail">Text me a link →</span></a>`);

  panel.innerHTML = `<p class="pay-panel-title">Pay $${price} now</p>${rows.join('')}`;
  return panel;
}

function initPaymentLinks() {
  const buttons = document.querySelectorAll('.price-pay[data-tier]');
  if (!buttons.length) return;
  buttons.forEach((btn) => {
    const tier = btn.dataset.tier;
    const url = (PAYMENT_LINKS[tier] || '').trim();
    const price = btn.dataset.price;
    if (/^https:\/\/\S+$/.test(url)) {
      // Real hosted card checkout present — pay by card on tap.
      btn.href = url;
      btn.target = '_blank';
      btn.rel = 'noopener';
      if (price) btn.textContent = `Pay $${price} →`;
      return;
    }
    // No hosted link — reveal the on-site pay options (Zelle now + any app links).
    if (price) btn.textContent = `Pay $${price} →`;
    const panel = buildPayPanel(tier, price);
    btn.insertAdjacentElement('afterend', panel);
    btn.setAttribute('aria-expanded', 'false');
    // Keep an SMS href as the no-JS fallback; intercept to toggle the panel.
    const what = PAYMENT_TIER_LABELS[tier] || 'a cleanup';
    btn.href = `sms:${PAYMENT_PHONE}?&body=${encodeURIComponent(`Hi Dominick — I'd like ${what}.`)}`;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const open = panel.hidden;
      panel.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
    });
  });
}

/* Sprint 152 — Clarity Bloom: cursor-interactive particle text --------------- */

function initParticleWord() {
  const canvas = document.getElementById('particleWord');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const WORD = canvas.dataset.word || 'CLARITY';
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let particles = [];
  let raf = null;
  let active = false;
  const pointer = { x: -9999, y: -9999, on: false };

  const sizeCanvas = () => {
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width * DPR));
    canvas.height = Math.max(1, Math.round(rect.height * DPR));
  };

  const drawWordStatic = () => {
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(0,212,200,0.85)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const fontSize = Math.min(w * 0.2, h * 0.62);
    ctx.font = `900 ${fontSize}px "Barlow Condensed", sans-serif`;
    ctx.fillText(WORD, w / 2, h / 2);
  };

  const buildParticles = () => {
    const w = canvas.width, h = canvas.height;
    drawWordStatic();
    const data = ctx.getImageData(0, 0, w, h).data;
    ctx.clearRect(0, 0, w, h);
    particles = [];
    const gap = Math.max(3, Math.round(DPR * 3));
    for (let y = 0; y < h; y += gap) {
      for (let x = 0; x < w; x += gap) {
        if (data[(y * w + x) * 4 + 3] > 128) {
          particles.push({
            x: Math.random() * w,
            y: Math.random() * h,
            hx: x,
            hy: y,
            vx: 0,
            vy: 0,
          });
        }
      }
    }
  };

  const step = () => {
    if (!active) return;
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(0,212,200,0.85)';
    const repelR = 46 * DPR;
    const dot = Math.max(1, DPR);
    for (const p of particles) {
      let ax = (p.hx - p.x) * 0.022;
      let ay = (p.hy - p.y) * 0.022;
      if (pointer.on) {
        const dx = p.x - pointer.x;
        const dy = p.y - pointer.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < repelR && dist > 0.01) {
          const force = (repelR - dist) / repelR;
          ax += (dx / dist) * force * 3.2;
          ay += (dy / dist) * force * 3.2;
        }
      }
      p.vx = (p.vx + ax) * 0.85;
      p.vy = (p.vy + ay) * 0.85;
      p.x += p.vx;
      p.y += p.vy;
      ctx.fillRect(p.x, p.y, dot, dot * 1.3);
    }
    raf = requestAnimationFrame(step);
  };

  const setPointer = (clientX, clientY) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = (clientX - rect.left) * DPR;
    pointer.y = (clientY - rect.top) * DPR;
    pointer.on = true;
  };

  sizeCanvas();

  if (reduce) {
    drawWordStatic();
    return;
  }

  buildParticles();

  canvas.addEventListener('mousemove', (e) => setPointer(e.clientX, e.clientY), { passive: true });
  canvas.addEventListener('mouseleave', () => { pointer.on = false; });
  canvas.addEventListener('touchmove', (e) => {
    if (e.touches[0]) setPointer(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  canvas.addEventListener('touchend', () => { pointer.on = false; });

  const io = new IntersectionObserver(([e]) => {
    active = e.isIntersecting;
    if (active) step();
    else if (raf) { cancelAnimationFrame(raf); raf = null; }
  }, { threshold: 0.1 });
  io.observe(canvas);

  let rt;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => { sizeCanvas(); buildParticles(); }, 200);
  }, { passive: true });
}

/* Sprint 151 — Interactive SMS composer (tap chips → prefilled text) --------- */

function initSmsComposer() {
  const composer = document.querySelector('.composer');
  if (!composer) return;
  const msgEl = composer.querySelector('#composerMsg');
  const sendEl = composer.querySelector('#composerSend');
  if (!msgEl || !sendEl) return;

  const PHONE = '7736477598';
  const selection = { what: '', size: '' };

  const buildMessage = () => {
    const what = selection.what || 'something';
    let msg = `Hey Dominick — I've got ${what} to clean up.`;
    if (selection.size) msg += ` It's ${selection.size}.`;
    msg += ' Can you help?';
    return msg;
  };

  const update = () => {
    const msg = buildMessage();
    msgEl.textContent = msg;
    // `?&body=` form works across iOS and Android SMS handlers
    sendEl.href = `sms:${PHONE}?&body=${encodeURIComponent(msg)}`;
    msgEl.classList.remove('composer-msg-pulse');
    // reflow to restart the animation
    void msgEl.offsetWidth;
    msgEl.classList.add('composer-msg-pulse');
  };

  composer.querySelectorAll('[data-chip-group]').forEach((group) => {
    const key = group.dataset.chipGroup; // 'what' | 'size'
    group.querySelectorAll('.chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const wasSelected = chip.classList.contains('chip-selected');
        group.querySelectorAll('.chip').forEach((c) => {
          c.classList.remove('chip-selected');
          c.setAttribute('aria-pressed', 'false');
        });
        if (wasSelected) {
          selection[key] = '';
        } else {
          chip.classList.add('chip-selected');
          chip.setAttribute('aria-pressed', 'true');
          selection[key] = chip.dataset.value || '';
        }
        update();
      });
    });
  });
}

/* Sprint 150 — Stats count-up, magnetic CTAs, testimonials ambient canvas ---- */

function initStatsCountUp() {
  const items = document.querySelectorAll('.stat-item[data-stat-to]');
  if (!items.length) return;

  const countUp = (el) => {
    const target = parseInt(el.dataset.statTo, 10);
    const prefix = el.dataset.statPrefix || '';
    const suffix = el.dataset.statSuffix || '';
    const numEl = el.querySelector('.stat-num');
    if (!numEl) return;
    const duration = 1400;
    const start = performance.now();
    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const value = Math.round(ease * target);
      numEl.textContent = prefix + value + suffix;
      if (progress < 1) requestAnimationFrame(tick);
      else el.classList.add('stat-counted');
    };
    requestAnimationFrame(tick);
  };

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      countUp(e.target);
    });
  }, { threshold: 0.5 });

  items.forEach(el => io.observe(el));

  // Text-only stat items: just flash the bottom bar on entry
  document.querySelectorAll('.stat-item[data-stat-text]').forEach((el) => {
    const io2 = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io2.unobserve(e.target);
        setTimeout(() => e.target.classList.add('stat-counted'), 300);
      });
    }, { threshold: 0.5 });
    io2.observe(el);
  });
}

function initMagneticButtons() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const RADIUS = 80; // px — activation zone
  const PULL = 10;   // px — max displacement

  const btns = document.querySelectorAll('.btn-primary, .float-cta');
  if (!btns.length) return;
  btns.forEach(b => b.classList.add('magnetic-cta'));

  document.addEventListener('mousemove', (e) => {
    btns.forEach((btn) => {
      const r = btn.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < RADIUS) {
        const strength = (1 - dist / RADIUS) * PULL;
        btn.style.transform = `translate(${(dx / dist) * strength}px, ${(dy / dist) * strength}px)`;
      } else {
        btn.style.transform = '';
      }
    });
  }, { passive: true });
}

function initTestimonialsAmbient() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const section = document.getElementById('testimonials');
  if (!section) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'tcard-ambient-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  section.insertBefore(canvas, section.firstChild);

  const ctx = canvas.getContext('2d');
  const PARTICLE_COUNT = 22;
  let particles = [], raf = null, active = false;

  const resize = () => {
    canvas.width = section.offsetWidth;
    canvas.height = section.offsetHeight;
  };

  const seed = () => {
    particles = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: canvas.height + Math.random() * 120,
      r: Math.random() * 2 + 0.8,
      speed: Math.random() * 0.4 + 0.15,
      drift: (Math.random() - 0.5) * 0.3,
      opacity: Math.random() * 0.5 + 0.2,
    }));
  };

  const draw = () => {
    if (!active) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p) => {
      p.y -= p.speed;
      p.x += p.drift;
      if (p.y < -8) {
        p.y = canvas.height + 8;
        p.x = Math.random() * canvas.width;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,212,200,${p.opacity})`;
      ctx.fill();
    });
    raf = requestAnimationFrame(draw);
  };

  resize();
  seed();

  const io = new IntersectionObserver(([e]) => {
    active = e.isIntersecting;
    if (active) { draw(); } else { cancelAnimationFrame(raf); }
  }, { threshold: 0.05 });
  io.observe(section);

  window.addEventListener('resize', () => { resize(); seed(); }, { passive: true });
}

/* Sprint 149 — Testimonial stagger reveal + holographic card shine ----------- */

function initTestimonialsReveal() {
  const cards = document.querySelectorAll('.tcard[data-tcard]');
  if (!cards.length) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const card = e.target;
      io.unobserve(card);
      card.classList.add('tcard-in');
      // Stagger star fill 200ms after card starts entering
      setTimeout(() => card.classList.add('stars-in'), 200);
    });
  }, { threshold: 0.25 });

  cards.forEach(c => io.observe(c));
}

function initTestimonialCardShine() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const cards = document.querySelectorAll('.tcard[data-tcard]');
  if (!cards.length) return;

  cards.forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 100;
      const y = ((e.clientY - r.top) / r.height) * 100;
      card.style.setProperty('--mx', `${x}%`);
      card.style.setProperty('--my', `${y}%`);
      // Subtle 3D tilt
      const tiltX = ((e.clientY - r.top) / r.height - 0.5) * -8;
      const tiltY = ((e.clientX - r.left) / r.width - 0.5) * 8;
      card.style.transform = `perspective(600px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateY(-2px)`;
      card.style.boxShadow = `0 12px 36px rgba(0,0,0,0.35), 0 0 24px rgba(0,212,180,0.12)`;
    }, { passive: true });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
      card.style.boxShadow = '';
    });
  });
}

/* Sprint 148 — Live availability ping, Try-It demo, sonar ping reveal -------- */

function initLiveAvailabilityPing() {
  const heroContent = document.querySelector('.hero-content');
  if (!heroContent) return;

  // Determine availability: Mon–Fri, 8 am–8 pm Central Time
  const now = new Date();
  const ct = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
  const day = ct.getDay(); // 0=Sun, 6=Sat
  const hour = ct.getHours();
  const isAvail = day >= 1 && day <= 5 && hour >= 8 && hour < 20;

  let label;
  if (isAvail) {
    label = 'Available now — reply in minutes';
  } else if (day === 6 || (day === 0 && hour >= 20) || (day === 5 && hour >= 20)) {
    label = 'Back Monday morning';
  } else if (day === 0 || (day === 1 && hour < 8)) {
    label = 'Back Monday morning';
  } else if (hour < 8) {
    label = 'Back at 8 am CT';
  } else {
    label = 'Back tomorrow morning';
  }

  const badge = document.createElement('div');
  badge.className = `avail-ping ${isAvail ? 'avail-ping--on' : 'avail-ping--off'}`;
  badge.setAttribute('aria-label', isAvail ? 'Dominick is available now' : label);
  badge.innerHTML = `<span class="avail-dot" aria-hidden="true"></span><span class="avail-text">${label}</span>`;

  const eyebrow = heroContent.querySelector('.hero-eyebrow');
  if (eyebrow) {
    heroContent.insertBefore(badge, eyebrow);
  } else {
    heroContent.insertAdjacentElement('afterbegin', badge);
  }
}

function initTryItDemo() {
  const input  = document.getElementById('tryInput');
  const btn    = document.getElementById('tryBtn');
  const output = document.getElementById('tryOutput');
  const cta    = document.getElementById('tryCta');
  if (!input || !btn || !output) return;

  function cleanText(raw) {
    return raw
      .replace(/\t/g, ' ')
      .replace(/[ \t]{2,}/g, ' ')
      .split(/\n{2,}/)
      .map(para => para
        .split(/(?<=[.!?])\s+/)
        .map(s => s.trim())
        .filter(Boolean)
        .map(s => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ')
      )
      .map(para => para.replace(/\bi\b/g, 'I').trim())
      .filter(Boolean)
      .join('\n\n');
  }

  function typewrite(text, container) {
    container.innerHTML = '';
    const paras = text.split('\n\n');
    let paraIndex = 0;
    let charIndex = 0;

    const cursor = document.createElement('span');
    cursor.className = 'try-cursor';
    cursor.setAttribute('aria-hidden', 'true');

    function nextChar() {
      if (paraIndex >= paras.length) {
        cursor.remove();
        if (cta) { cta.setAttribute('aria-hidden', 'false'); cta.classList.add('visible'); }
        return;
      }
      if (charIndex === 0) {
        const p = document.createElement('p');
        p.style.marginBottom = '0.75em';
        container.appendChild(p);
        container.appendChild(cursor);
      }
      const p = container.querySelectorAll('p')[paraIndex];
      p.textContent += paras[paraIndex][charIndex];
      charIndex++;
      if (charIndex >= paras[paraIndex].length) {
        paraIndex++;
        charIndex = 0;
        setTimeout(nextChar, 180);
      } else {
        setTimeout(nextChar, Math.random() * 20 + 8);
      }
    }
    nextChar();
  }

  btn.addEventListener('click', () => {
    const raw = input.value.trim();
    if (!raw) { input.focus(); return; }

    btn.disabled = true;
    btn.classList.add('loading');
    output.innerHTML = '';
    output.classList.add('working');
    if (cta) { cta.classList.remove('visible'); cta.setAttribute('aria-hidden', 'true'); }

    setTimeout(() => {
      btn.disabled = false;
      btn.classList.remove('loading');
      output.classList.remove('working');
      const cleaned = cleanText(raw);
      typewrite(cleaned, output);
    }, 1400);
  });
}

function initSonarPing() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const heads = document.querySelectorAll('.section-head h2, .section-title');
  if (!heads.length) return;
  heads.forEach((h2) => {
    if (h2.dataset.sonarInit) return;
    h2.dataset.sonarInit = '1';
    const wrap = h2.parentElement;
    if (!wrap) return;
    const cur = getComputedStyle(wrap).position;
    if (cur === 'static') wrap.style.position = 'relative';
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(h2);
        const ring = document.createElement('div');
        ring.className = 'sonar-ring';
        ring.setAttribute('aria-hidden', 'true');
        wrap.appendChild(ring);
        ring.addEventListener('animationend', () => ring.remove(), { once: true });
      });
    }, { threshold: 0.6 });
    io.observe(h2);
  });
}
