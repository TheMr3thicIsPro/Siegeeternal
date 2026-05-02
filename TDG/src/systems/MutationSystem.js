// ============================================================
// MutationSystem — per-wave random mutations with announcements
// 28% chance each night (wave 2+). One active mutation per wave.
// Mutations apply flags to enemies at spawn time or are checked
// globally during the update / kill loops.
// ============================================================

const MUTATIONS = [
  // ── Shambler mutations ────────────────────────────────────
  {
    id:     'blazing_shamblers',
    name:   '💥 Blazing Shamblers',
    desc:   'Shamblers EXPLODE on death! 50 dmg in 80px to the player.',
    filter: (key) => key === 'shambler',
    onSpawn: (enemy) => { enemy._mutExplode = true; },
  },

  // ── Skitterer mutations ───────────────────────────────────
  {
    id:     'frost_immune_skitterers',
    name:   '❄ Turbo Skitterers',
    desc:   'Skitterers are immune to ALL slowing effects and move 35% faster!',
    filter: (key) => key === 'skitterer',
    onSpawn: (enemy) => {
      enemy._mutFrostImmune = true;
      enemy.def = { ...enemy.def, spd: Math.round(enemy.def.spd * 1.35) };
    },
  },

  // ── Ironback mutations ────────────────────────────────────
  {
    id:     'regen_ironbacks',
    name:   '⚙ Iron Regeneration',
    desc:   'Ironbacks regenerate 5 HP/s rapidly. Burst them down fast!',
    filter: (key) => key === 'ironback',
    onSpawn: (enemy) => { enemy.def = { ...enemy.def, regen: (enemy.def.regen || 0) + 5 }; },
  },

  // ── Shaman mutations ──────────────────────────────────────
  {
    id:     'zealot_shamans',
    name:   '💚 Zealot Shamans',
    desc:   'Shamans heal nearby allies at TWICE the normal rate!',
    filter: (key) => key === 'shamanbeast',
    onSpawn: (enemy) => { enemy._mutDoubleHeal = true; },
  },

  // ── Nightcrawler mutations ────────────────────────────────
  {
    id:     'triple_split_crawlers',
    name:   '🔀 Triple Fission',
    desc:   'Nightcrawlers split into THREE smaller crawlers on death!',
    filter: (key) => key === 'nightcrawler',
    onSpawn: (enemy) => { enemy.def = { ...enemy.def, splitCount: 3 }; },
  },

  // ── Ravager mutations ─────────────────────────────────────
  {
    id:     'berserker_ravagers',
    name:   '😡 Berserker Rage',
    desc:   'Ravagers go BERSERK below 50% HP: 2× speed and 1.5× damage!',
    filter: (key) => key === 'ravager',
    onSpawn: (enemy) => { enemy._mutBerserk = true; enemy._mutBerserkActive = false; },
  },

  // ── Shade mutations ───────────────────────────────────────
  {
    id:     'bonefire_immune_shades',
    name:   '🔥 Shade Fireproof',
    desc:   'Shades are immune to Bonefire towers this wave — only raw steel works!',
    filter: (key) => key === 'shade',
    onSpawn: (enemy) => { enemy._mutBonefireImmune = true; },
  },

  // ── Voidbat mutations ─────────────────────────────────────
  {
    id:     'double_hp_voidbats',
    name:   '🦇 Nightmare Voidbats',
    desc:   'Voidbats have double HP and move 20% faster tonight!',
    filter: (key) => key === 'voidbat',
    onSpawn: (enemy) => {
      enemy.hp    = Math.ceil(enemy.hp * 2);
      enemy.maxHp = enemy.hp;
      enemy.def   = { ...enemy.def, spd: Math.round(enemy.def.spd * 1.2) };
    },
  },

  // ── All-enemy mutations ───────────────────────────────────
  {
    id:     'armored_all',
    name:   '🛡 Iron Horde',
    desc:   'ALL enemies spawn with +10 bonus armor this wave.',
    filter: null,
    onSpawn: (enemy) => {
      if (!enemy.def.boss) enemy.def = { ...enemy.def, armor: (enemy.def.armor || 0) + 10 };
    },
  },
  {
    id:     'venomous_all',
    name:   '☠ Venomous Swarm',
    desc:   'Enemy melee hits inflict a poison DoT on YOU: 3 HP/s for 5s!',
    filter: null,
    onSpawn: (enemy) => { if (!enemy.def.boss) enemy._mutVenomous = true; },
  },
  {
    id:     'shield_carriers',
    name:   '🛡 Shield Bearers',
    desc:   '40% of enemies carry an energy shield — the first hit is completely absorbed!',
    filter: null,
    onSpawn: (enemy) => {
      if (!enemy.def.boss && Math.random() < 0.40) enemy._shield = true;
    },
  },
  {
    id:     'phase_storm',
    name:   '👻 Phase Storm',
    desc:   'ALL enemies can teleport on damage this wave (25% chance per hit)!',
    filter: null,
    onSpawn: (enemy) => {
      if (!enemy.def.boss) {
        enemy.def                = { ...enemy.def, phaseShift: true };
        enemy._lastHp            = null;
        enemy._phaseShiftCooldown = 0;
      }
    },
  },
  {
    id:     'zombie_wave',
    name:   '🧟 Zombie Outbreak',
    desc:   'Killing any enemy spawns a weak Zombie Shambler in its place!',
    filter: null,
    isGlobal: true,   // handled in EnemyManager._killEnemy
    onSpawn:  null,
  },
  {
    id:     'cursed_corruption',
    name:   '👁 Dark Corruption',
    desc:   'Towers corrupt 3× faster this wave — protect your defences!',
    filter: null,
    isGlobal: true,   // checked via corruptionMult()
    onSpawn:  null,
  },
  {
    id:     'bone_storm',
    name:   '💀 Bone Storm',
    desc:   'Enemies drop +3 extra bone on death — but there are more of them!',
    filter: null,
    isGlobal: true,   // checked via isBoneStorm()
    onSpawn:  null,
  },
];

