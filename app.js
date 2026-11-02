/* oye: flashcards for the 1000 most common words in spoken Spanish.
   No build step, no dependencies. Progress lives in localStorage on this device. */
(() => {
  'use strict';

  const W = window.WORDS || [];
  const N = W.length;
  const H = 0, P = 1, EN = 2, XH = 3, XP = 3, XE = 4, NOTE = 5, GL = 6;

  // ---------------------------------------------------------------- helpers
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const plural = (n, one, many) => `${n} ${n === 1 ? one : (many || one + 's')}`;
  const MIN = 60e3;

  const ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.2v5.6c0 .5.4.9.9.9h3l4.4 3.8c.6.5 1.5.1 1.5-.7V5.2c0-.8-.9-1.2-1.5-.7L7.9 8.3h-3c-.5 0-.9.4-.9.9Z"/><path d="M16.6 8.4a5 5 0 0 1 0 7.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M19.1 5.9a8.6 8.6 0 0 1 0 12.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

  function smart(s) {
    return String(s)
      .replace(/(^|[\s(\[—-])"/g, '$1“').replace(/"/g, '”')
      .replace(/'/g, '’');
  }

  // ---------------------------------------------------------------- spanish text
  const LETTERS = 'A-Za-zÁÉÍÓÚÜÑáéíóúüñ';
  const plain = (marked) => marked.replace(/[|*]/g, '');
  const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[|*'’]/g, '').toLowerCase();
  const pyColored = (marked) => esc(plain(marked));

  // Example sentence: each word is a hover/tap target carrying its English gloss.
  function pyWords(text, gl) {
    let k = 0;
    return text.replace(new RegExp(`[${LETTERS}]+|[^${LETTERS}]+`, 'g'), (seg) => {
      if (!new RegExp(`[${LETTERS}]`).test(seg)) return esc(seg);
      const g = gl ? gl[k++] : '';
      return g ? `<span class="w" tabindex="0" data-g="${esc(g)}">${esc(seg)}</span>` : esc(seg);
    });
  }

  const tip = document.createElement('div');
  tip.className = 'tip'; tip.id = 'tip'; tip.setAttribute('role', 'tooltip'); tip.hidden = true;
  let tipFor = null;
  function showTip(w) {
    if (tipFor && tipFor !== w) tipFor.classList.remove('on');
    tipFor = w;
    tip.textContent = smart(w.dataset.g);
    tip.hidden = false;
    w.classList.add('on');
    w.setAttribute('aria-describedby', 'tip');
    const r = w.getBoundingClientRect();
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    const x = Math.max(8, Math.min(r.left + r.width / 2 - tw / 2, innerWidth - tw - 8));
    let y = r.top - th - 8;
    if (y < 8) y = r.bottom + 8;
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  }
  function hideTip() {
    if (tipFor) { tipFor.classList.remove('on'); tipFor.removeAttribute('aria-describedby'); }
    tipFor = null; tip.hidden = true;
  }
  document.addEventListener('pointerover', (e) => { if (e.pointerType === 'mouse') { const w = e.target.closest('.w'); if (w) showTip(w); } });
  document.addEventListener('pointerout', (e) => { if (e.pointerType === 'mouse') { const w = e.target.closest('.w'); if (w && !w.contains(e.relatedTarget)) hideTip(); } });
  document.addEventListener('focusin', (e) => { const w = e.target.closest && e.target.closest('.w'); if (w) showTip(w); });
  document.addEventListener('focusout', (e) => { if (e.target.closest && e.target.closest('.w')) hideTip(); });
  window.addEventListener('scroll', hideTip, { passive: true });

  function rich(text) {
    return esc(smart(text)).replace(/\{\{([^}]+)\}\}/g, (m, x) =>
      `<button type="button" class="say" data-say="${x}" lang="es">${x}</button>`);
  }

  // ---------------------------------------------------------------- the rhythm strip
  // "la com|pu|ta|*do|ra": one bar per syllable, the stressed one tall.
  function staffHTML(marked, cls = '', hint = false) {
    let html = '';
    for (const tok of marked.split(/(\s+)/)) {
      if (!tok) continue;
      if (/^\s+$/.test(tok)) { html += ' '; continue; }
      html += '<span class="wd">' + tok.split('|').map((s) => {
        const st = s.startsWith('*');
        return `<span class="sy${st ? ' st' : ''}">${esc(st ? s.slice(1) : s)}</span>`;
      }).join('') + '</span>';
    }
    const classes = ['staff', cls, hint ? 'hint' : '', S.settings.contours ? '' : 'no-contours'].filter(Boolean).join(' ');
    return `<span class="${classes}" lang="es"><svg class="staff-svg" aria-hidden="true"></svg><span class="staff-text">${html}</span></span>`;
  }
  const hasSandhi = () => false;

  function drawStaff(el) {
    const svg = el.querySelector('.staff-svg');
    const sys = [...el.querySelectorAll('.sy')];
    if (!svg || !sys.length) return;
    const box = el.getBoundingClientRect();
    const Hh = svg.getBoundingClientRect().height;
    if (!box.width || !Hh) return;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    const gap = Math.max(1.5, fs * 0.045);
    let out = '';
    sys.forEach((s, i) => {
      const r = s.getBoundingClientRect();
      const a = r.left - box.left + gap, w = Math.max(3, r.width - gap * 2);
      const st = s.classList.contains('st');
      const h = st ? Hh : Hh * 0.3;
      out += `<rect class="bar${st ? ' st' : ''}" style="--i:${i}" x="${a.toFixed(1)}" y="${(Hh - h).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="${Math.min(w / 2, fs * 0.05).toFixed(1)}"/>`;
    });
    svg.setAttribute('viewBox', `0 0 ${box.width.toFixed(1)} ${Hh.toFixed(1)}`);
    svg.innerHTML = out;
  }
  const drawAll = (root = document) => $$('.staff', root).forEach(drawStaff);
  function animateStaff(el) {
    if (!el) return;
    el.classList.remove('playing');
    void el.offsetWidth;
    el.classList.add('playing');
    const n = el.querySelectorAll('.sy').length;
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('playing'), n * 160 + 600);
  }

  // ---------------------------------------------------------------- storage
  const KEY = 'oye.v1';
  const DEFAULTS = { newPerDay: 20, direction: 'mixed', autoplay: true, voice: '', rate: 0.9, toneColors: true, contours: true };
  function normalize(d) {
    d = d && typeof d === 'object' ? d : {};
    const cards = {};
    for (const [k, c] of Object.entries(d.cards || {})) {
      const i = +k;
      if (Number.isInteger(i) && i >= 0 && i < N && c && typeof c === 'object' && [1, 2, 3].includes(c.st)) cards[i] = c;
    }
    return {
      v: 1,
      cards,
      settings: Object.assign({}, DEFAULTS, d.settings || {}),
      log: d.log && typeof d.log === 'object' ? d.log : {},
      extra: d.extra && typeof d.extra === 'object' ? d.extra : {},
    };
  }
  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) return normalize(JSON.parse(raw)); } catch (e) { /* storage blocked */ }
    return normalize({});
  }
  let saveWarned = false;
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); }
    catch (e) { if (!saveWarned) { toast("This browser isn’t saving progress. Private mode, maybe?"); saveWarned = true; } }
  }
  let S = load();

  // ---------------------------------------------------------------- scheduling (SM-2, Anki-style)
  const LEARN = [1, 10];       // minutes
  const RELEARN = [10];        // minutes
  const GRAD = 1, EASY_GRAD = 4; // days
  const START_EASE = 2.5, MIN_EASE = 1.3;
  const AHEAD = 5 * MIN;       // learning cards can be shown this early when nothing else is left

  function dayNum(ts = Date.now()) {
    const d = new Date(ts - 4 * 3600e3); // the day rolls over at 4am
    return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);
  }
  const fuzz = (n, exact) => (exact || n < 3 ? Math.round(n) : Math.round(n * (0.95 + Math.random() * 0.1)));

  function graduate(c, ivl, today) { c.st = 2; c.ivl = Math.max(1, Math.round(ivl)); c.dd = today + c.ivl; c.step = 0; delete c.due; }

  function schedule(card, g, now, exact = false) {
    const c = Object.assign({}, card);
    const today = dayNum(now);
    c.reps = (c.reps || 0) + 1;
    c.last = now;
    if (c.st === 2) {
      const ivl = c.ivl;
      if (g === 1) {
        c.lapses = (c.lapses || 0) + 1;
        c.ef = Math.max(MIN_EASE, c.ef - 0.2);
        c.st = 3; c.step = 0; c.due = now + RELEARN[0] * MIN;
        c.ivl = Math.max(1, Math.round(ivl * 0.5));
      } else {
        // Hard < Good < Easy, always at least a day apart.
        const hard = Math.round(Math.max(ivl + 1, ivl * 1.2));
        const good = Math.round(Math.max(hard + 1, ivl * c.ef));
        const easy = Math.round(Math.max(good + 1, ivl * c.ef * 1.3));
        const n = g === 2 ? hard : g === 3 ? good : easy;
        if (g === 2) c.ef = Math.max(MIN_EASE, c.ef - 0.15);
        if (g === 4) c.ef += 0.15;
        c.ivl = fuzz(n, exact); c.dd = today + c.ivl;
      }
      return c;
    }
    const steps = c.st === 3 ? RELEARN : LEARN;
    const step = Math.min(c.step || 0, steps.length - 1);
    if (g === 1) { c.step = 0; c.due = now + steps[0] * MIN; }
    else if (g === 2) {
      const cur = steps[step], nxt = steps[step + 1] ?? cur * 1.5;
      c.step = step; c.due = now + ((cur + nxt) / 2) * MIN;
    } else if (g === 3) {
      c.step = step + 1;
      if (c.step >= steps.length) graduate(c, c.st === 3 ? c.ivl : GRAD, today);
      else c.due = now + steps[c.step] * MIN;
    } else graduate(c, c.st === 3 ? c.ivl + 1 : EASY_GRAD, today);
    return c;
  }

  function fmtIvl(card, next, now) {
    if (next.st === 2) {
      const d = next.dd - dayNum(now);
      if (d < 31) return plural(d, 'day');
      if (d < 365) return `${(d / 30).toFixed(d < 300 ? 1 : 0).replace(/\.0$/, '')} mo`;
      return `${(d / 365).toFixed(1).replace(/\.0$/, '')} yr`;
    }
    const m = Math.round((next.due - now) / MIN);
    return m < 60 ? `${m} min` : `${Math.round(m / 60)} hr`;
  }

  function stateOf(i) {
    const c = S.cards[i];
    if (!c) return 0;
    if (c.st !== 2) return 1;
    return c.ivl >= 21 ? 3 : 2;
  }

  function queues(now = Date.now()) {
    const today = dayNum(now);
    const learn = [], review = [];
    for (const [k, c] of Object.entries(S.cards)) {
      if (c.st === 1 || c.st === 3) learn.push(+k);
      else if (c.dd <= today) review.push(+k);
    }
    learn.sort((a, b) => S.cards[a].due - S.cards[b].due);
    review.sort((a, b) => S.cards[a].dd - S.cards[b].dd || a - b);
    const done = (S.log[today] && S.log[today].n) || 0;
    const limit = (+S.settings.newPerDay || 0) + ((S.extra[today]) || 0);
    const fresh = [];
    for (let i = 0; i < N && fresh.length < Math.max(0, limit - done); i++) if (!S.cards[i]) fresh.push(i);
    return { learn, review, fresh, today, learnDue: learn.filter((i) => S.cards[i].due <= now) };
  }

  function logIt(kind) {
    const t = dayNum();
    const L = (S.log[t] = S.log[t] || { n: 0, r: 0 });
    L[kind] = (L[kind] || 0) + 1;
  }
  function streak() {
    const on = (d) => S.log[d] && (S.log[d].r > 0 || S.log[d].n > 0);
    let d = dayNum(); if (!on(d)) d--;
    let n = 0; while (on(d)) { n++; d--; }
    return n;
  }

  // ---------------------------------------------------------------- speech
  const TTS = {
    ok: 'speechSynthesis' in window,
    voices: [],
    voice: null,
    loaded: false,
    init() {
      if (!this.ok) { this.loaded = true; return; }
      const load = () => {
        const all = speechSynthesis.getVoices();
        this.voices = all.filter((v) => /^es\b/i.test(v.lang.replace('_', '-')));
        if (all.length) this.loaded = true;
        this.pick();
        if (current === 'settings') renderSettings();
      };
      load();
      if (speechSynthesis.addEventListener) speechSynthesis.addEventListener('voiceschanged', load);
      else speechSynthesis.onvoiceschanged = load;
      setTimeout(() => { this.loaded = true; if (current === 'study' && !this.voices.length) renderStudy(); }, 2500);
    },
    score(v) {
      let s = 0;
      const lang = v.lang.replace('_', '-');
      if (/^es-(MX|US|419|CO)/i.test(lang)) s += 20;      // closest to a neutral Latin American default
      else if (/^es-ES/i.test(lang)) s += 16;
      else s += 12;
      if (/natural|neural|online|enhanced|premium/i.test(v.name)) s += 8;
      if (/paulina|m[oó]nica|juan|jorge|dalia|jorge|elvira|alvaro|helena|laura/i.test(v.name)) s += 4;
      if (/google/i.test(v.name)) s += 3;
      if (v.localService) s += 1;
      if (/^(eddy|flo|grandma|grandpa|reed|rocko|sandy|shelley)\b/i.test(v.name)) s -= 15;
      return s;
    },
    pick() {
      const want = S.settings.voice;
      this.voice = this.voices.find((v) => v.voiceURI === want) || [...this.voices].sort((a, b) => this.score(b) - this.score(a))[0] || null;
    },
    speak(text, { rate, onstart, onend } = {}) {
      if (!this.ok || !text) return false;
      const go = () => {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = (this.voice && this.voice.lang) || 'es-MX';
        if (this.voice) u.voice = this.voice;
        u.rate = rate || +S.settings.rate || 0.9;
        u.onstart = () => onstart && onstart();
        u.onend = u.onerror = () => onend && onend();
        this.u = u; // keep a reference so Chrome doesn't garbage-collect it mid-sentence
        if (speechSynthesis.resume) speechSynthesis.resume(); // Chrome can get stuck 'paused' after the tab sleeps
        speechSynthesis.speak(u);
      };
      if (speechSynthesis.speaking || speechSynthesis.pending) { speechSynthesis.cancel(); setTimeout(go, 60); }
      else go();
      return true;
    },
  };

  function say(text, btn, staff, rate) {
    if (staff) animateStaff(staff);
    TTS.speak(text, {
      rate,
      onstart: () => btn && btn.classList.add('speaking'),
      onend: () => btn && btn.classList.remove('speaking'),
    });
  }
  const noVoice = () => TTS.loaded && !TTS.voices.length;

  // ---------------------------------------------------------------- toast
  let toastT;
  function toast(msg) {
    const el = $('.toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => el.classList.remove('show'), 2600);
  }

  // ---------------------------------------------------------------- router
  const VIEWS = ['today', 'study', 'words', 'settings'];
  let current = null;
  function route() {
    const v = (location.hash.match(/^#\/(\w+)/) || [])[1];
    show(VIEWS.includes(v) ? v : 'today');
  }
  function show(view) {
    const changed = view !== current;
    if (changed && view !== 'study') sess.ahead = false;
    current = view;
    for (const v of VIEWS) $('#view-' + v).hidden = v !== view;
    $$('.nav a').forEach((a) => (a.dataset.view === view ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
    ({ today: renderToday, study: renderStudy, words: renderWords, settings: renderSettings })[view]();
    if (changed) window.scrollTo(0, 0);
  }

  // ---------------------------------------------------------------- today
  let peekIdx = null;
  function renderToday() {
    const now = Date.now();
    const q = queues(now);
    const started = Object.keys(S.cards).length;
    const reviews = q.review.length + q.learn.filter((i) => S.cards[i].due <= now + AHEAD).length;
    const fresh = q.fresh.length;
    let h1, p, actions;
    if (!started && fresh) {
      h1 = `Your first ${fresh} words are ready.`;
      p = 'They start with the most common word in spoken Spanish and work down the list. Say everything out loud. Mouthing it silently is cheating.';
      actions = '<a class="btn primary" href="#/study">Start studying</a>';
    } else if (reviews || fresh) {
      const parts = [];
      if (reviews) parts.push(plural(reviews, 'review'));
      if (fresh) parts.push(`${fresh} new ${fresh === 1 ? 'word' : 'words'}`);
      h1 = `${parts.join(' and ')} today.`;
      const mins = Math.max(1, Math.round((reviews * 9 + fresh * 30) / 60));
      p = `About ${plural(mins, 'minute')}, if you don’t stall.`;
      actions = '<a class="btn primary" href="#/study">Start studying</a>';
    } else if (started >= N) {
      h1 = 'All caught up.';
      p = "You’ve started all 1000 words. From here it’s just reviews, and there are none due right now.";
      actions = '';
    } else {
      h1 = 'All caught up.';
      const nextDd = Math.min(...Object.values(S.cards).filter((c) => c.st === 2).map((c) => c.dd), Infinity);
      const pending = q.learn.length;
      p = pending ? `${plural(pending, 'card')} will come back in a few minutes.` :
        nextDd !== Infinity ? `Next reviews ${nextDd - q.today <= 1 ? 'are due tomorrow' : `in ${nextDd - q.today} days`}.` : 'Nothing is due.';
      actions = `<button class="btn" data-act="more">Learn 10 more words</button>`;
    }
    const counts = [0, 0, 0, 0];
    let dots = '';
    for (let i = 0; i < N; i++) { const s = stateOf(i); counts[s]++; dots += `<i class="s${s}${i === peekIdx ? ' sel' : ''}" data-i="${i}"></i>`; }
    const t = S.log[q.today] || { n: 0, r: 0 };
    $('#view-today').innerHTML = `
      <div class="today-head">
        <h1 id="today-title">${esc(h1)}</h1>
        <p>${esc(p)}</p>
        <div class="row">${actions}</div>
      </div>
      <div class="panel">
        <h2>Your 1000 words</h2>
        <p class="sub">One dot per word, most common first. Tap a dot to peek at it.</p>
        <div class="field" role="img" aria-label="${counts[3]} known, ${counts[2]} reviewing, ${counts[1]} learning, ${counts[0]} not started">${dots}</div>
        <ul class="legend">
          <li><i class="s0"></i>Not started <b>${counts[0]}</b></li>
          <li><i class="s1"></i>Learning <b>${counts[1]}</b></li>
          <li><i class="s2"></i>Reviewing <b>${counts[2]}</b></li>
          <li><i class="s3"></i>Known <b>${counts[3]}</b></li>
        </ul>
        <div class="peek" aria-live="polite">${peekHTML(peekIdx)}</div>
      </div>
      <div class="panel">
        <dl class="stats">
          <div><dt>Streak</dt><dd>${plural(streak(), 'day')}</dd></div>
          <div><dt>Reviewed today</dt><dd>${t.r || 0}</dd></div>
          <div><dt>New today</dt><dd>${t.n || 0}</dd></div>
        </dl>
      </div>`;
  }
  function peekHTML(i) {
    if (i == null) return '<p class="muted">Nothing selected yet.</p>';
    const w = W[i];
    const st = ['Not started', 'Learning', 'Reviewing', 'Known'][stateOf(i)];
    return `<div class="what"><span class="py" lang="es">${pyColored(w[P])}</span><p>${rich(w[EN])}</p><p>Word ${i + 1} of ${N}. ${st}.</p></div>
      <button class="play" data-act="say-i" data-i="${i}" aria-label="Play ${esc(plain(w[P]))}">${ICON_PLAY}</button>`;
  }

  // ---------------------------------------------------------------- study
  // Only move focus for keyboard users, so touch screens don't get stray focus rings.
  let kbd = false;
  document.addEventListener('keydown', () => { kbd = true; }, true);
  document.addEventListener('pointerdown', () => { kbd = false; }, true);

  function fitHead(root) {
    const spec = $('.spec', root), head = $('.staff.head', root);
    if (!spec || !head) return;
    head.style.fontSize = '';
    const avail = spec.clientWidth - 60;
    const w = head.getBoundingClientRect().width;
    if (w > avail) {
      const fs = parseFloat(getComputedStyle(head).fontSize);
      head.style.fontSize = Math.max(26, Math.floor((fs * avail) / w)) + 'px';
      drawStaff(head);
    }
  }

  const sess = { cur: null, mode: null, side: 'front', hint: false, n: 0, last: null, ahead: false, waitT: null,
    retry: [], filler: false, isRetry: false, dk: false };

  // Words you missed this session come back after a few cards until you get them right.
  // While the loop has words in it, roughly every other card is a quick check of a word you already know.
  function addRetry(i) {
    sess.retry = sess.retry.filter((r) => r.i !== i);
    sess.retry.push({ i, after: sess.n + 4 + Math.floor(Math.random() * 3) }); // 3 to 5 cards in between
  }
  function knownPool(skip) {
    const out = [], today = dayNum();
    for (const [k, c] of Object.entries(S.cards)) {
      const i = +k;
      if (c.st === 2 && c.dd > today && !skip.has(i) && i !== sess.last && i !== sess.cur) out.push(i);
    }
    return out;
  }
  const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function pickNext(now) {
    const q = queues(now);
    const inLoop = new Set(sess.retry.map((r) => r.i));
    const avoid = (list) => (list.length > 1 && list[0] === sess.last ? list[1] : list[0]);
    const ready = sess.retry.filter((r) => r.after <= sess.n && r.i !== sess.last);
    if (ready.length) return { i: ready[0].i, q, retry: true };
    const known = sess.retry.length ? knownPool(inLoop) : [];
    if (known.length && sess.n % 2 === 1) return { i: pickRandom(known), q, filler: true };
    const learnDue = q.learnDue.filter((i) => !inLoop.has(i));
    const learn = q.learn.filter((i) => !inLoop.has(i));
    if (learnDue.length) return { i: avoid(learnDue), q };
    const hasRev = q.review.length, hasNew = q.fresh.length;
    if (hasRev || hasNew) {
      const takeNew = hasNew && (!hasRev || sess.n % 4 === 3);
      return { i: takeNew ? q.fresh[0] : avoid(q.review), isNew: takeNew, q };
    }
    if (learn.length && (sess.ahead || S.cards[learn[0]].due <= now + AHEAD)) return { i: avoid(learn), q };
    if (sess.retry.length) {
      if (known.length) return { i: pickRandom(known), q, filler: true };
      const r = sess.retry.find((x) => x.i !== sess.last) || sess.retry[0];
      return { i: r.i, q, retry: true };
    }
    if (learn.length) return { wait: S.cards[learn[0]].due - now, q };
    return { done: true, q };
  }

  function directionFor(i) {
    const mode = S.settings.direction;
    if (mode === 'hear' || mode === 'say') return mode;
    const c = S.cards[i];
    return c && c.ld === 'hear' ? 'say' : 'hear';
  }

  function nextCard() {
    sess.cur = null;
    sess.side = 'front';
    sess.hint = false;
    renderStudy(true);
  }

  function countsHTML(q, kind) {
    const looped = new Set(sess.retry.map((r) => r.i));
    const learnN = q.learn.filter((i) => !looped.has(i)).length;
    return `<div class="counts" aria-label="Cards left">
      <span class="${kind === 'new' ? 'now' : ''}"><b>${q.fresh.length}</b> new</span>
      <span class="${kind === 'learn' ? 'now' : ''}"><b>${learnN}</b> learning</span>
      <span class="${kind === 'review' ? 'now' : ''}"><b>${q.review.length}</b> to review</span>
      ${sess.retry.length ? `<span class="${kind === 'retry' ? 'now' : ''}"><b>${sess.retry.length}</b> to retry</span>` : ''}
    </div>`;
  }

  function renderStudy(fresh = false) {
    const root = $('#view-study');
    hideTip();
    clearTimeout(sess.waitT);
    const now = Date.now();
    if (sess.cur == null || (sess.mode !== 'intro' && !S.cards[sess.cur])) {
      const nx = pickNext(now);
      if (nx.done) return renderDone(root, nx.q);
      if (nx.wait != null) return renderWait(root, nx.q, nx.wait);
      sess.cur = nx.i;
      sess.filler = !!nx.filler; sess.isRetry = !!nx.retry; sess.dk = false;
      sess.mode = S.cards[nx.i] ? directionFor(nx.i) : 'intro';
      sess.side = sess.mode === 'intro' ? 'back' : 'front';
      sess.hint = false;
      fresh = true;
    }
    const i = sess.cur, w = W[i], c = S.cards[i];
    const q = queues(now);
    const kind = sess.isRetry ? 'retry' : sess.filler ? '' : !c ? 'new' : c.st === 2 ? 'review' : 'learn';
    const remaining = q.fresh.length + q.learn.length + q.review.length;
    const depth = remaining > 15 ? 2 : remaining > 1 ? 1 : 0;
    const silent = noVoice();
    const voiceNote = silent ? `<div class="notice"><p>No Spanish voice on this device, so audio can’t play. Listening cards show the word instead. <a href="#/settings">How to add a voice</a></p></div>` : '';

    let body = '', actions = '', keys = '';
    if (sess.side === 'front' && sess.mode === 'hear') {
      const showPy = sess.hint || silent;
      body = `<p class="card-ask">${silent ? 'What does this mean?' : 'Listen. What does it mean?'}</p>
        <div class="card-front">
          ${silent ? '' : `<button class="play big" data-act="play-word" aria-label="Play the word again">${ICON_PLAY}</button>`}
          <div class="hint-area">${showPy ? staffHTML(w[P]) : ''}</div>
          ${showPy ? '' : '<button class="link-btn" data-act="hint">Show the word</button>'}
        </div>`;
      actions = '<div class="row"><button class="btn quiet" data-act="dk">Don’t know</button><button class="btn primary" data-act="flip">Show answer</button></div>';
      keys = 'Space shows the answer. D for don’t know. R replays.';
    } else if (sess.side === 'front' && sess.mode === 'say') {
      body = `<p class="card-ask">Say it out loud in Spanish.</p>
        <div class="card-front">
          <p class="prompt-en">${rich(w[EN])}</p>
          <div class="hint-area">${sess.hint ? staffHTML(w[P], '', true) : ''}</div>
          ${sess.hint ? '' : '<button class="link-btn" data-act="hint">Show the rhythm</button>'}
        </div>`;
      actions = '<div class="row"><button class="btn quiet" data-act="dk">Don’t know</button><button class="btn primary" data-act="flip">Show answer</button></div>';
      keys = 'Space shows the answer. D for don’t know. H shows the rhythm.';
    } else {
      const sandhi = S.settings.contours && hasSandhi(w[P]) ? '<p class="sandhi">Two 3rd tones in a row: the first one is said as a 2nd tone.</p>' : '';
      const tag = sess.mode === 'intro' ? 'New word' : sess.dk ? 'Here it is. It’ll come back in a few cards.' : '';
      body = `${tag ? `<p class="card-ask">${tag}</p>` : ''}
        <div class="spec">
          <div class="spec-row">${staffHTML(w[P], 'head')}<button class="play" data-act="play-word" aria-label="Play ${esc(plain(w[P]))}">${ICON_PLAY}</button></div>
          ${sandhi}
          <p class="gloss">${rich(w[EN])}</p>
        </div>
        <div class="inuse">
          <div class="example">
            <p class="ex-py" lang="es">${pyWords(w[XP], w[GL])}</p>
            <button class="play" data-act="play-ex" aria-label="Play the example">${ICON_PLAY}</button>
            <p class="ex-en">${esc(smart(w[XE]))}</p>
          </div>
          ${w[NOTE] ? `<p class="note">${rich(w[NOTE])}</p>` : ''}
        </div>
        <div class="card-foot"><span>Word ${i + 1} of ${N}</span><span>${sess.filler ? 'Quick check: a word you know' : sess.isRetry ? 'Back for another try' : !c ? 'First time' : c.reps ? `Reviewed ${c.reps === 1 ? 'once' : c.reps + ' times'}` : 'Just learned'}</span></div>`;
      if (sess.dk) {
        actions = `<div class="row"><button class="btn primary" data-act="cont">Continue</button></div>`;
        keys = 'Space continues. R replays, E plays the example.';
      } else if (sess.mode === 'intro') {
        actions = `<div class="row"><button class="btn quiet" data-act="know">I already know it</button><button class="btn primary" data-act="intro">Got it</button></div>`;
        keys = 'Space for Got it. K if you already know it. R replays.';
      } else {
        const labels = ['Again', 'Hard', 'Good', 'Easy'];
        actions = `<div class="grades">${labels.map((l, g) => {
          const nx = schedule(c, g + 1, now, true);
          const sub = sess.filler ? (g === 0 ? 'retry' : 'no change') : fmtIvl(c, nx, now);
          return `<button class="grade${g === 2 ? ' good' : ''}" data-act="grade" data-g="${g + 1}"><b>${l}</b><span>${sub}</span></button>`;
        }).join('')}</div>`;
        keys = '1 to 4 grades. Space is Good. R replays, E plays the example.';
      }
    }

    root.innerHTML = `${voiceNote}${countsHTML(q, kind)}
      <div class="deck" data-depth="${depth}"><article class="card" aria-live="polite">${body}</article></div>
      <div class="actions">${actions}<p class="keys">${keys}</p></div>`;
    drawAll(root);
    fitHead(root);
    const focusEl = $('[data-act="flip"], .grade.good, [data-act="intro"], [data-act="cont"]', root);
    if (focusEl && current === 'study' && kbd) focusEl.focus({ preventScroll: true });
    if (fresh && S.settings.autoplay && !silent && current === 'study') {
      if (sess.side === 'back') say(w[H], $('[data-act="play-word"]', root), $('.staff.head', root));
      else if (sess.mode === 'hear') say(w[H], $('[data-act="play-word"]', root));
    }
  }

  function renderDone(root, q) {
    const t = S.log[q.today] || { n: 0, r: 0 };
    const allStarted = Object.keys(S.cards).length >= N;
    root.innerHTML = `<div class="empty">
      <h2>That’s everything for today.</h2>
      <p>${t.r ? `${plural(t.r, 'review')} done${t.n ? `, ${t.n} new` : ''}. ` : ''}${allStarted ? 'Come back tomorrow.' : "Come back tomorrow, or keep going if you’re feeling ambitious."}</p>
      <div class="row">${allStarted ? '' : '<button class="btn primary" data-act="more">Learn 10 more words</button>'}<a class="btn" href="#/today">Back to Today</a></div>
    </div>`;
  }

  function renderWait(root, q, ms) {
    const m = Math.max(1, Math.ceil(ms / MIN));
    root.innerHTML = `${countsHTML(q, '')}<div class="empty">
      <h2>Next card in ${plural(m, 'minute')}.</h2>
      <p>The words you just learned come back after a short gap. That gap is the whole point.</p>
      <div class="row"><button class="btn primary" data-act="ahead">Show it now</button><a class="btn" href="#/today">Back to Today</a></div>
    </div>`;
    sess.waitT = setTimeout(() => current === 'study' && renderStudy(), Math.min(ms + 500, 60e3));
  }

  function flip() {
    if (sess.side !== 'front') return;
    sess.side = 'back';
    renderStudy();
    const root = $('#view-study');
    if (S.settings.autoplay && !noVoice()) say(W[sess.cur][H], $('[data-act="play-word"]', root), $('.staff.head', root));
  }

  function grade(g) {
    if (sess.side !== 'back' || sess.mode === 'intro' || sess.dk) return;
    const i = sess.cur, now = Date.now();
    // Quick checks of known words only count if you miss them.
    if (!sess.filler || g === 1) {
      const c = schedule(S.cards[i], g, now);
      c.ld = sess.mode;
      S.cards[i] = c;
      logIt('r'); save();
    }
    if (g === 1) addRetry(i);
    else sess.retry = sess.retry.filter((r) => r.i !== i);
    sess.last = i; sess.n++;
    nextCard();
  }

  function dontKnow() {
    if (sess.side !== 'front' || sess.mode === 'intro') return;
    const i = sess.cur, now = Date.now();
    const c = schedule(S.cards[i], 1, now);
    c.ld = sess.mode;
    S.cards[i] = c;
    logIt('r'); save();
    addRetry(i);
    sess.dk = true;
    sess.side = 'back';
    renderStudy();
    const root = $('#view-study');
    if (S.settings.autoplay && !noVoice()) say(W[i][H], $('[data-act="play-word"]', root), $('.staff.head', root));
  }

  function continueOn() {
    if (!sess.dk) return;
    sess.last = sess.cur; sess.n++;
    nextCard();
  }

  function introduce(known) {
    if (sess.mode !== 'intro') return;
    const i = sess.cur, now = Date.now();
    const c = { st: 1, step: 0, due: now + LEARN[0] * MIN, ef: START_EASE, reps: 0, lapses: 0, seen: now };
    if (known) graduate(c, EASY_GRAD, dayNum(now));
    S.cards[i] = c;
    logIt('n'); save();
    sess.last = i; sess.n++;
    nextCard();
  }

  function learnMore() {
    const t = dayNum();
    S.extra[t] = (S.extra[t] || 0) + 10;
    save();
    toast('10 more words added for today.');
    location.hash = '#/study';
    if (current === 'study') nextCard();
  }

  // ---------------------------------------------------------------- words
  let wordsBuilt = false;
  function renderWords() {
    const root = $('#view-words');
    if (!wordsBuilt) {
      let rows = '';
      for (let i = 0; i < N; i++) {
        const w = W[i];
        rows += `<li data-i="${i}" data-k="${esc(fold(w[P]) + ' ' + w[EN].toLowerCase())}">
          <div class="wrow"><span class="num">${i + 1}</span>
            <button class="open" data-act="open" aria-expanded="false"><span class="py" lang="es">${pyColored(w[P])}</span><span class="en">${esc(smart(w[EN].replace(/\{\{[^|]+\|([^}]+)\}\}|\[\[([^\]]+)\]\]/g, '$1$2')))}</span></button>
            <span class="right"><span class="st"></span><button class="play" data-act="say-i" data-i="${i}" aria-label="Play ${esc(plain(w[P]))}">${ICON_PLAY}</button></span>
          </div></li>`;
      }
      root.innerHTML = `<div class="words-head">
          <h1 id="words-title">Words</h1>
          <label class="vh" for="q">Search</label>
          <input id="q" class="search" type="search" placeholder="Search English or Spanish (accents optional)" autocomplete="off" spellcheck="false">
          <fieldset class="filters"><legend>Show</legend>
            ${[['all', 'All'], ['0', 'Not started'], ['1', 'Learning'], ['2', 'Reviewing'], ['3', 'Known']].map(([v, l]) =>
              `<label><input type="radio" name="wf" value="${v}"${v === 'all' ? ' checked' : ''}><span>${l}</span></label>`).join('')}
          </fieldset>
          <p class="count-line" aria-live="polite"></p>
        </div>
        <ol class="wlist">${rows}</ol>`;
      $('#q', root).addEventListener('input', filterWords);
      $$('input[name="wf"]', root).forEach((r) => r.addEventListener('change', filterWords));
      wordsBuilt = true;
    }
    $$('.wlist > li', root).forEach((li) => { $('.st', li).className = 'st s' + stateOf(+li.dataset.i); });
    filterWords();
  }
  function filterWords() {
    const root = $('#view-words');
    const raw = $('#q', root).value.trim().toLowerCase();
    const qf = fold(raw);
    const f = ($('input[name="wf"]:checked', root) || {}).value || 'all';
    let n = 0;
    $$('.wlist > li', root).forEach((li) => {
      const k = li.dataset.k;
      const okText = !raw || k.includes(raw) || (qf && k.split(' ')[0].includes(qf));
      const okState = f === 'all' || String(stateOf(+li.dataset.i)) === f;
      li.hidden = !(okText && okState);
      if (!li.hidden) n++;
    });
    $('.count-line', root).textContent = n === N ? `${N} words, most common first.` : plural(n, 'word') + (n ? '' : '. Try fewer letters, or search the English.');
  }
  function toggleWord(li) {
    const btn = $('.open', li);
    const open = btn.getAttribute('aria-expanded') === 'true';
    const det = $('.wdetail', li);
    if (open) { det && det.remove(); btn.setAttribute('aria-expanded', 'false'); return; }
    const i = +li.dataset.i, w = W[i];
    const d = document.createElement('div');
    d.className = 'wdetail';
    d.innerHTML = `<div>${staffHTML(w[P])}</div>
      <div class="example">
        <p class="ex-py" lang="es">${pyWords(w[XP], w[GL])}</p>
        <button class="play" data-act="say-x" data-i="${i}" aria-label="Play the example">${ICON_PLAY}</button>
        <p class="ex-en">${esc(smart(w[XE]))}</p>
      </div>
      ${w[NOTE] ? `<p class="note">${rich(w[NOTE])}</p>` : ''}`;
    li.appendChild(d);
    btn.setAttribute('aria-expanded', 'true');
    drawAll(d);
  }

  // ---------------------------------------------------------------- settings
  let resetArmed = null;
  function renderSettings() {
    const st = S.settings;
    const voiceOpts = ['<option value="">Automatic (best available)</option>']
      .concat(TTS.voices.map((v) => `<option value="${esc(v.voiceURI)}"${v.voiceURI === st.voice ? ' selected' : ''}>${esc(v.name)} (${esc(v.lang)})</option>`)).join('');
    const tones = [
      ['*ca|sa', 'casa', 'house', 'Ends in a vowel: stress the second-to-last syllable.'],
      ['ha|*blar', 'hablar', 'to speak', 'Ends in a consonant other than n or s: stress the last.'],
      ['*lá|piz', 'lápiz', 'pencil', 'An accent mark overrides both rules.'],
      ['can|*ción', 'canción', 'song', 'Ends in n, but the accent pulls the stress to the end.'],
    ];
    $('#view-settings').innerHTML = `
      <div class="settings-head"><h1 id="settings-title">Settings</h1></div>

      <section class="group" aria-labelledby="s-study">
        <h2 id="s-study">Studying</h2>
        <div class="set"><label class="lbl" for="newPerDay"><b>New words per day</b><span>20 a day gets you through all 1000 in under two months.</span></label>
          <input id="newPerDay" type="number" min="0" max="200" step="5" value="${esc(st.newPerDay)}" inputmode="numeric"></div>
        <div class="set stack"><div class="lbl" id="dir-l"><b>Card direction</b><span>Mixed alternates between hearing a word and saying it.</span></div>
          <div class="seg" role="radiogroup" aria-labelledby="dir-l">
            ${[['mixed', 'Mixed'], ['hear', 'Hear it'], ['say', 'Say it']].map(([v, l]) =>
              `<label><input type="radio" name="direction" value="${v}"${st.direction === v ? ' checked' : ''}><span>${l}</span></label>`).join('')}
          </div></div>
      </section>

      <section class="group" aria-labelledby="s-audio">
        <h2 id="s-audio">Audio</h2>
        ${TTS.voices.length ? '' : `<p>${TTS.ok ? 'No Spanish voice found on this device yet. Audio uses the voices built into your operating system, so add one:' : "This browser can’t do speech. Try Chrome, Edge or Safari."}</p>
        ${TTS.ok ? `<ul class="voice-help">
          <li>iPhone or iPad: Settings, Accessibility, Spoken Content, Voices, Spanish. Download one (Mexico or Spain), then reload this page.</li>
          <li>Mac: System Settings, Accessibility, Spoken Content, System voice, Manage Voices, then add a Spanish voice.</li>
          <li>Windows: Settings, Time &amp; language, Speech, Add voices, Spanish (Mexico) or Spanish (Spain). Microsoft Edge also has very good online voices built in.</li>
          <li>Android: Settings, then Text-to-speech output. In Google’s engine settings, install the Spanish voice data.</li>
        </ul>` : ''}`}
        <div class="set"><div class="lbl"><b>Play audio automatically</b><span>When a card appears and when you flip it.</span></div>
          <label class="switch"><input type="checkbox" id="autoplay"${st.autoplay ? ' checked' : ''}><span></span><b class="vh">Play audio automatically</b></label></div>
        <div class="set"><label class="lbl" for="voice"><b>Voice</b><span>${TTS.voices.length ? plural(TTS.voices.length, 'Spanish voice') + ' on this device.' : 'None available.'}</span></label>
          <select id="voice"${TTS.voices.length ? '' : ' disabled'}>${voiceOpts}</select></div>
        <div class="set"><label class="lbl" for="rate"><b>Speed</b><span id="rate-v">${Math.round(st.rate * 100)}% of normal</span></label>
          <input id="rate" type="range" min="0.6" max="1.2" step="0.05" value="${esc(st.rate)}"></div>
        <div class="set"><div class="lbl"><b>Test it</b><span>Plays “Hola, estoy aprendiendo español.”</span></div>
          <button class="btn small" data-act="test-voice">Play test</button></div>
      </section>

      <section class="group" aria-labelledby="s-display">
        <h2 id="s-display">Display</h2>
        <div class="set"><div class="lbl"><b>Highlight the stress</b><span>Colors the syllable you hit hardest.</span></div>
          <label class="switch"><input type="checkbox" id="toneColors"${st.toneColors ? ' checked' : ''}><span></span><b class="vh">Highlight the stress</b></label></div>
        <div class="set"><div class="lbl"><b>Rhythm bars</b><span>One bar per syllable over each word, the stressed one tall.</span></div>
          <label class="switch"><input type="checkbox" id="contours"${st.contours ? ' checked' : ''}><span></span><b class="vh">Rhythm bars</b></label></div>
      </section>

      <section class="group" aria-labelledby="s-tones">
        <h2 id="s-tones">Where the stress goes</h2>
        <p>Spanish spelling tells you which syllable to hit, every time. Get the stress wrong and people may hear a different word. Three rules cover it.</p>
        <div class="tones">${tones.map(([py, hz, en, how]) => `<div class="tone">${staffHTML(py)}<p><b>${esc(en)}</b>${esc(how)}</p>
          <button class="play" data-act="say-text" data-say="${hz}" aria-label="Play ${py}">${ICON_PLAY}</button></div>`).join('')}</div>
        <ul class="rules">
          <li><b>Stress changes meaning:</b> <button type="button" class="say" data-say="papa" lang="es">papa</button> (potato) vs <button type="button" class="say" data-say="papá" lang="es">papá</button> (dad), <button type="button" class="say" data-say="hablo" lang="es">hablo</button> (I speak) vs <button type="button" class="say" data-say="habló" lang="es">habló</button> (he spoke).</li>
          <li><b>Vowels never go lazy.</b> English turns unstressed vowels into “uh.” Spanish keeps every a, e, i, o, u crisp, stressed or not.</li>
          <li><b>Little words lean on the next one.</b> el, la, de, que, me, te and se are unstressed, so <button type="button" class="say" data-say="la casa" lang="es">la casa</button> sounds like one word: la-CA-sa.</li>
        </ul>
      </section>

      <section class="group" aria-labelledby="s-data">
        <h2 id="s-data">Your progress</h2>
        <p>Progress is saved in this browser only. Export it to move to another device or keep a backup.</p>
        <div class="set"><div class="lbl"><b>Back up</b><span>${plural(Object.keys(S.cards).length, 'word')} started.</span></div>
          <button class="btn small" data-act="export">Export progress</button></div>
        <div class="set"><div class="lbl"><b>Restore</b><span>Replaces what’s in this browser.</span></div>
          <label class="btn small" for="importFile">Import progress</label><input id="importFile" type="file" accept="application/json,.json" class="vh"></div>
        <div class="set"><div class="lbl"><b>Start over</b><span>Erases all progress in this browser.</span></div>
          <button class="btn small quiet danger" data-act="reset">Reset progress</button></div>
      </section>

      <section class="group" aria-labelledby="s-about">
        <h2 id="s-about">About the word list</h2>
        <p>The ranking comes from word frequencies in Spanish film and TV subtitles (the OpenSubtitles 2018 corpus, via Hermit Dave’s FrequencyWords lists), which track everyday speech better than counts based on books or news. Word forms were grouped under their base word, so tengo, tienes and tiene all count toward tener. Cop-show vocabulary, names and slurs were cut, and essentials that subtitles undercount (days of the week, food, travel basics) were added. Where Spain and Latin America differ, the card uses the most widely understood word and the note gives the other.</p>
        <p class="fineprint">Hover over (or tap) a word in an example sentence to see what it means. Keyboard: Space flips and grades Good, D is don’t know, 1 to 4 grade, R replays the word, E plays the example, H shows a hint. Fonts: Gentium Book Plus and Andika by SIL International, under the SIL Open Font License.</p>
      </section>`;
    drawAll($('#view-settings'));
  }

  function setSetting(k, v) {
    S.settings[k] = v;
    save();
    applyDisplay();
  }
  function applyDisplay() {
    document.body.classList.toggle('mono-tones', !S.settings.toneColors);
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    const d = new Date();
    a.href = URL.createObjectURL(blob);
    a.download = `oye-progress-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('Progress exported.');
  }
  function importData(file) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(r.result);
        if (!d || typeof d !== 'object' || typeof d.cards !== 'object') throw new Error('shape');
        S = normalize(d);
        save(); applyDisplay(); TTS.pick();
        sess.cur = null; sess.retry = []; wordsBuilt = false;
        toast(`Progress imported: ${plural(Object.keys(S.cards).length, 'word')}.`);
        renderSettings();
      } catch (e) {
        toast("That file isn’t an oye progress export.");
      }
    };
    r.readAsText(file);
  }
  function reset(btn) {
    if (!resetArmed) {
      btn.classList.add('armed');
      btn.textContent = 'Tap again to erase everything';
      resetArmed = setTimeout(() => { resetArmed = null; if (btn.isConnected) { btn.classList.remove('armed'); btn.textContent = 'Reset progress'; } }, 4000);
      return;
    }
    clearTimeout(resetArmed); resetArmed = null;
    S = normalize({ settings: S.settings });
    save();
    sess.cur = null; sess.retry = []; peekIdx = null;
    toast('Progress reset. Back to word one.');
    renderSettings();
  }

  // ---------------------------------------------------------------- events
  document.addEventListener('click', (e) => {
    const word = e.target.closest('.w');
    if (word) { showTip(word); return; }
    hideTip();
    const dot = e.target.closest('.field i');
    if (dot) {
      peekIdx = +dot.dataset.i;
      $$('.field i.sel').forEach((x) => x.classList.remove('sel'));
      dot.classList.add('sel');
      $('.peek').innerHTML = peekHTML(peekIdx);
      return;
    }
    const el = e.target.closest('[data-act], .say');
    if (!el) return;
    if (el.classList.contains('say') && !el.dataset.act) { say(el.dataset.say, el); return; }
    const act = el.dataset.act;
    const root = $('#view-study');
    switch (act) {
      case 'flip': flip(); break;
      case 'grade': grade(+el.dataset.g); break;
      case 'dk': dontKnow(); break;
      case 'cont': continueOn(); break;
      case 'intro': introduce(false); break;
      case 'know': introduce(true); break;
      case 'hint': sess.hint = true; renderStudy(); break;
      case 'ahead': sess.ahead = true; renderStudy(); break;
      case 'more': learnMore(); break;
      case 'play-word': say(W[sess.cur][H], el, $('.staff.head', root)); break;
      case 'play-ex': say(W[sess.cur][XH], el, null, (+S.settings.rate || 0.9) * 0.95); break;
      case 'say-i': say(W[+el.dataset.i][H], el, el.closest('li') ? $('.wdetail .staff', el.closest('li')) : null); break;
      case 'say-x': say(W[+el.dataset.i][XH], el, null, (+S.settings.rate || 0.9) * 0.95); break;
      case 'say-text': say(el.dataset.say, el, $('.staff', el.closest('.tone'))); break;
      case 'open': toggleWord(el.closest('li')); break;
      case 'test-voice': say('Hola, estoy aprendiendo español.', el); break;
      case 'export': exportData(); break;
      case 'reset': reset(el); break;
    }
  });

  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'newPerDay') { const v = Math.max(0, Math.min(200, Math.round(+t.value || 0))); t.value = v; setSetting('newPerDay', v); sess.cur = sess.mode === 'intro' ? null : sess.cur; }
    else if (t.name === 'direction') { setSetting('direction', t.value); if (sess.side === 'front') sess.cur = null; }
    else if (t.id === 'autoplay') setSetting('autoplay', t.checked);
    else if (t.id === 'voice') { setSetting('voice', t.value); TTS.pick(); }
    else if (t.id === 'toneColors') setSetting('toneColors', t.checked);
    else if (t.id === 'contours') { setSetting('contours', t.checked); wordsBuilt = false; renderSettings(); }
    else if (t.id === 'importFile' && t.files && t.files[0]) importData(t.files[0]);
  });
  document.addEventListener('input', (e) => {
    if (e.target.id === 'rate') {
      S.settings.rate = +e.target.value;
      const v = $('#rate-v'); if (v) v.textContent = `${Math.round(S.settings.rate * 100)}% of normal`;
      save();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (current !== 'study' || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest('input, select, textarea')) return;
    const onControl = e.target.closest('button, a, label');
    const k = e.key.toLowerCase();
    const root = $('#view-study');
    if ((k === ' ' || k === 'enter') && !onControl) {
      e.preventDefault();
      if (sess.side === 'front') flip();
      else if (sess.dk) continueOn();
      else if (sess.mode === 'intro') introduce(false);
      else grade(3);
    } else if (/^[1-4]$/.test(k) && sess.side === 'back') grade(+k);
    else if (k === 'r' && sess.cur != null) say(W[sess.cur][H], $('[data-act="play-word"]', root), $('.staff.head', root));
    else if (k === 'e' && sess.cur != null && sess.side === 'back') say(W[sess.cur][XH], $('[data-act="play-ex"]', root), null, (+S.settings.rate || 0.9) * 0.95);
    else if (k === 'h' && sess.side === 'front' && !sess.hint) { sess.hint = true; renderStudy(); }
    else if (k === 'k' && sess.mode === 'intro') introduce(true);
    else if (k === 'd' && sess.side === 'front') dontKnow();
  });

  let rz;
  window.addEventListener('resize', () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(() => { drawAll(); if (current === 'study') fitHead($('#view-study')); }); });
  window.addEventListener('storage', (e) => { if (e.key === KEY) { S = load(); sess.cur = null; route(); } });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && (current === 'today' || (current === 'study' && sess.side === 'front' && sess.mode !== 'intro'))) route(); });

  // ---------------------------------------------------------------- boot
  function boot() {
    if (!N) { document.body.innerHTML = '<p class="noscript">The word list (words.js) didn’t load.</p>'; return; }
    document.body.appendChild(tip);
    applyDisplay();
    $('.staff-mark').outerHTML = staffHTML($('.staff-mark').dataset.py, 'staff-mark');
    TTS.init();
    route();
    window.addEventListener('hashchange', route);
    drawAll();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => drawAll());
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }
  boot();
})();
