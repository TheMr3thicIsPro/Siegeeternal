// ============================================================
// SIEGE ETERNAL — Game Constants & Entity Definitions
// ============================================================

// World dimensions
export const TS   = 32;           // tile size in pixels
export const MW   = 60;           // map width  (tiles)
export const MH   = 60;           // map height (tiles)
export const WW   = MW * TS;      // world width  (px)
export const WH   = MH * TS;      // world height (px)

// Viewport
export const VW   = 960;
export const VH   = 640;

// Phase durations (ms)
export const DAY_DUR        = 60_000;    // 1 minute
export const NIGHT_DUR      = 60_000;    // 1 minute

// Player
export const INTERACT_RANGE = 52;
export const PLAYER_SPEED   = 195;

// Waves
export const BASE_WAVE_SIZE = 10;  // enemies on wave 1 (day cap)

// ── Tower definitions ──────────────────────────────────────
export const TOWER_DEFS = {
  arrow:      { name: 'Arrow Tower',     cost: { wood: 5,  stone: 3                }, range: 96,                 rate: 1200, dmg: 15,                        dayOn: true,  nightOn: true,  tex: 'tw_arrow'     },
  ballista:   { name: 'Ballista',        cost: { wood: 8,  iron: 4                 }, range: 144,                rate: 2500, dmg: 45,                        dayOn: true,  nightOn: true,  tex: 'tw_ballista'  },
  longbow:    { name: 'Long Archer',     cost: { wood: 10, bone: 6, iron: 3        }, range: 220, minRange: 80,  rate: 2000, dmg: 35,                        dayOn: true,  nightOn: true,  tex: 'tw_longbow'   },
  flame:      { name: 'Flame Vat',     cost: { stone: 6, coal: 4             }, range: 80,                 rate: 800,  dmg: 20, aoe: 48,               dayOn: true,  nightOn: false, tex: 'tw_flame'     },
  bonefire:   { name: 'Bonefire',      cost: { bone: 8,  coal: 3             }, range: 112,                rate: 1500, dmg: 25, light: true,            dayOn: false, nightOn: true,  tex: 'tw_bonefire'  },
  frost:      { name: 'Frost Spire',   cost: { crystal: 5, stone: 4          }, range: 100,                rate: 1000, dmg: 10, slow: 0.45,             dayOn: true,  nightOn: true,  tex: 'tw_frost'     },
  cannon:     { name: 'Siege Cannon',  cost: { iron: 8, stone: 6, coal: 2    }, range: 128,                rate: 3000, dmg: 80, aoe: 64,                dayOn: true,  nightOn: false, tex: 'tw_cannon'    },
  voltspire:  { name: 'Volt Spire',    cost: { crystal: 6, iron: 4           }, range: 110,                rate: 1800, dmg: 30, chain: 3,               dayOn: true,  nightOn: true,  tex: 'tw_volt'      },
  poison:     { name: 'Poison Vent',   cost: { coal: 5, crystal: 3, stone: 2 }, range: 88,                 rate: 900,  dmg: 8,  dot: 3,                dayOn: true,  nightOn: true,  tex: 'tw_poison'    },
  sunbeamer:  { name: 'Sunbeamer',     cost: { crystal: 6, iron: 5, coal: 3  }, range: 192,                rate: 600,  dmg: 22, beam: true,             dayOn: true,  nightOn: false, tex: 'tw_sunbeamer' },
};

// ── Machine definitions ────────────────────────────────────
export const MACHINE_DEFS = {
  woodcutter:  { name: 'Wood Cutter',  cost: { stone: 4, iron: 2  }, produces: { wood: 1  }, interval: 5000, tex: 'mc_wood'  },
  stonedrill:  { name: 'Stone Drill',  cost: { iron: 5,  coal: 2  }, produces: { stone: 1 }, interval: 6000, tex: 'mc_stone' },
  kiln:        { name: 'Kiln',         cost: { stone: 8, wood: 4  }, produces: { coal: 1  }, interval: 8000, tex: 'mc_kiln'  },
  scrapbench:  { name: 'Scrap Bench',  cost: { iron: 4,  stone: 3 }, produces: { bone: 2  }, interval: 7000, tex: 'mc_scrap' },
  campfire:    { name: 'Campfire',     cost: { coal: 5,  wood: 5, bone: 10 }, produces: {}, interval: 99999, tex: 'campfire' },
  dummy_statue: { name: 'Dummy Statue', cost: { wood: 12, bone: 8 }, produces: {}, interval: 99999, tex: 'dummy_statue', decoy: true, hp: 150, desc: 'Attracts nearby enemies (200px). Enemies attack it instead of you until destroyed.' },
};

// ── Wall definitions (4 tiers) ─────────────────────────────
export const WALL_DEFS = {
  wood:      { name: 'Wood Wall',      hp: 53,   cost: { wood: 5                      }, tex: 'wall_wood'    },
  stone:     { name: 'Stone Wall',     hp: 97,   cost: { stone: 4                     }, tex: 'wall_stone'   },
  iron:      { name: 'Iron Wall',      hp: 210,  cost: { iron: 5,  stone: 2           }, tex: 'wall_iron'    },
  crystal:   { name: 'Crystal Wall',   hp: 399,  cost: { crystal: 4, iron: 3          }, tex: 'wall_crystal' },
  mob_soul:  { name: 'Mob Soul Wall',  hp: 798,  cost: { souls: 10, crystal: 10, bone: 15 }, tex: 'wall_mob_soul' },
  fire_wall: { name: 'Fire Wall',      hp: 5000, cost: { coal: 20, bone: 15, souls: 1 }, tex: 'wall_fire', fire: true, passthrough: true },
};

