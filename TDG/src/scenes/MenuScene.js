// ============================================================
// MenuScene — main menu with 3 save slots
// ============================================================
import { VW, VH } from '../constants.js';
import { metaProgression } from '../systems/MetaProgression.js';
import { settingsStore }   from '../systems/SettingsStore.js';
import { soundMgr }        from '../systems/SoundManager.js';

const SLOT_KEYS = ['siege_eternal_save_1', 'siege_eternal_save_2', 'siege_eternal_save_3'];

// ── Version history ───────────────────────────────────────
export const CURRENT_VERSION = 'v0.11.3';

const VERSION_HISTORY = [
  { ver: 'v0.11.3', date: 'Apr 2026', notes: 'Codex full audit: blueprint text fixed · weapons tab · machines · cursed zone · relics · all chest types · 9 perk corrections' },
  { ver: 'v0.11.2', date: 'Apr 2026', notes: 'Hotbar removed · All armour in one tab (4×5 grid) · ~ key toggles labels · Blueprint towers in Codex with weaknesses & purple style' },
  { ver: 'v0.11.1', date: 'Apr 2026', notes: 'Emerald cave bonuses (spd/mine/dmg/lifesteal) · Torch wider with emerald helm · Crystal set craft discount · Cave armour state' },
  { ver: 'v0.11.0', date: 'Apr 2026', notes: '5-set armour system (helmet+chest+pants+boots) · Full set bonuses · 5-slot hotbar (keys 1-5) · Backpack overhaul · Dynamic resource panel' },
  { ver: 'v0.10.0', date: 'Apr 2026', notes: 'Raids south-of-river · Cursed enemies zone-locked · Chests respawn every 3 days · Permanent mutations · Elite +50% · Codex in pause' },
  { ver: 'v0.9.0',  date: 'Apr 2026', notes: 'Mutation rounds · Tower synergies (7 combos) · Build-menu keyboard nav (1-7 tabs, arrows, Enter)' },
  { ver: 'v0.8.0',  date: 'Apr 2026', notes: 'Raid events · Blueprints · Corrupted towers rework · Dual-wield bow + upgrade' },
  { ver: 'v0.7.0',  date: 'Apr 2026', notes: 'Run perks (22) · Mini objectives · Boss-kill escalation · Bounty rounds' },
  { ver: 'v0.6.0',  date: 'Apr 2026', notes: 'Map themes · Chests & keys · Crystal Wraith · Deep cave darkness & torch' },
];

function _migrateOldSave() {
  const old = localStorage.getItem('dungeonkeep_save');
  if (old && !localStorage.getItem('siege_eternal_save_1')) {
    localStorage.setItem('siege_eternal_save_1', old);
  }
  if (old) localStorage.removeItem('dungeonkeep_save');

  for (let i = 1; i <= 3; i++) {
    const oldKey = `dungeonkeep_save_${i}`;
    const newKey = `siege_eternal_save_${i}`;
    const data = localStorage.getItem(oldKey);
    if (data && !localStorage.getItem(newKey)) localStorage.setItem(newKey, data);
    if (data) localStorage.removeItem(oldKey);
  }
}

