// ============================================================
// BackpackUI — toggle-able inventory panel (Tab key)
// Pre-built on first open; subsequent toggles just show/hide.
// Shows EQUIPPED gear + owned resources (zero-count hidden).
// ============================================================
import { VW, VH, RELIC_DEFS, HELMET_DEFS, PANTS_DEFS, SET_BOOTS_DEFS, SET_BONUS_DEFS } from '../constants.js';

const ALL_RESOURCES = [
  'wood','stone','iron','coal','crystal','ruby','emerald','gold',
  'bone','souls','raw_meat','cooked_meat',
  'key_regular','key_boss',
  'cursed_essence','void_shards','corrupted_wood','corrupted_stone',
];

const RES_LABELS = {
  wood: 'Wood', stone: 'Stone', iron: 'Iron', coal: 'Coal',
  crystal: 'Crystal', ruby: 'Ruby', emerald: 'Emerald', gold: 'Gold',
  bone: 'Bone', souls: 'Souls', raw_meat: 'Raw Meat', cooked_meat: 'Cooked Meat',
  key_regular: 'Regular Key', key_boss: 'Boss Key',
  cursed_essence: 'Cursed Essence', void_shards: 'Void Shards',
  corrupted_wood: 'Corr. Wood', corrupted_stone: 'Corr. Stone',
};

const RES_COLORS = {
  wood: 0x6B8F4E, stone: 0x9A908A, iron: 0xC0A882, coal: 0x888888,
  crystal: 0x5BBCB0, ruby: 0xFF4466, emerald: 0x44CC66, gold: 0xD4A017,
  bone: 0xEDE0C4, souls: 0xAA44FF, raw_meat: 0xFF6655, cooked_meat: 0xCC7733,
  key_regular: 0xC8A882, key_boss: 0xD4A017,
  cursed_essence: 0xCC22FF, void_shards: 0x4422FF,
  corrupted_wood: 0x553311, corrupted_stone: 0x664455,
};

const BG   = 0x110D08;
const BORD = 0x5A3A20;
const DEP  = 80;

export class BackpackUI {
  constructor(scene) {
    this.scene  = scene;
    this._els   = [];
    this._open  = false;
    this._built = false;
    // live-updating text objects
    this._resTxts    = {};   // res key → text (count)
    this._equippedTxts = {}; // slot key → text
  }

  isOpen() { return this._open; }

  toggle() { this._open ? this.close() : this.open(); }

  open() {
    if (this._open) return;
    this._open = true;
    if (!this._built) { this._buildOnce(); this._built = true; }
    this._els.forEach(e => e?.setVisible(true));
    this._refresh();
  }

  close() {
    if (!this._open) return;
    this._open = false;
    this._els.forEach(e => e?.setVisible(false));
  }

  // Called every frame from GameScene.update() while open
  update() {
    if (!this._open) return;
    this._refresh();
  }

  // ── Build once ─────────────────────────────────────────────

