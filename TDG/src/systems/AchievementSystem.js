// ============================================================
// AchievementSystem — permanent achievements, meta soul rewards
// Stored in localStorage key 'siege_eternal_achievements'
// ============================================================
const STORAGE_KEY = 'siege_eternal_achievements';

const ACHIEVEMENT_DEFS = [
  // Survival milestones
  { id: 'first_blood',      name: 'First Blood',        desc: 'Kill your first enemy',                    reward: 5   },
  { id: 'wave_1',           name: 'Night One',          desc: 'Survive 1 day',                            reward: 5   },
  { id: 'wave_10',          name: 'Survivor',           desc: 'Survive 10 days',                          reward: 10  },
  { id: 'wave_25',          name: 'Veteran',            desc: 'Survive 25 days',                          reward: 25  },
  { id: 'wave_50',          name: 'Legendary',          desc: 'Survive 50 days',                          reward: 50  },
  { id: 'wave_100',         name: 'Eternal',            desc: 'Survive 100 days',                         reward: 100 },
  // Kill milestones
  { id: 'kills_100',        name: 'Slayer',             desc: 'Kill 100 enemies',                         reward: 10  },
  { id: 'kills_1000',       name: 'Massacre',           desc: 'Kill 1,000 enemies',                       reward: 30  },
  // Boss milestones
  { id: 'first_boss',       name: 'Boss Slayer',        desc: 'Kill your first boss',                     reward: 15  },
  { id: 'all_bosses',       name: 'Tyrant Slayer',      desc: 'Kill all 3 boss types in one run',         reward: 30  },
  // Keys & chests
  { id: 'keys_100',         name: 'Master Lockpick',    desc: 'Collect 100 keys in a single run',         reward: 40  },
  // Resources
  { id: 'emerald_100',      name: 'Emerald Hoarder',    desc: 'Hold 100 emerald at once',                 reward: 20  },
  { id: 'crystal_100',      name: 'Crystal Lord',       desc: 'Hold 100 crystal at once',                 reward: 20  },
  { id: 'ruby_100',         name: 'Ruby Baron',         desc: 'Hold 100 ruby at once',                    reward: 20  },
  { id: 'souls_1k',         name: 'Soul Collector',     desc: 'Accumulate 1,000 souls in one run',        reward: 25  },
  { id: 'souls_10k',        name: 'Soul Reaper',        desc: 'Accumulate 10,000 souls in one run',       reward: 75  },
  // Dungeon & caves
  { id: 'cave_master',      name: 'Cave Master',        desc: 'Enter the deep cave',                      reward: 15  },
  { id: 'dungeon_clear',    name: 'Vault Breaker',      desc: 'Clear the dungeon',                        reward: 40  },
  // Gear
  { id: 'full_armor',       name: 'Fully Armoured',     desc: 'Equip a full armor set',                   reward: 20  },
  // Challenges
  { id: 'wave_10_1hp',      name: 'Ironman',            desc: 'Survive 10 days in 1 HP Mode',             reward: 50  },
  { id: 'challenge_1',      name: 'Challenger',         desc: 'Complete a run with any challenge mod',    reward: 30  },
  { id: 'challenge_all',    name: 'Supreme Challenge',  desc: 'Complete a run with all 4 mods active',    reward: 100 },
  // World events
  { id: 'cursed_unlock',    name: 'Into the Dark',      desc: 'Unlock the cursed area',                   reward: 20  },
  { id: 'raid_complete',    name: 'Raid Defender',      desc: 'Complete a raid event',                    reward: 25  },
  { id: 'supply_defended',  name: 'Logistics Expert',   desc: 'Protect a supply crate to completion',     reward: 20  },
  { id: 'weather_all',      name: 'Storm Chaser',       desc: 'Encounter all 10 weather types',           reward: 30  },
  // Misc
  { id: 'revive_used',      name: 'Second Chance',      desc: 'Use a Revive Token',                       reward: 15  },
  { id: 'contract_all',     name: 'Contract Fulfilled', desc: 'Complete all 3 contracts in one run',      reward: 20  },
  { id: 'level_10',         name: 'Seasoned',           desc: 'Reach player level 10',                    reward: 20  },
  { id: 'permadeath_win',   name: 'Immortal',           desc: 'Reach wave 20 without dying',              reward: 30  },
  { id: 'blueprints_all',   name: 'Architect',          desc: 'Unlock all blueprints',                    reward: 50  },
  { id: 'collector',        name: 'Hoarder',            desc: 'Collect 500 of any one resource',          reward: 10  },
];

export class AchievementSystem {
  constructor() {
    this._unlocked = this._load();
    this._listeners = [];
  }

  /** Returns true if the achievement was newly unlocked. */
  unlock(id) {
    if (this._unlocked.has(id)) return false;
    const def = ACHIEVEMENT_DEFS.find(a => a.id === id);
    if (!def) return false;
    this._unlocked.add(id);
    this._save();
    this._awardMetaSouls(def.reward);
    this._notify(def);
    return true;
  }

  has(id)    { return this._unlocked.has(id); }
  getAll()   { return ACHIEVEMENT_DEFS; }
  getDefs()  { return ACHIEVEMENT_DEFS; }

  _awardMetaSouls(amount) {
    const cur = parseInt(localStorage.getItem('siege_eternal_meta_souls') ?? '0', 10);
    localStorage.setItem('siege_eternal_meta_souls', String(cur + amount));
  }

  _notify(def) {
    this._listeners.forEach(fn => fn(def));
  }

  /** scene: Phaser scene — shows toast notification */
  attachScene(scene) {
    this._listeners.push(def => {
      if (!scene?.add) return;
      const t = scene.add.text(480, 80, `ACHIEVEMENT: ${def.name}  +${def.reward} souls`, {
        fontSize: '13px', color: '#FFD700', fontFamily: 'monospace', fontStyle: 'bold',
        stroke: '#000000', strokeThickness: 3, backgroundColor: '#000000AA', padding: { x: 8, y: 4 },
      }).setOrigin(0.5).setScrollFactor(0).setDepth(300);
      scene.time.delayedCall(3000, () => t?.destroy());
    });
  }

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return new Set(raw ? JSON.parse(raw) : []);
    } catch { return new Set(); }
  }

  _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...this._unlocked]));
    } catch {}
  }
}

// Singleton so achievements persist across scenes without re-instantiation
export const achievementSys = new AchievementSystem();
