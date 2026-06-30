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
      // Clear the sticky header — measure it live so the landing point stays
      // correct after the nav shrinks into its compact state on scroll.
      const navEl = document.getElementById('nav');
      const navH = navEl ? navEl.offsetHeight : 70;
      lenis.scrollTo(el, { offset: -(navH + 14) });
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

/* -------------------------------------------------------------------------
   CARD TILT — subtle rAF-driven 3D perspective tilt on the bento service
   cards and pricing cards. Pairs with the existing cursor spotlight (which
   drives --mx/--my): the glow tracks the cursor while the card leans toward
   it, for a premium "glass panel you can push on" feel. Desktop / fine-pointer
   only, and fully skipped under prefers-reduced-motion.
   ------------------------------------------------------------------------- */
function initCardTilt() {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const MAX = 6; // degrees of lean at the card edge — present but never gimmicky
  document.querySelectorAll('.bento-card, .price-card').forEach((card) => {
    // Specular sheen — a soft highlight that rides with the cursor so the tilted
    // card looks like glass catching the light. Out-of-flow (absolute), so it
    // doesn't affect the card's flex layout; only visible while .tilt-active.
    const sheen = document.createElement('span');
    sheen.className = 'card-sheen';
    sheen.setAttribute('aria-hidden', 'true');
    card.prepend(sheen);

    let raf = 0, rx = 0, ry = 0, gx = 50, gy = 50;
    const draw = () => {
      raf = 0;
      // scale(1.015) keeps the hover "lift" the CSS :hover used to provide,
      // now that the inline transform overrides it.
      card.style.transform =
        `perspective(900px) rotateX(${ry.toFixed(2)}deg) rotateY(${rx.toFixed(2)}deg) scale(1.015)`;
      sheen.style.setProperty('--gx', gx.toFixed(1) + '%');
      sheen.style.setProperty('--gy', gy.toFixed(1) + '%');
    };
    card.addEventListener('pointerenter', () => card.classList.add('tilt-active'));
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width;   // 0 (left) .. 1 (right)
      const ny = (e.clientY - r.top) / r.height;   // 0 (top)  .. 1 (bottom)
      gx = nx * 100; gy = ny * 100;
      rx = (nx - 0.5) * 2 * MAX;    // cursor right → lean right
      ry = -(ny - 0.5) * 2 * MAX;   // cursor down  → lean back
      if (!raf) raf = requestAnimationFrame(draw);
    });
    card.addEventListener('pointerleave', () => {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      card.classList.remove('tilt-active'); // restores the CSS transform transition
      card.style.transform = '';            // settle smoothly back to rest
    });
  });
}


/* -------------------------------------------------------------------------
   CLEANUP CINEMA — scroll-scrubbed "messy → clean" document transformation.
   Maps the section's scroll progress to a --p (0..1) custom property that the
   CSS keys every transform/opacity off of. Uses position:sticky in CSS (not a
   JS scroll-pin), so it can never hijack or break page scrolling. Under
   prefers-reduced-motion it collapses to a static clean sheet.
   ------------------------------------------------------------------------- */
function initCleanupCinema() {
  const section = document.getElementById('cleanup');
  if (!section) return;
  const caption = document.getElementById('cleanupCaption');
  const paper = section.querySelector('.cleanup-paper');

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    section.classList.add('cleanup-static');
    section.style.setProperty('--p', '1');
    if (paper) paper.classList.add('is-done');
    if (caption) caption.textContent = 'Clean, formatted, ready to send.';
    return;
  }

  const CAPTIONS = [
    [0.00, 'A messy draft — typos, stains, crooked.'],
    [0.30, 'Fixing the typos…'],
    [0.55, 'Straightening and reformatting…'],
    [0.90, 'Clean, formatted, ready to send.'],
  ];
  let raf = 0, lastCap = -1;

  const update = () => {
    raf = 0;
    const rect = section.getBoundingClientRect();
    const total = section.offsetHeight - window.innerHeight;
    const scrolled = Math.min(Math.max(-rect.top, 0), total);
    const p = total > 0 ? scrolled / total : 0;
    section.style.setProperty('--p', p.toFixed(4));
    if (paper) paper.classList.toggle('is-done', p > 0.9);
    let idx = 0;
    for (let i = 0; i < CAPTIONS.length; i++) if (p >= CAPTIONS[i][0]) idx = i;
    if (idx !== lastCap && caption) { caption.textContent = CAPTIONS[idx][1]; lastCap = idx; }
  };
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update();
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