// ── Enemy definitions ──────────────────────────────────────
export const ENEMY_DEFS = {
  shambler:    { name: 'Shambler',    hp: 60,   spd: 45,  dmg: 10, sz: 14, drop: { bone: 1                } },
  skitterer:   { name: 'Skitterer',   hp: 25,   spd: 90,  dmg: 5,  sz: 9,  drop: { bone: 1                } },
  ironback:    { name: 'Ironback',    hp: 120,  spd: 30,  dmg: 20, sz: 16, drop: { iron: 1, bone: 1 }, armor: 5 },
  burrower:    { name: 'Burrower',    hp: 50,   spd: 60,  dmg: 15, sz: 12, drop: { bone: 2 },          burrow: true   },
  looter:      { name: 'Looter',      hp: 40,   spd: 85,  dmg: 8,  sz: 11, drop: { gold: 3 },          machines: true },
  shamanbeast: { name: 'Shaman',      hp: 80,   spd: 40,  dmg: 15, sz: 13, drop: { bone: 3, crystal: 1 }, heals: true },
  shade:       { name: 'Shade',       hp: 35,   spd: 75,  dmg: 12, sz: 10, drop: { crystal: 1 },       invis: true, night: true },
  nightcrawler:{ name: 'Crawler',     hp: 70,   spd: 55,  dmg: 18, sz: 13, drop: { bone: 2 },           splits: true, night: true },
  voidbat:     { name: 'Voidbat',     hp: 45,   spd: 80,  dmg: 10, sz: 11, drop: { crystal: 1, bone: 1 }, arc: true, night: true },
  siege_hulk:  { name: 'Siege Hulk',  hp: 5800,  spd: 35,  dmg: 45, sz: 40, drop: { gold: 20, iron: 5 },  boss: true, spawns: 'shambler'  },
  pale_mother: { name: 'Pale Mother', hp: 2500,  spd: 55,  dmg: 34, sz: 40, drop: { gold: 20, crystal: 5 },boss: true, spawns: 'shade'     },
  ironclad:    { name: 'Ironclad',    hp: 10000,  spd: 30,  dmg: 60, sz: 50, drop: { gold: 25, iron: 8, crystal: 3 }, boss: true },
  towertacker: { name: 'TowerTacker', hp: 40,   spd: 55,  dmg: 5,  sz: 11, drop: { bone: 1 }, targetsStructures: true },
  // Deep-cave exclusive — teleports when damaged, slowly regenerates HP, drops gems on death
  cave_wraith: { name: 'Crystal Wraith', hp: 140, spd: 35, dmg: 22, sz: 18, drop: {}, phaseShift: true, regen: 0.8, gemDrop: true, cave: true },
  // Raid boss — spawned by RaiderSystem during a raid event (10% chance each night ≥ wave 3)
  raid_chief:  { name: 'Raid Chief', hp: 320, spd: 40, dmg: 28, sz: 20, drop: { gold: 8, iron: 4, bone: 6 }, boss: false, isRaidBoss: true },
};

// Surface resource nodes — iron/coal/crystal are cave-only
export const RESOURCE_NODES = [
  { key: 'tree',      res: 'wood',  w: 0.60, amt: [3, 8]  },
  { key: 'stonenode', res: 'stone', w: 0.20, amt: [4, 10] },
];

// Cave-only resources (most → least common)
export const CAVE_RESOURCE_NODES = [
  { key: 'stonenode',   res: 'stone',   w: 0.34, amt: [4, 8] },
  { key: 'coalnode',    res: 'coal',    w: 0.27, amt: [3, 9] },
  { key: 'ironnode',    res: 'iron',    w: 0.18, amt: [2, 5] },
  { key: 'goldnode',    res: 'gold',    w: 0.11, amt: [1, 3] },
  { key: 'crystalnode', res: 'crystal', w: 0.05, amt: [1, 3] },
  { key: 'rubynode',    res: 'ruby',    w: 0.03, amt: [1, 2] },
  { key: 'emeraldnode', res: 'emerald', w: 0.02, amt: [1, 2] },
];

// Projectile texture by tower key
export const PROJ_TEX = {
  arrow: 'proj_arrow', ballista: 'proj_arrow',
  flame: 'proj_flame', cannon:   'proj_flame',
  frost: 'proj_ice',   voltspire:'proj_volt',
  poison:'proj_poison',bonefire: 'proj_flame',
  sunbeamer: 'proj_sunbeam',
  longbow:   'proj_arrow',
};

// Day enemy pool / night enemy pool
export const DAY_ENEMIES   = ['shambler','skitterer','ironback','burrower','looter','shamanbeast'];
export const NIGHT_ENEMIES = ['shade','nightcrawler','voidbat'];

