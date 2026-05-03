// ============================================================
// PlayerLevelSystem — XP from kills, level-up card overlay
// ============================================================
export class PlayerLevelSystem {
  constructor(scene) {
    this.scene   = scene;
    this.level   = 1;
    this.xp      = 0;
    this.xpToNext = 100;
    this._overlay = null;
    this._pending = false; // level-up waiting for card pick
  }

  /** Call after every enemy kill. enemy.def needed for xp value. */
  addXP(enemy) {
    if (this._pending) return;
    const base = enemy?.def?.boss ? 50 : (enemy?.def?.dungeon ? 15 : 8);
    this.xp += base;
    this.scene.events.emit('xp_gained', this.xp, this.xpToNext);
    if (this.xp >= this.xpToNext) this._levelUp();
  }

  _levelUp() {
    this.xp -= this.xpToNext;
    this.level++;
    this.xpToNext = Math.floor(this.xpToNext * 1.4);
    this._pending = true;
    this.scene.events.emit('player_level_up', this.level);
    this._showOverlay();
  }

  _showOverlay() {
    const s    = this.scene;
    const cards = this._pickCards(3);
    const ow   = 700, oh = 340;
    const ox   = (960 - ow) / 2, oy = (640 - oh) / 2;

    const bg = s.add.rectangle(480, 320, ow, oh, 0x000000, 0.88)
      .setScrollFactor(0).setDepth(120);
    const title = s.add.text(480, oy + 22, `LEVEL ${this.level} — CHOOSE A BONUS`, {
      fontSize: '16px', color: '#FFD700', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(121);

    const cardObjs = [];
    cards.forEach((card, i) => {
      const cx  = ox + 40 + i * 210;
      const cy  = oy + 80;
      const cw  = 190, ch = 200;
      const box = s.add.rectangle(cx + cw / 2, cy + ch / 2, cw, ch, 0x111133, 0.95)
        .setScrollFactor(0).setDepth(121).setInteractive()
        .setStrokeStyle(2, 0x4488FF);
      const cname = s.add.text(cx + cw / 2, cy + 20, card.name, {
        fontSize: '13px', color: '#FFFFFF', fontFamily: 'monospace', fontStyle: 'bold',
        wordWrap: { width: cw - 16 }, align: 'center',
      }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(122);
      const cdesc = s.add.text(cx + cw / 2, cy + 60, card.desc, {
        fontSize: '10px', color: '#AACCFF', fontFamily: 'monospace',
        wordWrap: { width: cw - 16 }, align: 'center',
      }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(122);

      box.on('pointerover', () => box.setFillStyle(0x223366, 0.95));
      box.on('pointerout',  () => box.setFillStyle(0x111133, 0.95));
      box.on('pointerdown', () => { this._pick(card); this._closeOverlay(objs); });

      cardObjs.push(box, cname, cdesc);
    });

    const objs = [bg, title, ...cardObjs];
    this._overlay = objs;
    this._paused = true;
    s.physics.pause();
  }

  _closeOverlay(objs) {
    objs.forEach(o => o?.destroy());
    this._overlay  = null;
    this._pending  = false;
    this.scene.physics.resume();
  }

  _pick(card) {
    const s = this.scene;
    switch (card.id) {
      case 'hp_up':       s.playerMaxHP = (s.playerMaxHP ?? 100) + 25; s.playerHP = Math.min(s.playerHP + 25, s.playerMaxHP); break;
      case 'mp_up':       s.playerMaxMP = (s.playerMaxMP ?? 100) + 20; break;
      case 'dmg_up':      s.playerAttackDmg = (s.playerAttackDmg ?? 10) + 15; break;
      case 'spd_up':      s._levelSpdMult = ((s._levelSpdMult ?? 1) * 1.08); break;
      case 'armor_up':    s._levelArmor   = ((s._levelArmor   ?? 0) + 4); break;
      case 'harvest_up':  s._levelHarvestMult = ((s._levelHarvestMult ?? 1) * 1.3); break;
      case 'xp_up':       this.xpToNext = Math.floor(this.xpToNext * 0.85); break;
      case 'heal':        s.playerHP = Math.min((s.playerHP ?? 100) + 40, s.playerMaxHP ?? 100); break;
    }
    s.events.emit('level_bonus_applied', card.id);
  }

  _pickCards(n) {
    const pool = [
      { id: 'hp_up',      name: 'Vitality',       desc: '+25 Max HP, heal 25' },
      { id: 'mp_up',      name: 'Arcane Surge',   desc: '+20 Max MP' },
      { id: 'dmg_up',     name: 'Sharpened Edge', desc: '+15 attack damage' },
      { id: 'spd_up',     name: 'Fleet Foot',     desc: '+8% movement speed' },
      { id: 'armor_up',   name: 'Hardened',       desc: '+4 flat armor' },
      { id: 'harvest_up', name: 'Skilled Hands',  desc: '+30% harvest yield' },
      { id: 'xp_up',      name: 'Fast Learner',   desc: '-15% XP needed per level' },
      { id: 'heal',       name: 'Second Wind',    desc: 'Restore 40 HP now' },
    ];
    const shuffled = pool.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n);
  }

  serialize() {
    return { level: this.level, xp: this.xp, xpToNext: this.xpToNext };
  }

  restore(data) {
    if (!data) return;
    this.level    = data.level    ?? 1;
    this.xp       = data.xp       ?? 0;
    this.xpToNext = data.xpToNext ?? 100;
  }
}