/* -------------------------------------------------------------------------
   KINETIC TEXT — word-by-word staggered reveal on .kinetic-section entry
   ------------------------------------------------------------------------- */

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
    // Focal band ~15%–25% down the viewport: wide enough to avoid gaps between
    // short sections leaving no link active, high enough that the active link
    // tracks what you're actually reading rather than lagging behind.
  }, { rootMargin: '-15% 0px -75% 0px' });

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

/* -------------------------------------------------------------------------
   NAV CTA PING — sonar pulse ring fires from the primary SMS CTA buttons
   (nav + mobile bar) after 5 s, then every 9 s. A <span> is appended,
   animates outward, and self-removes on animationend.
   ------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------
   SCROLL BLOOM — a fixed teal radial gradient drifts from bottom-left to
   top-right of the viewport as the user scrolls the full page length.
   Very subtle (≤5.5% opacity) — adds depth without distracting.
   Uses rAF throttling for smooth, jank-free updates.
   ------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------
   Sprint 28-A: Cursor trail — lagging dot chain follows mouse on desktop
   ------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------
   Sprint 28-B: Bento icon bounce — GSAP elastic pop when card enters view
   ------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------
   Sprint 28-C: Section progress dots — fixed right-side nav, dot per section
   ------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------
   Sprint 29-A: Scroll velocity skew — subtle section lean on fast scroll
   ------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------
   Sprint 29-B: Section title curtain — clip-path wipe left→right on scroll
   ------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------
   Sprint 31-B: Bento title scramble — h3 text glitches on card hover
   ------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------
   Sprint 31-C: FAQ bar reveal — teal left-bar box-shadow on open
   ------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------
   Sprint 30-A: Step number pop — GSAP elastic entrance on process step nums
   ------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------
   Sprint 30-B: Grain overlay — SVG noise texture adds film-grain depth
   ------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------
   Sprint 30-C: Submit confetti — teal particle burst on form success
   ------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------
   Sprint 33-A: About icon spin — D badge rotates into view via GSAP
   ------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------
   Sprint 33-B: Step badge pop — GSAP elastic entrance for .step-badge pills
   ------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------
   Sprint 33-C: Phone ring wiggle — attention animation on phone/SMS links
   ------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------
   Sprint 32-A: Process line draw — scaleX 0→1 left-to-right on scroll
   ------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------
   Sprint 32-B: Hero eyebrow pulse — teal glow burst 2s after load
   ------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------
   Sprint 32-C: Format tag entrance — GSAP pop for .step-formats chips
   ------------------------------------------------------------------------- */

/* Sprint 35 — social-proof ticker, CTA border morph, nav depth blur -------- */

/* Sprint 36 — hero sub morph, contact pulse ring, badge levitate ----------- */

/* Sprint 37 — footer brand glow, step left-border flash, hero orbit dot ----- */

/* Sprint 38 — FAQ icon spin, price hover wash, section deco numbers --------- */

/* Sprint 39 — hero tagline typewriter, bento border trace, form field glow -- */

/* Sprint 43 — section glow halo, step icon hover, hero CTA pulse ring -------- */

/* Sprint 42 — hero headline color cycle, contact list pop, footer glow pulse  */

/* Sprint 41 — nav progress line, showcase tab pop, price label pop ---------- */

/* Sprint 40 — hero orb drift, pricing urgency badge, form shake validation -- */

/* Sprint 34 — price-diff stagger, hero-price flash, QR hover glow ---------- */

/* Sprint 44 — headline glitch, QR orbit rings, section h2 underline ---------- */

/* Sprint 45 — click sparks, slider handle glow, scroll vignette ------------ */

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

/* Sprint 47 — bento card shine, nav dot indicator, pricing grid glow -------- */

/* Sprint 48 — pricing card hover particles, about pulse, footer link glow ---- */

