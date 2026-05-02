// ============================================================
// HUD — heads-up display, crafting menu, build cursor
// No Phaser Containers used — each element gets setScrollFactor(0)
// directly, which is the only reliable way to get correct input
// hit detection on UI elements in a scrolling world.
// ============================================================
import {
  VW, VH, TS, MW, MH,
  TOWER_DEFS, MACHINE_DEFS, WALL_DEFS, SWORD_DEFS, ARMOR_DEFS,
  PICKAXE_DEF, STONE_PICKAXE_DEF, IRON_PICKAXE_DEF, CRYSTAL_PICKAXE_DEF,
  EMERALD_PICKAXE_DEF, RUBY_PICKAXE_DEF,
  BED_DEF, BOW_DEF, BOW_UPGRADED_DEF,
  REGEN_TOKEN_DEF, SPEED_BOOTS_DEF, UNCURSE_TOKEN_DEF,
  PICKAXE_TIERS, TORCH_DEF,
  CURSED_TOWER_DEFS, BRIDGE_DEF,
  HELMET_DEFS, PANTS_DEFS, SET_BOOTS_DEFS, SET_BONUS_DEFS,
} from '../constants.js';
import { blueprintSys } from './BlueprintSystem.js';

const CRAFT_TABS = ['towers', 'walls', 'machines', 'items', 'gear', 'armour', 'cursed'];

const ITEMS_DEF = {
  revive:       { name: 'Revive Token', cost: { crystal: 5, gold: 10, bone: 8 }, desc: 'Auto-use on death (no hardcore)', cat: 'consumable', tex: 'particle' },
  torch:        { ...TORCH_DEF, cat: 'consumable' },
  stone_pick:   { ...STONE_PICKAXE_DEF,   cat: 'tool' },
  iron_pick:    { ...IRON_PICKAXE_DEF,    cat: 'tool' },
  crystal_pick: { ...CRYSTAL_PICKAXE_DEF, cat: 'tool' },
  emerald_pick: { ...EMERALD_PICKAXE_DEF, cat: 'tool' },
  ruby_pick:    { ...RUBY_PICKAXE_DEF,    cat: 'tool' },
  bed:          { ...BED_DEF,             cat: 'build' },
  campfire:     { name: 'Campfire',  cost: { coal: 5, wood: 5, bone: 10 }, desc: 'Cook raw meat → eat near it (E)', cat: 'build', tex: 'campfire' },
  boots_speed:  { ...SPEED_BOOTS_DEF,     cat: 'boots' },
  regen_token:   { ...REGEN_TOKEN_DEF,     cat: 'consumable' },
  uncurse_token: { ...UNCURSE_TOKEN_DEF,   cat: 'consumable' },
  landmine:     { name: 'Landmine',   cost: { iron: 3, coal: 2   }, desc: 'Explodes on contact (harms you too!)', cat: 'trap', tex: 'landmine'  },
  tripwire:     { name: 'Tripwire',   cost: { iron: 1, bone: 2   }, desc: 'Slows enemies 70% while on it',        cat: 'trap', tex: 'tripwire'  },
  spike_pit:    { name: 'Spike Pit',  cost: { iron: 2, stone: 2  }, desc: 'Deals 25 dmg/0.8s (harms you too!)',   cat: 'trap', tex: 'spike_pit' },
  glue_pool:    { name: 'Glue Pool',  cost: { crystal: 2, bone: 3}, desc: 'Stops enemy movement (4s)',            cat: 'trap', tex: 'glue_pool' },
};

// Weapons only — chest armour moved to ARMOUR_TAB_DEF
const GEAR_DEF = {
  sword_wood:    { ...SWORD_DEFS.wood,    desc: `Dmg: ${SWORD_DEFS.wood.dmg}`,    cat: 'weapon' },
  sword_stone:   { ...SWORD_DEFS.stone,   desc: `Dmg: ${SWORD_DEFS.stone.dmg}`,   cat: 'weapon' },
  sword_iron:    { ...SWORD_DEFS.iron,    desc: `Dmg: ${SWORD_DEFS.iron.dmg}`,    cat: 'weapon' },
  sword_crystal: { ...SWORD_DEFS.crystal, desc: `Dmg: ${SWORD_DEFS.crystal.dmg}`, cat: 'weapon' },
  sword_ruby:    { ...SWORD_DEFS.ruby,    desc: `Dmg: ${SWORD_DEFS.ruby.dmg} fast`, cat: 'weapon' },
  sword_emerald: { ...SWORD_DEFS.emerald, desc: `Dmg: ${SWORD_DEFS.emerald.dmg}`, cat: 'weapon' },
  bow:           { ...BOW_DEF,            desc: `Auto ${BOW_DEF.dmg}dmg/2s`,      cat: 'weapon' },
  bow_upgraded:  { ...BOW_UPGRADED_DEF,   desc: `Auto ${BOW_UPGRADED_DEF.dmg}dmg/1.2s`, cat: 'weapon' },
};