// Deep cave enemy spawn pool — cave_wraith appears twice for higher weight
export const DEEP_CAVE_ENEMIES = ['cave_wraith','cave_wraith','shade','nightcrawler','voidbat','ironback','shambler'];
// Boss cycle — pale_mother unlocks first (day 10), then siege_hulk (day 25), then ironclad (day 50)
export const BOSS_CYCLE    = ['pale_mother','siege_hulk','ironclad'];
export const BOSS_MIN_WAVE = { pale_mother: 10, siege_hulk: 25, ironclad: 50 };

// ── Cursed enemies (spawned in Cursed Zone) ───────────────
Object.assign(ENEMY_DEFS, {
  soul_eater:    { name: 'Soul Eater',   hp: 90,   spd: 50,  dmg: 18, sz: 14, drop: { souls: 3, bone: 1 },           targetsStructures: true, drainsTower: true  },
  ravager:       { name: 'Ravager',      hp: 55,   spd: 105, dmg: 28, sz: 12, drop: { bone: 2, cursed_essence: 1 },  targetsStructures: true                    },
  hex_shaman:    { name: 'Hex Shaman',   hp: 70,   spd: 38,  dmg: 12, sz: 13, drop: { cursed_essence: 2 },           targetsStructures: true, hexes: true        },
  splitter_beast:{ name: 'Splitter',     hp: 100,  spd: 42,  dmg: 20, sz: 16, drop: { bone: 3, cursed_essence: 1 },  targetsStructures: true, splits: true, splitKey: 'ravager', splitCount: 2 },
  siege_leech:   { name: 'Siege Leech',  hp: 80,   spd: 30,  dmg: 0,  sz: 13, drop: { cursed_essence: 2, souls: 2 }, targetsStructures: true, leechTower: true   },
  void_brute:    { name: 'Void Brute',   hp: 380,  spd: 20,  dmg: 40, sz: 20, drop: { void_shards: 1, cursed_essence: 3, souls: 5 }, targetsStructures: true     },
});

// ── Cursed enemy types — only spawn/live in the cursed zone, always purple tint ──
export const CURSED_ENEMY_KEYS = new Set([
  'soul_eater','ravager','hex_shaman','splitter_beast','siege_leech','void_brute',
]);

// ── Cursed Zone ────────────────────────────────────────
export const CURSED_ZONE_MULT = { hp: 2.0, dmg: 2.0, spd: 1.5 };

// ── River / Bridge ─────────────────────────────────────
export const BRIDGE_DEF = {
  name: 'Bridge', cost: { wood: 200, stone: 100 },
  blueprint: 'bridge', tex: 'bridge',
  desc: 'Cross the river. Blueprint required.', cat: 'build',
};

// ── Cursed Resources ───────────────────────────────────
// Inventory keys: cursed_essence, void_shards, corrupted_wood, corrupted_stone
export const CURSED_RESOURCE_NODES = [
  { key: 'cursed_node',  res: 'cursed_essence', w: 0.45, amt: [1, 3] },
  { key: 'void_node',    res: 'void_shards',    w: 0.30, amt: [1, 2] },
  { key: 'corrupt_wood', res: 'corrupted_wood', w: 0.25, amt: [2, 5] },
];

// ── Relics (found, not chosen — run-changing passives) ─
export const RELIC_DEFS = {
  blood_core:   { name: 'Blood Core',   desc: '+50% damage, -1 HP per kill',    color: 0xFF2244, tex: 'relic_blood' },
  time_breaker: { name: 'Time Breaker', desc: 'Random area slow bursts',         color: 0x44FFAA, tex: 'relic_time'  },
  greed_idol:   { name: 'Greed Idol',   desc: '2× loot drops, -20 max HP',       color: 0xFFCC00, tex: 'relic_greed' },
  soul_engine:  { name: 'Soul Engine',  desc: 'Each kill restores 1 MP',          color: 0xAA44FF, tex: 'relic_soul'  },
};

