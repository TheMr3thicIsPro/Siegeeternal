// ============================================================
// BlueprintsScene — view all tower + perk blueprints
// Sections: Tower Blueprints | Free Perks | Perk Blueprints
// ============================================================
import { VW, VH, BLUEPRINT_DEFS, FREE_PERKS } from '../constants.js';
import { PERK_DEFS } from '../systems/PerkSystem.js';
import { blueprintSys } from '../systems/BlueprintSystem.js';
import { metaProgression } from '../systems/MetaProgression.js';
// per-run blueprints (bridge) are stored in inventory, not blueprintSys
const PER_RUN_BLUEPRINT_KEYS = Object.keys(BLUEPRINT_DEFS).filter(k => BLUEPRINT_DEFS[k].perRun);

const CAT_COLOR = {
  COMBAT:   '#FF6666',
  TOWER:    '#44BBFF',
  ECONOMY:  '#FFDD44',
  ACTIVE:   '#00FFDD',
  CHAOS:    '#FF44FF',
  STRATEGY: '#88AAFF',
};

const PERK_CAT = {};
PERK_DEFS.forEach(p => { PERK_CAT[p.id] = p.cat; });

const CARD_H    = 56;
const CARD_GAP  = 4;
const CARD_STEP = CARD_H + CARD_GAP;
const COLS      = 4;
const CARD_W    = Math.floor((VW - 60) / COLS);

export class BlueprintsScene extends Phaser.Scene {
  constructor() { super('Blueprints'); }