// All armour pieces — chest + helmet + pants + boots (20 items, 4×5 grid)
const ARMOUR_TAB_DEF = {
  armor_bone:     { ...ARMOR_DEFS.bone,    desc: `Armor: ${ARMOR_DEFS.bone.armor} + stealth`, cat: 'armor' },
  armor_iron:     { ...ARMOR_DEFS.iron,    desc: `Armor: ${ARMOR_DEFS.iron.armor}`,            cat: 'armor' },
  armor_crystal:  { ...ARMOR_DEFS.crystal, desc: `Armor: ${ARMOR_DEFS.crystal.armor}`,         cat: 'armor' },
  armor_ruby:     { ...ARMOR_DEFS.ruby,    desc: `Armor: ${ARMOR_DEFS.ruby.armor} +night`,     cat: 'armor' },
  armor_emerald:  { ...ARMOR_DEFS.emerald, desc: `Armor: ${ARMOR_DEFS.emerald.armor} +cave`,   cat: 'armor' },
  bone_helmet:    { ...HELMET_DEFS.bone_helmet,    cat: 'helmet'   },
  iron_helmet:    { ...HELMET_DEFS.iron_helmet,    cat: 'helmet'   },
  crystal_helmet: { ...HELMET_DEFS.crystal_helmet, cat: 'helmet'   },
  ruby_helmet:    { ...HELMET_DEFS.ruby_helmet,    cat: 'helmet'   },
  emerald_helmet: { ...HELMET_DEFS.emerald_helmet, cat: 'helmet'   },
  bone_pants:     { ...PANTS_DEFS.bone_pants,      cat: 'pants'    },
  iron_pants:     { ...PANTS_DEFS.iron_pants,      cat: 'pants'    },
  crystal_pants:  { ...PANTS_DEFS.crystal_pants,   cat: 'pants'    },
  ruby_pants:     { ...PANTS_DEFS.ruby_pants,      cat: 'pants'    },
  emerald_pants:  { ...PANTS_DEFS.emerald_pants,   cat: 'pants'    },
  bone_boots:     { ...SET_BOOTS_DEFS.bone_boots,    cat: 'setBoots' },
  iron_boots:     { ...SET_BOOTS_DEFS.iron_boots,    cat: 'setBoots' },
  crystal_boots:  { ...SET_BOOTS_DEFS.crystal_boots, cat: 'setBoots' },
  ruby_boots:     { ...SET_BOOTS_DEFS.ruby_boots,    cat: 'setBoots' },
  emerald_boots:  { ...SET_BOOTS_DEFS.emerald_boots, cat: 'setBoots' },
};

export class HUD {
  constructor(scene) {
    this.scene         = scene;
    this._msgTimer     = null;
    this._panelEls     = [];   // every element belonging to the craft panel
    this.showLabels    = false;
    this._labelPool    = [];   // reusable world-space text objects for entity labels
    this._mobResTimer  = 0;    // throttle for dk:resources dispatch
  }

  // ── Build ────────────────────────────────────────────────

  build() {
    this._buildResourcePanel();
    this._buildWaveClock();
    this._buildPlayerBars();
    this._buildCursor();
    this._buildMessageText();
    this._buildBossBar();
    this._buildCraftPanel();
    this._buildSellButton();
    this._buildEquipDisplay();
    this._buildLabelsBtn();
    this._buildBackpackBtn();
  }

  _buildBackpackBtn() {
    this._backpackBtn = this.scene.add.text(VW - 118, 92, '[Tab] Backpack', {
      fontSize: '10px', fill: '#EDE0C4', fontFamily: 'monospace',
      backgroundColor: '#1A102A', padding: { x: 6, y: 3 },
    }).setScrollFactor(0).setDepth(50).setInteractive({ useHandCursor: true });
    this._backpackBtn.on('pointerover', () => this._backpackBtn.setStyle({ backgroundColor: '#2A1A3A' }));
    this._backpackBtn.on('pointerout',  () => this._backpackBtn.setStyle({ backgroundColor: '#1A102A' }));
    this._backpackBtn.on('pointerdown', () => this.scene.backpackUI?.toggle());
  }

  // ── Per-frame update ─────────────────────────────────────

  update() {
    this._updateResources();
    this._updateWaveClock();
    this._updatePlayerBars();
    this._updateCursor();
    this._updateBossBar();
    this._updateEquipDisplay();
    this._updateLabels();
    this._dispatchMobileResources();
  }

  _dispatchMobileResources() {
    const now = Date.now();
    if (now - this._mobResTimer < 250) return;
    this._mobResTimer = now;
    const s  = this.scene;
    const wm = s.waveMgr;
    window.dispatchEvent(new CustomEvent('dk:resources', {
      detail: {
        inv:    s.inventory,
        hp:     s.playerHP     ?? 100,
        maxHp:  s.playerMaxHP  ?? 100,
        mp:     s.playerMP     ?? 100,
        maxMp:  s.playerMaxMP  ?? 100,
        wave:   s.wave         ?? 0,
        isDay:  wm?.isDay      ?? true,
        weapon: s.weapon,
        armor:  s.armor,
      },
    }));
  }

  // ── Public API ───────────────────────────────────────────

  showMsg(txt, dur) {
    if (!this._msgTxt) return;
    this._msgTxt.setText(txt).setAlpha(1);
    if (this._msgTimer) this._msgTimer.remove();
    this._msgTimer = this.scene.time.delayedCall(Math.max(0, dur - 400), () => {
      this.scene.tweens.add({ targets: this._msgTxt, alpha: 0, duration: 400 });
    });
    // Mirror to mobile overlay
    window.dispatchEvent(new CustomEvent('dk:announce', { detail: { text: txt, dur: Math.max(dur - 200, 800) } }));
  }

  openCraft()   {
    this._panelEls.forEach(e => e.setVisible(true));
    this._refreshSlots();
    // Reset keyboard cursor to first slot
    this._selectSlot(this.scene._gamepadMenuIdx ?? 0);
  }
  closeCraft()  { this._panelEls.forEach(e => e.setVisible(false)); }
  isCraftOpen() { return this._panelEls.length > 0 && this._panelEls[0].visible; }

  // Gamepad: highlight a slot by index (0-11)
  _selectSlot(idx) {
    this._slots.forEach((s, i) => {
      s.slot.setFillStyle(i === idx ? 0x5A3A28 : 0x2A1E10);
      s.slot.setStrokeStyle(i === idx ? 2 : 1, i === idx ? 0xFFDD88 : 0x5A3A20);
    });
  }

  // Gamepad: switch to tab by index (0=towers 1=walls 2=machines 3=items 4=gear 5=armour 6=cursed)
  _selectTab(tabIdx) {
    const tabs = ['towers', 'walls', 'machines', 'items', 'gear', 'armour', 'cursed'];
    this._selectedTab = tabs[tabIdx] ?? 'towers';
    this._refreshSlots();
    this._selectSlot(0);
  }