// ── Blueprints (permanent unlocks across all worlds) ───
export const BLUEPRINT_DEFS = {
  // Tower / structure blueprints — bridge is per-run only (found in supply crates)
  bridge:       { name: 'Bridge',       desc: 'Build bridges over rivers',      type: 'tower', perRun: true },
  soul_turret:  { name: 'Soul Turret',  desc: 'Unlocks Soul Turret tower',      type: 'tower' },
  curse_totem:  { name: 'Curse Totem',  desc: 'Unlocks Curse Totem tower',      type: 'tower' },
  void_cannon:  { name: 'Void Cannon',  desc: 'Unlocks Void Cannon tower',      type: 'tower' },
  blood_tower:  { name: 'Blood Tower',  desc: 'Unlocks Blood Tower',            type: 'tower' },
  chain_spire:  { name: 'Chain Spire',  desc: 'Unlocks Chain Spire tower',      type: 'tower' },
  grave_tower:  { name: 'Grave Tower',  desc: 'Unlocks Grave Tower',            type: 'tower' },
  // Perk blueprints — non-free perks, found in chests
  perk_lucky_crit:     { name: 'Lucky Crit',      desc: '15% chance to deal triple damage',          type: 'perk', perkId: 'lucky_crit'     },
  perk_headhunter:     { name: 'Headhunter',      desc: '10% chance to instantly kill non-bosses',   type: 'perk', perkId: 'headhunter'     },
  perk_burning_aura:   { name: 'Burning Aura',    desc: '40px fire aura, 3 dmg/s to nearby enemies', type: 'perk', perkId: 'burning_aura'   },
  perk_overclock:      { name: 'Overclock',        desc: 'Towers fire 35% faster (lose 1 HP / 5 shots)', type: 'perk', perkId: 'overclock'  },
  perk_double_shot:    { name: 'Double Shot',      desc: '25% chance for towers to fire twice',       type: 'perk', perkId: 'double_shot'    },
  perk_chain_lightning:{ name: 'Chain Lightning',  desc: 'Volt Spire chains to 8 targets',            type: 'perk', perkId: 'chain_lightning'},
  perk_freeze_mastery: { name: 'Freeze Mastery',   desc: 'Frost Spire slow drops to 0.2',             type: 'perk', perkId: 'freeze_mastery' },
  perk_explosive_shots:{ name: 'Explosive Shots',  desc: 'Tower hits create 40px AoE splash',         type: 'perk', perkId: 'explosive_shots'},
  perk_auto_repair:    { name: 'Auto Repair',       desc: 'Towers regen 0.2 HP/s',                    type: 'perk', perkId: 'auto_repair'    },
  perk_berserk:        { name: 'Berserk',           desc: 'Q: 5s double dmg + 1.5x speed (60s cd)',   type: 'perk', perkId: 'berserk'        },
  perk_time_slow:      { name: 'Time Slow',         desc: 'Q: Slow all enemies for 4s (90s cd)',       type: 'perk', perkId: 'time_slow'      },
  perk_glass_cannon:   { name: 'Glass Cannon',      desc: 'Half HP, double attack damage',             type: 'perk', perkId: 'glass_cannon'   },
  perk_giant_mode:     { name: 'Giant Mode',        desc: '1.5x size, 50% more damage',                type: 'perk', perkId: 'giant_mode'     },
  perk_unstable_power: { name: 'Unstable Power',    desc: 'Random burst every 8s',                     type: 'perk', perkId: 'unstable_power' },
  perk_trap_master:    { name: 'Trap Master',       desc: 'Traps deal 3x damage',                      type: 'perk', perkId: 'trap_master'    },
  perk_commander:      { name: 'Commander',          desc: 'Towers within 96px of you get a boost',    type: 'perk', perkId: 'commander'      },
};

// ── Cursed Towers (blueprint required, use cursed resources) ─
export const CURSED_TOWER_DEFS = {
  soul_turret: { name: 'Soul Turret',  blueprint: 'soul_turret', cost: { souls: 15, bone: 20, crystal: 5 },         range: 110, rate: 1000, dmg: 25, dayOn: true, nightOn: true, tex: 'tw_soul_turret', desc: 'Gets +2 dmg per kill'        },
  curse_totem: { name: 'Curse Totem', blueprint: 'curse_totem', cost: { cursed_essence: 5, bone: 15 },              range: 88,  rate: 2500, dmg: 8,  dayOn: true, nightOn: true, tex: 'tw_curse_totem', desc: 'Debuffs enemies in range'    },
  void_cannon: { name: 'Void Cannon', blueprint: 'void_cannon', cost: { void_shards: 3, iron: 8, crystal: 4 },      range: 150, rate: 4000, dmg: 120,dayOn: true, nightOn: true, tex: 'tw_void_cannon', desc: 'Pierce shot, massive damage', pierce: true },
  blood_tower: { name: 'Blood Tower', blueprint: 'blood_tower', cost: { cursed_essence: 8, bone: 25 },              range: 96,  rate: 800,  dmg: 40, dayOn: true, nightOn: true, tex: 'tw_blood_tower', desc: 'Uses 1 player HP per shot',  hpCost: 1    },
  chain_spire: { name: 'Chain Spire', blueprint: 'chain_spire', cost: { crystal: 6, iron: 5, void_shards: 2 },      range: 120, rate: 1500, dmg: 35, dayOn: true, nightOn: true, tex: 'tw_chain_spire', desc: '8-chain lightning bounce',   chain: 8     },
  grave_tower: { name: 'Grave Tower', blueprint: 'grave_tower', cost: { souls: 20, bone: 30, corrupted_wood: 5 },   range: 96,  rate: 5000, dmg: 15, dayOn: false,nightOn: true, tex: 'tw_grave_tower', desc: 'Spawns skeleton minions',    spawnsMinion: true },
};

// Projectile textures for cursed towers
export const CURSED_PROJ_TEX = {
  soul_turret: 'proj_soul', curse_totem: 'proj_curse',
  void_cannon: 'proj_void', blood_tower: 'proj_blood',
  chain_spire: 'proj_volt', grave_tower: 'proj_grave',
};

// ── Meta Perk unlock costs (meta souls) ────────────────
export const META_PERK_COSTS = {
  lifesteal: 20, lucky_crit: 25, headhunter: 40, burning_aura: 30,
  sniper: 20, overclock: 25, double_shot: 30, chain_lightning: 45, freeze_mastery: 25, explosive_shots: 35,
  greed: 15, scavenger: 20, auto_repair: 30,
  dash: 25, berserk: 35, time_slow: 40,
  glass_cannon: 50, giant_mode: 45, unstable_power: 55,
  wall_fortifier: 20, trap_master: 25, commander: 35,
};
// Perks available without unlocking (free starter set)
export const FREE_PERKS = new Set(['lifesteal','sniper','greed','dash','wall_fortifier','scavenger']);

