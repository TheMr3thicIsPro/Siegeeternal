// ============================================================
// ContractSystem — 3 per-run contracts with progress + reward
// ============================================================
export class ContractSystem {
  constructor(scene) {
    this.scene     = scene;
    this.contracts = [];
    this._panel    = null;
  }

  /** Call at start of each run to generate 3 contracts. */
  generateContracts(wave) {
    const pool = this._buildPool();
    const shuffled = pool.sort(() => Math.random() - 0.5);
    this.contracts = shuffled.slice(0, 3).map(c => ({ ...c, progress: 0, done: false, rewarded: false }));
    this._buildPanel();
  }

  /** Increment a counter type. Call from EnemyManager, GameScene, etc. */
  progress(type, amount = 1) {
    let changed = false;
    for (const c of this.contracts) {
      if (c.done || c.type !== type) continue;
      c.progress = Math.min(c.progress + amount, c.goal);
      if (c.progress >= c.goal) {
        c.done = true;
        this._giveReward(c);
        this.scene.events.emit('contract_complete', c);
      }
      changed = true;
    }
    if (changed) this._buildPanel();
  }

  _giveReward(c) {
    if (c.rewarded) return;
    c.rewarded = true;
    const s = this.scene;
    const inv = s.inventory ?? {};
    for (const [k, v] of Object.entries(c.reward)) {
      inv[k] = (inv[k] ?? 0) + v;
    }
    s.inventory = inv;
    const text = s.add.text(480, 300, `CONTRACT: ${c.name} DONE!`, {
      fontSize: '15px', color: '#FFD700', fontFamily: 'monospace', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200);
    s.time.delayedCall(2500, () => text?.destroy());
  }

  _buildPool() {
    return [
      { type: 'kills',          name: 'Slayer',        goal: 100,  reward: { gold: 20, souls: 10   }, desc: 'Kill 100 enemies' },
      { type: 'kills',          name: 'Veteran',       goal: 250,  reward: { gold: 40, crystal: 5  }, desc: 'Kill 250 enemies' },
      { type: 'kills',          name: 'Reaper',        goal: 500,  reward: { gold: 80, ruby: 3      }, desc: 'Kill 500 enemies' },
      { type: 'boss_kills',     name: 'Boss Bane',     goal: 1,    reward: { gold: 30, souls: 20   }, desc: 'Kill 1 boss' },
      { type: 'boss_kills',     name: 'Boss Hunter',   goal: 3,    reward: { gold: 60, emerald: 3  }, desc: 'Kill 3 bosses' },
      { type: 'waves',          name: 'Survivor',      goal: 5,    reward: { iron: 15, bone: 20    }, desc: 'Survive 5 nights' },
      { type: 'waves',          name: 'Night Owl',     goal: 10,   reward: { iron: 30, crystal: 3  }, desc: 'Survive 10 nights' },
      { type: 'harvest',        name: 'Gatherer',      goal: 100,  reward: { gold: 12, souls: 5    }, desc: 'Harvest 100 resources' },
      { type: 'harvest',        name: 'Forager',       goal: 300,  reward: { gold: 25, coal: 20    }, desc: 'Harvest 300 resources' },
      { type: 'crafts',         name: 'Crafter',       goal: 10,   reward: { crystal: 5, gold: 10  }, desc: 'Craft 10 items' },
      { type: 'crafts',         name: 'Artisan',       goal: 25,   reward: { crystal: 12, ruby: 2  }, desc: 'Craft 25 items' },
      { type: 'towers_built',   name: 'Builder',       goal: 5,    reward: { iron: 10, stone: 20   }, desc: 'Build 5 towers' },
      { type: 'towers_built',   name: 'Architect',     goal: 15,   reward: { iron: 25, gold: 15    }, desc: 'Build 15 towers' },
      { type: 'caves_entered',  name: 'Explorer',      goal: 1,    reward: { ruby: 1, emerald: 1   }, desc: 'Enter a cave' },
      { type: 'dungeon_cleared',name: 'Dungeon Run',   goal: 1,    reward: { void_shards: 3, souls: 25, gold: 60 }, desc: 'Clear the Dungeon' },
    ];
  }

  // ── HUD panel — bottom-left above mini-objective panel ─────
  _buildPanel() {
    this._destroyPanel();
    const s   = this.scene;
    const bx  = 10, by = 420;
    const objs = [];
    const hdr = s.add.text(bx, by, 'CONTRACTS', {
      fontSize: '9px', color: '#FFD700', fontFamily: 'monospace', fontStyle: 'bold',
    }).setScrollFactor(0).setDepth(50);
    objs.push(hdr);

    this.contracts.forEach((c, i) => {
      const y = by + 14 + i * 30;
      const col = c.done ? '#44FF44' : '#AAAAAA';
      const pct = c.goal > 0 ? Math.floor((c.progress / c.goal) * 100) : 100;
      const label = s.add.text(bx, y, `${c.done ? '✓' : '○'} ${c.name}`, {
        fontSize: '9px', color: col, fontFamily: 'monospace',
      }).setScrollFactor(0).setDepth(50);
      const bar = s.add.rectangle(bx + 110, y + 4, 60, 6, 0x333333)
        .setOrigin(0, 0.5).setScrollFactor(0).setDepth(50);
      const fill = s.add.rectangle(bx + 110, y + 4, Math.max(1, pct * 0.6), 6, c.done ? 0x44FF44 : 0x4488FF)
        .setOrigin(0, 0.5).setScrollFactor(0).setDepth(51);
      objs.push(label, bar, fill);
    });

    this._panel = objs;
  }

  _destroyPanel() {
    if (this._panel) { this._panel.forEach(o => o?.destroy()); this._panel = null; }
  }

  serialize() {
    return { contracts: this.contracts.map(c => ({ ...c })) };
  }

  restore(data) {
    if (!data?.contracts?.length) return;
    this.contracts = data.contracts;
    this._buildPanel();
  }
}