  // ── Labels overlay ([1] key) ─────────────────────────────

  _buildLabelsBtn() {
    this._labelsBtn = this.scene.add.text(VW - 118, 74, '[~] Labels', {
      fontSize: '11px', fill: '#EDE0C4', fontFamily: 'monospace',
      backgroundColor: '#2A1E10', padding: { x: 8, y: 4 },
    }).setScrollFactor(0).setDepth(50).setInteractive({ useHandCursor: true });

    this._labelsBtn.on('pointerover',  () => { if (!this.showLabels) this._labelsBtn.setStyle({ backgroundColor: '#3D2B1F' }); });
    this._labelsBtn.on('pointerout',   () => { if (!this.showLabels) this._labelsBtn.setStyle({ backgroundColor: '#2A1E10' }); });
    this._labelsBtn.on('pointerdown',  () => this.toggleLabels());
  }

  toggleLabels() {
    this.showLabels = !this.showLabels;
    this._labelsBtn.setStyle({
      backgroundColor: this.showLabels ? '#1A4A20' : '#2A1E10',
      fill: this.showLabels ? '#88FF88' : '#EDE0C4',
    });
    if (!this.showLabels) this._labelPool.forEach(t => t.setVisible(false));
    this.showMsg(this.showLabels ? 'Labels ON' : 'Labels OFF', 800);
  }

  _updateLabels() {
    if (!this.showLabels) return;

    const s   = this.scene;
    const cam = s.cameras.main;
    const vL  = cam.scrollX - TS;
    const vT  = cam.scrollY - TS;
    const vR  = cam.scrollX + cam.width  + TS;
    const vB  = cam.scrollY + cam.height + TS;
    const vis = (x, y) => x >= vL && x <= vR && y >= vT && y <= vB;

    let idx = 0;
    const put = (x, y, text, color) => {
      if (!vis(x, y)) return;
      const t = this._getLabel(idx++);
      t.setPosition(x, y - 18).setText(text).setStyle({ fill: color }).setVisible(true);
    };

    // Towers (name + level + kill progress)
    for (const t of (s.towerMgr?.towers ?? [])) {
      if (!t.sprite?.active) continue;
      const lv = t.upgLevel + 1;
      let suffix = '';
      if (t.corrupted) suffix = ' !!CORRUPT!!';
      else if (t.upgLevel < 9) suffix = ` [${t.kills % 100}/100]`;
      else suffix = ' MAX';
      const col = t.corrupted ? '#FF4444' : '#88CCFF';
      put(t.sprite.x, t.sprite.y, `${t.def.name} Lv${lv}${suffix}`, col);
    }

    // Machines
    for (const m of (s.towerMgr?.machines ?? [])) {
      if (!m.sprite?.active) continue;
      put(m.sprite.x, m.sprite.y, m.def.name, '#FFDD88');
    }

    // Walls
    for (const w of (s.towerMgr?.walls ?? [])) {
      if (!w.sprite?.active || w.alive === false) continue;
      const name = WALL_DEFS[w.type]?.name ?? w.type;
      put(w.sprite.x, w.sprite.y, name, '#C8C8C8');
    }

    // Enemies
    for (const e of (s.enemyMgr?.enemies ?? [])) {
      if (!e.alive || !e.sprite?.active) continue;
      put(e.sprite.x, e.sprite.y, e.def.name, '#FF8888');
    }

    // Resources (scan visible portion of map)
    const tx0 = Math.max(1, Math.floor(vL / TS));
    const ty0 = Math.max(1, Math.floor(vT / TS));
    const tx1 = Math.min(MW - 2, Math.ceil(vR  / TS));
    const ty1 = Math.min(MH - 2, Math.ceil(vB  / TS));
    for (let ry = ty0; ry <= ty1; ry++) {
      for (let rx = tx0; rx <= tx1; rx++) {
        const node = s.mapData[ry]?.[rx]?.resource;
        if (!node || node.amt <= 0 || !node.sprite?.visible) continue;
        put(node.sprite.x, node.sprite.y, `${node.type} ×${node.amt}`, '#88FF88');
      }
    }

    // Hide surplus pool entries
    for (let i = idx; i < this._labelPool.length; i++) {
      this._labelPool[i].setVisible(false);
    }
  }

  _getLabel(idx) {
    if (this._labelPool[idx]) return this._labelPool[idx];
    const t = this.scene.add.text(0, 0, '', {
      fontSize: '9px', fill: '#FFFFFF', fontFamily: 'monospace',
      stroke: '#000', strokeThickness: 2,
    }).setDepth(25).setOrigin(0.5, 1);
    this._labelPool.push(t);
    return t;
  }

  setSellMode(active) {
    this._sellBtn.setStyle({
      backgroundColor: active ? '#882200' : '#3D2B1F',
      fill: active ? '#FFDD88' : '#EDE0C4',
    });
    this._sellLabel.setText(active ? 'SELLING [X]' : 'SELL [X]');
  }

  // ── Resource panel (top-left) ────────────────────────────

  _buildResourcePanel() {
    const res    = ['wood','stone','bone','coal','iron','crystal','gold','ruby','emerald','souls','raw_meat','cooked_meat','cursed_essence','void_shards','corrupted_wood','key_regular','key_boss'];
    const labels = ['Wood','Stone','Bone','Coal','Iron','Crystal','Gold','Ruby','Emerald','Souls','Raw Meat','Cooked','C.Essence','VoidShard','Corr.Wood','Key','Boss Key'];
    const colors = ['#8B6040','#9A908A','#EDE0C4','#555555','#C0A882','#5BBCB0','#D4A017','#FF4466','#44DD88','#AA44FF','#FF9988','#CC7733','#CC22FF','#4422FF','#553311','#C8A882','#D4A017'];
    this._resRows   = {};
    this._resTxts   = {};    // backward-compat alias
    this._keyLabels = {};    // kept for code that references it

    res.forEach((r, i) => {
      const lbl = this.scene.add.text(4, 14 + i * 22, labels[i], {
        fontSize: '10px', fill: colors[i], fontFamily: 'monospace',
        stroke: '#000', strokeThickness: 2,
      }).setScrollFactor(0).setDepth(50).setVisible(false);
      const val = this._txt('0', 62, 14 + i * 22, '13px').setVisible(false);
      this._resRows[r] = { lbl, val };
      this._resTxts[r] = val;
    });
  }