// ── Weather ────────────────────────────────────────────────
// 35% chance each night; one of 10 types
export const WEATHER_CHANCE = 0.35;
export const WEATHER_TYPES  = [
  'thunderstorm','rain','blood_moon','foggy','blizzard','snowy',
  'full_moon','mega_storm','solar_eclipse','earthquake',
];

// ── Cave ──────────────────────────────────────────────────
export const CAVE_W = 30;   // cave width  (tiles)
export const CAVE_H = 30;   // cave height (tiles)

// ── Deep Cave ─────────────────────────────────────────────
export const DEEP_CAVE_W = 25;
export const DEEP_CAVE_H = 25;

// Deep cave resource nodes — precious ores only
export const DEEP_CAVE_RESOURCE_NODES = [
  { key: 'crystalnode', res: 'crystal', w: 0.55, amt: [1, 3] },
  { key: 'rubynode',    res: 'ruby',    w: 0.28, amt: [1, 2] },
  { key: 'emeraldnode', res: 'emerald', w: 0.17, amt: [1, 2] },
];

// Torch — required to see in the deep cave
export const TORCH_DEF = { name: 'Torch', cost: { wood: 2, coal: 1 }, tex: 'torch', desc: 'Lights the deep cave (pitch black without it)' };

// Enemy unlock wave thresholds (no bosses — handled separately)
export const ENEMY_UNLOCK_WAVE = {
  shambler: 1, skitterer: 2, ironback: 3, voidbat: 4,
  burrower: 5, looter: 6, shade: 7, nightcrawler: 8, shamanbeast: 9,
  towertacker: 11,
};

// Enemy types that are night-only (burn/despawn at dawn)
export const NIGHT_ENEMY_KEYS = ['voidbat', 'shade', 'nightcrawler'];

// Pickaxe tier system: higher tier = can mine better ores
// tier 0 = none, 1 = stone, 2 = iron, 3 = crystal/ruby/emerald
// ruby/emerald are tier 4 so crystal_pick (3) doesn't block crafting them
export const PICKAXE_TIERS    = { stone_pick: 1, iron_pick: 2, crystal_pick: 3, emerald_pick: 4, ruby_pick: 4 };
export const ORE_TIER_REQ     = { coal: 1, iron: 1, gold: 2, crystal: 2, ruby: 3, emerald: 3 };
// Legacy sets (kept for backward compat)
export const HARD_RESOURCES        = new Set(['coal', 'iron', 'crystal', 'gold']);
export const CRYSTAL_PICK_RESOURCES = new Set(['ruby', 'emerald']);

// Craftable pickaxes (tiered)
export const STONE_PICKAXE_DEF   = { name: 'Stone Pickaxe',   cost: { wood: 2, stone: 1              }, tex: 'pickaxe',         desc: 'Mine Stone, Coal & Iron (tier 1)' };
export const IRON_PICKAXE_DEF    = { name: 'Iron Pickaxe',    cost: { wood: 2, iron: 3               }, tex: 'iron_pickaxe',    desc: 'Mine Gold & tier 2 ores' };
export const CRYSTAL_PICKAXE_DEF = { name: 'Crystal Pickaxe', cost: { wood: 2, crystal: 3, souls: 1  }, tex: 'crystal_pickaxe', desc: 'Mine Crystal, Ruby & Emerald' };
export const EMERALD_PICKAXE_DEF = { name: 'Emerald Pickaxe', cost: { emerald: 3, crystal: 2, souls: 2 }, tex: 'emerald_pickaxe', desc: 'All ores + 1.5× drop rate' };
export const RUBY_PICKAXE_DEF    = { name: 'Ruby Pickaxe',    cost: { ruby: 3, crystal: 2, souls: 1  }, tex: 'ruby_pickaxe',    desc: 'All ores + 100ms mine speed' };
// Backward-compat alias
export const PICKAXE_DEF = STONE_PICKAXE_DEF;

// Bed — placeable structure that speeds up night by 1.25× (player frozen while sleeping)
export const BED_DEF = { name: 'Bed', cost: { wood: 8, stone: 4 }, tex: 'bed', desc: 'Sleep to fast-forward night (still vulnerable)' };

// Swords — crafted weapons, grant attack damage
export const SWORD_DEFS = {
  wood:        { name: 'Wood Sword',    cost: { wood: 8                              }, dmg: 17,  tex: 'sword_wood'    },
  stone:       { name: 'Stone Sword',   cost: { stone: 6                             }, dmg: 29,  tex: 'sword_stone'   },
  iron:        { name: 'Iron Sword',    cost: { iron: 5                              }, dmg: 46,  tex: 'sword_iron'    },
  crystal:     { name: 'Crystal Sword', cost: { crystal: 4, iron: 2                  }, dmg: 81,  tex: 'sword_crystal' },
  ruby:        { name: 'Ruby Sword',    cost: { ruby: 2, wood: 1                     }, dmg: 95,  tex: 'sword_ruby',   attackCooldown: 250 },
  emerald:     { name: 'Emerald Sword', cost: { emerald: 2, wood: 1                  }, dmg: 140, tex: 'sword_emerald' },
  phase_blade: { name: 'Phase Blade',   cost: { void_shards: 5, crystal: 5, souls: 10 }, dmg: 180, tex: 'sword_phase', attackCooldown: 400, phaseHit: true, desc: 'Phases through armor. Dungeon-forged.' },
};

