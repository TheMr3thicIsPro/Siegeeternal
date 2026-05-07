// ============================================================
// MenuScene — main menu with 3 save slots
// ============================================================
import { VW, VH, CHALLENGE_MODS } from '../constants.js';
import { metaProgression } from '../systems/MetaProgression.js';
import { settingsStore }   from '../systems/SettingsStore.js';
import { soundMgr }        from '../systems/SoundManager.js';

const SLOT_KEYS = ['siege_eternal_save_1', 'siege_eternal_save_2', 'siege_eternal_save_3'];

// ── Version history ───────────────────────────────────────
export const CURRENT_VERSION = 'v0.13.1';

const VERSION_HISTORY = [
  { ver: 'v0.13.1', date: 'May 2026', notes: 'Fix: save after craft (no more equipment loss) · Fix: no_towers challenge enforced · Fix: achievements overlay layout · Fix: playerMaxHP saved/restored · Multiplayer co-op via Supabase (HOST/JOIN lobby)' },
  { ver: 'v0.13.0', date: 'May 2026', notes: 'Ruby Bow (fast/15dmg) + Emerald Bow (heavy/45dmg) · Arrow animation · Bridge persistence fix · Trap chest fix · Boss safe-edge spawn · Cave 60% darker w/o torch · Level-up auto-bonus (+10 HP) · Concrete contracts · 30+ achievements · Revive sound+effect · Death cause screen · Achievements menu · Resource regen every 3 days · Bed 2× speed' },
  { ver: 'v0.12.0', date: 'May 2026', notes: 'Player levels + XP · Contracts system · Achievements · Dungeon (cursed zone, key drop, boss, blueprints) · Merchant NPC (20% night) · Challenge mods (1HP/No Towers/Relentless/Scarce) · 4 dungeon towers · 4 consumable items · Phase Blade weapon' },
  { ver: 'v0.11.4', date: 'May 2026', notes: 'Dummy Statue decoy (200px enemy attractor) · Raids no longer spawn arrow towers · Codex item-loss bug fixed (sleep/wake) · Bone Chestplate stealth 200px · Chests reset every day' },
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
    const btnY = 418;
    this._makeBtn(cx,       btnY - 38, 'MULTIPLAYER',  () => this.scene.start('Multiplayer'), 0x08101E, 0x88BBFF, 200);
    this._makeBtn(cx - 315, btnY + 10, 'CODEX',        () => this.scene.start('Help'),        0x0E1E2E, 0x88BBFF, 130);
    this._makeBtn(cx - 105, btnY + 10, 'BLUEPRINTS',   () => this.scene.start('Blueprints'),  0x0A1E0E, 0x44FFAA, 130);
    this._makeBtn(cx + 105, btnY + 10, 'ACHIEVEMENTS', () => this._openAchievements(),        0x1E0E0E, 0xFFAA44, 130);
    this._makeBtn(cx + 315, btnY + 10, 'SETTINGS',     () => this._openSettings(),            0x0E0E1E, 0xFFDD88, 130);

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
    const statusTxt = this.add.text(cx - 130, y + 10, dayLabel, {
      fontSize: '16px', fill: hasSave ? '#88EE88' : '#3A2A1A', fontFamily: 'monospace',
    }).setOrigin(0, 0.5);

    // Player level (below day count)
    if (hasSave && save.playerLevel) {
      const lvl = save.playerLevel.level ?? 1;
      this.add.text(cx - 130, y + 28, `LVL ${lvl}`, {
        fontSize: '10px', fill: '#AADDFF', fontFamily: 'monospace',
      }).setOrigin(0, 0.5);
    }

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

    // Challenge mod toggles for new game only
    const activeMods = {};
    if (!hasSave) {
      const modKeys = Object.keys(CHALLENGE_MODS);
      modKeys.forEach((modKey, mi) => {
        const mod  = CHALLENGE_MODS[modKey];
        const mx   = cx - 242 + mi * 120;
        const modTxt = this.add.text(mx, y + 50, `[  ] ${mod.name}`, {
          fontSize: '8px', fill: '#555577', fontFamily: 'monospace',
          backgroundColor: '#0A0A18', padding: { x: 3, y: 2 },
        }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
        modTxt.on('pointerdown', (ptr) => {
          ptr.event.stopPropagation();
          activeMods[modKey] = !activeMods[modKey];
          modTxt.setText(activeMods[modKey] ? `[X] ${mod.name}` : `[  ] ${mod.name}`);
          modTxt.setStyle({ fill: activeMods[modKey] ? '#FF9944' : '#555577' });
        });
      });
    }

    panel.on('pointerdown', () => {
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.time.delayedCall(400, () => {
        this.scene.start('Game', {
          newGame: !hasSave, slotId,
          hardcore: !hasSave ? isHardcore : (save?.isHardcore ?? false),
          challengeMods: !hasSave ? activeMods : (save?.challengeMods ?? {}),
        });
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

  // ── Achievements overlay ──────────────────────────────────

  _openAchievements() {
    const { achievementSys } = window._siegeGlobals ?? {};
    const PW = 560, PH = 400;
    const px = VW / 2, py = VH / 2;

    const overlay = this.add.rectangle(px, py, VW, VH, 0x000000, 0.76).setDepth(80).setInteractive();
    const panel   = this.add.rectangle(px, py, PW, PH, 0x0E0A0E, 1)
      .setStrokeStyle(2, 0xFFAA44).setDepth(81);
    const title   = this.add.text(px, py - PH / 2 + 18, 'ACHIEVEMENTS', {
      fontSize: '15px', fill: '#FFAA44', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5, 0.5).setDepth(82);

    // Load achievement data
    let unlocked = new Set();
    try {
      const raw = localStorage.getItem('siege_eternal_achievements');
      if (raw) { const arr = JSON.parse(raw); arr.forEach(id => unlocked.add(id)); }
    } catch (_) {}

    // Inline defs for display (mirrors AchievementSystem without import)
    const raw = localStorage.getItem('siege_eternal_achievements_defs');
    const defs = [
      { id: 'first_blood', name: 'First Blood', desc: 'Kill your first enemy' },
      { id: 'wave_1', name: 'Night One', desc: 'Survive 1 day' },
      { id: 'wave_10', name: 'Survivor', desc: 'Survive 10 days' },
      { id: 'wave_25', name: 'Veteran', desc: 'Survive 25 days' },
      { id: 'wave_50', name: 'Legendary', desc: 'Survive 50 days' },
      { id: 'wave_100', name: 'Eternal', desc: 'Survive 100 days' },
      { id: 'kills_100', name: 'Slayer', desc: 'Kill 100 enemies' },
      { id: 'kills_1000', name: 'Massacre', desc: 'Kill 1,000 enemies' },
      { id: 'first_boss', name: 'Boss Slayer', desc: 'Kill your first boss' },
      { id: 'all_bosses', name: 'Tyrant Slayer', desc: 'Kill all 3 boss types in one run' },
      { id: 'keys_100', name: 'Master Lockpick', desc: 'Collect 100 keys in a single run' },
      { id: 'emerald_100', name: 'Emerald Hoarder', desc: 'Hold 100 emerald at once' },
      { id: 'crystal_100', name: 'Crystal Lord', desc: 'Hold 100 crystal at once' },
      { id: 'ruby_100', name: 'Ruby Baron', desc: 'Hold 100 ruby at once' },
      { id: 'souls_1k', name: 'Soul Collector', desc: 'Accumulate 1,000 souls in one run' },
      { id: 'souls_10k', name: 'Soul Reaper', desc: 'Accumulate 10,000 souls in one run' },
      { id: 'cave_master', name: 'Cave Master', desc: 'Enter the deep cave' },
      { id: 'dungeon_clear', name: 'Vault Breaker', desc: 'Clear the dungeon' },
      { id: 'full_armor', name: 'Fully Armoured', desc: 'Equip a full armor set' },
      { id: 'wave_10_1hp', name: 'Ironman', desc: 'Survive 10 days in 1 HP Mode' },
      { id: 'challenge_1', name: 'Challenger', desc: 'Complete a run with any challenge mod' },
      { id: 'challenge_all', name: 'Supreme Challenge', desc: 'Complete a run with all 4 mods active' },
      { id: 'cursed_unlock', name: 'Into the Dark', desc: 'Unlock the cursed area' },
      { id: 'raid_complete', name: 'Raid Defender', desc: 'Complete a raid event' },
      { id: 'supply_defended', name: 'Logistics Expert', desc: 'Protect a supply crate to completion' },
      { id: 'weather_all', name: 'Storm Chaser', desc: 'Encounter all 10 weather types' },
      { id: 'revive_used', name: 'Second Chance', desc: 'Use a Revive Token' },
      { id: 'contract_all', name: 'Contract Fulfilled', desc: 'Complete all 3 contracts in one run' },
      { id: 'level_10', name: 'Seasoned', desc: 'Reach player level 10' },
      { id: 'permadeath_win', name: 'Immortal', desc: 'Reach wave 20 without dying' },
      { id: 'blueprints_all', name: 'Architect', desc: 'Unlock all blueprints' },
      { id: 'collector', name: 'Hoarder', desc: 'Collect 500 of any one resource' },
    ];

    const els = [overlay, panel, title];
    const COLS = 3, ROW_H = 28, startY = py - PH / 2 + 48;
    const colW = PW / COLS;
    defs.forEach((def, i) => {
      const col  = i % COLS;
      const row  = Math.floor(i / COLS);
      const ax   = px - PW / 2 + 16 + col * colW;
      const ay   = startY + row * ROW_H;
      const done = unlocked.has(def.id);
      const nameCol = done ? '#FFD700' : '#443322';
      const descCol = done ? '#AAAAAA' : '#221A10';
      const pre     = done ? '★ ' : '○ ';
      els.push(
        this.add.text(ax, ay,      pre + def.name, { fontSize: '9px', fill: nameCol, fontFamily: 'monospace', fontStyle: 'bold' }).setDepth(82),
        this.add.text(ax, ay + 13, def.desc,        { fontSize: '7px', fill: descCol, fontFamily: 'monospace' }).setDepth(82),
      );
    });

    const countDone = defs.filter(d => unlocked.has(d.id)).length;
    els.push(this.add.text(px, py + PH / 2 - 18, `${countDone} / ${defs.length} unlocked`, {
      fontSize: '10px', fill: '#888888', fontFamily: 'monospace',
    }).setOrigin(0.5, 0.5).setDepth(82));

    overlay.on('pointerdown', (ptr) => {
      const dx = Math.abs(ptr.x - px), dy = Math.abs(ptr.y - py);
      if (dx > PW / 2 || dy > PH / 2) els.forEach(e => e.destroy());
    });
  }
}