  _updateResources() {
    const inv  = this.scene.inventory;
    let   curY = 14;
    for (const [r, row] of Object.entries(this._resRows)) {
      const n = inv[r] || 0;
      if (n > 0) {
        row.lbl.setY(curY).setVisible(true);
        row.val.setY(curY).setText(String(n)).setVisible(true);
        curY += 22;
      } else {
        row.lbl.setVisible(false);
        row.val.setVisible(false);
      }
    }
  }

  // ── Wave counter + day/night clock (top-right) ───────────
  // Layout: [Wave N] [DAY/NIGHT]   (clock circle to the far right)

  _buildWaveClock() {
    this._waveTxt    = this._txt('Day 0', VW - 180, 10, '18px', '#EDE0C4');
    this._phaseTxt   = this._txt('DAY',   VW - 180, 32, '12px', '#FFB830');
    this._weatherTxt = this._txt('',      VW - 180, 50, '10px', '#AABBFF');
    this._secsLeftTxt = this._txt('',     VW - 180, 64, '10px', '#AABB88');
    this._clockGfx   = this.scene.add.graphics().setScrollFactor(0).setDepth(50);
  }

  _updateWaveClock() {
    const wm  = this.scene.waveMgr;
    this._waveTxt.setText(`Day ${this.scene.wave}`);
    this._phaseTxt
      .setText(wm.isDay ? 'DAY' : 'NIGHT')
      .setStyle({ fill: wm.isDay ? '#FFB830' : '#8899FF' });

    // Clock circle — far right, clear of text
    const g   = this._clockGfx;
    const pct = wm.phaseTime / wm.phaseLen;
    const cx  = VW - 24, cy = 24, r = 18;

    g.clear();
    g.fillStyle(0x1a1a1a);
    g.fillCircle(cx, cy, r);
    g.fillStyle(wm.isDay ? 0xFFB830 : 0x4455BB);
    g.slice(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - pct), false);
    g.fillPath();
    g.lineStyle(2, 0x7A6545);
    g.strokeCircle(cx, cy, r);

    // Weather display
    const wx = this.scene.weatherSystem?.current ?? null;
    if (wx) {
      const label = this.scene.weatherSystem.label();
      const color = this.scene.weatherSystem.displayColor();
      this._weatherTxt.setText(label).setStyle({ fill: color });
    } else {
      this._weatherTxt.setText('');
    }