export const BOW_DEF          = { name: 'Bow',          cost: { wood: 10, bone: 5                           }, dmg: 20, tex: 'bow',         autoFire: 2000 };
export const BOW_UPGRADED_DEF = { name: 'Upgraded Bow', cost: { souls: 5, emerald: 1, crystal: 1            }, dmg: 30, tex: 'bow_upgraded', autoFire: 1200, requiresWeapon: 'bow' };

export const UPGRADE_TOKEN_DEF = { name: 'Upgrade Token', cost: { souls: 25, bone: 25, crystal: 25 }, desc: 'Upgrade a tower (max lvl 10)', tex: 'upgrade_token', cat: 'consumable' };
export const REGEN_TOKEN_DEF   = { name: 'Regen Token',   cost: { crystal: 5, souls: 5, bone: 10  }, desc: 'Repair all towers to full HP',  tex: 'regen_token',   cat: 'consumable' };
export const UNCURSE_TOKEN_DEF = { name: 'Uncurse Token', cost: { crystal: 8, souls: 15, bone: 12 }, desc: 'Press E near corrupted tower to cleanse it', tex: 'uncurse_token', cat: 'consumable' };

// Armor — crafted chestplates, reduce incoming damage
export const ARMOR_DEFS = {
  bone:    { name: 'Bone Chestplate',    cost: { bone: 15, souls: 5                    }, armor: 5,  tex: 'armor_bone',    stealth: 200                 },
  iron:    { name: 'Iron Chestplate',    cost: { iron: 9                               }, armor: 5,  tex: 'armor_iron'                                   },
  crystal: { name: 'Crystal Chestplate', cost: { crystal: 9                            }, armor: 12, tex: 'armor_crystal'                                },
  ruby:    { name: 'Ruby Chestplate',    cost: { ruby: 15, crystal: 5, souls: 1        }, armor: 15, tex: 'armor_ruby',    nightBonus: 0.15               },
  emerald: { name: 'Emerald Chestplate', cost: { emerald: 15, crystal: 5, souls: 1     }, armor: 15, tex: 'armor_emerald', caveBonus: 0.15                },
};

// Speed Boots — movement speed passive (standalone, no set)
export const SPEED_BOOTS_DEF = { name: 'Speed Boots', cost: { crystal: 8, emerald: 2, souls: 10 }, tex: 'boots_speed', spdMult: 1.30, slot: 'boots', set: null, armor: 0, desc: '1.3× movement speed' };

// ── Helmets ───────────────────────────────────────────────
export const HELMET_DEFS = {
  emerald_helmet: { name: 'Emerald Helm',   set: 'emerald', slot: 'helmet', cost: { emerald: 2, crystal: 1, souls: 1 }, armor: 4,  tex: 'helmet_emerald', desc: '+4 armor · spot enemies in cave dark' },
  ruby_helmet:    { name: 'Ruby Helm',      set: 'ruby',    slot: 'helmet', cost: { ruby: 2, iron: 3, souls: 1      }, armor: 4,  tex: 'helmet_ruby',    desc: '+4 armor · wider night vision' },
  bone_helmet:    { name: 'Bone Helm',      set: 'bone',    slot: 'helmet', cost: { bone: 20, souls: 3              }, armor: 2,  tex: 'helmet_bone',    desc: '+2 armor · enemies detect you 30% slower' },
  iron_helmet:    { name: 'Iron Helm',      set: 'iron',    slot: 'helmet', cost: { iron: 7, stone: 3               }, armor: 8,  tex: 'helmet_iron',    desc: '+8 armor · heavy head protection' },
  crystal_helmet: { name: 'Crystal Helm',   set: 'crystal', slot: 'helmet', cost: { crystal: 6, iron: 2             }, armor: 5,  tex: 'helmet_crystal', desc: '+5 armor · highlight nearby resources' },
};

// ── Pants ─────────────────────────────────────────────────
export const PANTS_DEFS = {
  emerald_pants: { name: 'Emerald Greaves', set: 'emerald', slot: 'pants', cost: { emerald: 2, crystal: 1          }, armor: 3, mineFast: true,      tex: 'pants_emerald', desc: '+3 armor · mine 100ms faster in caves' },
  ruby_pants:    { name: 'Ruby Greaves',    set: 'ruby',    slot: 'pants', cost: { ruby: 2, bone: 8, souls: 1      }, armor: 3, dodge: 0.15,         tex: 'pants_ruby',    desc: '+3 armor · 15% dodge chance vs enemies' },
  bone_pants:    { name: 'Bone Greaves',    set: 'bone',    slot: 'pants', cost: { bone: 18, souls: 2              }, armor: 1, aggroReduce: 0.30,   tex: 'pants_bone',    desc: '+1 armor · 30% smaller enemy aggro range' },
  iron_pants:    { name: 'Iron Greaves',    set: 'iron',    slot: 'pants', cost: { iron: 6, stone: 2               }, armor: 5, slowImmune: true,    tex: 'pants_iron',    desc: '+5 armor · immune to slow on hit' },
  crystal_pants: { name: 'Crystal Greaves', set: 'crystal', slot: 'pants', cost: { crystal: 5, iron: 2             }, armor: 3, craftDiscount: 0.15, tex: 'pants_crystal', desc: '+3 armor · -15% crafting costs' },
};