  _buildOnce() {
    const s  = this.scene;
    const W  = 520, H = 500;
    const cx = VW / 2, cy = VH / 2;
    const push = o => { this._els.push(o); return o; };

    // Backdrop + panel
    push(s.add.rectangle(cx, cy, VW, VH, 0x000000, 0.70).setScrollFactor(0).setDepth(DEP));
    push(s.add.rectangle(cx, cy, W, H, BG).setStrokeStyle(2, BORD).setScrollFactor(0).setDepth(DEP + 1));

    // Title
    push(s.add.text(cx, cy - H / 2 + 18, '[ BACKPACK ]', {
      fontSize: '18px', color: '#C8A96E', fontFamily: 'monospace', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEP + 2));

    push(s.add.text(cx, cy - H / 2 + 38, 'Tab to close', {
      fontSize: '11px', color: '#666666', fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEP + 2));

    // ── EQUIPPED section ────────────────────────────────────
    const eqTop = cy - H / 2 + 58;
    push(s.add.text(cx - W / 2 + 14, eqTop, '— EQUIPPED —', {
      fontSize: '11px', color: '#7A6545', fontFamily: 'monospace', fontStyle: 'bold',
    }).setScrollFactor(0).setDepth(DEP + 2));

    const EQUIP_SLOTS = [
      { key: 'weapon',   label: 'Weapon',  col: '#FFDDAA' },
      { key: 'bow',      label: 'Bow',     col: '#FFDDAA' },
      { key: 'armor',    label: 'Chest',   col: '#C8D0D8' },
      { key: 'helmet',   label: 'Helmet',  col: '#AACCFF' },
      { key: 'pants',    label: 'Pants',   col: '#AAFFCC' },
      { key: 'setBoots', label: 'Boots',   col: '#FFDDAA' },
      { key: 'pickaxe',  label: 'Pickaxe', col: '#D4A017' },
      { key: 'torch',    label: 'Torch',   col: '#FF8800' },
    ];

    const eqCols = 4, eqCellW = (W - 28) / eqCols, eqCellH = 36;
    EQUIP_SLOTS.forEach((slot, i) => {
      const col = i % eqCols, row = Math.floor(i / eqCols);
      const ex  = cx - W / 2 + 14 + col * eqCellW;
      const ey  = eqTop + 16 + row * eqCellH;

      push(s.add.text(ex, ey, slot.label + ':', {
        fontSize: '10px', color: '#665544', fontFamily: 'monospace',
      }).setScrollFactor(0).setDepth(DEP + 2));

      const val = push(s.add.text(ex, ey + 14, '—', {
        fontSize: '12px', color: slot.col, fontFamily: 'monospace', fontStyle: 'bold',
        stroke: '#000', strokeThickness: 2,
      }).setScrollFactor(0).setDepth(DEP + 2));
      this._equippedTxts[slot.key] = val;
    });

    // Set bonus line
    push(s.add.text(cx - W / 2 + 14, eqTop + 16 + 2 * eqCellH, 'Set Bonus:', {
      fontSize: '10px', color: '#665544', fontFamily: 'monospace',
    }).setScrollFactor(0).setDepth(DEP + 2));
    const setBonusVal = push(s.add.text(cx - W / 2 + 14, eqTop + 30 + 2 * eqCellH, '—', {
      fontSize: '11px', color: '#88FF88', fontFamily: 'monospace', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 2,
    }).setScrollFactor(0).setDepth(DEP + 2));
    this._equippedTxts['setBonus'] = setBonusVal;

    const eqSectionH = 16 + 3 * eqCellH + 10;

    // ── RESOURCES section ───────────────────────────────────
    const resTop = eqTop + eqSectionH + 4;
    push(s.add.text(cx - W / 2 + 14, resTop, '— INVENTORY —', {
      fontSize: '11px', color: '#7A6545', fontFamily: 'monospace', fontStyle: 'bold',
    }).setScrollFactor(0).setDepth(DEP + 2));

    // Divider
    push(s.add.rectangle(cx, resTop + 8, W - 28, 1, 0x5A3A20, 0.6).setScrollFactor(0).setDepth(DEP + 2));

    // Resource rows — 3 columns, dynamic visibility
    const RES_COLS = 3;
    const resCellW = (W - 28) / RES_COLS;
    const resCellH = 24;

    ALL_RESOURCES.forEach((res, i) => {
      const col = i % RES_COLS;
      const row = Math.floor(i / RES_COLS);
      const rx  = cx - W / 2 + 14 + col * resCellW;
      const ry  = resTop + 18 + row * resCellH;

      const colHex = RES_COLORS[res] ?? 0xAAAAAA;
      const dot    = push(s.add.circle(rx + 6, ry + 8, 5, colHex).setScrollFactor(0).setDepth(DEP + 2));

      const lbl = push(s.add.text(rx + 16, ry, RES_LABELS[res] ?? res, {
        fontSize: '12px', color: '#DDDDDD', fontFamily: 'monospace',
        stroke: '#000', strokeThickness: 2,
      }).setScrollFactor(0).setDepth(DEP + 2));

      const val = push(s.add.text(rx + resCellW - 8, ry, '0', {
        fontSize: '13px', color: '#FFE090', fontFamily: 'monospace', fontStyle: 'bold',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(1, 0).setScrollFactor(0).setDepth(DEP + 2));

      this._resTxts[res] = { dot, lbl, val };
    });

    // ── Relics section ──────────────────────────────────────
    const relicY = cy + H / 2 - 28;
    const relicLbl = push(s.add.text(cx, relicY - 14, 'Relics: None', {
      fontSize: '11px', color: '#555555', fontFamily: 'monospace',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEP + 2));
    this._equippedTxts['relics'] = relicLbl;

    // Start hidden until opened
    this._els.forEach(e => e.setVisible(false));
  }

  // ── Refresh live data ───────────────────────────────────────

  _refresh() {
    this._refreshEquipped();
    this._refreshResources();
  }

  _refreshEquipped() {
    const s  = this.scene;
    const et = this._equippedTxts;
    if (!et.weapon) return;

    // Weapon
    const sword = s.weapon ? s.weapon.replace('sword_', '').replace(/_/g, ' ') + ' Sword' : 'None';
    et.weapon?.setText(sword);
    const bow = s.bow === 'bow_upgraded' ? 'Upgraded Bow' : s.bow === 'bow' ? 'Bow' : 'None';
    et.bow?.setText(bow);

    // Armor pieces
    et.armor?.setText(s.armor ? s.armor.replace('armor_', '').replace(/_/g, ' ') + ' Chest' : 'None');
    et.helmet?.setText(s.helmet ? (HELMET_DEFS[s.helmet]?.name ?? s.helmet) : 'None');
    et.pants?.setText(s.pants ? (PANTS_DEFS[s.pants]?.name ?? s.pants) : 'None');

    // Boots — show set boots if equipped, else speed boots, else none
    const bootsName = s.setBoots ? (SET_BOOTS_DEFS[s.setBoots]?.name ?? s.setBoots)
      : s.hasSpeedBoots ? 'Speed Boots' : 'None';
    et.setBoots?.setText(bootsName);

    // Pickaxe
    const PICK_NAMES = { stone_pick: 'Stone Pick', iron_pick: 'Iron Pick', crystal_pick: 'Crystal Pick', emerald_pick: 'Emerald Pick', ruby_pick: 'Ruby Pick' };
    et.pickaxe?.setText(s.pickaxeKey ? (PICK_NAMES[s.pickaxeKey] ?? s.pickaxeKey) : 'None');

    // Torch
    et.torch?.setText(s.hasTorch ? '🔥 Lit Torch' : 'None');

    // Set bonus
    const setNow = s._getArmorSet?.();
    const bonus  = setNow ? SET_BONUS_DEFS[setNow] : null;
    et.setBonus?.setText(bonus ? `${bonus.name}` : 'No full set');

    // Relics
    const relics = s.relicSys?.relics ?? [];
    const relicNames = relics.map(k => RELIC_DEFS[k]?.name ?? k).join(', ') || 'None';
    et.relics?.setText(`Relics: ${relicNames}`);
  }

  _refreshResources() {
    const inv = this.scene.inventory ?? {};
    for (const [res, objs] of Object.entries(this._resTxts)) {
      const n    = inv[res] || 0;
      const show = n > 0;
      objs.dot?.setVisible(show);
      objs.lbl?.setVisible(show);
      objs.val?.setVisible(show).setText(String(n));
    }
  }
}