export class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    _migrateOldSave();

    const cx = VW / 2;

    // ── Background ─────────────────────────────────────────
    this.add.rectangle(cx, VH / 2, VW, VH, 0x06080F);

    const glow = this.add.graphics();
    glow.fillGradientStyle(0x1A0A30, 0x1A0A30, 0x0D1525, 0x0D1525, 1);
    glow.fillRect(0, VH * 0.35, VW, VH * 0.65);

    // Stars
    const starGfx = this.add.graphics();
    starGfx.fillStyle(0xFFFFFF, 1);
    for (let i = 0; i < 120; i++) {
      const sx = Math.random() * VW;
      const sy = Math.random() * VH * 0.5;
      starGfx.fillCircle(sx, sy, Math.random() < 0.15 ? 1.5 : 0.8);
    }

    this._spawnEmbers();

    // ── Title ──────────────────────────────────────────────
    // Drop shadow
    this.add.text(cx + 3, 83, 'SIEGE ETERNAL', {
      fontSize: '52px', fill: '#1A0830', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);
    // Main title
    const title = this.add.text(cx, 80, 'SIEGE ETERNAL', {
      fontSize: '52px', fontFamily: 'monospace', fontStyle: 'bold',
      fill: '#FFD97A', stroke: '#7A3800', strokeThickness: 5,
    }).setOrigin(0.5);
    this.tweens.add({ targets: title, alpha: { from: 0.85, to: 1 }, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // ── Tagline ────────────────────────────────────────────
    this.add.text(cx, 136, 'Hold the line.  Build smarter.  Survive the siege.', {
      fontSize: '13px', fill: '#9A8060', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // ── Divider ────────────────────────────────────────────
    const div = this.add.graphics();
    div.lineStyle(1, 0x5A3A18, 0.7);
    div.lineBetween(cx - 220, 156, cx + 220, 156);
    div.fillStyle(0xD4A017, 0.8);
    div.fillCircle(cx,       156, 3);
    div.fillCircle(cx - 220, 156, 2);
    div.fillCircle(cx + 220, 156, 2);

    // ── Best run badge ─────────────────────────────────────
    const best = localStorage.getItem('siege_eternal_best') ?? localStorage.getItem('dungeonkeep_best');
    if (best) {
      const badge = this.add.text(cx, 172, `Best run: Day ${best}`, {
        fontSize: '12px', fill: '#D4A017', fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.tweens.add({ targets: badge, alpha: { from: 0.6, to: 1 }, duration: 2200, yoyo: true, repeat: -1 });
    }

    // ── Save slot label ────────────────────────────────────
    this.add.text(cx, 194, 'SELECT  WORLD', {
      fontSize: '10px', fill: '#5A4A35', fontFamily: 'monospace', letterSpacing: 3,
    }).setOrigin(0.5);

    // ── World slots (3 × 64px spacing) ────────────────────
    const slotY = 214;
    for (let i = 0; i < 3; i++) {
      this._makeWorldSlot(cx, slotY + i * 68, i + 1);
    }
    // Slot 3 bottom edge: slotY + 2*68 + 45 = 214+136+45 = 395

    // ── Bottom action buttons ──────────────────────────────
    const btnY = 426;
    this._makeBtn(cx - 210, btnY, 'CODEX',       () => this.scene.start('Help'),       0x0E1E2E, 0x88BBFF, 150);
    this._makeBtn(cx,       btnY, 'BLUEPRINTS',  () => this.scene.start('Blueprints'), 0x0A1E0E, 0x44FFAA, 150);
    this._makeBtn(cx + 210, btnY, 'SETTINGS',    () => this._openSettings(),           0x0E0E1E, 0xFFDD88, 150);

    // ── Meta souls ─────────────────────────────────────────
    const souls = metaProgression.balance;
    this.add.text(cx, btnY + 36, `SOULS: ${souls}`, {
      fontSize: '12px', fill: souls > 0 ? '#AA44FF' : '#3A2A4A',
      fontFamily: 'monospace', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5);

    // ── Changelog ──────────────────────────────────────────
    this._buildVersionHistory();

    // ── Footer bar ─────────────────────────────────────────
    this.add.text(10, VH - 8, CURRENT_VERSION, {
      fontSize: '9px', fill: '#3A2A40', fontFamily: 'monospace',
    }).setOrigin(0, 1);

    this.add.text(cx, VH - 8, 'WASD  E  F  X  ~  1-5  Tab — see Codex for full controls', {
      fontSize: '9px', fill: '#332A22', fontFamily: 'monospace',
    }).setOrigin(0.5, 1);

    this.add.text(VW - 10, VH - 8, 'join.vibeschool on tiktok', {
      fontSize: '9px', fill: '#AA7744', fontFamily: 'monospace',
    }).setOrigin(1, 1).setAlpha(0.5);

    this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  // ── World slot ─────────────────────────────────────────

  _makeWorldSlot(cx, y, slotId) {
    const key  = SLOT_KEYS[slotId - 1];
    const raw  = localStorage.getItem(key);
    const save = raw ? (() => { try { return JSON.parse(raw); } catch { return null; } })() : null;

    const hasSave   = !!save;
    const dayLabel  = hasSave ? `Day ${save.wave ?? 0}` : 'Empty';
    const btnText   = hasSave ? 'CONTINUE' : 'NEW GAME';
    const panelCol  = hasSave ? 0x0E1E0E : 0x1A1410;
    const borderCol = hasSave ? 0x336633 : 0x4A3020;
    const hoverFill = hasSave ? 0x1A3A1A : 0x2A1E10;

    // Panel
    const panel = this.add.rectangle(cx, y + 18, 520, 54, panelCol)
      .setStrokeStyle(1, borderCol)
      .setInteractive({ useHandCursor: true });

    // World number badge (left)
    this.add.text(cx - 242, y + 10, `W${slotId}`, {
      fontSize: '9px', fill: '#5A4535', fontFamily: 'monospace',
    }).setOrigin(0, 0.5);

    // Save state (day count)
    const statusTxt = this.add.text(cx - 130, y + 18, dayLabel, {
      fontSize: '16px', fill: hasSave ? '#88EE88' : '#3A2A1A', fontFamily: 'monospace',
    }).setOrigin(0, 0.5);

    // Action button label (right)
    const playTxt = this.add.text(cx + 140, y + 18, btnText, {
      fontSize: '13px', fill: '#C8A96E', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Arrow indicator
    const arrow = this.add.text(cx + 210, y + 18, '>', {
      fontSize: '14px', fill: hasSave ? '#44AA44' : '#5A4030', fontFamily: 'monospace',
    }).setOrigin(0.5);

    panel.on('pointerover', () => {
      panel.setFillStyle(hoverFill);
      playTxt.setStyle({ fill: '#FFFFFF' });
      arrow.setStyle({ fill: '#FFFFFF' });
    });
    panel.on('pointerout', () => {
      panel.setFillStyle(panelCol);
      playTxt.setStyle({ fill: '#C8A96E' });
      arrow.setStyle({ fill: hasSave ? '#44AA44' : '#5A4030' });
    });

    // Hardcore toggle (empty slots only)
    let isHardcore = false;
    if (!hasSave) {
      const hcTxt = this.add.text(cx - 242, y + 30, '[  ] HARDCORE', {
        fontSize: '9px', fill: '#663333', fontFamily: 'monospace',
        backgroundColor: '#140808', padding: { x: 4, y: 2 },
      }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
      hcTxt.on('pointerdown', (ptr) => {
        ptr.event.stopPropagation();
        isHardcore = !isHardcore;
        hcTxt.setText(isHardcore ? '[X] HARDCORE' : '[  ] HARDCORE');
        hcTxt.setStyle({ fill: isHardcore ? '#FF4444' : '#663333' });
      });
    } else if (save?.isHardcore) {
      this.add.text(cx - 242, y + 30, 'HARDCORE', {
        fontSize: '9px', fill: '#FF4444', fontFamily: 'monospace',
        backgroundColor: '#200000', padding: { x: 4, y: 2 },
      }).setOrigin(0, 0.5);
    }

    // Theme badge (existing saves)
    if (hasSave && save.mapTheme) {
      const themeColor = { grass: '#44AA55', desert: '#CC8833', snow: '#88BBFF' }[save.mapTheme] ?? '#888888';
      this.add.text(cx + 50, y + 30, save.mapTheme.toUpperCase(), {
        fontSize: '8px', fill: themeColor, fontFamily: 'monospace',
      }).setOrigin(0.5, 0.5);
    }

    panel.on('pointerdown', () => {
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.time.delayedCall(400, () => {
        this.scene.start('Game', { newGame: !hasSave, slotId, hardcore: !hasSave ? isHardcore : (save?.isHardcore ?? false) });
      });
    });

    // Clear button (existing saves only)
    if (hasSave) {
      const clrTxt = this.add.text(cx + 244, y + 18, 'X', {
        fontSize: '11px', fill: '#663333', fontFamily: 'monospace',
        backgroundColor: '#140808', padding: { x: 7, y: 4 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      clrTxt.on('pointerover', () => clrTxt.setStyle({ fill: '#FF6666' }));
      clrTxt.on('pointerout',  () => clrTxt.setStyle({ fill: '#663333' }));
      clrTxt.on('pointerdown', (ptr) => {
        ptr.event.stopPropagation();
        localStorage.removeItem(key);
        this.scene.restart();
      });
    }
  }

  // ── Changelog (centered, full-width strip) ────────────────

  _buildVersionHistory() {
    const ENTRIES  = VERSION_HISTORY.slice(0, 6);
    const ROW_H    = 17;
    const HEADER_H = 22;
    const PAD_BOT  = 8;
    const panW     = VW - 24;       // 936px — nearly full width
    const panH     = HEADER_H + ENTRIES.length * ROW_H + PAD_BOT;
    const panX     = VW / 2;
    const panY     = 476 + panH / 2;

    // Panel background
    this.add.rectangle(panX, panY, panW, panH, 0x070710, 0.90)
      .setStrokeStyle(1, 0x1E1535);

    const lx = panX - panW / 2 + 12;  // left content x
    const ty = panY - panH / 2;       // panel top y

    // Header row with version tag
    this.add.text(lx, ty + 6, 'CHANGELOG', {
      fontSize: '8px', fill: '#4A3A6A', fontFamily: 'monospace', letterSpacing: 2,
    });
    this.add.text(panX + panW / 2 - 12, ty + 6, CURRENT_VERSION, {
      fontSize: '8px', fill: '#FFDD88', fontFamily: 'monospace',
    }).setOrigin(1, 0);

    // Divider under header
    const dg = this.add.graphics();
    dg.lineStyle(1, 0x1E1535, 1);
    dg.lineBetween(lx, ty + HEADER_H - 2, panX + panW / 2 - 12, ty + HEADER_H - 2);

    // Version rows
    const VER_W  = 48;  // fixed column width for version string
    const DATE_W = 50;  // fixed column width for date
    const NOTE_X = lx + VER_W + DATE_W;

    ENTRIES.forEach((entry, i) => {
      const iy        = ty + HEADER_H + i * ROW_H;
      const isLatest  = i === 0;
      const dimFactor = Math.min(1, 0.3 + (ENTRIES.length - i) / ENTRIES.length * 0.7);

      const verCol  = isLatest ? '#FFDD88' : '#5A4A6A';
      const dateCol = isLatest ? '#7A6A9A' : '#3A2A4A';
      const noteCol = isLatest ? '#C0B8D8' : `rgba(${Math.floor(60 * dimFactor)},${Math.floor(50 * dimFactor)},${Math.floor(80 * dimFactor)},1)`;

      this.add.text(lx,          iy, entry.ver,  { fontSize: '9px', fill: verCol,  fontFamily: 'monospace' });
      this.add.text(lx + VER_W,  iy, entry.date, { fontSize: '8px', fill: dateCol, fontFamily: 'monospace' });
      this.add.text(NOTE_X,      iy, entry.notes, {
        fontSize: '9px', fill: isLatest ? '#C0B8D8' : '#3E3050', fontFamily: 'monospace',
      });
    });
  }

  // ── Ambient embers ────────────────────────────────────────

  _spawnEmbers() {
    for (let i = 0; i < 40; i++) {
      const ex  = 180 + Math.random() * (VW - 360);
      const ey  = VH * 0.25 + Math.random() * VH * 0.5;
      const dot = this.add.graphics();
      dot.fillStyle(Math.random() < 0.5 ? 0xFF8C00 : 0xFFDD00, 0.7);
      dot.fillCircle(0, 0, Math.random() < 0.3 ? 2 : 1);
      dot.setPosition(ex, ey);
      this.tweens.add({
        targets: dot,
        y: ey - 60 - Math.random() * 80,
        x: ex + (Math.random() - 0.5) * 40,
        alpha: { from: 0.7, to: 0 },
        duration: 2000 + Math.random() * 3000,
        delay: Math.random() * 3000,
        repeat: -1,
        onRepeat: () => {
          dot.x = 180 + Math.random() * (VW - 360);
          dot.y = VH * 0.25 + Math.random() * VH * 0.5;
        },
      });
    }
  }

  // ── Generic button ────────────────────────────────────────

  _makeBtn(x, y, label, cb, bgCol = 0x1A1410, txtCol = 0xC8A96E, w = 160) {
    const bg = this.add.rectangle(x, y, w, 34, bgCol, 1)
      .setStrokeStyle(1, 0x5A4030)
      .setInteractive({ useHandCursor: true });
    const txt = this.add.text(x, y, label, {
      fontSize: '12px', fill: '#C8A96E', fontFamily: 'monospace',
    }).setOrigin(0.5);

    bg.on('pointerover', () => {
      bg.setStrokeStyle(2, txtCol);
      bg.setFillStyle(bgCol + 0x101010);
      txt.setStyle({ fill: '#FFFFFF' });
    });
    bg.on('pointerout', () => {
      bg.setStrokeStyle(1, 0x5A4030);
      bg.setFillStyle(bgCol);
      txt.setStyle({ fill: '#C8A96E' });
    });
    bg.on('pointerdown', cb);
    return bg;
  }

  // ── Settings overlay ─────────────────────────────────────

  _openSettings() {
    const overlay = this.add.rectangle(VW / 2, VH / 2, VW, VH, 0x000000, 0.72).setDepth(80).setInteractive();

    const PW = 440, PH = 330;
    const px = VW / 2, py = VH / 2;

    const panel = this.add.rectangle(px, py, PW, PH, 0x0E0C1A, 1)
      .setStrokeStyle(2, 0x5533AA).setDepth(81);

    const els = [overlay, panel];
    const add  = (el) => { els.push(el.setDepth(82)); return el; };
    const txt  = (x, y, str, size, col) => add(this.add.text(x, y, str, {
      fontSize: size, fill: col, fontFamily: 'monospace',
    }).setOrigin(0.5));

    txt(px, py - PH / 2 + 20, 'SETTINGS', '18px', '#FFDD88');
    add(this.add.rectangle(px, py - PH / 2 + 34, PW - 20, 1, 0x5533AA, 0.5));

    const LEFT   = px - PW / 2 + 24;
    const LABX   = LEFT + 155;
    const startY = py - PH / 2 + 60;
    const rowH   = 58;

    const rowLabel = (row, label) => {
      add(this.add.text(LEFT, startY + row * rowH, label, {
        fontSize: '12px', fill: '#C8A96E', fontFamily: 'monospace',
      }));
    };

    const makeGroup = (row, options, getCurrent, onSelect) => {
      const btns = options.map((opt, i) => {
        const bx = LABX + i * (64 + 8);
        const bg = this.add.rectangle(bx, startY + row * rowH + 2, 60, 26, 0x1A1428, 1)
          .setStrokeStyle(1, 0x5533AA).setDepth(82).setInteractive({ useHandCursor: true });
        const t  = this.add.text(bx, startY + row * rowH + 2, opt.label, {
          fontSize: '11px', fill: '#8877AA', fontFamily: 'monospace',
        }).setOrigin(0.5).setDepth(83);
        els.push(bg, t);

        const refresh = () => {
          const active = opt.value === getCurrent();
          bg.setFillStyle(active ? 0x5533AA : 0x1A1428);
          t.setStyle({ fill: active ? '#FFFFFF' : '#8877AA' });
        };
        refresh();

        bg.on('pointerover', () => bg.setFillStyle(0x3322AA));
        bg.on('pointerout',  refresh);
        bg.on('pointerdown', () => { onSelect(opt.value); btns.forEach(b => b._refresh()); });
        bg._refresh = refresh;
        return bg;
      });
      return btns;
    };

    rowLabel(0, 'Cursor / Aim Sensitivity');
    makeGroup(0,
      [{ label:'0.5×', value:0.5 },{ label:'1×', value:1 },{ label:'1.5×', value:1.5 },{ label:'2×', value:2 },{ label:'2.5×', value:2.5 },{ label:'3×', value:3 }],
      () => settingsStore.cursorSensitivity,
      (v) => { settingsStore.cursorSensitivity = v; }
    );
    add(this.add.text(LEFT, startY + 0 * rowH + 20, 'Affects gamepad right-stick cursor speed', {
      fontSize: '9px', fill: '#554466', fontFamily: 'monospace',
    }));

    rowLabel(1, 'Screen Shake');
    makeGroup(1,
      [{ label:'ON', value:true },{ label:'OFF', value:false }],
      () => settingsStore.screenShake,
      (v) => { settingsStore.screenShake = v; }
    );

    rowLabel(2, 'SFX Volume');
    makeGroup(2,
      [{ label:'0%', value:0 },{ label:'25%', value:0.25 },{ label:'50%', value:0.5 },{ label:'75%', value:0.75 },{ label:'100%', value:1 }],
      () => settingsStore.sfxVolume,
      (v) => { settingsStore.sfxVolume = v; soundMgr.setVolume(v); }
    );

    rowLabel(3, 'Particle Effects');
    makeGroup(3,
      [{ label:'Full', value:'full' },{ label:'Reduced', value:'reduced' }],
      () => settingsStore.particles,
      (v) => { settingsStore.particles = v; }
    );

    const closeY  = py + PH / 2 - 28;
    const closeBg = this.add.rectangle(px, closeY, 180, 34, 0x3322AA)
      .setStrokeStyle(1, 0xAA88FF).setDepth(82).setInteractive({ useHandCursor: true });
    const closeTxt = this.add.text(px, closeY, 'SAVE & CLOSE', {
      fontSize: '13px', fill: '#FFFFFF', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(83);
    els.push(closeBg, closeTxt);
    closeBg.on('pointerover', () => closeBg.setFillStyle(0x5544DD));
    closeBg.on('pointerout',  () => closeBg.setFillStyle(0x3322AA));
    closeBg.on('pointerdown', () => {
      settingsStore.save();
      soundMgr.setVolume(settingsStore.sfxVolume);
      els.forEach(e => e.destroy());
    });

    overlay.on('pointerdown', (ptr) => {
      const dx = Math.abs(ptr.x - px), dy = Math.abs(ptr.y - py);
      if (dx > PW / 2 || dy > PH / 2) {
        settingsStore.save();
        soundMgr.setVolume(settingsStore.sfxVolume);
        els.forEach(e => e.destroy());
      }
    });
  }
}