// ── Set Boots ─────────────────────────────────────────────
export const SET_BOOTS_DEFS = {
  emerald_boots: { name: 'Emerald Boots',  set: 'emerald', slot: 'boots', cost: { emerald: 2, crystal: 1          }, armor: 2, caveSpdMult: 1.12,                      tex: 'boots_emerald', desc: '+2 armor · +12% speed in caves' },
  ruby_boots:    { name: 'Ruby Boots',     set: 'ruby',    slot: 'boots', cost: { ruby: 2, iron: 2                }, armor: 2, nightSpdMult: 1.15,                     tex: 'boots_ruby',    desc: '+2 armor · +15% speed at night' },
  bone_boots:    { name: 'Bone Boots',     set: 'bone',    slot: 'boots', cost: { bone: 15, souls: 1              }, armor: 1, spdMult: 1.10,                          tex: 'boots_bone',    desc: '+1 armor · +10% movement speed' },
  iron_boots:    { name: 'Iron Boots',     set: 'iron',    slot: 'boots', cost: { iron: 6, coal: 2                }, armor: 4, slowImmune: true,                       tex: 'boots_iron',    desc: '+4 armor · immune to all slow effects' },
  crystal_boots: { name: 'Crystal Boots',  set: 'crystal', slot: 'boots', cost: { crystal: 5, gold: 2             }, armor: 3, spdMult: 1.08, cdReduction: 0.15,      tex: 'boots_crystal', desc: '+3 armor · +8% speed, -15% cooldowns' },
};

// ── Full set bonuses (helmet + chest + pants + boots same set) ─
export const SET_BONUS_DEFS = {
  emerald: { name: '🌿 Cave Predator', desc: '+25% dmg in caves · 0.5 HP lifesteal per cave kill',   caveDmgMult: 1.25, caveLifesteal: 0.5 },
  ruby:    { name: '🩸 Night Hunter',  desc: '+20% dmg at night · enemies 15% slower near you',       nightDmgMult: 1.20, slowAura: 0.85    },
  bone:    { name: '👻 Ghost Dancer',  desc: '20% chance enemies completely ignore you',               ghostChance: 0.20                     },
  iron:    { name: '⚙ Iron Fortress', desc: 'Flat 8 damage reduction (applied after armor)',           flatReduce: 8                          },
  crystal: { name: '❄ Arcane Flow',   desc: '-20% all cooldowns · -20% crafting costs',               cdReduction: 0.20, craftDiscount: 0.20 },
};

// ── Dungeon ───────────────────────────────────────────────
export const DUNGEON_W = 30;
export const DUNGEON_H = 30;
export const DUNGEON_KEY_DROP_CHANCE = 0.02; // 2% from any surface/night enemy

Object.assign(ENEMY_DEFS, {
  dungeon_sentinel: { name: 'Sentinel',        hp: 220,  spd: 25,  dmg: 30, sz: 18, drop: { iron: 2, bone: 3               }, armor: 12, dungeon: true },
  dungeon_shade:    { name: 'Dungeon Shade',   hp: 80,   spd: 110, dmg: 28, sz: 11, drop: { crystal: 1, bone: 2            }, invis: true, dungeon: true },
  dungeon_golem:    { name: 'Stone Golem',     hp: 500,  spd: 18,  dmg: 45, sz: 22, drop: { iron: 5, stone: 10, gold: 3   }, armor: 20, dungeon: true },
  dungeon_phantom:  { name: 'Dungeon Phantom', hp: 160,  spd: 65,  dmg: 35, sz: 14, drop: { crystal: 2, souls: 2          }, phaseShift: true, regen: 1.5, dungeon: true },
  vault_keeper:     { name: 'Vault Keeper',    hp: 8000, spd: 40,  dmg: 55, sz: 45, drop: { crystal: 15, ruby: 5, emerald: 5, gold: 30, souls: 20 }, boss: true, dungeon: true, spawns: 'dungeon_sentinel' },
});

export const DUNGEON_ENEMY_POOL = ['dungeon_sentinel', 'dungeon_shade', 'dungeon_golem', 'dungeon_phantom'];

// ── Dungeon-exclusive blueprints (found inside Dungeon only) ─
Object.assign(BLUEPRINT_DEFS, {
  shadow_cannon: { name: 'Shadow Cannon', desc: 'Unlocks Shadow Cannon tower',  type: 'tower', dungeonOnly: true },
  spirit_totem:  { name: 'Spirit Totem',  desc: 'Unlocks Spirit Totem tower',   type: 'tower', dungeonOnly: true },
  oracle_beacon: { name: 'Oracle Beacon', desc: 'Unlocks Oracle Beacon tower',  type: 'tower', dungeonOnly: true },
  thorn_cage:    { name: 'Thorn Cage',    desc: 'Unlocks Thorn Cage tower',     type: 'tower', dungeonOnly: true },
});