export class MutationSystem {
  constructor(scene) {
    this.scene             = scene;
    this.active            = null;   // current wave's mutation
    this.permanentMutations = [];    // mutations that "stuck" (15% chance each clear)
  }

  /** Called by WaveManager.startNight() — 28% chance to roll a mutation. */
  rollMutation(wave) {
    this.active = null;
    if (wave < 2) return;
    if (Math.random() >= 0.28) return;

    this.active = MUTATIONS[Math.floor(Math.random() * MUTATIONS.length)];
    const m = this.active;

    // Build suffix showing permanent count
    const permCount = this.permanentMutations.length;
    const permNote  = permCount > 0 ? `  [${permCount} permanent active]` : '';

    // Two-stage announcement
    this.scene.time.delayedCall(800, () => {
      if (!this.scene.alive) return;
      this.scene.hud?.showMsg(`⚠ MUTATION: ${m.name} — ${m.desc}${permNote}`, 7000);
      this.scene.cameras?.main?.shake(200, 0.003);
    });
    this.scene.time.delayedCall(30000, () => {
      if (!this.scene.alive || !this.active) return;
      this.scene.hud?.showMsg(`[MUTATION STILL ACTIVE] ${m.name}`, 4000);
    });
  }

  /**
   * Called by EnemyManager.spawnAt() — applies active + all permanent mutations.
   */
  applyToSpawn(enemy) {
    const all = this.active ? [this.active, ...this.permanentMutations] : [...this.permanentMutations];
    for (const m of all) {
      if (!m.onSpawn) continue;
      if (m.filter && !m.filter(enemy.key)) continue;
      m.onSpawn(enemy);
    }
  }

  /** Returns the corruption speed multiplier — stacks if permanent too. */
  corruptionMult() {
    const inActive = this.active?.id === 'cursed_corruption';
    const inPerm   = this.permanentMutations.some(m => m.id === 'cursed_corruption');
    if (inActive && inPerm) return 6;   // double-stacked
    if (inActive || inPerm) return 3;
    return 1;
  }

  /** True if zombie_wave mutation is active or permanent. */
  isZombieWave() {
    return this.active?.id === 'zombie_wave'
        || this.permanentMutations.some(m => m.id === 'zombie_wave');
  }

  /** True if bone_storm mutation is active or permanent. */
  isBoneStorm() {
    return this.active?.id === 'bone_storm'
        || this.permanentMutations.some(m => m.id === 'bone_storm');
  }

  /**
   * Clear mutation at the start of each day.
   * 15% chance for the active mutation to become permanently embedded.
   */
  clear() {
    if (this.active) {
      if (Math.random() < 0.15) {
        // Don't stack duplicates
        if (!this.permanentMutations.some(m => m.id === this.active.id)) {
          this.permanentMutations.push(this.active);
          this.scene.hud?.showMsg(
            `⚠ PERMANENT MUTATION: ${this.active.name} is now a FOREVER curse on this world!`,
            6000,
          );
          this.scene.cameras?.main?.flash(300, 160, 0, 255);
        }
      }
    }
    this.active = null;
  }
}
