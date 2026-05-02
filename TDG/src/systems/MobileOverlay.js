// ============================================================
// MobileOverlay — pure DOM overlay for mobile letterbox zones
// Uses the black bars above/below the game canvas on portrait
// mobile to show announcements (top) and resources (bottom).
//
// No Phaser dependency. Communicates via window CustomEvents:
//   dk:announce  { text, dur? }   — push a message
//   dk:resources { inv, hp, maxHp, mp, maxMp, wave, isDay, weapon, armor }
//   dk:clear                      — hide/reset both zones
// ============================================================

const RES_COLORS = {
  wood:             '#8B6040',
  stone:            '#9A908A',
  bone:             '#EDE0C4',
  coal:             '#888888',
  iron:             '#C0A882',
  crystal:          '#5BBCB0',
  gold:             '#D4A017',
  ruby:             '#FF5577',
  emerald:          '#44DD88',
  souls:            '#AA44FF',
  raw_meat:         '#FF9988',
  cooked_meat:      '#CC7733',
  key_regular:      '#C8A882',
  key_boss:         '#D4A017',
  cursed_essence:   '#CC22FF',
  void_shards:      '#4422FF',
  corrupted_wood:   '#7A5533',
  corrupted_stone:  '#664455',
};

const RES_LABELS = {
  wood: 'Wood', stone: 'Stone', bone: 'Bone', coal: 'Coal',
  iron: 'Iron', crystal: 'Crystal', gold: 'Gold', ruby: 'Ruby',
  emerald: 'Emerald', souls: 'Souls',
  raw_meat: 'Raw Meat', cooked_meat: 'Cooked',
  key_regular: 'Key', key_boss: 'Boss Key',
  cursed_essence: 'C.Essence', void_shards: 'Void Shards',
  corrupted_wood: 'Corr.Wood', corrupted_stone: 'Corr.Stone',
};

class MobileOverlay {
  constructor() {
    this._topVisible   = false;
    this._botVisible   = false;
    this._clearTimer   = null;
    this._resThrottle  = 0;
    this._lastResHTML  = '';
    this._posTimer     = null;

    this._buildDOM();
    this._bindEvents();
    // Position once canvas is ready (Phaser creates it synchronously
    // but Scale Manager sizes it on the first rAF tick)
    this._waitForCanvas();
  }

  // ── DOM construction ─────────────────────────────────────

  _buildDOM() {
    // ── Top zone (announcements) ──────────────────────────
    this._topEl = document.createElement('div');
    this._topEl.className = 'dk-overlay dk-overlay-top';

    this._statusEl = document.createElement('div');
    this._statusEl.className = 'dk-status';
    this._topEl.appendChild(this._statusEl);

    this._annoEl = document.createElement('div');
    this._annoEl.className = 'dk-announce';
    this._topEl.appendChild(this._annoEl);

    // ── Bottom zone (resources) ───────────────────────────
    this._botEl = document.createElement('div');
    this._botEl.className = 'dk-overlay dk-overlay-bot';

    this._resEl = document.createElement('div');
    this._resEl.className = 'dk-resources';
    this._botEl.appendChild(this._resEl);

    document.body.appendChild(this._topEl);
    document.body.appendChild(this._botEl);
  }

  // ── Canvas detection & positioning ───────────────────────

  _waitForCanvas() {
    const attempt = () => {
      const canvas = document.querySelector('#game-container canvas');
      if (!canvas) { requestAnimationFrame(attempt); return; }
      this._position(canvas);
    };
    requestAnimationFrame(attempt);

    // Re-position on every resize (orientation changes, zoom, etc.)
    window.addEventListener('resize', () => {
      clearTimeout(this._posTimer);
      this._posTimer = setTimeout(() => {
        const canvas = document.querySelector('#game-container canvas');
        if (canvas) this._position(canvas);
      }, 80);
    });
  }