// ── Dungeon-exclusive towers (blueprint required) ─────────
export const DUNGEON_TOWER_DEFS = {
  shadow_cannon: { name: 'Shadow Cannon', blueprint: 'shadow_cannon', cost: { void_shards: 4, crystal: 6, souls: 10      }, range: 160, rate: 2000, dmg: 90, dayOn: true, nightOn: true, tex: 'tw_shadow_cannon', desc: 'Pierce + ignores armor',       pierce: true, armorIgnore: true },
  spirit_totem:  { name: 'Spirit Totem',  blueprint: 'spirit_totem',  cost: { crystal: 8, souls: 12, bone: 20            }, range: 96,  rate: 0,    dmg: 0,  dayOn: true, nightOn: true, tex: 'tw_spirit_totem',  desc: 'Heals nearby towers 1 HP/s',  healNearby: 1, healRadius: 96 },
  oracle_beacon: { name: 'Oracle Beacon', blueprint: 'oracle_beacon', cost: { crystal: 10, gold: 8, iron: 6              }, range: 160, rate: 0,    dmg: 0,  dayOn: true, nightOn: true, tex: 'tw_oracle_beacon', desc: 'Reveals invis + buffs +15% dmg nearby', revealRadius: 160, buffNearby: 0.15 },
  thorn_cage:    { name: 'Thorn Cage',    blueprint: 'thorn_cage',    cost: { iron: 8, crystal: 4, cursed_essence: 3     }, range: 48,  rate: 500,  dmg: 15, dayOn: true, nightOn: true, tex: 'tw_thorn_cage',    desc: 'Short-range AoE field, hits all nearby', aoe: 48 },
};

// Dungeon chest — big loot, only one per dungeon run
Object.assign(CHEST_DEFS, {
  dungeon: {
    keyItem: null, label: 'Dungeon Chest',
    rewards: { crystal: 20, ruby: 8, emerald: 8, gold: 40, souls: 25, void_shards: 3 },
    dungeonOnly: true,
  },
});

// ── Consumable items (gameplay-changing, not basic resources) ─
export const CONSUMABLE_DEFS = {
  soul_bomb:       { name: 'Soul Bomb',       cost: { souls: 20, crystal: 5                    }, tex: 'soul_bomb',       desc: 'Explode — kills all enemies within 120px',    radius: 120,  cat: 'consumable' },
  iron_ration:     { name: 'Iron Ration',     cost: { iron: 5, cooked_meat: 2                  }, tex: 'iron_ration',     desc: '+15 flat armor for 30s',                       armorBoost: 15, duration: 30000, cat: 'consumable' },
  blood_pact:      { name: 'Blood Pact',      cost: { souls: 15, ruby: 2                       }, tex: 'blood_pact',      desc: 'Spend 30 HP — triple damage for 10s',          hpCost: 30, dmgMult: 3, duration: 10000, cat: 'consumable' },
  temporal_shard:  { name: 'Temporal Shard',  cost: { crystal: 6, void_shards: 2               }, tex: 'temporal_shard',  desc: 'Freeze all enemies for 5s',                    duration: 5000, cat: 'consumable' },
  dungeon_compass: { name: 'Dungeon Compass', cost: {},                                          tex: 'dungeon_compass',  desc: 'Points toward the Dungeon entrance (found)',   found: true,  cat: 'consumable' },
};

// ── Challenge modifiers (selected at new game — multiplicative soul bonuses) ─
export const CHALLENGE_MODS = {
  hp1:        { name: '1 HP',       desc: 'Start with 1 max HP',              soulMult: 5.0 },
  no_towers:  { name: 'No Towers',  desc: 'Cannot place towers or walls',     soulMult: 3.0 },
  relentless: { name: 'Relentless', desc: 'Enemies spawn continuously',       soulMult: 2.0 },
  scarce:     { name: 'Scarce',     desc: '0.5× all resource drops',          soulMult: 2.0 },
};

// Map themes — chosen randomly on new game (stored in save)
export const MAP_THEMES = ['grass', 'desert', 'snow'];

// Chest definitions — opened with matching key (or no key for special types)
export const CHEST_DEFS = {
  regular: {
    keyItem:  'key_regular',
    label:    'Regular Chest',
    rewards:  { wood: 20, stone: 15, iron: 10, coal: 8, bone: 15, gold: 5 },
  },
  boss: {
    keyItem:  'key_boss',
    label:    'Boss Chest',
    rewards:  { crystal: 10, ruby: 3, emerald: 3, iron: 15, gold: 20, souls: 10 },
  },
  cursed: {
    keyItem:  null,
    label:    'Cursed Chest',
    // random good or bad — resolved at open time in GameScene
    cursed: true,
    goodRewards: { crystal: 8, ruby: 2, emerald: 2, gold: 15, souls: 8 },
    badEffects:  'dmg', // deal 30 dmg to player
  },
  trap: {
    keyItem:  null,
    label:    'Trap Chest',
    trap: true,
    spawnCount: 4,  // spawn N enemies on open
    rewards:  { bone: 5, gold: 3 },
  },
  legendary: {
    keyItem:  null,
    label:    'Legendary Chest',
    legendary: true,
    rewards:  { crystal: 20, ruby: 8, emerald: 8, gold: 30, souls: 20, void_shards: 2, cursed_essence: 3 },
  },
  blueprint: {
    keyItem:  null,
    label:    'Blueprint Chest',
    blueprint: true,  // resolved at open time — gives a random locked blueprint
    rewards:  { cursed_essence: 2, void_shards: 1 },
  },
  starter: {
    keyItem:  null,
    label:    'Starter Chest',
    rewards:  { wood: 60, stone: 40, bone: 15, coal: 8, iron: 5, cooked_meat: 2 },
  },
};