/* Sprint 49 — contact sparkle, QR scanline, scroll echo lines --------------- */

/* Sprint 50 — aurora bg, process chain bounce, secondary btn hover ripple ----- */

/* Sprint 51 — parallax bento cards, time-of-day tint, kicker hover glow ----- */

/* Sprint 52 — custom scrollbar, card focus ring, section counter ------------ */

/* -------------------------------------------------------------------------
   Chat assistant widget — talks to the /api/chat Cloudflare Function, which
   proxies Claude and streams the reply back as SSE. Renders token-by-token.
   ------------------------------------------------------------------------- */
function initChatbot() {
  const launcher = document.getElementById('chatLauncher');
  const panel = document.getElementById('chatPanel');
  const closeBtn = document.getElementById('chatClose');
  const log = document.getElementById('chatLog');
  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatInput');
  const sendBtn = document.getElementById('chatSend');
  const chips = document.getElementById('chatChips');
  if (!launcher || !panel || !form || !input || !log) return;

  const history = [];          // [{role:'user'|'assistant', content}]
  let busy = false;
  let greeted = false;

  // --- Cloudflare Turnstile (optional bot-check) ---------------------------
  // Active only when a real site key is set on #chatTurnstile (data-sitekey) and
  // the Turnstile script has loaded. Otherwise we send no token and the backend
  // fails open. Invisible widget, executed on demand to get a fresh per-message token.
  const tsEl = document.getElementById('chatTurnstile');
  const SITEKEY = tsEl && tsEl.dataset ? tsEl.dataset.sitekey : '';
  const turnstileOn = !!SITEKEY && !SITEKEY.includes('REPLACE');
  let tsWidget = null;
  let tsResolve = null;

  function getTurnstileToken() {
    return new Promise((resolve) => {
      if (!turnstileOn || !window.turnstile || !tsEl) return resolve(null);
      try {
        if (tsWidget === null) {
          tsWidget = window.turnstile.render(tsEl, {
            sitekey: SITEKEY,
            size: 'invisible',
            execution: 'execute',
            callback: (token) => { if (tsResolve) { const r = tsResolve; tsResolve = null; r(token); } },
            'error-callback': () => { if (tsResolve) { const r = tsResolve; tsResolve = null; r(null); } },
          });
        }
        tsResolve = resolve;
        // Never let the widget hang the chat — bail to null after 6s.
        setTimeout(() => { if (tsResolve) { tsResolve = null; resolve(null); } }, 6000);
        window.turnstile.execute(tsWidget);
      } catch (_) {
        resolve(null);
      }
    });
  }

  const scrollDown = () => { log.scrollTop = log.scrollHeight; };

  function addMsg(role, text) {
    const el = document.createElement('div');
    el.className = 'chat-msg ' + (role === 'user' ? 'user' : 'bot');
    el.textContent = text;
    log.appendChild(el);
    scrollDown();
    return el;
  }

  function openPanel() {
    panel.hidden = false;
    panel.setAttribute('aria-modal', 'true');
    launcher.classList.add('is-hidden');
    launcher.setAttribute('aria-expanded', 'true');
    // Lock the page behind the panel: overflow lock for native scroll, and stop
    // Lenis (desktop smooth scroll) so the background doesn't scroll under it.
    document.body.style.overflow = 'hidden';
    try { window.__lenis && window.__lenis.stop(); } catch (_) {}
    if (!greeted) {
      greeted = true;
      addMsg('bot', "Hey — I'm Dominick's assistant. Ask me what I can clean up, how much it costs, or how to send a file. For a real job, text 773-647-7598.");
    }
    setTimeout(() => input.focus(), 50);
  }
  function closePanel() {
    panel.hidden = true;
    panel.setAttribute('aria-modal', 'false');
    launcher.classList.remove('is-hidden');
    launcher.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    try { window.__lenis && window.__lenis.start(); } catch (_) {}
    launcher.focus();
  }

  launcher.addEventListener('click', openPanel);
  closeBtn?.addEventListener('click', closePanel);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) closePanel();
  });

  if (chips) {
    chips.addEventListener('click', (e) => {
      const btn = e.target.closest('.chat-chip');
      if (!btn || busy) return;
      input.value = btn.textContent;
      form.requestSubmit();
    });
  }

  async function send(text) {
    if (busy) return;
    busy = true;
    sendBtn.disabled = true;
    input.disabled = true;          // don't let the user type into a message that won't send yet
    chips?.setAttribute('hidden', '');
    addMsg('user', text);
    history.push({ role: 'user', content: text });

    // Typing indicator, replaced by the streamed text as it arrives.
    const botEl = addMsg('bot', '');
    botEl.innerHTML = '<span class="chat-typing"><span></span><span></span><span></span></span>';
    let answer = '';

    try {
      const turnstileToken = await getTurnstileToken();
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: history, turnstileToken }),
      });

      if (!resp.ok || !resp.body) {
        let msg = 'The assistant is busy right now. Text Dominick at 773-647-7598.';
        try { const j = await resp.json(); if (j && j.error) msg = j.error; } catch (_) {}
        botEl.classList.add('is-error');
        botEl.textContent = msg;
        return;
      }

      // Parse the Claude SSE stream: lines `data: {json}`, type content_block_delta.
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();           // keep the trailing partial line
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const payload = trimmed.slice(5).trim();
          if (!payload || payload === '[DONE]') continue;
          let evt;
          try { evt = JSON.parse(payload); } catch (_) { continue; }
          if (evt.type === 'content_block_delta' && evt.delta && evt.delta.type === 'text_delta') {
            answer += evt.delta.text;
            botEl.textContent = answer;
            scrollDown();
          }
        }
      }

      if (answer.trim()) {
        history.push({ role: 'assistant', content: answer });
      } else {
        botEl.classList.add('is-error');
        botEl.textContent = "Sorry — I couldn't answer that. Text Dominick at 773-647-7598.";
      }
    } catch (_) {
      botEl.classList.add('is-error');
      botEl.textContent = 'Connection trouble. Text Dominick at 773-647-7598.';
    } finally {
      // Reset the (single-use) Turnstile token so the next message gets a fresh one.
      if (turnstileOn && window.turnstile && tsWidget !== null) {
        try { window.turnstile.reset(tsWidget); } catch (_) {}
      }
      busy = false;
      sendBtn.disabled = false;
      input.disabled = false;
      input.focus();
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    send(text);
  });
}