  create() {
    const cx = VW / 2;

    // Background
    this.add.rectangle(cx, VH / 2, VW, VH, 0x060810);
    const gfx = this.add.graphics();
    gfx.fillGradientStyle(0x0A0520, 0x0A0520, 0x05101A, 0x05101A, 1);
    gfx.fillRect(0, 0, VW, VH);

    // Title
    this.add.text(cx, 20, 'BLUEPRINTS', {
      fontSize: '22px', color: '#44FFAA', fontFamily: 'monospace', fontStyle: 'bold',
      stroke: '#002210', strokeThickness: 4,
    }).setOrigin(0.5);

    // Meta souls
    const souls = metaProgression.balance;
    this.add.text(cx, 44, `✦ Meta Souls: ${souls}`, {
      fontSize: '11px', color: souls > 0 ? '#AA44FF' : '#554466',
      fontFamily: 'monospace', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5);

    let curY = 62;

    // ── Section 1: Tower Blueprints ───────────────────────
    curY = this._section(cx, curY, 'TOWER & STRUCTURE BLUEPRINTS');
    const towerKeys = Object.keys(BLUEPRINT_DEFS).filter(k => BLUEPRINT_DEFS[k].type === 'tower');
    towerKeys.forEach((key, i) => {
      const { x, y } = this._cellPos(i, curY);
      this._towerCard(key, x, y);
    });
    curY += Math.ceil(towerKeys.length / COLS) * CARD_STEP + 8;

    // ── Section 2: Free Perks ─────────────────────────────
    curY = this._section(cx, curY, 'FREE PERKS  —  always available in wave offers');
    const freePerks = PERK_DEFS.filter(p => FREE_PERKS.has(p.id));
    freePerks.forEach((p, i) => {
      const { x, y } = this._cellPos(i, curY);
      this._freeCard(p, x, y);
    });
    curY += Math.ceil(freePerks.length / COLS) * CARD_STEP + 8;

    // ── Section 3: Perk Blueprints ────────────────────────
    curY = this._section(cx, curY, 'PERK BLUEPRINTS  —  find in regular or boss chests to unlock in wave offers');
    const perkKeys = Object.keys(BLUEPRINT_DEFS).filter(k => BLUEPRINT_DEFS[k].type === 'perk');
    perkKeys.forEach((key, i) => {
      const { x, y } = this._cellPos(i, curY);
      this._perkCard(key, x, y);
    });

    // ── Back button ───────────────────────────────────────
    const back = this.add.text(cx, VH - 16, '← BACK  (ESC)', {
      fontSize: '13px', color: '#888888', fontFamily: 'monospace',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    back.on('pointerover', () => back.setColor('#CCCCCC'));
    back.on('pointerout',  () => back.setColor('#888888'));
    back.on('pointerdown', () => this._back());

    this.input.keyboard.once('keydown-ESC', () => this._back());
    this.cameras.main.fadeIn(350, 0, 0, 0);
  }

  _back() {
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.time.delayedCall(250, () => this.scene.start('Menu'));
  }

  _section(cx, y, label) {
    this.add.text(cx, y, label, {
      fontSize: '10px', color: '#445544', fontFamily: 'monospace',
    }).setOrigin(0.5);
    const g = this.add.graphics();
    g.lineStyle(1, 0x1A3322, 0.7);
    g.lineBetween(30, y + 10, VW - 30, y + 10);
    return y + 16;
  }

  _cellPos(idx, startY) {
    return {
      x: 30 + (idx % COLS) * CARD_W,
      y: startY + Math.floor(idx / COLS) * CARD_STEP,
    };
  }

  // ── Tower blueprint card ──────────────────────────────────
  _towerCard(key, x, y) {
    const def     = BLUEPRINT_DEFS[key];
    const isPerRun = !!def.perRun;
    const owned   = isPerRun ? false : blueprintSys.has(key);
    const bgCol   = owned ? 0x0A2018 : 0x0D0D0D;
    const bordCol = owned ? 0x2A7744 : (isPerRun ? 0x2A4A3A : 0x2A2A2A);
    const nameCol = owned ? '#AAFFCC' : (isPerRun ? '#66AACC' : '#444444');
    const descCol = owned ? '#668866' : (isPerRun ? '#3A5A6A' : '#2A2A2A');

    this.add.rectangle(x + CARD_W / 2, y + CARD_H / 2, CARD_W - 4, CARD_H - 2, bgCol)
      .setStrokeStyle(1, bordCol);
    this.add.text(x + 8, y + 7, owned ? '✔' : (isPerRun ? '↺' : '?'), {
      fontSize: '13px', color: owned ? '#44FF88' : (isPerRun ? '#44AACC' : '#333333'), fontFamily: 'monospace',
    });
    this.add.text(x + 24, y + 7, def.name, {
      fontSize: '11px', color: nameCol, fontFamily: 'monospace', fontStyle: owned ? 'bold' : 'normal',
    });
    this.add.text(x + 24, y + 22, def.desc, {
      fontSize: '9px', color: descCol, fontFamily: 'monospace', wordWrap: { width: CARD_W - 32 },
    });
    if (owned) {
      this.add.text(x + CARD_W - 6, y + 7, 'OWNED', {
        fontSize: '8px', color: '#2A8844', fontFamily: 'monospace',
      }).setOrigin(1, 0);
    } else if (isPerRun) {
      this.add.text(x + CARD_W - 6, y + 7, 'PER-RUN', {
        fontSize: '8px', color: '#3A6A88', fontFamily: 'monospace',
      }).setOrigin(1, 0);
      this.add.text(x + CARD_W / 2, y + CARD_H - 11, 'defend supply crates (25% drop)', {
        fontSize: '8px', color: '#2A4A5A', fontFamily: 'monospace',
      }).setOrigin(0.5);
    } else {
      this.add.text(x + CARD_W / 2, y + CARD_H - 11, 'find in chests', {
        fontSize: '8px', color: '#3A2A2A', fontFamily: 'monospace',
      }).setOrigin(0.5);
    }
  }

  // ── Free perk card (always unlocked) ─────────────────────
  _freeCard(perk, x, y) {
    const cat     = perk.cat;
    const catCol  = CAT_COLOR[cat] ?? '#AAAAAA';
    const bordNum = parseInt(catCol.replace('#', ''), 16);

    this.add.rectangle(x + CARD_W / 2, y + CARD_H / 2, CARD_W - 4, CARD_H - 2, 0x0F1508)
      .setStrokeStyle(1, bordNum);
    // FREE badge
    this.add.text(x + 8, y + 7, '★', {
      fontSize: '12px', color: '#FFD700', fontFamily: 'monospace',
    });
    this.add.text(x + 24, y + 7, perk.name, {
      fontSize: '11px', color: catCol, fontFamily: 'monospace', fontStyle: 'bold',
    });
    this.add.text(x + CARD_W - 6, y + 7, cat, {
      fontSize: '8px', color: catCol, fontFamily: 'monospace',
    }).setOrigin(1, 0);
    this.add.text(x + 24, y + 22, perk.desc, {
      fontSize: '9px', color: '#556644', fontFamily: 'monospace', wordWrap: { width: CARD_W - 32 },
    });
    this.add.text(x + CARD_W / 2, y + CARD_H - 11, 'FREE — always available', {
      fontSize: '8px', color: '#4A6A20', fontFamily: 'monospace',
    }).setOrigin(0.5);
  }

  // ── Perk blueprint card ───────────────────────────────────
  _perkCard(key, x, y) {
    const def     = BLUEPRINT_DEFS[key];
    const perkId  = def.perkId;
    const owned   = blueprintSys.hasPerkBlueprint(perkId);
    const cat     = PERK_CAT[perkId] ?? 'COMBAT';
    const catCol  = CAT_COLOR[cat] ?? '#AAAAAA';
    const bordNum = owned ? parseInt(catCol.replace('#', ''), 16) : 0x2A2A2A;
    const bgCol   = owned ? 0x120F1A : 0x0D0D0D;
    const nameCol = owned ? catCol : '#444444';
    const descCol = owned ? '#5A4A66' : '#2A2A2A';

    this.add.rectangle(x + CARD_W / 2, y + CARD_H / 2, CARD_W - 4, CARD_H - 2, bgCol)
      .setStrokeStyle(1, bordNum);
    this.add.text(x + 8, y + 7, owned ? '✔' : '?', {
      fontSize: '13px', color: owned ? catCol : '#333333', fontFamily: 'monospace',
    });
    this.add.text(x + 24, y + 7, def.name, {
      fontSize: '11px', color: nameCol, fontFamily: 'monospace', fontStyle: owned ? 'bold' : 'normal',
    });
    this.add.text(x + CARD_W - 6, y + 7, cat, {
      fontSize: '8px', color: owned ? catCol : '#333333', fontFamily: 'monospace',
    }).setOrigin(1, 0);
    this.add.text(x + 24, y + 22, def.desc, {
      fontSize: '9px', color: descCol, fontFamily: 'monospace', wordWrap: { width: CARD_W - 32 },
    });
    if (owned) {
      this.add.text(x + CARD_W / 2, y + CARD_H - 11, 'UNLOCKED', {
        fontSize: '8px', color: catCol, fontFamily: 'monospace',
      }).setOrigin(0.5);
    } else {
      this.add.text(x + CARD_W / 2, y + CARD_H - 11, 'find blueprint in chests', {
        fontSize: '8px', color: '#3A2A3A', fontFamily: 'monospace',
      }).setOrigin(0.5);
    }
  }
}
