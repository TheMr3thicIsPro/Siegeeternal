// ============================================================
// MerchantSystem — 20% chance to spawn a merchant each night
// Merchant NPC: player walks up, presses E to open shop
// ============================================================
export class MerchantSystem {
  constructor(scene) {
    this.scene    = scene;
    this.active   = false;
    this._sprite  = null;
    this._label   = null;
    this._panel   = null;
    this._shopOpen = false;
    this._stock   = [];
  }

  /** Call from WaveManager.startNight() */
  maybeSpawn(wave) {
    if (this.active) return;
    if (Math.random() > 0.20) return;
    this._spawn(wave);
  }

  /** Called from WaveManager on wave clear — despawn merchant */
  onWaveCleared() {
    if (!this.active) return;
    this._closeShop();
    this._despawn();
  }

  _spawn(wave) {
    const s   = this.scene;
    // Spawn near player but offset safely
    const px  = s.player?.x ?? 960;
    const py  = s.player?.y ?? 960;
    const mx  = Phaser.Math.Clamp(px + Phaser.Math.Between(-180, 180), 100, 1860);
    const my  = Phaser.Math.Clamp(py + 120, 100, 1860);

    this._sprite = s.add.rectangle(mx, my, 22, 28, 0xFFCC66)
      .setDepth(10).setStrokeStyle(2, 0xAA8800);
    this._label  = s.add.text(mx, my - 22, 'MERCHANT\n[E] Shop', {
      fontSize: '8px', color: '#FFFF00', fontFamily: 'monospace',
      stroke: '#000000', strokeThickness: 2, align: 'center',
    }).setOrigin(0.5, 1).setDepth(11);

    this._stock = this._buildStock(wave);
    this.active = true;
  }

  _despawn() {
    this._sprite?.destroy(); this._sprite = null;
    this._label?.destroy();  this._label  = null;
    this.active = false;
  }

  /** Call from GameScene E-key handler when player is near merchant */
  tryInteract(px, py) {
    if (!this.active || !this._sprite) return false;
    const d = Math.hypot(px - this._sprite.x, py - this._sprite.y);
    if (d > 60) return false;
    if (this._shopOpen) { this._closeShop(); } else { this._openShop(); }
    return true;
  }

  _openShop() {
    this._shopOpen = true;
    const s  = this.scene;
    const ow = 520, oh = 360;
    const ox = (960 - ow) / 2, oy = (640 - oh) / 2;
    const objs = [];

    const bg = s.add.rectangle(480, 320, ow, oh, 0x110022, 0.95)
      .setScrollFactor(0).setDepth(120).setStrokeStyle(2, 0xFFCC44);
    const title = s.add.text(480, oy + 14, '🛒  WANDERING MERCHANT', {
      fontSize: '14px', color: '#FFD700', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(121);
    objs.push(bg, title);

    this._stock.forEach((item, i) => {
      const col = i < 2 ? 0 : (i < 4 ? 200 : 380);
      const row = i % 2;
      const cx  = ox + 50 + col;
      const cy  = oy + 60 + row * 120;

      const box = s.add.rectangle(cx + 90, cy + 45, 180, 90, 0x221133, 0.9)
        .setScrollFactor(0).setDepth(121).setInteractive()
        .setStrokeStyle(1, 0x8866AA);
      const nm = s.add.text(cx + 90, cy + 18, item.name, {
        fontSize: '10px', color: '#FFFFFF', fontFamily: 'monospace', fontStyle: 'bold',
      }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(122);
      const costStr = Object.entries(item.cost).map(([k, v]) => `${v} ${k}`).join(', ');
      const cost = s.add.text(cx + 90, cy + 38, `Cost: ${costStr}`, {
        fontSize: '9px', color: '#FFCC44', fontFamily: 'monospace',
      }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(122);
      const bought = item.bought
        ? s.add.text(cx + 90, cy + 60, '[SOLD OUT]', { fontSize: '9px', color: '#FF4444', fontFamily: 'monospace' }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(122)
        : null;

      box.on('pointerover', () => !item.bought && box.setFillStyle(0x442255, 0.9));
      box.on('pointerout',  () => box.setFillStyle(0x221133, 0.9));
      box.on('pointerdown', () => {
        if (item.bought) return;
        if (this._canAfford(item.cost)) {
          this._pay(item.cost);
          this._give(item);
          item.bought = true;
          box.setFillStyle(0x111111, 0.5);
          if (bought) { bought.setVisible(true); }
          else {
            s.add.text(cx + 90, cy + 60, '[SOLD OUT]', { fontSize: '9px', color: '#FF4444', fontFamily: 'monospace' })
              .setOrigin(0.5, 0).setScrollFactor(0).setDepth(122);
          }
        }
      });

      objs.push(box, nm, cost);
      if (bought) objs.push(bought);
    });

    const closeBtn = s.add.text(480, oy + oh - 18, '[ CLOSE ]', {
      fontSize: '11px', color: '#AAAAAA', fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(122).setInteractive();
    closeBtn.on('pointerdown', () => this._closeShop());
    objs.push(closeBtn);

    this._panel = objs;
  }

  _closeShop() {
    if (this._panel) { this._panel.forEach(o => o?.destroy()); this._panel = null; }
    this._shopOpen = false;
  }

  _buildStock(wave) {
    const allItems = [
      { name: 'Wood ×40',      cost: { gold: 5  }, give: { wood: 40   } },
      { name: 'Stone ×30',     cost: { gold: 5  }, give: { stone: 30  } },
      { name: 'Iron ×15',      cost: { gold: 8  }, give: { iron: 15   } },
      { name: 'Coal ×20',      cost: { gold: 6  }, give: { coal: 20   } },
      { name: 'Bone ×25',      cost: { gold: 4  }, give: { bone: 25   } },
      { name: 'Crystal ×5',    cost: { gold: 20 }, give: { crystal: 5 } },
      { name: 'Ruby ×2',       cost: { gold: 35 }, give: { ruby: 2    } },
      { name: 'Emerald ×2',    cost: { gold: 35 }, give: { emerald: 2 } },
      { name: 'Souls ×10',     cost: { gold: 25 }, give: { souls: 10  } },
      { name: 'Cooked Meat ×3',cost: { gold: 8  }, give: { cooked_meat: 3 } },
      { name: 'Key (Regular)', cost: { gold: 40 }, give: { key_regular: 1 } },
      { name: 'Soul Bomb',     cost: { gold: 30 }, give: { soul_bomb: 1 } },
      { name: 'Iron Ration',   cost: { gold: 18 }, give: { iron_ration: 1 } },
      { name: 'Temporal Shard',cost: { gold: 45 }, give: { temporal_shard: 1 } },
    ];
    // Higher wave = better chance of rare stock
    const shuffled = allItems.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 6).map(i => ({ ...i, bought: false }));
  }

  _canAfford(cost) {
    const inv = this.scene.inventory ?? {};
    return Object.entries(cost).every(([k, v]) => (inv[k] ?? 0) >= v);
  }

  _pay(cost) {
    const inv = this.scene.inventory ?? {};
    for (const [k, v] of Object.entries(cost)) inv[k] = (inv[k] ?? 0) - v;
    this.scene.inventory = inv;
  }

  _give(item) {
    const inv = this.scene.inventory ?? {};
    for (const [k, v] of Object.entries(item.give)) inv[k] = (inv[k] ?? 0) + v;
    this.scene.inventory = inv;
  }

  get merchantPos() {
    if (!this._sprite) return null;
    return { x: this._sprite.x, y: this._sprite.y };
  }
}