  _position(canvas) {
    const rect  = canvas.getBoundingClientRect();
    const vw    = window.innerWidth;
    const vh    = window.innerHeight;
    const topH  = Math.round(rect.top);
    const botH  = Math.round(vh - rect.bottom);
    const MIN   = 32;  // minimum letterbox height to bother showing UI

    this._topVisible = topH >= MIN;
    this._botVisible = botH >= MIN;

    const applyZone = (el, show, topPos, botPos, h) => {
      el.style.display  = show ? 'flex' : 'none';
      if (!show) return;
      el.style.left     = '0';
      el.style.right    = '0';
      el.style.width    = '100%';
      el.style.height   = `${h}px`;
      if (topPos !== null) el.style.top    = `${topPos}px`;
      if (botPos !== null) el.style.bottom = `${botPos}px`;
    };

    applyZone(this._topEl, this._topVisible, 0,    null, topH);
    applyZone(this._botEl, this._botVisible, null, 0,    botH);
  }

  // ── Event bridge ─────────────────────────────────────────

  _bindEvents() {
    window.addEventListener('dk:announce',  e => this._announce(e.detail.text, e.detail.dur ?? 3000));
    window.addEventListener('dk:resources', e => this._updateResources(e.detail));
    window.addEventListener('dk:clear',     () => this._clear());
  }

  // ── Announcements ─────────────────────────────────────────

  _announce(text, dur) {
    if (!this._topVisible) return;
    clearTimeout(this._clearTimer);
    this._annoEl.textContent = text;
    this._annoEl.classList.add('visible');
    this._clearTimer = setTimeout(() => {
      this._annoEl.classList.remove('visible');
    }, dur);
  }

  // ── Status (phase/wave) ───────────────────────────────────

  _setStatus(wave, isDay) {
    if (!this._topVisible) return;
    const phase = isDay ? 'DAY' : 'NIGHT';
    const color = isDay ? '#FFB830' : '#8899FF';
    this._statusEl.innerHTML =
      `<span style="color:${color}">&#9679; ${phase}</span>` +
      `<span class="dk-status-wave">Wave ${wave}</span>`;
  }

  // ── Resources ────────────────────────────────────────────

  _updateResources(data) {
    const now = Date.now();
    if (now - this._resThrottle < 200) return;  // max 5 fps DOM updates
    this._resThrottle = now;

    if (!this._botVisible) return;

    const { inv = {}, hp = 100, maxHp = 100, mp = 100, maxMp = 100,
            wave = 0, isDay = true } = data;

    this._setStatus(wave, isDay);

    const hpPct  = hp / maxHp;
    const hpCol  = hpPct > 0.5 ? '#55CC55' : hpPct > 0.25 ? '#FFB830' : '#FF4444';

    const energyPct = mp / maxMp;
    const energyCol = energyPct > 0.4 ? '#4488FF' : '#225599';

    const chips = [
      { label: 'HP',     val: `${Math.ceil(hp)}/${maxHp}`, color: hpCol    },
      { label: 'ENERGY', val: `${Math.ceil(mp)}/${maxMp}`, color: energyCol },
    ];

    for (const [key, val] of Object.entries(inv)) {
      if (!val || val <= 0) continue;
      const col = RES_COLORS[key];
      if (!col) continue;
      chips.push({ label: RES_LABELS[key] ?? key, val: String(val), color: col });
    }

    const html = chips.map(c =>
      `<span class="dk-chip">` +
      `<span class="dk-chip-lbl" style="color:${c.color}">${c.label}</span>` +
      `<span class="dk-chip-val" style="color:${c.color}">${c.val}</span>` +
      `</span>`
    ).join('');

    if (html !== this._lastResHTML) {
      this._resEl.innerHTML = html;
      this._lastResHTML = html;
    }
  }

  // ── Clear ─────────────────────────────────────────────────

  _clear() {
    clearTimeout(this._clearTimer);
    this._annoEl.textContent = '';
    this._annoEl.classList.remove('visible');
    this._statusEl.innerHTML = '';
    this._resEl.innerHTML    = '';
    this._lastResHTML        = '';
  }
}

// Singleton — imported once by main.js, self-initialises
export const mobileOverlay = new MobileOverlay();