/* ------------------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  // Each init is isolated so a failure in one (e.g. a blocked CDN) can't
  // take down the rest of the page's interactivity.
  const inits = [
    initSmoothScroll, initScrollVelocityCinema, initPageIntro, initHeroCanvas,
    initHeroAnimation, initClarityScramble, initNav, initMobileBar,
    initDiveHero, initAboutEntrance, initBeforeAfter, initProcessTimeline,
    initPricingEntrance, initBentoReveal, initFaqStagger, initScrollReveals,
    initUnderwater, initReef, initContactForm, initQRCode,
    initTransformDemo, initCardSpotlight, initCountUp, initFaqAnimation,
    initScrollProgress, initMagneticButtons, initHeadingReveal, initActiveNav,
    initButtonRipple, initScrollToTop, initContactReveal, initContactSteps,
    initTrustBarEntrance, initFooterEntrance, initShowcaseAutoplay, initSliderTabIndicator,
    initSliderHint, initNavShrink, initPriceCardSpotlight, initFloatingCTA,
    initScrollVignette, initStaggerListReveal, initKeyboardNav, initDynamicThemeColor,
    initCascadeReveal, initPaymentLinks, initParticleWord, initSmsComposer,
    initStatsCountUp, initTestimonialsReveal, initLiveAvailabilityPing, initTryItDemo,
    initChatbot, initCardTilt, initCleanupCinema,
  ];
  // ── Refined curation (Phase 1 visual upgrade) ──────────────────────────────
  // The site accumulated ~158 init effects over 150 sprints — too flashy and too
  // heavy for the "refined & professional" direction. Content visibility no longer
  // depends on any of them (the pure-CSS reveal-rise fade in style.css handles that),
  // so we run only a curated, tasteful allowlist and SKIP the gimmicks: per-character
  // wave/scramble/glitch/typewriter/neon/rainbow text, cursor trails, sparks/confetti,
  // glow halos/rings/pulses, icon/badge bounce-pop-wiggle, chromatic effects,
  // the redundant initScroll*/initHover* variants, and the initBg* aurora/comet/ink/
  // scanline/fog/vignette backgrounds. Skipped functions stay DEFINED — just not run,
  // so nothing is deleted and the set can be tuned later. Cutting an effect is the win.
  const KEEP = new Set([
    // Structure · nav · scroll spine
    'initSmoothScroll', 'initScrollVelocityCinema', 'initNav', 'initMobileBar',
    'initActiveNav', 'initNavShrink', 'initScrollProgress', 'initScrollToTop',
    'initDynamicThemeColor', 'initKeyboardNav', 'initScrollVignette',
    // Content visibility · reveals (clean fades only)
    'initScrollReveals', 'initPageIntro', 'initHeadingReveal', 'initPricingEntrance',
    'initBentoReveal', 'initProcessTimeline', 'initFaqStagger', 'initFooterEntrance',
    'initAboutEntrance', 'initContactReveal', 'initContactSteps', 'initTrustBarEntrance',
    'initCascadeReveal', 'initStaggerListReveal', 'initTestimonialsReveal',
    // Signature interactive showpieces (the "wow" — kept)
    'initHeroCanvas', 'initHeroAnimation', 'initClarityScramble', 'initDiveHero',
    'initUnderwater', 'initReef', 'initBeforeAfter', 'initSliderTabIndicator',
    'initSliderHint', 'initShowcaseAutoplay', 'initTransformDemo', 'initTryItDemo',
    'initSmsComposer', 'initParticleWord', 'initFaqAnimation', 'initStatsCountUp',
    'initCountUp', 'initFloatingCTA', 'initCleanupCinema',
    // Forms · utility · conversion
    'initContactForm', 'initQRCode', 'initPaymentLinks', 'initLiveAvailabilityPing', 'initChatbot',
    // Tasteful hover (desktop / fine-pointer — subtle, not flashy)
    'initCardSpotlight', 'initPriceCardSpotlight', 'initMagneticButtons', 'initButtonRipple',
    'initCardTilt',
  ]);
  const ranInits = new Set();
  for (const init of inits) {
    if (!KEEP.has(init.name) || ranInits.has(init.name)) continue;
    ranInits.add(init.name);
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

  // Universal GSAP-from fallback. Many sections (bento, pricing, process, about,
  // faq, headings, underwater cards) hide their content via gsap.from({opacity:0})
  // gated on a ScrollTrigger. On a tall/slow page those triggers can fail to fire,
  // stranding whole sections invisible (no desktop fallback existed except pricing).
  // Shortly after load, force-clear any reveal target still hidden so content can
  // never silently disappear. Pairs with the CSS load-time fade-up for .reveal.
  const revealFallback = () => {
    const sel = '.bento-card, .price-card, .steps .step, .step-num, .step-formats span,'
      + ' .about-icon, .about-headline, .about-copy, .about-cta,'
      + ' .section-title, .faq-item, .uw-card';
    document.querySelectorAll(sel).forEach((el) => {
      const cs = getComputedStyle(el);
      const hidden = parseFloat(cs.opacity) < 0.05
        || (cs.clipPath && cs.clipPath !== 'none' && cs.clipPath.includes('inset'));
      if (!hidden) return;
      if (typeof gsap !== 'undefined') gsap.set(el, { clearProps: 'opacity,transform,clipPath' });
      else { el.style.opacity = '1'; el.style.transform = 'none'; el.style.clipPath = 'none'; }
    });
  };
  window.addEventListener('load', () => setTimeout(revealFallback, 800));

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

/* Sprint 54 — word reveal wave, card glint sweep, stagger list reveal --------- */

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

/* Sprint 56 — page click ripple, image clip reveal, pricing countdown --------- */

/* Sprint 57 — hero gradient ring, keyboard nav, dynamic theme color ----------- */

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

/* Sprint 59 — live textarea preview, scroll-next hint, card light beam ------- */

/* Sprint 60 — hero text-shadow mouse parallax, momentum dot, CTA wave hover -- */

/* Sprint 61 — hero subtitle underline, section dimmer, price ping pulse ------- */

/* Sprint 62 — dot grid bg, tag cloud hover push, section entry sheen --------- */

/* Sprint 63 — nav hover scale, scroll blob tracker, active section border --- */

/* Sprint 64 — blob cursor blend, section watermark, nav morph pill --------- */

/* Sprint 65 — border beam btn, scroll ripple, stat glow reveal ------------- */

/* Sprint 66 — char wave reveal, btn fill hover, progressive text reveal ----- */

/* Sprint 67 — mosaic image reveal, hero word cycle, card peel corner ------- */

/* Sprint 68 — hover char repel, scale reveal, attention pulse -------------- */

/* Sprint 69 — blob morph hero, scroll timeline bar, rainbow text hue ------- */

/* Sprint 70 — depth parallax layers, text stroke reveal, section hover glow */

/* Sprint 71 — cursor text label, split dual reveal, scroll flood fill ------ */

/* Sprint 72 — neon link underline, scroll reveal rotate, velocity skew ----- */

/* Sprint 73 — grid diagonal reveal, card hover depth, scroll meter --------- */

/* Sprint 74 — hero scanline, clip reveal slide, highlight text mark --------- */

/* Sprint 75 — spring click effect, scroll text parallax, global focus glow -- */

/* Sprint 76 — SVG path draw, perspective reveal, tooltip hover -------------- */

/* Sprint 77 — scroll elevation, feature icon pulse, glow hover text --------- */

/* Sprint 78 — radial reveal, lazy image fade, scroll fog effect --------------- */

/* Sprint 79 — magnetic button, counter animation, 3D card tilt --------------- */

/* Sprint 80 — typing effect, scroll progress counter, ambient glow ----------- */

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

/* Sprint 82 — parallax hero text, card flip reveal, scroll hue shift --------- */

/* Sprint 83 — noise texture overlay, button ripple, hero scroll blur --------- */

/* Sprint 84 — floating label input, fade-up reveal, cursor trail ------------- */

/* Sprint 85 — text scramble hover, button border draw, scroll band reveal ---- */

/* Sprint 86 — spotlight hover, scroll ink blot, word pop-in ----------------- */

/* Sprint 87 — card shadow depth on hover, scroll color band, pulse badge ----- */

/* Sprint 88 — glitch text hover, scroll zoom section, btn liquid fill -------- */

/* Sprint 89 — aurora bg section, underline morph, scroll scale text ---------- */

/* Sprint 90 — card stack hover, particle burst click, section edge glow ------ */

/* Sprint 91 — text reveal mask, hover border glow, scroll opacity fade ------- */

/* Sprint 92 — hero grid lines, btn confetti, scroll slide from side ---------- */

/* Sprint 93 — hover color shift card, scroll depth blur, btn shake ----------- */

/* Sprint 94 — floating action btn, dot pattern bg, hover scale icon ---------- */

/* Sprint 95 — section divider wave, scroll progress ring, text highlight sweep */

/* Sprint 96 — hover glow trail, scroll letter-spacing morph, btn elastic bounce */

/* Sprint 97 — morphing blob, scroll parallax cards, text split reveal */

/* Sprint 98 — cursor spotlight, scroll clip reveal, hover border trace */

/* Sprint 99 — scroll reveal scale, hover tilt 3D, neon line draw */

/* Sprint 100 — MILESTONE — cinematic scroll wipe, hero particle burst, cascade reveal */

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

/* Sprint 102 — scroll skew entry, image parallax layer, hover underline expand */

/* Sprint 103 — scroll rotate-in, hover shadow lift, text gradient shift */

/* Sprint 104 — scroll flip reveal, hover icon spin, bg aurora drift */

/* Sprint 105 — scroll stagger grid, hover card shimmer, section count-up */

/* Sprint 106 — scroll zoom-fade, hover border glow pulse, typewriter cursor */

/* Sprint 107 — scroll wave reveal, hover floating label, btn magnetic pull */

/* Sprint 108 — scroll bounce-in, hover text outline, section noise layer */

/* Sprint 109 — scroll pendulum swing, hover neon badge, bg starfield */

/* Sprint 110 — scroll door open, hover card depth ring, text shimmer wave */

/* Sprint 111 — scroll accordion reveal, hover glow icon ring, bg mesh gradient */

/* Sprint 112 — scroll split wipe, hover card outline draw, bg gradient orbs */

/* Sprint 113 — scroll typewriter reveal, hover fill sweep, bg radial pulse */

/* Sprint 114 — scroll zoom-blur reveal, hover text pop, bg grid lines */

/* Sprint 115 — scroll slide-up fade, hover card glow border, text reveal mask v2 */

/* Sprint 116 — scroll elastic entry, hover rainbow border, bg dot matrix */

/* Sprint 117 — scroll orbit reveal, hover ink splatter, bg scan line */

/* Sprint 118 — scroll pendulum entry, hover glow trail v2, bg firefly */

/* Sprint 119 — scroll shutter reveal, hover magnetic text, bg aurora v2 */

/* Sprint 120 — scroll prism split, hover depth shadow, bg nebula */

/* Sprint 121 — scroll lens zoom, hover spotlight, bg vhs noise */

/* Sprint 122 — scroll typewriter v2, hover color shift, bg plasma */

/* Sprint 123 — scroll curtain lift, hover border dash, bg grid pulse */

/* Sprint 124 — scroll wave text, hover neon glow, bg constellation */

/* Sprint 125 — scroll stack reveal, hover shimmer border, bg matrix rain */

/* Sprint 126 — scroll morph path, hover liquid btn, bg gradient flow */

/* Sprint 127 — scroll fan cards, hover ripple expand, bg holo foil */

/* Sprint 128 — scroll glitch entry, hover chromatic aberration, bg particle field */

/* Sprint 129 — scroll accordion stagger, hover glow icon ring v2, bg circuit trace */

/* Sprint 130 — scroll tilt card, hover border beam, bg lava lamp */

/* Sprint 131 — scroll reveal counter, hover underline wave, bg static burst */

/* Sprint 132 — scroll spring pop, hover gradient text, bg warp grid */

/* Sprint 133 — scroll cascade fade, hover icon bounce, bg hex grid */

/* Sprint 134 — scroll zoom blur in, hover text scramble, bg pulse ring */

/* Sprint 135 — scroll flip x, hover border glow sweep, bg rain drops */

/* Sprint 136 — scroll blur panel, hover scale pop, bg comet trail */

/* Sprint 137 — scroll reveal words, hover glow ring, bg ink wash */

/* Sprint 138 — scroll fade-slide, magnetic glow hover, ambient wave bg -------- */

/* Sprint 139 — text morph counter, neon border trail hover, grid reveal bg ---- */

/* Sprint 140 — multi-layer scroll parallax, card spotlight reveal, aurora pulse bg */

/* Sprint 141 — blur-to-sharp scroll reveal, 3D depth tilt hover, noise overlay bg */

/* Sprint 142 — staggered char pop, glow orb hover, scanline bg overlay --------- */

/* Sprint 143 — scroll text stroke fill, morph border hover, radial vignette bg -- */

/* Sprint 144 — clip-path slide reveal, shimmer hover on images, gradient drift bg */

/* Sprint 145 — elastic scale-in scroll, border pulse hover, depth fog bg -------- */

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

  // Lazy: buildParticles() does a synchronous getImageData (50–200ms) — far too
  // expensive to run on load for a section well below the fold. Defer it until the
  // canvas first scrolls into view so it never blocks first paint.
  let built = false;

  canvas.addEventListener('mousemove', (e) => setPointer(e.clientX, e.clientY), { passive: true });
  canvas.addEventListener('mouseleave', () => { pointer.on = false; });
  canvas.addEventListener('touchmove', (e) => {
    if (e.touches[0]) setPointer(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  canvas.addEventListener('touchend', () => { pointer.on = false; });

  const io = new IntersectionObserver(([e]) => {
    active = e.isIntersecting;
    if (active) {
      if (!built) { sizeCanvas(); buildParticles(); built = true; }
      step();
    } else if (raf) { cancelAnimationFrame(raf); raf = null; }
  }, { threshold: 0.1 });
  io.observe(canvas);

  let rt;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => { if (built) { sizeCanvas(); buildParticles(); } }, 200);
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
