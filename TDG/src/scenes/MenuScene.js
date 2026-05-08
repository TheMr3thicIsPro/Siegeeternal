// ============================================================
// MenuScene — main menu with 3 save slots
// ============================================================
import { VW, VH, CHALLENGE_MODS } from '../constants.js';
import { metaProgression } from '../systems/MetaProgression.js';
import { settingsStore }   from '../systems/SettingsStore.js';
import { soundMgr }        from '../systems/SoundManager.js';

const SLOT_KEYS = ['siege_eternal_save_1', 'siege_eternal_save_2', 'siege_eternal_save_3'];

// ── Version history ───────────────────────────────────────
export const CURRENT_VERSION = 'v0.14.1';

const VERSION_HISTORY = [
  { ver: 'v0.14.1', date: 'May 2026', notes: 'Settings/Achievements overlay redesign · Bone chestplate stealth 350px · Starter chest one-time only · Codex chrome deep-space restyle' },
  { ver: 'v0.14.0', date: 'May 2026', notes: 'Deep-space menu redesign · Aurora bg, star field, shooting star · New 72px world slots with accent bars & chips inside · Featured MULTIPLAYER glow button · Colored nav row (Codex/Blueprints/Achievements/Settings)' },
  { ver: 'v0.13.2', date: 'May 2026', notes: 'Supabase connected — multiplayer HOST/JOIN now live · Supabase CDN loaded in index.html' },
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

    // ── Background: deep-space layers ─────────────────────
    this.add.rectangle(cx, VH / 2, VW, VH, 0x04060E);

    // Aurora glow — upper purple band
    const aurora = this.add.graphics();
    aurora.fillGradientStyle(0x1C0A38, 0x1C0A38, 0x08101E, 0x08101E, 0.85);
    aurora.fillRect(0, 0, VW, VH * 0.52);
    // Lower blue-grey fade
    const auroraLow = this.add.graphics();
    auroraLow.fillGradientStyle(0x060A18, 0x060A18, 0x030408, 0x030408, 1);
    auroraLow.fillRect(0, VH * 0.45, VW, VH * 0.55);
    // Subtle teal shimmer streak
    const streak = this.add.graphics();
    streak.fillGradientStyle(0x062030, 0x062030, 0x030810, 0x030810, 0.25);
    streak.fillRect(VW * 0.05, VH * 0.08, VW * 0.9, VH * 0.28);
    this.tweens.add({ targets: streak, alpha: { from: 0.5, to: 0.9 }, duration: 3800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Stars — dense field, varied brightness
    const starGfx = this.add.graphics();
    for (let i = 0; i < 170; i++) {
      const sx = Math.random() * VW;
      const sy = Math.random() * VH * 0.58;
      const bright = Math.random() < 0.07;
      const sz = bright ? 1.6 : (Math.random() < 0.18 ? 1.1 : 0.65);
      starGfx.fillStyle(0xFFFFFF, bright ? 0.95 : (0.25 + Math.random() * 0.45));
      starGfx.fillCircle(sx, sy, sz);
    }

    // Shooting star (periodic)
    const shootStar = this.add.graphics();
    const doShoot = () => {
      shootStar.clear();
      const sx = Math.random() * VW * 0.7 + VW * 0.15;
      const sy = Math.random() * VH * 0.28;
      shootStar.fillStyle(0xFFFFFF, 0.9);
      shootStar.fillRect(sx, sy, 28, 1);
      shootStar.fillStyle(0xAABBFF, 0.5);
      shootStar.fillRect(sx + 28, sy, 12, 1);
      this.tweens.add({
        targets: shootStar, alpha: { from: 0.9, to: 0 }, x: 45, y: 22,
        duration: 550, delay: 4000 + Math.random() * 9000,
        onComplete: () => { shootStar.x = 0; shootStar.y = 0; doShoot(); },
      });
    };
    doShoot();

    this._spawnEmbers();

    // ── Title ─────────────────────────────────────────────
    this.add.text(cx + 3, 75, 'SIEGE ETERNAL', {
      fontSize: '54px', fill: '#1C0640', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0.55);
    const title = this.add.text(cx, 73, 'SIEGE ETERNAL', {
      fontSize: '54px', fontFamily: 'monospace', fontStyle: 'bold',
      fill: '#FFD97A', stroke: '#6A2C00', strokeThickness: 6,
    }).setOrigin(0.5);
    this.tweens.add({ targets: title, alpha: { from: 0.87, to: 1 }, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Tagline
    this.add.text(cx, 132, '— Hold the line.  Build smarter.  Survive the siege. —', {
      fontSize: '11px', fill: '#6A5038', fontFamily: 'monospace', letterSpacing: 1,
    }).setOrigin(0.5);

    // Gold divider with ornament
    const divG = this.add.graphics();
    divG.lineStyle(1, 0x4A2E10, 0.9);
    divG.lineBetween(cx - 240, 150, cx - 14, 150);
    divG.lineBetween(cx + 14,  150, cx + 240, 150);
    divG.fillStyle(0xD4A017, 1);
    divG.fillRect(cx - 6, 147, 12, 6);
    divG.fillStyle(0x7A5810, 0.8);
    divG.fillCircle(cx - 240, 150, 2); divG.fillCircle(cx + 240, 150, 2);

    // Best run badge
    const best = localStorage.getItem('siege_eternal_best') ?? localStorage.getItem('dungeonkeep_best');
    if (best) {
      const badge = this.add.text(cx, 163, `✦  Best Run: Day ${best}  ✦`, {
        fontSize: '11px', fill: '#B88820', fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.tweens.add({ targets: badge, alpha: { from: 0.5, to: 0.85 }, duration: 2600, yoyo: true, repeat: -1 });
    }

    // ── World slots ────────────────────────────────────────
    this.add.text(cx, 173, 'S E L E C T   W O R L D', {
      fontSize: '9px', fill: '#3A2E1E', fontFamily: 'monospace', letterSpacing: 5,
    }).setOrigin(0.5);

    for (let i = 0; i < 3; i++) {
      this._makeWorldSlot(cx, 183 + i * 80, i + 1);
    }
    // Slot 3 bottom at 183 + 2*80 + 72 = 415

    // ── MULTIPLAYER — featured button ─────────────────────
    this._makeFeaturedBtn(cx, 443, '⚔  MULTIPLAYER  ⚔', () => this.scene.start('Multiplayer'));

    // ── Nav row ────────────────────────────────────────────
    const NAV = [
      { label: 'CODEX',        col: 0x5599EE, cb: () => this.scene.start('Help')       },
      { label: 'BLUEPRINTS',   col: 0x33CC88, cb: () => this.scene.start('Blueprints') },
      { label: 'ACHIEVEMENTS', col: 0xEE8833, cb: () => this._openAchievements()       },
      { label: 'SETTINGS',     col: 0xDDCC66, cb: () => this._openSettings()           },
    ];
    const NW = 183, NH = 30, NGAP = 8;
    const ntotal = NAV.length * NW + (NAV.length - 1) * NGAP;
    NAV.forEach((b, i) => {
      const nx = cx - ntotal / 2 + NW / 2 + i * (NW + NGAP);
      this._makeNavBtn(nx, 475, b.label, b.cb, b.col, NW, NH);
    });

    // ── Meta souls ─────────────────────────────────────────
    const souls = metaProgression.balance;
    if (souls > 0) {
      const sg = this.add.graphics();
      sg.fillStyle(0xAA44FF, 0.85); sg.fillCircle(cx - 52, 497, 5);
      sg.fillStyle(0x8833CC, 0.5);  sg.fillCircle(cx - 52, 497, 8);
      this.add.text(cx - 43, 497, `${souls}  META SOULS`, {
        fontSize: '11px', fill: '#AA44FF', fontFamily: 'monospace',
      }).setOrigin(0, 0.5);
    }

    // ── Changelog ──────────────────────────────────────────
    this._buildVersionHistory();

    // ── Footer ─────────────────────────────────────────────
    this.add.text(10, VH - 8, CURRENT_VERSION, { fontSize: '9px', fill: '#2E2040', fontFamily: 'monospace' }).setOrigin(0, 1);
    this.add.text(cx, VH - 8, 'WASD  E  F  X  Tab — see Codex for controls', { fontSize: '9px', fill: '#2E2418', fontFamily: 'monospace' }).setOrigin(0.5, 1);
    this.add.text(VW - 10, VH - 8, 'join.vibeschool on tiktok', { fontSize: '9px', fill: '#8A6030', fontFamily: 'monospace' }).setOrigin(1, 1).setAlpha(0.45);

    this.cameras.main.fadeIn(700, 0, 0, 0);
  }

  // ── World slot ─────────────────────────────────────────

  _makeWorldSlot(cx, y, slotId) {
    const PH        = 72;
    const key       = SLOT_KEYS[slotId - 1];
    const raw       = localStorage.getItem(key);
    const save      = raw ? (() => { try { return JSON.parse(raw); } catch { return null; } })() : null;
    const hasSave   = !!save;
    const dayLabel  = hasSave ? `Day ${save.wave ?? 0}` : 'EMPTY';
    const panelCol  = hasSave ? 0x0A1A0A : 0x100C08;
    const accentCol = hasSave ? 0x2A6630 : 0x5A3A1A;
    const glowCol   = hasSave ? 0x44AA55 : 0xAA6622;
    const borderCol = hasSave ? 0x1E4A22 : 0x3A2418;
    const hoverFill = hasSave ? 0x142A14 : 0x1E1408;
    const slotCy    = y + PH / 2;

    // Drop shadow
    this.add.rectangle(cx + 2, slotCy + 3, 526, PH + 4, 0x000000, 0.45);

    // Main panel
    const panel = this.add.rectangle(cx, slotCy, 522, PH, panelCol)
      .setStrokeStyle(1, borderCol)
      .setInteractive({ useHandCursor: true });

    // Left accent bar
    this.add.rectangle(cx - 259, slotCy, 4, PH, accentCol, 1);

    // World number badge
    this.add.rectangle(cx - 243, y + 13, 28, 16, accentCol, 0.35);
    this.add.text(cx - 243, y + 13, `W${slotId}`, {
      fontSize: '9px', fill: hasSave ? '#88FF99' : '#CC8844', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Day / status label
    this.add.text(cx - 218, y + 8, dayLabel, {
      fontSize: hasSave ? '17px' : '13px',
      fill: hasSave ? '#88EE88' : '#4A3A2A',
      fontFamily: 'monospace',
    });

    // Player level (existing saves)
    if (hasSave && save.playerLevel) {
      const lvl = save.playerLevel.level ?? 1;
      this.add.text(cx - 218, y + 30, `LVL ${lvl}`, {
        fontSize: '10px', fill: '#99CCFF', fontFamily: 'monospace',
      });
    }

    // Action label + arrow (right side)
    const btnText = hasSave ? 'CONTINUE' : 'NEW GAME';
    const playTxt = this.add.text(cx + 145, slotCy, btnText, {
      fontSize: '14px', fill: '#C8A96E', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);
    const arrow = this.add.text(cx + 213, slotCy, '▶', {
      fontSize: '13px', fill: hasSave ? '#44AA44' : '#5A4030', fontFamily: 'monospace',
    }).setOrigin(0.5);

    panel.on('pointerover', () => {
      panel.setFillStyle(hoverFill);
      panel.setStrokeStyle(1, glowCol);
      playTxt.setStyle({ fill: '#FFFFFF' });
      arrow.setStyle({ fill: '#FFFFFF' });
    });
    panel.on('pointerout', () => {
      panel.setFillStyle(panelCol);
      panel.setStrokeStyle(1, borderCol);
      playTxt.setStyle({ fill: '#C8A96E' });
      arrow.setStyle({ fill: hasSave ? '#44AA44' : '#5A4030' });
    });

    // ── Bottom strip (inside panel, y+42 → y+68) ───────────
    const botY       = y + 55;
    let isHardcore   = false;
    const activeMods = {};

    if (!hasSave) {
      const hcTxt = this.add.text(cx - 255, botY, '[  ] HARDCORE', {
        fontSize: '8px', fill: '#664444', fontFamily: 'monospace',
        backgroundColor: '#140808', padding: { x: 4, y: 2 },
      }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
      hcTxt.on('pointerdown', (ptr) => {
        ptr.event.stopPropagation();
        isHardcore = !isHardcore;
        hcTxt.setText(isHardcore ? '[X] HARDCORE' : '[  ] HARDCORE');
        hcTxt.setStyle({ fill: isHardcore ? '#FF4444' : '#664444' });
      });

      Object.keys(CHALLENGE_MODS).forEach((modKey, mi) => {
        const mod  = CHALLENGE_MODS[modKey];
        const chip = this.add.text(cx - 126 + mi * 104, botY, `[  ] ${mod.name}`, {
          fontSize: '8px', fill: '#445566', fontFamily: 'monospace',
          backgroundColor: '#0A0C18', padding: { x: 3, y: 2 },
        }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
        chip.on('pointerdown', (ptr) => {
          ptr.event.stopPropagation();
          activeMods[modKey] = !activeMods[modKey];
          chip.setText(activeMods[modKey] ? `[X] ${mod.name}` : `[  ] ${mod.name}`);
          chip.setStyle({ fill: activeMods[modKey] ? '#FF9944' : '#445566' });
        });
      });
    } else {
      let badgeX = cx - 255;
      if (save.isHardcore) {
        this.add.text(badgeX, botY, 'HARDCORE', {
          fontSize: '8px', fill: '#FF4444', fontFamily: 'monospace',
          backgroundColor: '#200000', padding: { x: 4, y: 2 },
        }).setOrigin(0, 0.5);
        badgeX += 82;
      }
      if (save.mapTheme) {
        const themeColor = { grass: '#44AA55', desert: '#CC8833', snow: '#88BBFF' }[save.mapTheme] ?? '#888888';
        this.add.text(badgeX, botY, save.mapTheme.toUpperCase(), {
          fontSize: '8px', fill: themeColor, fontFamily: 'monospace',
          backgroundColor: '#0A1008', padding: { x: 4, y: 2 },
        }).setOrigin(0, 0.5);
        badgeX += 58;
      }
      if (save.challengeMods) {
        const chips = Object.entries(save.challengeMods).filter(([, v]) => v).map(([k]) => k.replace(/_/g, ' ').toUpperCase());
        if (chips.length) {
          this.add.text(badgeX, botY, chips.join(' + '), {
            fontSize: '8px', fill: '#FF9944', fontFamily: 'monospace',
            backgroundColor: '#180800', padding: { x: 3, y: 2 },
          }).setOrigin(0, 0.5);
        }
      }
      // Clear button
      const clrTxt = this.add.text(cx + 243, slotCy, '✕', {
        fontSize: '12px', fill: '#663333', fontFamily: 'monospace',
        backgroundColor: '#140808', padding: { x: 6, y: 4 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      clrTxt.on('pointerover', () => clrTxt.setStyle({ fill: '#FF6666' }));
      clrTxt.on('pointerout',  () => clrTxt.setStyle({ fill: '#663333' }));
      clrTxt.on('pointerdown', (ptr) => {
        ptr.event.stopPropagation();
        localStorage.removeItem(key);
        this.scene.restart();
      });
    }

    panel.on('pointerdown', () => {
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.time.delayedCall(400, () => {
        this.scene.start('Game', {
          newGame: !hasSave, slotId,
          hardcore:      !hasSave ? isHardcore        : (save?.isHardcore     ?? false),
          challengeMods: !hasSave ? activeMods         : (save?.challengeMods ?? {}),
        });
      });
    });
  }

  // ── Featured button (MULTIPLAYER) ──────────────────────

  _makeFeaturedBtn(x, y, label, cb) {
    const W = 362, H = 38;
    // Outer glow shadow
    this.add.rectangle(x, y + 3, W + 8, H + 6, 0x0A1840, 0.7);
    // Panel
    const bg = this.add.rectangle(x, y, W, H, 0x0B1636)
      .setStrokeStyle(1, 0x3355BB)
      .setInteractive({ useHandCursor: true });
    // Top accent stripe
    this.add.rectangle(x, y - H / 2 + 1.5, W, 3, 0x4466EE, 0.9);
    // Animated inner glow
    const glow = this.add.rectangle(x, y, W - 4, H - 4, 0x1A3488, 0)
      .setStrokeStyle(1, 0x4466CC, 0);
    this.tweens.add({ targets: glow, alpha: { from: 0.08, to: 0.4 }, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // Label
    const txt = this.add.text(x, y + 1, label, {
      fontSize: '15px', fill: '#7AAAFF', fontFamily: 'monospace', fontStyle: 'bold',
      letterSpacing: 2,
    }).setOrigin(0.5);

    bg.on('pointerover', () => {
      bg.setFillStyle(0x1A2E66);
      bg.setStrokeStyle(2, 0x6688FF);
      txt.setStyle({ fill: '#FFFFFF' });
    });
    bg.on('pointerout', () => {
      bg.setFillStyle(0x0B1636);
      bg.setStrokeStyle(1, 0x3355BB);
      txt.setStyle({ fill: '#7AAAFF' });
    });
    bg.on('pointerdown', cb);
    return bg;
  }

  // ── Nav button ──────────────────────────────────────────

  _makeNavBtn(x, y, label, cb, accentCol, w, h) {
    const hexCol = '#' + accentCol.toString(16).padStart(6, '0');
    const bg = this.add.rectangle(x, y, w, h, 0x080A12)
      .setStrokeStyle(1, 0x1E1C2E)
      .setInteractive({ useHandCursor: true });
    // Coloured top accent stripe
    this.add.rectangle(x, y - h / 2 + 1.5, w, 3, accentCol, 0.85);
    const txt = this.add.text(x, y + 1, label, {
      fontSize: '10px', fill: hexCol, fontFamily: 'monospace',
    }).setOrigin(0.5);

    bg.on('pointerover', () => {
      bg.setFillStyle(0x161824);
      bg.setStrokeStyle(1, accentCol);
      txt.setStyle({ fill: '#FFFFFF' });
    });
    bg.on('pointerout', () => {
      bg.setFillStyle(0x080A12);
      bg.setStrokeStyle(1, 0x1E1C2E);
      txt.setStyle({ fill: hexCol });
    });
    bg.on('pointerdown', cb);
    return bg;
  }

  // ── Changelog (centered, full-width strip) ────────────────

  _buildVersionHistory() {
    const ENTRIES  = VERSION_HISTORY.slice(0, 4);
    const ROW_H    = 17;
    const HEADER_H = 22;
    const PAD_BOT  = 8;
    const panW     = VW - 24;
    const panH     = HEADER_H + ENTRIES.length * ROW_H + PAD_BOT;
    const panX     = VW / 2;
    const panY     = 510 + panH / 2;

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
    const PW = 520, PH = 370;
    const px = VW / 2, py = VH / 2;

    const overlay = this.add.rectangle(px, py, VW, VH, 0x000000, 0.76).setDepth(80).setInteractive();
    const panel   = this.add.rectangle(px, py, PW, PH, 0x08091A).setStrokeStyle(2, 0x3344BB).setDepth(81);
    // Top accent stripe
    const stripe  = this.add.rectangle(px, py - PH / 2 + 1.5, PW, 3, 0x4466EE).setDepth(82);

    const els = [overlay, panel, stripe];
    const d   = (el) => { els.push(el.setDepth(82)); return el; };

    d(this.add.text(px, py - PH / 2 + 20, 'SETTINGS', {
      fontSize: '16px', fill: '#CCDAFF', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5));
    d(this.add.rectangle(px, py - PH / 2 + 36, PW - 24, 1, 0x3344BB, 0.5));

    const LEFT   = px - PW / 2 + 22;
    const OPT_X  = LEFT + 188;   // options start here
    const startY = py - PH / 2 + 56;
    const rowH   = 68;

    const rowLabel = (row, label, sub) => {
      d(this.add.text(LEFT, startY + row * rowH, label, { fontSize: '11px', fill: '#C8A96E', fontFamily: 'monospace' }));
      if (sub) d(this.add.text(LEFT, startY + row * rowH + 18, sub, { fontSize: '8px', fill: '#4A4066', fontFamily: 'monospace' }));
    };

    const makeGroup = (row, options, getCurrent, onSelect) => {
      const BW = 40, GAP = 5, STEP = BW + GAP;
      const btns = options.map((opt, i) => {
        const bx = OPT_X + i * STEP + BW / 2;
        const by = startY + row * rowH + 10;
        const bg = this.add.rectangle(bx, by, BW, 27, 0x101428)
          .setStrokeStyle(1, 0x3344BB).setDepth(82).setInteractive({ useHandCursor: true });
        const t  = this.add.text(bx, by, opt.label, {
          fontSize: '10px', fill: '#6677AA', fontFamily: 'monospace',
        }).setOrigin(0.5).setDepth(83);
        els.push(bg, t);

        const refresh = () => {
          const active = opt.value === getCurrent();
          bg.setFillStyle(active ? 0x2233AA : 0x101428);
          t.setStyle({ fill: active ? '#FFFFFF' : '#6677AA' });
        };
        refresh();
        bg.on('pointerover', () => bg.setFillStyle(0x1A2488));
        bg.on('pointerout',  refresh);
        bg.on('pointerdown', () => { onSelect(opt.value); btns.forEach(b => b._refresh()); });
        bg._refresh = refresh;
        return bg;
      });
      return btns;
    };

    rowLabel(0, 'Cursor / Aim Sensitivity', 'Gamepad right-stick cursor speed');
    makeGroup(0,
      [{ label:'0.5×', value:0.5 },{ label:'1×', value:1 },{ label:'1.5×', value:1.5 },
       { label:'2×', value:2 },{ label:'2.5×', value:2.5 },{ label:'3×', value:3 }],
      () => settingsStore.cursorSensitivity,
      (v) => { settingsStore.cursorSensitivity = v; }
    );

    rowLabel(1, 'Screen Shake');
    makeGroup(1,
      [{ label:'ON', value:true },{ label:'OFF', value:false }],
      () => settingsStore.screenShake,
      (v) => { settingsStore.screenShake = v; }
    );

    rowLabel(2, 'SFX Volume');
    makeGroup(2,
      [{ label:'0%', value:0 },{ label:'25%', value:0.25 },{ label:'50%', value:0.5 },
       { label:'75%', value:0.75 },{ label:'100%', value:1 }],
      () => settingsStore.sfxVolume,
      (v) => { settingsStore.sfxVolume = v; soundMgr.setVolume(v); }
    );

    rowLabel(3, 'Particle Effects');
    makeGroup(3,
      [{ label:'Full', value:'full' },{ label:'Reduced', value:'reduced' }],
      () => settingsStore.particles,
      (v) => { settingsStore.particles = v; }
    );

    const closeY  = py + PH / 2 - 30;
    const closeBg = this.add.rectangle(px, closeY, 190, 34, 0x1E2DAA)
      .setStrokeStyle(1, 0x7788FF).setDepth(82).setInteractive({ useHandCursor: true });
    const closeTxt = this.add.text(px, closeY, 'SAVE & CLOSE', {
      fontSize: '13px', fill: '#FFFFFF', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(83);
    els.push(closeBg, closeTxt);
    closeBg.on('pointerover', () => closeBg.setFillStyle(0x3A4ACC));
    closeBg.on('pointerout',  () => closeBg.setFillStyle(0x1E2DAA));
    closeBg.on('pointerdown', () => {
      settingsStore.save();
      soundMgr.setVolume(settingsStore.sfxVolume);
      els.forEach(e => e.destroy());
    });

    overlay.on('pointerdown', (ptr) => {
      if (Math.abs(ptr.x - px) > PW / 2 || Math.abs(ptr.y - py) > PH / 2) {
        settingsStore.save();
        soundMgr.setVolume(settingsStore.sfxVolume);
        els.forEach(e => e.destroy());
      }
    });
  }

  // ── Achievements overlay ──────────────────────────────────

  _openAchievements() {
    const PW = 600, PH = 460;
    const px = VW / 2, py = VH / 2;

    const overlay = this.add.rectangle(px, py, VW, VH, 0x000000, 0.78).setDepth(80).setInteractive();
    const panel   = this.add.rectangle(px, py, PW, PH, 0x080910).setStrokeStyle(2, 0xCC8822).setDepth(81);
    const stripe  = this.add.rectangle(px, py - PH / 2 + 1.5, PW, 3, 0xFFAA33).setDepth(82);

    const els = [overlay, panel, stripe];
    const d   = (el) => { els.push(el.setDepth(82)); return el; };

    d(this.add.text(px, py - PH / 2 + 20, 'ACHIEVEMENTS', {
      fontSize: '16px', fill: '#FFAA44', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5));
    d(this.add.rectangle(px, py - PH / 2 + 37, PW - 24, 1, 0xCC8822, 0.5));

    // Load unlocked set
    let unlocked = new Set();
    try {
      const raw = localStorage.getItem('siege_eternal_achievements');
      if (raw) JSON.parse(raw).forEach(id => unlocked.add(id));
    } catch (_) {}

    const defs = [
      { id: 'first_blood',    name: 'First Blood',       desc: 'Kill your first enemy'                         },
      { id: 'wave_1',         name: 'Night One',          desc: 'Survive 1 day'                                },
      { id: 'wave_10',        name: 'Survivor',           desc: 'Survive 10 days'                              },
      { id: 'wave_25',        name: 'Veteran',            desc: 'Survive 25 days'                              },
      { id: 'wave_50',        name: 'Legendary',          desc: 'Survive 50 days'                              },
      { id: 'wave_100',       name: 'Eternal',            desc: 'Survive 100 days'                             },
      { id: 'kills_100',      name: 'Slayer',             desc: 'Kill 100 enemies'                             },
      { id: 'kills_1000',     name: 'Massacre',           desc: 'Kill 1,000 enemies'                           },
      { id: 'first_boss',     name: 'Boss Slayer',        desc: 'Kill your first boss'                         },
      { id: 'all_bosses',     name: 'Tyrant Slayer',      desc: 'Kill all 3 boss types in one run'             },
      { id: 'keys_100',       name: 'Lockpick',           desc: 'Collect 100 keys in a single run'             },
      { id: 'emerald_100',    name: 'Emerald Hoarder',    desc: 'Hold 100 emerald at once'                     },
      { id: 'crystal_100',    name: 'Crystal Lord',       desc: 'Hold 100 crystal at once'                     },
      { id: 'ruby_100',       name: 'Ruby Baron',         desc: 'Hold 100 ruby at once'                        },
      { id: 'souls_1k',       name: 'Soul Collector',     desc: 'Accumulate 1,000 souls in one run'            },
      { id: 'souls_10k',      name: 'Soul Reaper',        desc: 'Accumulate 10,000 souls in one run'           },
      { id: 'cave_master',    name: 'Cave Master',        desc: 'Enter the deep cave'                          },
      { id: 'dungeon_clear',  name: 'Vault Breaker',      desc: 'Clear the dungeon'                            },
      { id: 'full_armor',     name: 'Fully Armoured',     desc: 'Equip a full armor set'                       },
      { id: 'wave_10_1hp',    name: 'Ironman',            desc: 'Survive 10 days in 1 HP Mode'                 },
      { id: 'challenge_1',    name: 'Challenger',         desc: 'Complete a run with any challenge mod'        },
      { id: 'challenge_all',  name: 'Supreme Challenge',  desc: 'All 4 challenge mods active in one run'       },
      { id: 'cursed_unlock',  name: 'Into the Dark',      desc: 'Unlock the cursed area'                       },
      { id: 'raid_complete',  name: 'Raid Defender',      desc: 'Complete a raid event'                        },
      { id: 'supply_defended',name: 'Logistics Expert',   desc: 'Protect a supply crate to completion'         },
      { id: 'weather_all',    name: 'Storm Chaser',       desc: 'Encounter all 10 weather types'               },
      { id: 'revive_used',    name: 'Second Chance',      desc: 'Use a Revive Token'                           },
      { id: 'contract_all',   name: 'Contracts Done',     desc: 'Complete all 3 contracts in one run'          },
      { id: 'level_10',       name: 'Seasoned',           desc: 'Reach player level 10'                        },
      { id: 'permadeath_win', name: 'Immortal',           desc: 'Reach wave 20 without dying'                  },
      { id: 'blueprints_all', name: 'Architect',          desc: 'Unlock all blueprints'                        },
      { id: 'collector',      name: 'Hoarder',            desc: 'Collect 500 of any one resource'              },
    ];

    const COLS = 3;
    const ROW_H = 34;
    const startY = py - PH / 2 + 52;
    const colW   = (PW - 32) / COLS;

    defs.forEach((def, i) => {
      const col   = i % COLS;
      const row   = Math.floor(i / COLS);
      const ax    = px - PW / 2 + 16 + col * colW;
      const ay    = startY + row * ROW_H;
      const done  = unlocked.has(def.id);

      // Row background for unlocked entries
      if (done) {
        d(this.add.rectangle(ax + colW / 2 - 8, ay + 13, colW - 4, 30, 0x1A1200, 0.8)
          .setStrokeStyle(1, 0x664400, 0.6));
      }
      d(this.add.text(ax + 4, ay + 4, done ? '★' : '○', {
        fontSize: '11px', fill: done ? '#FFD700' : '#3A2A1A', fontFamily: 'monospace',
      }));
      d(this.add.text(ax + 20, ay + 4, def.name, {
        fontSize: '10px', fill: done ? '#FFD700' : '#3A3020', fontFamily: 'monospace', fontStyle: done ? 'bold' : '',
      }));
      d(this.add.text(ax + 20, ay + 18, def.desc, {
        fontSize: '8px', fill: done ? '#AA9966' : '#2A2018', fontFamily: 'monospace',
      }));
    });

    const countDone = defs.filter(def => unlocked.has(def.id)).length;
    const countTxt  = d(this.add.text(px - 80, py + PH / 2 - 22, `${countDone} / ${defs.length} unlocked`, {
      fontSize: '11px', fill: '#AA8844', fontFamily: 'monospace',
    }).setOrigin(0, 0.5));

    // Close button
    const closeBg = this.add.rectangle(px + 120, py + PH / 2 - 22, 130, 28, 0x221A00)
      .setStrokeStyle(1, 0xCC8822).setDepth(82).setInteractive({ useHandCursor: true });
    const closeTxt = this.add.text(px + 120, py + PH / 2 - 22, 'CLOSE', {
      fontSize: '12px', fill: '#FFAA44', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(83);
    els.push(closeBg, closeTxt);
    closeBg.on('pointerover', () => { closeBg.setFillStyle(0x3A2800); closeTxt.setStyle({ fill: '#FFFFFF' }); });
    closeBg.on('pointerout',  () => { closeBg.setFillStyle(0x221A00); closeTxt.setStyle({ fill: '#FFAA44' }); });
    closeBg.on('pointerdown', () => els.forEach(e => e.destroy()));

    overlay.on('pointerdown', (ptr) => {
      if (Math.abs(ptr.x - px) > PW / 2 || Math.abs(ptr.y - py) > PH / 2)
        els.forEach(e => e.destroy());
    });
  }
}