    // Seconds remaining in current phase
    const secsLeft = Math.max(0, Math.ceil((wm.phaseLen - wm.phaseTime) / 1000));
    this._secsLeftTxt.setText(`${secsLeft}s left`);
  }

  // ── HP / energy bars (follow player in world space) ─────

  _buildPlayerBars() {
    this._hpBg   = this.scene.add.rectangle(0, 0, 26, 4, 0x111111).setDepth(12).setOrigin(0, 0);
    this._hpFill = this.scene.add.rectangle(0, 0, 26, 4, 0x880000).setDepth(13).setOrigin(0, 0);
    this._mpBg   = this.scene.add.rectangle(0, 0, 26, 4, 0x111111).setDepth(12).setOrigin(0, 0);
    this._mpFill = this.scene.add.rectangle(0, 0, 26, 4, 0x004488).setDepth(13).setOrigin(0, 0);
  }

  _updatePlayerBars() {
    const s   = this.scene;
    const px  = s.player.x - 13;
    const py  = s.player.y + 18;
    this._hpBg.setPosition(px, py);
    this._hpFill.setPosition(px, py);
    this._mpBg.setPosition(px, py + 5);
    this._mpFill.setPosition(px, py + 5);
    const hpPct = Math.max(0, s.playerHP / s.playerMaxHP);
    const mpPct = Math.max(0, s.playerMP / s.playerMaxMP);
    this._hpFill.setSize(26 * hpPct, 4);
    this._mpFill.setSize(26 * mpPct, 4);
    this._hpFill.setAlpha(hpPct < 0.25 ? 0.5 + Math.sin(Date.now() * 0.008) * 0.5 : 1);
  }

  // ── Build cursor (world space, no scrollFactor needed) ───

  _buildCursor() {
    this._cursor      = this.scene.add.image(0, 0, 'cursor').setDepth(20).setVisible(false).setAlpha(0.85);
    this._cursorLabel = this.scene.add.text(0, 0, '', {
      fontSize: '10px', fill: '#EDE0C4', fontFamily: 'monospace', stroke: '#000', strokeThickness: 2,
    }).setDepth(21).setVisible(false);
  }

  _updateCursor() {
    const bm   = this.scene.buildMode;
    const sell = this.scene.sellMode;

    if (!bm && !sell) { this._cursor.setVisible(false); this._cursorLabel.setVisible(false); return; }

    const cam = this.scene.cameras.main;
    const ptr = this.scene.input.activePointer;
    const tx  = Math.floor((cam.scrollX + ptr.x) / TS);
    const ty  = Math.floor((cam.scrollY + ptr.y) / TS);
    const cx  = tx * TS + TS / 2;
    const cy  = ty * TS + TS / 2;

    this._cursor.setPosition(cx, cy).setVisible(true);

    if (sell) {
      const inMap = tx >= 1 && ty >= 1 && tx < MW - 1 && ty < MH - 1;
      const cell  = inMap ? this.scene.mapData[ty]?.[tx] : null;
      const hasStruct = cell?.structure && (cell.structure.alive !== false);
      this._cursor.setTexture(hasStruct ? 'cursor_red' : 'cursor');
      this._cursorLabel.setPosition(cx + 18, cy - 22).setText(hasStruct ? 'SELL (50%)' : '').setVisible(true);
    } else {
      const inMap    = tx >= 1 && ty >= 1 && tx < MW - 1 && ty < MH - 1;
      const cell     = inMap ? this.scene.mapData[ty]?.[tx] : null;
      const existing = cell?.structure;
      const isWallUpgrade = bm.cat === 'wall' && existing?.type &&
        (WALL_DEFS[bm.key]?.hp ?? 0) > (WALL_DEFS[existing.type]?.hp ?? 0);
      const canPlace = cell && cell.terrain !== 'bwall' && !cell.resource && (!cell.structure || isWallUpgrade);
      this._cursor.setTexture(canPlace ? 'cursor' : 'cursor_red');
      this._cursorLabel.setPosition(cx + 18, cy - 22).setText(bm.def.name).setVisible(true);
    }
  }

  // ── Message text ─────────────────────────────────────────

  _buildMessageText() {
    this._msgTxt = this.scene.add.text(VW / 2, 84, '', {
      fontSize: '19px', fill: '#EDE0C4', fontFamily: 'monospace',
      stroke: '#1a1a1a', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(55).setScrollFactor(0).setAlpha(0);
  }

  _buildBossBar() {
    const cx = VW / 2;
    this._bossBarBg   = this.scene.add.rectangle(cx, VH - 28, 320, 18, 0x1A0000)
      .setScrollFactor(0).setDepth(55).setStrokeStyle(1, 0x880000).setVisible(false);
    this._bossBarFill = this.scene.add.rectangle(cx - 160, VH - 28, 320, 18, 0xCC2200)
      .setScrollFactor(0).setDepth(56).setOrigin(0, 0.5).setVisible(false);
    this._bossTxt = this.scene.add.text(cx, VH - 28, '', {
      fontSize: '10px', fill: '#FFD0D0', fontFamily: 'monospace', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(57).setVisible(false);
  }

  _updateBossBar() {
    const boss = this.scene.enemyMgr?.enemies?.find(e => e.alive && e.def?.boss);
    if (boss) {
      const pct = Math.max(0, boss.hp / boss.maxHp);
      this._bossBarBg.setVisible(true);
      this._bossBarFill.setVisible(true).setSize(320 * pct, 18);
      this._bossTxt.setVisible(true).setText(`${boss.def.name}  ${Math.ceil(boss.hp)} / ${boss.maxHp}`);
      const col = pct > 0.5 ? 0xCC2200 : pct > 0.25 ? 0xFF6600 : 0xFF0000;
      this._bossBarFill.setFillStyle(col);
    } else {
      this._bossBarBg.setVisible(false);
      this._bossBarFill.setVisible(false);
      this._bossTxt.setVisible(false);
    }
  }

  // ── Crafting panel — NO Container, direct scrollFactor(0) ─
  // This is critical: Phaser 3 Container hit detection is unreliable
  // when the world camera is scrolling. Every element must have its
  // own setScrollFactor(0) for pointer events to work correctly.

  _buildCraftPanel() {
    const W = 528, H = 408;
    const px = (VW - W) / 2, py = VH - H - 8;

    const add = el => { this._panelEls.push(el.setScrollFactor(0).setDepth(60).setVisible(false)); return el; };

    // Background
    add(this.scene.add.rectangle(px + W / 2, py + H / 2, W, H, 0x1E1610).setStrokeStyle(2, 0x5A4030));

    // Tab strip — 7 tabs across W=528
    this._selectedTab = 'towers';
    this._tabBtns = {};
    const TAB_LABELS = { towers: 'TOWERS', walls: 'WALLS', machines: 'MACHS', items: 'ITEMS', gear: 'WEAPONS', armour: 'ARMOUR', cursed: '★CURSED' };
    const TAB_COLORS = { towers: '#C8A96E', walls: '#C8A96E', machines: '#C8A96E', items: '#C8A96E', gear: '#C8A96E', armour: '#88EEBB', cursed: '#CC66FF' };
    const TAB_STEP = 74;
    CRAFT_TABS.forEach((tab, i) => {
      const bx   = px + 6 + i * TAB_STEP;
      const bg   = tab === 'cursed' ? 0x2A0A3A : tab === 'armour' ? 0x0A2A1A : 0x3A2A18;
      const bord = tab === 'cursed' ? 0x882299 : tab === 'armour' ? 0x226644 : 0x7A5A30;
      const btn  = this.scene.add.rectangle(bx + 35, py + 16, 68, 28, bg)
        .setStrokeStyle(1, bord)
        .setInteractive({ useHandCursor: true });
      const lbl  = this.scene.add.text(bx + 35, py + 16, TAB_LABELS[tab], {
        fontSize: '9px', fill: TAB_COLORS[tab], fontFamily: 'monospace',
      }).setOrigin(0.5);

      btn.on('pointerdown',  () => { this._selectedTab = tab; this._refreshSlots(); });
      btn.on('pointerover',  () => btn.setFillColor(tab === 'cursed' ? 0x4A1A5A : tab === 'armour' ? 0x1A4A2A : 0x5A3A28));
      btn.on('pointerout',   () => btn.setFillColor(this._selectedTab === tab ? (tab === 'cursed' ? 0x4A1A5A : tab === 'armour' ? 0x1A4A2A : 0x5A3A28) : bg));

      add(btn); add(lbl);
      this._tabBtns[tab] = { btn, lbl };
    });

    add(this.scene.add.text(px + 12, py + 38, 'Select item to build  (1-7 = tabs  ↑↓←→ = navigate  Enter = select)', {
      fontSize: '9px', fill: '#7A6545', fontFamily: 'monospace',
    }));

    add(this.scene.add.text(px + W - 90, py + 6, '[F] Close', {
      fontSize: '10px', fill: '#7A5A40', fontFamily: 'monospace',
    }));

    // Item slots: 4 cols × 5 rows = 20 slots (supports full armour tab)
    this._slots = [];
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 4; col++) {
        const sx = px + 12 + col * 126;
        const sy = py + 56 + row * 64;

        const slot = this.scene.add.rectangle(sx + 58, sy + 30, 118, 60, 0x2A1E10)
          .setStrokeStyle(1, 0x5A3A20)
          .setInteractive({ useHandCursor: true });
        const img    = this.scene.add.image(sx + 16, sy + 20, 'particle').setDisplaySize(24, 24);
        const name   = this.scene.add.text(sx + 42, sy + 6,  '', { fontSize: '9px',  fill: '#EDE0C4', fontFamily: 'monospace', wordWrap: { width: 74 } });
        const cost   = this.scene.add.text(sx + 42, sy + 26, '', { fontSize: '8px',  fill: '#C8A96E', fontFamily: 'monospace', wordWrap: { width: 74 } });
        const afford = this.scene.add.text(sx + 42, sy + 44, '', { fontSize: '8px',  fill: '#FF5555', fontFamily: 'monospace' });

        const idx = row * 4 + col;
        slot.setData({ idx });
        slot.on('pointerdown',  () => this._onSlotClick(idx));
        slot.on('pointerover',  () => slot.setFillColor(0x3A2A18));
        slot.on('pointerout',   () => slot.setFillColor(0x2A1E10));

        add(slot); add(img); add(name); add(cost); add(afford);
        this._slots.push({ slot, img, name, cost, afford, data: null });
      }
    }
  }

  _refreshSlots() {
    let items = [];
    if      (this._selectedTab === 'towers')   items = Object.entries(TOWER_DEFS).map(([k, v])        => ({ key: k, def: v, cat: 'tower'   }));
    else if (this._selectedTab === 'walls')    items = Object.entries(WALL_DEFS).map(([k, v])          => ({ key: k, def: v, cat: 'wall'    }));
    else if (this._selectedTab === 'machines') items = Object.entries(MACHINE_DEFS).map(([k, v])       => ({ key: k, def: v, cat: 'machine' }));
    else if (this._selectedTab === 'items')    items = Object.entries(ITEMS_DEF).map(([k, v])          => ({ key: k, def: v, cat: v.cat || 'item' }));
    else if (this._selectedTab === 'gear')     items = Object.entries(GEAR_DEF).map(([k, v])           => ({ key: k, def: v, cat: v.cat || 'gear' }));
    else if (this._selectedTab === 'armour')   items = Object.entries(ARMOUR_TAB_DEF).map(([k, v])    => ({ key: k, def: v, cat: v.cat }));
    else if (this._selectedTab === 'cursed') {
      // Bridge first, then all cursed towers
      items = [
        { key: 'bridge', def: BRIDGE_DEF, cat: 'bridge' },
        ...Object.entries(CURSED_TOWER_DEFS).map(([k, v]) => ({ key: k, def: v, cat: 'cursed_tower' })),
      ];
    }

    const inv = this.scene.inventory;
    const sc  = this.scene;
    this._slots.forEach((s, i) => {
      const item = items[i] ?? null;
      s.data = item;
      if (item) {
        // Blueprint check — bridge is per-run (inventory), other blueprints are permanent
        const bpKey = item.def.blueprint;
        const hasBlueprint = !bpKey
          || (item.key === 'bridge' ? (inv.bridge_blueprint ?? 0) > 0 : blueprintSys.has(bpKey));

        s.img.setTexture(item.def.tex || 'particle').setDisplaySize(28, 28);
        s.name.setText(item.def.name);

        if (!hasBlueprint) {
          // Locked — show blueprint requirement
          s.cost.setText('BLUEPRINT\nREQUIRED');
          s.afford.setText('[locked]').setStyle({ fill: '#884488' });
          s.slot.setAlpha(0.45);
          s.img.setAlpha(0.4);
          s.data = null; // prevent clicking
        } else {
          s.img.setAlpha(1);
          s.cost.setText(Object.entries(item.def.cost).map(([r, n]) => `${n} ${r}`).join(', '));
          const ok = Object.entries(item.def.cost).every(([r, n]) => (inv[r] || 0) >= n);
          let equippedNote = '';
          const myTier  = PICKAXE_TIERS[item.key] ?? 0;
          const curTier = PICKAXE_TIERS[sc.pickaxeKey] ?? 0;
          if (myTier > 0 && curTier >= myTier)                    equippedNote = '[have it]';
          else if (item.key === 'revive' && sc.hasRevive)         equippedNote = '[have it]';
          else if (item.key === 'torch'  && sc.hasTorch)          equippedNote = '[have it]';
          else if (item.cat === 'weapon'   && (sc.weapon === item.key || sc.bow === item.key)) equippedNote = '[equipped]';
          else if (item.cat === 'armor'    && sc.armor    === item.key) equippedNote = '[equipped]';
          else if (item.cat === 'boots'    && sc.hasSpeedBoots)         equippedNote = '[equipped]';
          else if (item.cat === 'helmet'   && sc.helmet   === item.key) equippedNote = '[equipped]';
          else if (item.cat === 'pants'    && sc.pants    === item.key) equippedNote = '[equipped]';
          else if (item.cat === 'setBoots' && sc.setBoots === item.key) equippedNote = '[equipped]';
          s.afford.setText(ok ? equippedNote : '[cannot afford]').setStyle({ fill: equippedNote ? '#88FF88' : '#FF5555' });
          s.slot.setAlpha(1);
        }
      } else {
        s.img.setTexture('particle').setDisplaySize(28, 28).setAlpha(1);
        s.name.setText(''); s.cost.setText(''); s.afford.setText('');
        s.slot.setAlpha(0.2);
      }
    });
  }

  // Returns craft cost discount multiplier: crystal_pants = 15%, full crystal set = 20%
  _getCraftDiscount() {
    const s = this.scene;
    const setNow = s._getArmorSet?.();
    if (setNow === 'crystal') return SET_BONUS_DEFS.crystal?.craftDiscount ?? 0.20;
    if (s.pants === 'crystal_pants') return PANTS_DEFS.crystal_pants?.craftDiscount ?? 0.15;
    return 0;
  }

  _onSlotClick(idx) {
    const slot = this._slots[idx];
    if (!slot?.data) return;
    const { key, def, cat } = slot.data;
    const inv = this.scene.inventory;

    // Apply crystal set craft discount — ceil so costs never go below 1
    const discount   = this._getCraftDiscount();
    const scaledCost = Object.fromEntries(
      Object.entries(def.cost).map(([r, n]) => [r, Math.max(1, Math.ceil(n * (1 - discount)))])
    );

    if (!Object.entries(scaledCost).every(([r, n]) => (inv[r] || 0) >= n)) {
      this.showMsg('Not enough resources!', 2000);
      return;
    }

    // Helmet slot
    if (cat === 'helmet') {
      Object.entries(scaledCost).forEach(([r, n]) => { inv[r] -= n; });
      this.scene.helmet = key;
      this._recalcArmor();
      const setNow = this.scene._getArmorSet?.();
      const bonus  = setNow ? SET_BONUS_DEFS[setNow] : null;
      const setMsg = bonus ? `  🎉 ${bonus.name}!` : '';
      this.showMsg(`Equipped: ${def.name}${setMsg}`, 3000);
      this._refreshSlots();
      return;
    }

    // Pants slot
    if (cat === 'pants') {
      Object.entries(scaledCost).forEach(([r, n]) => { inv[r] -= n; });
      this.scene.pants = key;
      this._recalcArmor();
      const setNow = this.scene._getArmorSet?.();
      const bonus  = setNow ? SET_BONUS_DEFS[setNow] : null;
      const setMsg = bonus ? `  🎉 ${bonus.name}!` : '';
      this.showMsg(`Equipped: ${def.name}${setMsg}`, 3000);
      this._refreshSlots();
      return;
    }

    // Set boots slot
    if (cat === 'setBoots') {
      Object.entries(scaledCost).forEach(([r, n]) => { inv[r] -= n; });
      this.scene.setBoots = key;
      this.scene.hasSpeedBoots = false;   // set boots replace standalone speed boots
      this._recalcArmor();
      const setNow = this.scene._getArmorSet?.();
      const bonus  = setNow ? SET_BONUS_DEFS[setNow] : null;
      const setMsg = bonus ? `  🎉 ${bonus.name}!` : '';
      this.showMsg(`Equipped: ${def.name}${setMsg}`, 3000);
      this._refreshSlots();
      return;
    }

    if (cat === 'consumable' || cat === 'tool' || cat === 'weapon' || cat === 'armor' || cat === 'boots') {
      if (key === 'revive' && this.scene.isHardcore) { this.showMsg('No revive tokens in Hardcore mode!', 2000); return; }
      if (key === 'revive' && this.scene.hasRevive) { this.showMsg('Already have a Revive Token!', 2000); return; }
      if (key === 'torch'  && this.scene.hasTorch)  { this.showMsg('Already have a Torch!', 2000); return; }
      // Pickaxe: only craft if this tier is better than current
      if (cat === 'tool') {
        const myTier  = PICKAXE_TIERS[key] ?? 0;
        const curTier = PICKAXE_TIERS[this.scene.pickaxeKey] ?? 0;
        if (myTier > 0 && curTier >= myTier) { this.showMsg('Already have equal or better pickaxe!', 2000); return; }
      }
      // bow_upgraded requires bow already in bow slot
      if (key === 'bow_upgraded' && this.scene.bow !== 'bow') {
        this.showMsg('Requires Bow equipped first!', 2000); return;
      }
      Object.entries(scaledCost).forEach(([r, n]) => { inv[r] -= n; });
      if (key === 'revive') this.scene.hasRevive = true;
      if (key === 'torch')  this.scene.hasTorch  = true;
      if (cat === 'tool' && PICKAXE_TIERS[key]) {
        this.scene.pickaxeKey = key;
        this.scene.hasPickaxe = true;
      }
      if (key === 'regen_token')   { this.scene._repairAllTowers?.(); this._refreshSlots(); return; }
      if (key === 'uncurse_token') { inv.uncurse_token = (inv.uncurse_token || 0) + 1; this.showMsg('Uncurse Token crafted — press E near a corrupted tower to cleanse it!', 4000); this._refreshSlots(); return; }
      if (cat === 'weapon') {
        if (key === 'bow' || key === 'bow_upgraded') {
          // Bow goes in its own slot — sword stays unaffected
          this.scene.bow = key;
        } else {
          // Sword — updates melee stats
          this.scene.weapon = key;
          this.scene.playerAttackDmg = def.dmg;
          this.scene._weaponCooldown = def.attackCooldown ?? 400;
        }
      }
      if (cat === 'armor') {
        this.scene.armor = key;
        this.scene.applyArmorTint?.(key);
        this._recalcArmor();
      }
      if (cat === 'boots') {
        this.scene.hasSpeedBoots = true;
        this.scene.setBoots = null;  // speed boots replace set boots
        this._recalcArmor();
      }
      this.showMsg(`Crafted: ${def.name}`, 2000);
      this._refreshSlots();
      return;
    }
    if (cat === 'build') {
      this.scene.buildMode = { cat: 'machine', key, def };
      this.scene._buildModeTime = this.scene.time.now;
      this.closeCraft();
      this.showMsg(`Placing ${def.name} — left-click to place`, 3500);
      return;
    }

    if (cat === 'trap') {
      this.scene.buildMode = { cat: 'trap', key, def };
      this.scene._buildModeTime = this.scene.time.now;
      this.closeCraft();
      this.showMsg(`Placing ${def.name} — left-click to place (stackable)`, 3500);
      return;
    }

    // Bridge
    if (cat === 'bridge') {
      this.scene.buildMode = { cat: 'bridge', key, def };
      this.scene._buildModeTime = this.scene.time.now;
      this.closeCraft();
      this.showMsg(`Placing Bridge — click on a RIVER tile to build`, 4000);
      return;
    }

    // Cursed towers
    if (cat === 'cursed_tower') {
      this.scene.buildMode = { cat: 'tower', key, def };
      this.scene._buildModeTime = this.scene.time.now;
      this.closeCraft();
      this.showMsg(`Placing ${def.name} — ${def.desc}`, 3500);
      return;
    }

    // Enter build mode — timestamp guard prevents the selection click from also placing
    this.scene.buildMode = { cat, key, def };
    this.scene._buildModeTime = this.scene.time.now;
    this.closeCraft();
    this.showMsg(`Placing ${def.name} — left-click to place, right-click to cancel`, 3500);
  }

  // ── Sell button (top-right, below clock) ─────────────────

  _buildSellButton() {
    // Positioned below the wave clock area
    this._sellBtn = this.scene.add.text(VW - 118, 52, 'SELL [X]', {
      fontSize: '12px', fill: '#EDE0C4', fontFamily: 'monospace',
      backgroundColor: '#3D2B1F', padding: { x: 8, y: 5 },
    }).setScrollFactor(0).setDepth(50).setInteractive({ useHandCursor: true });

    this._sellLabel = this._sellBtn; // alias used by setSellMode

    this._sellBtn.on('pointerover',  () => { if (!this.scene.sellMode) this._sellBtn.setStyle({ backgroundColor: '#5A3020' }); });
    this._sellBtn.on('pointerout',   () => { if (!this.scene.sellMode) this._sellBtn.setStyle({ backgroundColor: '#3D2B1F' }); });
    this._sellBtn.on('pointerdown',  () => this.scene._toggleSellMode());
  }

  // ── Equip display (bottom-left) ──────────────────────────

  _buildEquipDisplay() {
    const y = VH - 128;
    this._equipBg = this.scene.add.rectangle(70, y + 56, 140, 120, 0x000000, 0.50)
      .setScrollFactor(0).setDepth(49);
    this.scene.add.text(4, y, 'EQUIPPED', { fontSize: '9px', fill: '#7A6545', fontFamily: 'monospace' }).setScrollFactor(0).setDepth(50);
    this._weaponTxt  = this._txt('—',  4, y + 12,  '10px', '#EDE0C4');
    this._armorTxt   = this._txt('—',  4, y + 26,  '10px', '#C8D0D8');
    this._helmetTxt  = this._txt('',   4, y + 40,  '10px', '#AACCFF');
    this._pantsTxt   = this._txt('',   4, y + 54,  '10px', '#AAFFCC');
    this._setBootsTxt = this._txt('',  4, y + 68,  '10px', '#FFDDAA');
    this._reviveTxt  = this._txt('',   4, y + 82,  '10px', '#FFD700');
    this._torchTxt   = this._txt('',   4, y + 96,  '10px', '#FF8800');
    this._setBonusTxt = this._txt('',  4, y + 110, '9px',  '#88FF88');
  }

  _updateEquipDisplay() {
    if (!this._weaponTxt) return;
    const s = this.scene;
    // Weapon line
    const swordLabel = s.weapon ? s.weapon.replace('sword_', '').replace('_', ' ') + ' sword' : 'unarmed';
    let bowLabel = '';
    if      (s.bow === 'bow_upgraded') bowLabel = '+ upgd.bow';
    else if (s.bow === 'bow')          bowLabel = '+ bow';
    this._weaponTxt.setText(bowLabel ? `${swordLabel}  ${bowLabel}` : swordLabel);
    // Armor lines
    const armorBase = s.armor ? s.armor.replace('armor_', '') + ' chest' : 'no chest';
    const bootsNote = s.hasSpeedBoots ? ' +spd.boots' : '';
    this._armorTxt.setText(armorBase + bootsNote);
    this._helmetTxt.setText(s.helmet   ? HELMET_DEFS[s.helmet]?.name   ?? s.helmet   : '');
    this._pantsTxt.setText( s.pants    ? PANTS_DEFS[s.pants]?.name     ?? s.pants    : '');
    this._setBootsTxt.setText(s.setBoots ? SET_BOOTS_DEFS[s.setBoots]?.name ?? s.setBoots : '');
    this._reviveTxt.setText(s.hasRevive ? '[REVIVE READY]' : '');
    if (this._torchTxt) this._torchTxt.setText(s.hasTorch ? '[TORCH]' : '');
    // Set bonus indicator
    const activeSet = s._getArmorSet?.();
    const bonus = activeSet ? SET_BONUS_DEFS[activeSet] : null;
    if (this._setBonusTxt) this._setBonusTxt.setText(bonus ? `★ ${bonus.name}` : '');
  }

  // ── Armor total recalculation ────────────────────────────

  _recalcArmor() {
    const s  = this.scene;
    let total = 0;
    if (s.armor)    total += ARMOR_DEFS[s.armor?.replace('armor_', '')]?.armor ?? 0;
    if (s.helmet)   total += HELMET_DEFS[s.helmet]?.armor   ?? 0;
    if (s.pants)    total += PANTS_DEFS[s.pants]?.armor     ?? 0;
    if (s.setBoots) total += SET_BOOTS_DEFS[s.setBoots]?.armor ?? 0;
    s.playerArmor = total;
  }

  // ── Shared text factory ───────────────────────────────────

  _txt(str, x, y, size = '13px', col = '#EDE0C4') {
    return this.scene.add.text(x, y, str, {
      fontSize: size, fill: col, fontFamily: 'monospace',
      stroke: '#000', strokeThickness: 2,
    }).setScrollFactor(0).setDepth(50);
  }
}
