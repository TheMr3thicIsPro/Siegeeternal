// ============================================================
// HelpScene — Codex: towers, enemies and how to play
// ============================================================
import { VW, VH } from '../constants.js';

const CARD_W    = 420;
const CARD_H    = 114;   // taller cards to prevent text overflow/overlap
const CARD_GAP  = 6;
const COL_L     = 40;
const COL_R     = VW / 2 + 20;
const CONTENT_Y = 118;

// ── Tower reference data ──────────────────────────────────
const TOWERS = [
  { tex: 'tw_arrow',     name: 'Arrow Tower',   cost: 'Wood×5  Stone×3',
    abilities: ['Active day & night', 'Reliable ranged damage'],           downside: 'Low damage per shot' },
  { tex: 'tw_ballista',  name: 'Ballista',       cost: 'Wood×8  Iron×4',
    abilities: ['Long range (144 px)', 'High single-target damage'],       downside: 'Very slow fire rate' },
  { tex: 'tw_longbow',   name: 'Long Archer',    cost: 'Wood×10  Bone×6  Iron×3',
    abilities: ['Extreme range (220 px)', 'Active day & night'],           downside: 'Blind spot — misses targets within 80 px' },
  { tex: 'tw_flame',     name: 'Flame Vat',      cost: 'Stone×6  Coal×4',
    abilities: ['Area splash 48 px radius', 'Shreds clustered groups'],    downside: 'Day only — off at night; disabled by rain/thunder' },
  { tex: 'tw_bonefire',  name: 'Bonefire',       cost: 'Bone×8  Coal×3',
    abilities: ['Lights surrounding area', 'Steady night fire rate'],      downside: 'Night only — off at day; disabled by rain/thunder' },
  { tex: 'tw_frost',     name: 'Frost Spire',    cost: 'Crystal×5  Stone×4',
    abilities: ['Slows enemies by 45%', 'Active day & night'],             downside: 'Low direct damage alone' },
  { tex: 'tw_cannon',    name: 'Siege Cannon',   cost: 'Iron×8  Stone×6  Coal×2',
    abilities: ['Massive AoE blast 64 px', 'Annihilates dense packs'],    downside: 'Day only — disabled by rain' },
  { tex: 'tw_volt',      name: 'Volt Spire',     cost: 'Crystal×6  Iron×4',
    abilities: ['Chains to 3 nearby enemies', 'Punishes tight groups'],   downside: 'Moderate base damage' },
  { tex: 'tw_poison',    name: 'Poison Vent',    cost: 'Coal×5  Crystal×3  Stone×2',
    abilities: ['Applies poison DoT', 'Stacks with other towers'],         downside: 'Very low direct damage' },
  { tex: 'tw_sunbeamer', name: 'Sunbeamer',      cost: 'Crystal×6  Iron×5  Coal×3',
    abilities: ['Beam pierces through all enemies in line', 'Fast rate — highest sustained DPS'], downside: 'Day only, clear weather only — blocked by rain/fog/blizzard' },
  // ── Blueprint / Cursed towers ─────────────────────────
  { tex: 'tw_soul_turret', name: 'Soul Turret',  cost: 'Souls×15  Bone×20  Crystal×5',
    abilities: ['+2 dmg per kill permanently (snowballs)', 'Active day & night'],
    downside: 'Weak before kills stack; soul cost is rare', blueprint: true },
  { tex: 'tw_curse_totem', name: 'Curse Totem',  cost: 'C.Essence×5  Bone×15',
    abilities: ['Slows & debuffs all enemies in AoE range', 'Active day & night'],
    downside: 'Zero direct damage — support tower only', blueprint: true },
  { tex: 'tw_void_cannon', name: 'Void Cannon',  cost: 'VoidShard×3  Iron×8  Crystal×4',
    abilities: ['Pierces all enemies in a straight line', 'Massive 120 dmg · day & night'],
    downside: '4s reload · Void Shards are very rare', blueprint: true },
  { tex: 'tw_blood_tower', name: 'Blood Tower',  cost: 'C.Essence×8  Bone×25',
    abilities: ['Fastest fire rate — highest raw DPS', 'Active day & night'],
    downside: 'Costs 1 HP per shot — unchecked = death', blueprint: true },
  { tex: 'tw_chain_spire', name: 'Chain Spire',  cost: 'Crystal×6  Iron×5  VoidShard×2',
    abilities: ['Lightning chains to 8 enemies per shot', 'Active day & night'],
    downside: 'Weak vs singles; poor in sparse waves', blueprint: true },
  { tex: 'tw_grave_tower', name: 'Grave Tower',  cost: 'Souls×20  Bone×30  Corr.Wood×5',
    abilities: ['Spawns skeleton minions to fight enemies', 'Minions persist until wave clears'],
    downside: 'Night only — inactive during the day', blueprint: true },
  // ── Dungeon-exclusive towers ──────────────────────────
  { tex: 'tw_shadow_cannon', name: 'Shadow Cannon', cost: 'VoidShard×4  Crystal×6  Souls×10',
    abilities: ['Pierce shot — IGNORES ALL ARMOR', '90 dmg / 2s · 160 range · day & night'],
    downside: 'Dungeon Blueprint required', blueprint: true },
  { tex: 'tw_spirit_totem', name: 'Spirit Totem', cost: 'Crystal×8  Souls×12  Bone×20',
    abilities: ['Passive: heals nearby towers 1 HP/s (96px)', 'Keeps tower cluster alive indefinitely'],
    downside: 'No offensive output — support only. Dungeon Blueprint required', blueprint: true },
  { tex: 'tw_oracle_beacon', name: 'Oracle Beacon', cost: 'Crystal×10  Gold×8  Iron×6',
    abilities: ['Reveals invisible enemies in 160px', 'Nearby towers (160px) deal +15% damage'],
    downside: 'Passive only. Dungeon Blueprint required', blueprint: true },
  { tex: 'tw_thorn_cage', name: 'Thorn Cage', cost: 'Iron×8  Crystal×4  C.Essence×3',
    abilities: ['AoE field — hits ALL nearby enemies every 500ms', '15 dmg · 48px radius · chokepoint king'],
    downside: 'Very short range. Dungeon Blueprint required', blueprint: true },
];

// ── Enemy reference data ──────────────────────────────────
// spawn: wave number the enemy first appears (from ENEMY_UNLOCK_WAVE)
// boss entries use BOSS_MIN_WAVE thresholds
const ENEMIES = [
  { tex: 'e_shambler',     name: 'Shambler',     stats: 'HP 60   Spd 45  Dmg 10', spawn: 1,  special: null,                                          boss: false },
  { tex: 'e_skitterer',    name: 'Skitterer',    stats: 'HP 25   Spd 90  Dmg 5',  spawn: 2,  special: 'Fast runner — outpaces slow towers',          boss: false },
  { tex: 'e_ironback',     name: 'Ironback',     stats: 'HP 120  Spd 30  Dmg 20', spawn: 3,  special: 'Armor 5 — blocks 5 dmg per hit',              boss: false },
  { tex: 'e_voidbat',      name: 'Voidbat',      stats: 'HP 45   Spd 80  Dmg 10', spawn: 4,  special: 'Night only · Arcing flight path',             boss: false },
  { tex: 'e_burrower',     name: 'Burrower',     stats: 'HP 50   Spd 60  Dmg 15', spawn: 5,  special: 'Briefly burrows underground',                 boss: false },
  { tex: 'e_looter',       name: 'Looter',       stats: 'HP 40   Spd 85  Dmg 8',  spawn: 6,  special: 'Targets machines, ignores towers',            boss: false },
  { tex: 'e_shade',        name: 'Shade',        stats: 'HP 35   Spd 75  Dmg 12', spawn: 7,  special: 'Night only · Invisible to towers',            boss: false },
  { tex: 'e_nightcrawler', name: 'Crawler',      stats: 'HP 70   Spd 55  Dmg 18', spawn: 8,  special: 'Night only · Splits into 2 on death',         boss: false },
  { tex: 'e_shamanbeast',  name: 'Shaman',       stats: 'HP 80   Spd 40  Dmg 15', spawn: 9,  special: 'Heals nearby enemies over time',              boss: false },
  { tex: 'e_towertacker',  name: 'TowerTacker',  stats: 'HP 40   Spd 55  Dmg 5',  spawn: 11, special: 'Ignores player — targets towers & walls only', boss: false },
  { tex: 'e_pale_mother',  name: 'Pale Mother',  stats: 'HP 2500  Spd 55  Dmg 34', spawn: 10, special: 'BOSS — spawns Shades mid-fight · first appears wave 10', boss: true  },
  { tex: 'e_siege_hulk',   name: 'Siege Hulk',   stats: 'HP 5800  Spd 35  Dmg 45', spawn: 25, special: 'BOSS — spawns Shamblers mid-fight · first appears wave 25', boss: true  },
  { tex: 'e_ironclad',     name: 'Ironclad',     stats: 'HP 10000 Spd 30  Dmg 60', spawn: 50, special: 'BOSS — pure tank, no minions · first appears wave 50',       boss: true  },
  { tex: 'e_cave_wraith',  name: 'Crystal Wraith', stats: 'HP 140  Spd 35  Dmg 22', spawn: 0, special: 'DEEP CAVE — Phase shift on hit (30%) · Regenerates HP · Drops gem + 5% Regular Key', boss: false, cave: true },
  { tex: 'e_raid_chief',       name: 'Raid Chief',       stats: 'HP 320   Spd 40  Dmg 28',  spawn: 3, special: 'RAID BOSS — armoured bandit leader · spawns only during Raid Events (10% nightly)', boss: false, raid: true },
  { tex: 'e_dungeon_sentinel', name: 'Sentinel',         stats: 'HP 220   Spd 25  Dmg 30',  spawn: 0, special: 'DUNGEON — Armor 12, slow but tough', boss: false, dungeon: true },
  { tex: 'e_dungeon_shade',    name: 'Dungeon Shade',    stats: 'HP 80    Spd 110 Dmg 28',  spawn: 0, special: 'DUNGEON — Invisible · very fast', boss: false, dungeon: true },
  { tex: 'e_dungeon_golem',    name: 'Stone Golem',      stats: 'HP 500   Spd 18  Dmg 45',  spawn: 0, special: 'DUNGEON — Armor 20 · tanks all damage', boss: false, dungeon: true },
  { tex: 'e_dungeon_phantom',  name: 'Dungeon Phantom',  stats: 'HP 160   Spd 65  Dmg 35',  spawn: 0, special: 'DUNGEON — Phase shifts on hit · 1.5 HP/s regen', boss: false, dungeon: true },
  { tex: 'e_vault_keeper',     name: 'Vault Keeper',     stats: 'HP 8000  Spd 40  Dmg 55',  spawn: 0, special: 'DUNGEON BOSS — spawns Sentinels · clears dungeon on death → big loot + blueprint', boss: true, dungeon: true },
];

// ── Weather reference data ────────────────────────────────
// 35% chance per night that one of 10 types triggers
const WEATHER = [
  { name: 'Thunderstorm',  color: '#FFD700',
    enemy:  'Enemies move 40% faster',
    towers: 'Flame Vat, Bonefire & Siege Cannon disabled',
    visual: 'Rain + lightning flashes' },
  { name: 'Rain',          color: '#6699CC',
    enemy:  'No effect on enemies',
    towers: 'Flame Vat, Bonefire & Siege Cannon disabled',
    visual: 'Heavy rain particles' },
  { name: 'Blood Moon',    color: '#FF2222',
    enemy:  'All enemies spawn with +30% HP',
    towers: 'No tower penalties',
    visual: 'Deep red sky tint' },
  { name: 'Foggy',         color: '#AAAAAA',
    enemy:  'No effect on enemies',
    towers: 'Arrow Tower blinded & disabled',
    visual: 'Grey fog overlay' },
  { name: 'Blizzard',      color: '#DDEEFF',
    enemy:  'Enemies frozen solid until dawn',
    towers: 'No tower penalties',
    visual: 'Dense horizontal snow' },
  { name: 'Snowy',         color: '#CCDDFF',
    enemy:  'Enemies move 40% slower',
    towers: 'No tower penalties',
    visual: 'Gentle falling snow' },
  { name: 'Full Moon',     color: '#FFCC88',
    enemy:  '2\u00d7 enemy spawn count this wave',
    towers: 'No tower penalties',
    visual: 'Warm orange moonlight shimmer' },
  { name: 'Mega Storm',    color: '#CC4422',
    enemy:  '+30% HP \u00b7 move 40% faster',
    towers: 'Flame, Bonefire, Cannon, Arrow & Sunbeamer disabled',
    visual: 'Rain + lightning + fog + red tint + snow' },
  { name: 'Solar Eclipse', color: '#CC8800',
    enemy:  '+15% HP \u00b7 spawn during DAY every 15s',
    towers: 'Sunbeamer disabled',
    visual: 'Near-black orange sky overlay' },
  { name: 'Earthquake',    color: '#CC9955',
    enemy:  'No enemy effect',
    towers: 'ALL towers disabled for the entire night',
    visual: 'Brown dust overlay + screen shake' },
];

// ── How To Play content ───────────────────────────────────
const HTP_SECTIONS = [
  {
    title: 'Controls',
    lines: [
      'WASD         — Move player',
      'E            — Harvest resource / Enter cave / Use bed / Open chest',
      'L or Click   — Melee attack (requires a sword — craft in Gear tab)',
      'Bow          — Auto-fires every 2s (no key needed) if bow is equipped',
      'Q            — Trigger active perk ability (Dash / Berserk / Time Slow)',
      'F            — Open / close build menu',
      'X            — Toggle SELL mode (50% refund)',
      'Tab          — Toggle Backpack (inventory + equipped items)',
      '1-7 (craft)  — Switch build menu tabs when menu is open',
      '~ (tilde)    — Toggle entity Labels (towers, enemies, resources)',
      'F → select   — Enter build mode for chosen structure',
      'Left-click   — Place structure on map (after selecting)',
      'Right-click  — Cancel build / exit sell mode',
      'ESC          — Pause menu  (access Codex from pause)',
      '',
      'Build Menu Keyboard Navigation (when menu is open):',
      '  1-7         — Switch tabs (Towers / Walls / Machines / Items / Gear / Armour / Cursed)',
      '  ↑ ↓ ← →    — Move selection cursor through item slots',
      '  Enter       — Confirm / craft / enter build mode for selected slot',
    ],
  },
  {
    title: 'Day & Night Cycle  (1 min / 1 min)',
    lines: [
      'Wave 0 — Grace period: nothing spawns. Build your defences!',
      'DAY   — 1 minute. Safe — no enemies spawn during the day.',
      '         Exception: Solar Eclipse weather spawns enemies every 15s!',
      'NIGHT — 1 minute. Enemies spawn continuously; more every wave.',
      '         Every 10th wave a BOSS appears at night.',
      'Night-only enemies (Voidbat, Shade, Crawler) burn at dawn.',
    ],
  },
  {
    title: 'Resources & Pickaxes',
    lines: [
      'Wood & Stone  — Surface only (trees, stone nodes).',
      'Coal, Iron, Gold, Crystal, Ruby, Emerald — cave only.',
      'Bone & Souls  — Dropped by enemies.',
      'Tiered pickaxes (Items tab):',
      '  Stone Pick   — Mines coal, stone & iron  · Cost: 2 wood + 1 stone',
      '  Iron Pick    — Mines gold & crystal too   · Cost: 2 wood + 3 iron',
      '  Crystal Pick — Mines ruby & emerald too   · Cost: 2 wood + 3 crystal + 1 soul',
      '  Emerald Pick — All ores + 1.5× yield  · Cost: 3 emerald + 2 crystal + 2 souls',
      '  Ruby Pick    — All ores + 100ms faster · Cost: 3 ruby + 2 crystal + 1 soul',
    ],
  },
  {
    title: 'The Cave',
    lines: [
      'One cave entrance per map — walk close and press E to enter.',
      'Enemies always spawn in caves — always dark inside.',
      'Press E near the EXIT glyph (top of cave) to return.',
      'Time passes in real-time while underground — watch the phase!',
      'DEEP CAVE entrance at the bottom (purple glyph) — press E / A to enter.',
      '  — Only Crystal, Ruby & Emerald ore nodes inside.',
      '  — 2× enemy density vs normal cave. Enemies pre-spawn on entry.',
      '  — PITCH BLACK without a Torch. Craft it: 2 Wood + 1 Coal (Items tab).',
      '  — Torch reveals a radius around you — essential before entering!',
      '  — Crystal Wraith spawns here: phase-shifts on damage, regens HP,',
      '    and drops a Crystal, Ruby, or Emerald gem on death.',
    ],
  },
  {
    title: 'Weapons  (Weapons tab #5)',
    lines: [
      'SWORD + BOW are separate slots — equip both at the same time!',
      'Swords (L / click to swing, 63px arc):',
      '  Wood 17 · Stone 29 · Iron 46 · Crystal 81 · Ruby 95 (fast) · Emerald 140 dmg',
      'Bow  — auto-fires every 2s · 20 dmg  (no key needed when equipped)',
      '  Upgraded Bow — 1.2s fire rate · 30 dmg',
      '  Cost: 5 souls + 1 emerald + 1 crystal (requires Bow already equipped)',
      'Speed Boots — 1.3× movement speed (Items tab · standalone, no set)',
      '  Cost: 8 crystal + 2 emerald + 10 souls',
      'Chestplates, helmets, greaves & boots are all in the Armour tab (#6).',
    ],
  },
  {
    title: 'Armour Sets  (Armour tab #6 — chest · helm · pants · boots)',
    lines: [
      'Each set has 4 pieces: Helmet · Chestplate · Greaves · Boots.',
      'Equip all 4 of the same set to activate the FULL SET BONUS.',
      'Tab key → Backpack shows your current set and bonus status.',
      '',
      '🌿 Emerald Set  (cave-focused):',
      '  Helm: +4 armor · spot enemies in cave dark',
      '  Chest: +15 armor · -15% dmg in caves',
      '  Greaves: +3 armor · mine 100ms faster in caves',
      '  Boots: +2 armor · +12% speed in caves',
      '  FULL BONUS: Cave Predator — +25% dmg in caves · 0.5 HP lifesteal per cave kill',
      '',
      '🩸 Ruby Set  (night-focused):',
      '  Helm: +4 armor · wider night vision',
      '  Chest: +15 armor · -15% dmg at night',
      '  Greaves: +3 armor · 15% dodge chance vs attacks',
      '  Boots: +2 armor · +15% speed at night',
      '  FULL BONUS: Night Hunter — +20% dmg at night · enemies 15% slower near you',
      '',
      '👻 Bone Set  (stealth):',
      '  Helm: +2 armor · enemies detect you 30% slower',
      '  Chest: +5 armor · stealth range 200px (enemies freeze beyond this)',
      '  Greaves: +1 armor · 30% smaller enemy aggro range',
      '  Boots: +1 armor · +10% speed',
      '  FULL BONUS: Ghost Dancer — 20% chance enemies completely ignore your hit',
      '',
      '⚙ Iron Set  (tank):',
      '  Helm: +8 armor · heavy protection',
      '  Chest: +5 armor',
      '  Greaves: +5 armor · immune to slows',
      '  Boots: +4 armor · slow immune',
      '  FULL BONUS: Iron Fortress — flat 8 dmg reduction after armor',
      '',
      '❄ Crystal Set  (utility):',
      '  Helm: +5 armor · nearby resources highlighted',
      '  Chest: +12 armor',
      '  Greaves: +3 armor · -15% crafting costs',
      '  Boots: +3 armor · +8% speed · -15% cooldowns',
      '  FULL BONUS: Arcane Flow — -20% all cooldowns · -20% crafting costs',
    ],
  },
  {
    title: 'Walls  (can upgrade in-place to higher tier)',
    lines: [
      'Wood Wall     — HP   53 · Cost: 5 wood   (skip this — build stone!)',
      'Stone Wall    — HP   97 · Cost: 4 stone',
      'Iron Wall     — HP  210 · Cost: 5 iron + 2 stone',
      'Crystal Wall  — HP  399 · Cost: 4 crystal + 3 iron',
      'Mob Soul Wall — HP  798 · Cost: 10 souls + 10 crystal + 15 bone',
      'Fire Wall     — HP 5000 · Cost: 20 coal + 15 bone + 1 soul (enemies pass through, takes hits)',
      'TIP: Select a wall type and click an existing lower-tier wall to upgrade it.',
    ],
  },
  {
    title: 'Night Weather  (35% chance each night — 10 types)',
    lines: [
      'Thunderstorm  — Enemies +40% speed. Rain + lightning.',
      'Rain          — Flame Vat, Bonefire & Siege Cannon disabled.',
      'Blood Moon    — Enemies +30% HP. Red sky.',
      'Foggy         — Arrow Tower disabled. Grey haze.',
      'Blizzard      — Enemies frozen until dawn.',
      'Snowy         — Enemies -40% speed. Gentle snow.',
      'Full Moon     — 2\u00d7 enemy count this wave. Orange tint.',
      'Mega Storm    — All bad effects combined (no blizzard). Total chaos.',
      'Solar Eclipse — +15% HP + enemies spawn during the DAY. Dark sky.',
      'Earthquake    — ALL towers offline for the night. Brown dust.',
    ],
  },
  {
    title: 'Towers — Kill-Based Upgrades',
    lines: [
      'Towers upgrade automatically by kills — no tokens needed.',
      'Lv1 = 0–100 kills, Lv2 = 101–200 ... max Lv10 at 1000 kills.',
      'Each level adds 10% max HP. Toggle Labels [~] to see kill progress.',
      'Enemy chestplates (wave 15+): iron (+5 armor) or crystal (+12 armor).',
    ],
  },
  {
    title: 'Corrupted Towers',
    lines: [
      'When enemies attack a tower long enough (~3s) it becomes CORRUPTED:',
      '  — Tower glows RED and immediately turns against YOU.',
      '  — Event alert: "it will attack YOU until you uncurse it or sell it!"',
      '  — The corrupted tower fires at the player at half its normal damage.',
      '',
      'Dealing with a RED corrupted tower:',
      '  A) Sell it (X mode) — no refund. Leaves a RED TINT tile on the ground.',
      '  B) Craft an Uncurse Token (crystal×8 + souls×15 + bone×12), then',
      '     press E near the tower to cleanse it back to normal (no tile left).',
      '',
      'RED TINT tile (cursed ground) options:',
      '  A) Press E on it while holding an Uncurse Token → ground returns to normal.',
      '  B) Place any tower on it → tower gets BLACK TINT.',
      '     BLACK tint = YOUR cursed tower — it attacks enemies at 2× damage,',
      '     but has only ½ max HP. Sells with no refund and cleanses the tile.',
    ],
  },
  {
    title: 'Food & Cows',
    lines: [
      'Cows roam the map (not in Hardcore mode) — kill one for 2–3 Raw Meat.',
      'Cook Raw Meat on a Campfire (Machines tab) → Cooked Meat.',
      'Press E near Campfire with Cooked Meat → eat it and restore 30 HP.',
      'Hardcore mode: no cows, no campfire food.',
    ],
  },
  {
    title: 'Machines  (Machines tab — auto-produce resources)',
    lines: [
      'Machines produce resources automatically over time — no player action needed.',
      'LOOTERS ignore towers and target machines directly — wall them off!',
      '',
      'Wood Cutter  — stone×4 + iron×2   · Produces +1 wood every 5s',
      'Stone Drill  — iron×5 + coal×2    · Produces +1 stone every 6s',
      'Kiln         — stone×8 + wood×4   · Produces +1 coal every 8s',
      'Scrap Bench  — iron×4 + stone×3   · Produces +2 bone every 7s',
      'Campfire     — coal×5 + wood×5 + bone×10',
      '  Press E near campfire with Raw Meat → cooks to Cooked Meat.',
      '  Press E with Cooked Meat → eat, restores 30 HP.',
      '',
      'Dummy Statue — wood×12 + bone×8   · HP: 150 · DECOY',
      '  Enemies within 200px ignore the player and attack the statue instead.',
      '  Place near your base to redirect enemy waves. Destroyed when HP hits 0.',
    ],
  },
  {
    title: 'Traps  (Items tab)',
    lines: [
      'Traps are placed flat on tiles and are stackable (no structure limit).',
      'Landmine   — iron×3 + coal×2  · Explodes on contact (AOE 64px, 50 dmg). Harms you!',
      'Tripwire   — iron×1 + bone×2  · Slows enemies to 30% speed for 3s.',
      'Spike Pit  — iron×2 + stone×2 · 25 dmg every 0.8s. Harms you!',
      'Glue Pool  — crystal×2 + bone×3 · Stops movement for 4s.',
    ],
  },
  {
    title: 'Bounty Rounds, Bosses & Hardcore Mode',
    lines: [
      'Bounty Round: 20% chance each wave after wave 10.',
      '  — Only one enemy type spawns that night.',
      '  — Killing them gives 2\u00d7 drops (bone, gold, souls, etc.).',
      'Boss order (Normal): Pale Mother wave 10 (HP 2500) \u2192 Siege Hulk wave 25 (HP 5800)',
      '  \u2192 Ironclad wave 50 (HP 10000), then all three cycle every 10 waves.',
      'Boss order (Hardcore): strict rotation every 10 waves from wave 10.',
      'Boss Kill Escalation: each boss death permanently buffs all enemies +15%',
      '  HP, damage and spawn count — difficulty scales with your victories.',
      'Bed: fast-forwards night at 1.75\u00d7 in both normal and hardcore.',
      'PERMADEATH: dying in ANY mode permanently deletes your world save.',
      '  — The save is wiped the instant you die — no reloading.',
      '  — Revive Tokens are your only protection (Hardcore: none allowed).',
      'Hardcore Mode: toggle when starting a new world.',
      '  — No revive tokens, no food (cows/campfire), enemies +15% HP & damage.',
      '  — Bosses get an additional +25% HP & damage on top.',
    ],
  },
  {
    title: 'Map Themes  (random each new game)',
    lines: [
      'Each new game picks one of three surface themes at random:',
      '  Grass   — lush green fields with flowers and pebbles (default feel)',
      '  Desert  — sandy dunes with cactus stubs and rippled sand',
      '  Snow    — frozen tundra with boot prints and icy patches',
      'The theme is cosmetic — gameplay is identical in all three.',
      'Saved with your world, so it persists across sessions.',
    ],
  },
  {
    title: 'Chests & Keys',
    lines: [
      'Several chest types are scattered across the map.',
      'Press E near a chest to open it (or A on controller).',
      '',
      'Regular Chest  — needs Regular Key (5% drop from Crystal Wraith)',
      '  Rewards: wood×20, stone×15, iron×10, coal×8, bone×15, gold×5',
      '',
      'Boss Chest     — needs Boss Key (15% drop from any Boss)',
      '  Rewards: crystal×10, ruby×3, emerald×3, iron×15, gold×20, souls×10',
      '',
      'Blueprint Chest — no key · gives one random locked Blueprint',
      'Legendary Chest — no key · massive rare ore haul (crystal/ruby/emerald)',
      'Cursed Chest    — no key · 50% huge reward OR 50% deals 30 dmg to you',
      'Trap Chest      — no key · small bone+gold + spawns 4 enemies on open',
      'Starter Chest   — no key · generous early-game resource bundle',
      '',
      'TIP: Save Boss Keys for Boss Chests — best rare ore payout in the game!',
    ],
  },
  {
    title: 'Raid Events  (10% chance each night from wave 3)',
    lines: [
      'A raider camp can appear on the map 6s into any night (wave 3+).',
      'Alert: "RAID! Enemy camp appeared — their turrets TARGET YOU!"',
      '',
      'The camp is randomly shaped each time (square, diamond, cross, L, palisade…)',
      'It contains:',
      '  · 3–4 Raider Turrets — RED tint, fire at YOU every 1.6–3.5s',
      '  · 4–10 Raider enemy units (scale with wave)',
      '  · 1 Raid Chief (boss-tier armoured enemy, HP 320+)',
      '',
      'YOUR towers and projectiles attack the turrets and enemies normally.',
      'You can also melee turrets directly (within 63 px).',
      'Turrets scale in HP and damage with wave number.',
      '',
      'Clear condition: destroy ALL turrets + kill ALL raiders + Raid Chief.',
      'Reward:  A random Blueprint is permanently unlocked!',
      '         + bonus gold, iron & bone regardless.',
      '         If all blueprints already owned: +60 souls & +12 crystal instead.',
      '',
      'The camp persists across day/night until cleared — no time limit.',
      'HUD shows a kill counter (top-centre) while the raid is active.',
    ],
  },
  {
    title: 'The Cursed Zone  (past the river)',
    lines: [
      'A river divides the map. The south side is the Cursed Zone.',
      'Build a Bridge (wood×200 + stone×100) to cross.',
      '  Bridge is a per-run blueprint — found in supply crates (not permanent).',
      '',
      'All enemies inside the Cursed Zone are buffed: 2× HP · 2× dmg · 1.5× spd.',
      'Cursed enemies are purple-tinted and ONLY spawn within the zone.',
      '',
      'Cursed enemies:',
      '  Soul Eater    — HP 90  · Drains HP from your towers over time',
      '  Ravager       — HP 55  · Very fast (spd 105) · drops Cursed Essence',
      '  Hex Shaman    — HP 70  · Hexes and debuffs your structures',
      '  Splitter      — HP 100 · Splits into 2 Ravagers on death',
      '  Siege Leech   — HP 80  · Latches onto towers, draining their HP',
      '  Void Brute    — HP 380 · Massive tank · drops Void Shards',
      '',
      'Cursed Zone resources (harvest with any pickaxe):',
      '  Cursed Essence, Void Shards, Corrupted Wood',
      'These rare materials are required to craft Blueprint towers.',
    ],
  },
  {
    title: 'Mini Objectives  (65% chance each night from wave 3)',
    lines: [
      'At the start of each night a random mini objective may appear.',
      'Two types:',
      '',
      'Supply Drop — A crate falls near the center of the map (HP 200, 60s timer).',
      '  Enemies deal double damage to it on contact.',
      '  Survive until wave clears or crate HP reaches zero.',
      '  Succeed → wood, stone, iron, coal, bone, souls rewarded.',
      '  Fail (crate destroyed or timer runs out) → no reward.',
      '',
      'Elite Kill — A single elite enemy spawns (3× HP, 2× dmg, 1.5× speed).',
      '  Golden tint marks the elite. 90-second timer.',
      '  Kill it before time runs out for the bonus.',
      '  Succeed → crystal, iron, gold, bone, souls rewarded.',
      '',
      'HUD shows a panel (bottom-left) with objective type and countdown.',
    ],
  },
  {
    title: 'Mutation Rounds  (28% chance each wave from wave 2)',
    lines: [
      'Each night has a 28% chance to roll a random MUTATION.',
      'An announcement fires at the start of the night with the mutation name & effect.',
      'Mutations last the entire night and clear at dawn.',
      '',
      '— 💥 Blazing Shamblers  : Shamblers explode on death (50 dmg, 80px radius)',
      '— ❄ Turbo Skitterers   : Skitterers are frost-immune and 35% faster',
      '— ⚙ Iron Regeneration  : Ironbacks regen 5 HP/s — burst them down!',
      '— 💚 Zealot Shamans     : Shamans heal allies at 2× the normal rate',
      '— 🔀 Triple Fission     : Nightcrawlers split into THREE on death',
      '— 😡 Berserker Rage     : Ravagers below 50% HP: 2× speed + 1.5× damage',
      '— 🔥 Shade Fireproof    : Shades are immune to Bonefire towers',
      '— 🦇 Nightmare Voidbats : Voidbats have 2× HP and 20% extra speed',
      '— 🛡 Iron Horde         : ALL enemies spawn with +10 bonus armor',
      '— ☠ Venomous Swarm     : Enemy hits inflict 3 HP/s poison DoT on YOU for 5s',
      '— 🛡 Shield Bearers     : 40% of enemies carry an energy shield (absorbs 1 hit)',
      '— 👻 Phase Storm        : ALL non-boss enemies can teleport when hit (25%)',
      '— 🧟 Zombie Outbreak    : Killing any enemy spawns a Zombie Shambler in its place',
      '— 👁 Dark Corruption    : Towers corrupt 3× faster — protect your defences!',
      '— 💀 Bone Storm         : Enemies drop +3 bonus bone each, but their count rises',
    ],
  },
  {
    title: 'Relics  (rare finds — permanent run passives)',
    lines: [
      'Relics are powerful passive items found rarely in chests and special drops.',
      'They apply for the rest of your run — cannot be removed.',
      '',
      'Blood Core    — +50% attack damage · but -1 HP per enemy kill',
      'Time Breaker  — Passive random area-slow bursts around you',
      'Greed Idol    — 2× loot drops from all sources · -20 max HP',
      'Soul Engine   — Each enemy kill restores 1 MP',
    ],
  },
  {
    title: 'Tower Synergies  (status effects interact)',
    lines: [
      'Towers inflict status effects. Combining two elements triggers a SYNERGY.',
      'Elements: Fire (Flame/Bonefire/Cannon) · Electric (Volt/Chain) ·',
      '          Frost · Poison · Curse (Curse Totem)',
      '',
      '🔥+☠  TOXIC BLAST    — Fire hits a POISONED enemy → 15 dmg AOE blast (96px)',
      '         Poison also spreads to all enemies caught in the blast.',
      '',
      '⚡+💧  CHAIN STORM    — During rain/thunderstorm, Electric chains to +6 extra',
      '         enemies at 200px range instead of 3 at 120px.',
      '',
      '❄+⚔  SHATTER        — FROZEN enemy hit by any non-frost tower takes 2.5× damage.',
      '         Stack Frost Spire with any DPS tower for huge burst.',
      '',
      '☠+⚡  NEURO SHOCK    — Electric hits a POISONED enemy → 1.5s stun (no movement).',
      '',
      '🔥+⚡  OVERLOAD       — Enemy hit by BOTH fire AND electric is marked.',
      '         On death it explodes for 30 dmg in 64px to nearby enemies.',
      '',
      '❄+☠  DECAY FREEZE   — Frost hits a POISONED enemy → 80% slow + 2× poison DoT.',
      '',
      '🌀+*   CURSED AMPLIFY — Curse Totem marks enemies. Marked enemies take +30%',
      '         damage from ALL tower types until the debuff fades.',
    ],
  },
  {
    title: 'Run Perks  (offered every 5 waves at dawn)',
    lines: [
      'Every 5th wave, choose 1 of 3 random perks for your current run.',
      'Perks are run-specific — they reset when you start a new world.',
      'Q key (or LT on controller) triggers your ACTIVE perk ability.',
      '',
      'COMBAT perks:',
      '  Lifesteal    — Regain +2 HP per enemy kill',
      '  Lucky Crit   — 15% chance to deal TRIPLE damage on player melee hit',
      '  Headhunter   — 10% chance to instantly kill a non-boss enemy on hit',
      '  Burning Aura — Passive fire aura: 3 dmg/s to all enemies within 40px',
      '',
      'TOWER perks:',
      '  Sniper          — All tower range +25%',
      '  Overclock       — All towers fire 35% faster (costs 1 HP / 5 shots)',
      '  Double Shot     — 25% chance for any tower to fire twice per attack',
      '  Chain Lightning — Volt Spire chains to 8 targets (from 3)',
      '  Freeze Mastery  — Frost Spire slow: enemies drop to 20% speed',
      '  Explosive Shots — Tower hits create a 40px AoE splash',
      '',
      'ECONOMY perks:',
      '  Greed       — All resource drops are doubled (bones, gold, souls…)',
      '  Scavenger   — 30% chance for a random resource drop on each kill',
      '  Auto Repair — All towers passively regen 0.2 HP per second',
      '',
      'ACTIVE perks  (Q key / LT to use):',
      '  Dash       — Burst to 900 speed for 180ms                · 5s cooldown',
      '  Berserk    — 5 seconds of double damage + 1.5× speed    · 60s cooldown',
      '  Time Slow  — Slow ALL enemies to 30% speed for 4s       · 90s cooldown',
      '',
      'CHAOS perks:',
      '  Glass Cannon   — Half max HP, but double attack damage permanently',
      '  Giant Mode     — 1.5× player scale · deal 50% more damage',
      '  Unstable Power — Every 8s: random burst (heal/explosion/invincibility/reset)',
      '',
      'STRATEGY perks:',
      '  Wall Fortifier — All existing walls have their HP doubled immediately',
      '  Trap Master    — Traps deal 3× damage',
      '  Commander      — Towers within 96px of you gain a damage boost',
    ],
  },
  {
    title: 'Tips',
    lines: [
      'Early: Build Stone Walls ASAP — skip Wood Walls entirely.',
      'Upgrade walls in-place: select a wall type, click an existing wall.',
      'Craft Stone Pickaxe on wave 1 or 2 — mines coal AND iron.',
      'Build Frost Spires early — slowing enemies helps every other tower.',
      'Craft a sword — melee swing hits all enemies within 63 px.',
      'Bonefire towers are vital vs. Shades (invisible otherwise).',
      'Looters target machines; wall them off or keep machines central.',
      'Pale Mother (wave 10, HP 2500) spawns Shades — have Bonefires ready!',
      'Bow + Sword stack — craft both in Gear tab for auto+melee combo.',
      'RED tint tower = danger! Sell it or use an Uncurse Token immediately.',
      'RAID turrets (red tint, no sell mode) — hit them with melee or tower fire.',
      'Blueprint reward for clearing raids — worth prioritising your offence!',
      'BLACK tint tower on cursed ground = 2× dmg — leave it or sell to cleanse.',
      'Deep Cave Crystal Wraith: 5% key drop — needed for Regular Chests.',
      'Save Boss Keys for the Boss Chest (crystal/ruby/emerald payoff).',
      'Perk at wave 5: Greed doubles all drops — great for economy.',
      'MUTATION announced at night start — check the message and adapt!',
      'Zombie Outbreak mutation: avoid big kill piles — they chain-spawn quickly.',
      'Dark Corruption: build walls to shield towers before night if this rolls.',
      'SYNERGY tip: Frost Spire + any DPS tower = SHATTER for 2.5× damage bursts.',
      'Toxic Blast: pair Poison Vent with Flame Vat to AOE-poison clustered groups.',
      'Neuro Shock: Poison Vent + Volt Spire = stun-lock chokepoint combo.',
      'Craft menu: press 1-7 to switch tabs, arrows to navigate, Enter to craft.',
      'Armour tab (#6): chest · helmet · pants · boots all in one place (20 slots).',
      'Weapons tab (#5): swords and bows only — armour moved to its own tab.',
      'Armour: mix sets or go full set for the bonus (Backpack shows current bonus).',
      'Iron set counters late-game bosses — flat 8 dmg reduction is massive.',
      'Crystal set -20% crafting costs is great for long survival runs.',
      'Cursed Zone past the river — needs Bridge blueprint from supply crates.',
      'Void Brute (Cursed Zone) drops Void Shards — needed for Chain Spire.',
      'Relics are rare but permanent — Blood Core doubles damage at HP cost.',
    ],
  },
  {
    title: 'Player Levels  (XP from kills → bonus cards)',
    lines: [
      'Every enemy kill awards XP. Bosses give 50 XP, dungeon enemies 15, others 8.',
      'When the XP bar fills, you Level Up and choose 1 of 3 bonus cards:',
      '  Vitality       — +25 Max HP, heal 25 HP',
      '  Arcane Surge   — +20 Max MP',
      '  Sharpened Edge — +15 attack damage',
      '  Fleet Foot     — +8% movement speed',
      '  Hardened       — +4 flat armor',
      '  Skilled Hands  — +30% harvest yield',
      '  Fast Learner   — -15% XP needed per level',
      '  Second Wind    — Restore 40 HP now',
      '',
      'XP bar shown below the player MP bar (yellow bar).',
      'Game pauses for your pick — physics resumes on selection.',
    ],
  },
  {
    title: 'Contracts  (3 per run, progress → reward)',
    lines: [
      '3 random contracts are generated at the start of each run.',
      'Track progress in the bottom-left HUD panel.',
      '',
      'Contract types:',
      '  Slayer / Veteran   — Kill N enemies',
      '  Boss Bane          — Kill 1 boss',
      '  Survivor           — Survive 5 waves',
      '  Gatherer           — Harvest 80 resources',
      '  Crafter            — Craft 10 items',
      '  Builder            — Build 5 towers',
      '  Explorer           — Enter a cave',
      '  Dungeon Run        — Clear the Dungeon (big gold reward)',
      '  Night Owl          — Survive 3 nights',
      '',
      'Complete all 3 for a full-run achievement bonus.',
    ],
  },
  {
    title: 'Dungeon  (cursed zone, key required, boss loot)',
    lines: [
      'A Dungeon entrance spawns in the CURSED ZONE (north of river) every run.',
      'Label: DUNGEON [E]  — look for the purple glowing portal.',
      '',
      'To enter: hold a Dungeon Key (2% drop chance from any non-boss surface enemy).',
      '',
      'Inside the Dungeon:',
      '  — 30×30 arena with 4 unique enemy types',
      '  — Sentinel: heavy armor (armor 12)',
      '  — Dungeon Shade: fast, invisible',
      '  — Stone Golem: 500 HP, heavy armor',
      '  — Dungeon Phantom: phase-shifts, regens',
      '  — Clear all enemies → Vault Keeper boss spawns (8000 HP)',
      '',
      'Kill the Vault Keeper for:',
      '  crystal×15, ruby×5, emerald×5, gold×40, souls×25, void_shards×3',
      '  + random Dungeon Blueprint (shadow_cannon / spirit_totem / oracle_beacon / thorn_cage)',
      '',
      'HP lost in dungeon is kept on exit — risky but worth it!',
    ],
  },
  {
    title: 'Dungeon-Exclusive Towers  (blueprint required)',
    lines: [
      'These towers are unlocked only by finding their blueprints in the Dungeon.',
      'Build them from the DUNGEON tab (tab 8) in the craft menu.',
      '',
      'Shadow Cannon  — void_shards×4, crystal×6, souls×10',
      '  Pierce shot that IGNORES ALL ENEMY ARMOR. 90 dmg, 160 range.',
      '',
      'Spirit Totem   — crystal×8, souls×12, bone×20',
      '  Passive: heals all nearby towers (96px) at 1 HP/s continuously.',
      '  No projectile — place near your tower cluster.',
      '',
      'Oracle Beacon  — crystal×10, gold×8, iron×6',
      '  Passive: reveals invisible enemies within 160px.',
      '  Nearby towers (160px) deal +15% damage.',
      '',
      'Thorn Cage     — iron×8, crystal×4, cursed_essence×3',
      '  Short-range AoE field (48px). Hits ALL enemies near it every 500ms for 15 dmg.',
      '  Place in chokepoints where enemies cluster.',
    ],
  },
  {
    title: 'Merchant NPC  (20% chance each night)',
    lines: [
      'A Wandering Merchant has a 20% chance to spawn near the player each night.',
      'Walk up and press E to open the shop.',
      'The merchant sells resources and consumables for gold.',
      'The merchant despawns when the wave is cleared.',
      '',
      'Stock rotates each visit (6 random items from a pool):',
      '  Basic resources: wood, stone, iron, coal, bone, crystal, ruby, emerald',
      '  Keys, Souls, Cooked Meat',
      '  Special: Soul Bomb, Iron Ration, Temporal Shard',
      '',
      'Save gold from enemies — it buys you items you might desperately need!',
    ],
  },
  {
    title: 'Consumable Items  (keys 2-5 when craft closed)',
    lines: [
      'Four new gameplay-changing consumables — use with hotbar (2-5):',
      '',
      'Soul Bomb  (souls×20 + crystal×5)  [key 2]',
      '  Instantly kills all enemies within 120px of you.',
      '  Good for emergency clear or boss crowd control.',
      '',
      'Iron Ration  (iron×5 + cooked_meat×2)  [key 3]',
      '  +15 flat armor for 30 seconds.',
      '  Stack before a boss wave hits.',
      '',
      'Blood Pact  (souls×15 + ruby×2)  [key 4]',
      '  Costs 30 HP. Triples your attack damage for 10 seconds.',
      '  Risk vs reward — do not use at low HP!',
      '',
      'Temporal Shard  (crystal×6 + void_shards×2)  [key 5]',
      '  Freezes ALL enemies on screen for 5 seconds.',
      '  Pairs perfectly with melee attacks or boss phases.',
      '',
      'Phase Blade  (void_shards×5 + crystal×5 + souls×10)  — weapon',
      '  180 damage, phases through ALL armor. Dungeon-forged sword.',
    ],
  },
  {
    title: 'Challenge Runs  (modifiers for more meta soul rewards)',
    lines: [
      'On the main menu, toggle Challenge Mods before starting a NEW run.',
      'Each active modifier multiplies your meta soul reward:',
      '',
      '  1 HP        — Start with 1 max HP. One hit = death.  (×5 souls)',
      '  No Towers   — Cannot place any towers or walls.       (×3 souls)',
      '  Relentless  — Enemies keep spawning all night long.   (×2 souls)',
      '  Scarce      — All resource drops are halved.          (×2 souls)',
      '',
      'Multipliers are multiplicative — all 4 active = ×60 soul reward.',
      'Use meta souls to unlock perks permanently from the Blueprints menu.',
      '',
      'Completing a run with any challenge mod active unlocks the',
      '"Challenger" achievement (+30 meta souls permanently).',
    ],
  },
];

export class HelpScene extends Phaser.Scene {
  constructor() { super('Help'); }

  init(data) {
    // When launched from the pause menu, return to Game instead of Menu
    this._returnTo   = data?.returnTo   ?? 'Menu';
    this._returnData = data?.returnTo === 'Game'
      ? { newGame: false, slotId: data.slotId ?? 1, hardcore: data.hardcore ?? false }
      : undefined;
  }

  create() {
    this._tab      = 'towers';
    this._scrollY  = 0;

    this._buildChrome();
    this._towerContainer  = this._buildTowerContent();
    this._enemyContainer  = this._buildEnemyContent();
    this._weatherContainer = this._buildWeatherContent();
    this._htpContainer    = this._buildHTPContent();

    // Clip mask
    const maskGfx = this.make.graphics({ add: false });
    maskGfx.fillRect(0, CONTENT_Y, VW, VH - CONTENT_Y);
    const mask = maskGfx.createGeometryMask();
    this._towerContainer.setMask(mask);
    this._enemyContainer.setMask(mask);
    this._weatherContainer.setMask(mask);
    this._htpContainer.setMask(mask);

    this._setupInput();
    this._showTab('towers');
  }

  // ── Chrome ───────────────────────────────────────────────

  _buildChrome() {
    this.add.rectangle(VW / 2, VH / 2, VW, VH, 0x0a0808);

    this.add.text(VW / 2, 22, 'SIEGE ETERNAL — CODEX', {
      fontSize: '24px', fill: '#EDE0C4', fontFamily: 'monospace',
      stroke: '#3D2B1F', strokeThickness: 3,
    }).setOrigin(0.5);

    const back = this.add.text(VW - 24, 22, '[ BACK ]', {
      fontSize: '13px', fill: '#C8A96E', fontFamily: 'monospace',
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
    back.on('pointerover', () => back.setStyle({ fill: '#FFE090' }));
    back.on('pointerout',  () => back.setStyle({ fill: '#C8A96E' }));
    back.on('pointerdown', () => this._goBack());

    this.add.rectangle(VW / 2, 42, VW, 1, 0x3D2B1F);

    this._btnTowers  = this._makeTabBtn(VW / 2 - 180, 72, 'TOWERS',      () => this._showTab('towers'));
    this._btnEnemies = this._makeTabBtn(VW / 2 - 60,  72, 'ENEMIES',     () => this._showTab('enemies'));
    this._btnWeather = this._makeTabBtn(VW / 2 + 60,  72, 'WEATHER',     () => this._showTab('weather'));
    this._btnHTP     = this._makeTabBtn(VW / 2 + 180, 72, 'HOW TO PLAY', () => this._showTab('htp'));

    this.add.rectangle(VW / 2, CONTENT_Y - 4, VW, 1, 0x3D2B1F);

    this._fadeBar    = this.add.rectangle(VW / 2, VH - 20, VW, 50, 0x0a0808, 0.85).setDepth(20);
    this._scrollHint = this.add.text(VW / 2, VH - 14, 'scroll for more', {
      fontSize: '10px', fill: '#4A4030', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(21);
  }

  _makeTabBtn(x, y, label, cb) {
    const btn = this.add.text(x, y, label, {
      fontSize: '14px', fill: '#7A6545', fontFamily: 'monospace',
      backgroundColor: '#1A1210', padding: { x: 14, y: 7 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    btn.on('pointerover',  () => { if (!btn.getData('on')) btn.setStyle({ fill: '#C8A96E' }); });
    btn.on('pointerout',   () => { if (!btn.getData('on')) btn.setStyle({ fill: '#7A6545' }); });
    btn.on('pointerdown',  cb);
    return btn;
  }

  _setTabHighlight(tab) {
    const set = (btn, on) => {
      btn.setData('on', on);
      btn.setStyle({ fill: on ? '#FFE090' : '#7A6545', backgroundColor: on ? '#3D2B1F' : '#1A1210' });
    };
    set(this._btnTowers,  tab === 'towers');
    set(this._btnEnemies, tab === 'enemies');
    set(this._btnWeather, tab === 'weather');
    set(this._btnHTP,     tab === 'htp');
  }

  // ── Tower cards ──────────────────────────────────────────

  _buildTowerContent() {
    const c = this.add.container(0, CONTENT_Y);
    TOWERS.forEach((t, i) => {
      const col = i % 2 === 0 ? COL_L : COL_R;
      const cy  = Math.floor(i / 2) * (CARD_H + CARD_GAP);
      this._addTowerCard(c, col, cy, t);
    });
    return c;
  }

  _addTowerCard(c, cx, cy, t) {
    const wrap     = { wordWrap: { width: CARD_W - 114 } };
    const bgCol    = t.blueprint ? 0x10081A : 0x160E0A;
    const borderCol = t.blueprint ? 0x6A2299 : 0x3D2B1F;
    const nameCol  = t.blueprint ? '#CC66FF' : '#D4A017';
    c.add(this.add.rectangle(cx + CARD_W / 2, cy + CARD_H / 2, CARD_W, CARD_H, bgCol).setStrokeStyle(1, borderCol));
    c.add(this.add.image(cx + 22, cy + CARD_H / 2, t.tex).setDisplaySize(32, 32));
    c.add(this.add.text(cx + 52, cy + 7,  t.name, { fontSize: '14px', fill: nameCol, fontFamily: 'monospace' }));
    if (t.blueprint) {
      c.add(this.add.text(cx + CARD_W - 6, cy + 6, '★ BLUEPRINT', {
        fontSize: '8px', fill: '#7733AA', fontFamily: 'monospace',
      }).setOrigin(1, 0));
    }
    c.add(this.add.text(cx + 52, cy + 25, t.cost, { fontSize: '10px', fill: '#6A5535', fontFamily: 'monospace' }));
    c.add(this.add.text(cx + 52, cy + 42, `+ ${t.abilities[0]}`, { fontSize: '11px', fill: '#5A9A45', fontFamily: 'monospace', ...wrap }));
    c.add(this.add.text(cx + 52, cy + 57, `+ ${t.abilities[1]}`, { fontSize: '11px', fill: '#5A9A45', fontFamily: 'monospace', ...wrap }));
    c.add(this.add.text(cx + 52, cy + 75, `- ${t.downside}`,     { fontSize: '11px', fill: '#BB4422', fontFamily: 'monospace', ...wrap }));
  }

  // ── Enemy cards ──────────────────────────────────────────

  _buildEnemyContent() {
    const c = this.add.container(0, CONTENT_Y);
    ENEMIES.forEach((e, i) => {
      const col = i % 2 === 0 ? COL_L : COL_R;
      const cy  = Math.floor(i / 2) * (CARD_H + CARD_GAP);
      this._addEnemyCard(c, col, cy, e);
    });
    return c;
  }

  _addEnemyCard(c, cx, cy, e) {
    const border = e.boss ? 0x8B1A1A : 0x3D2B1F;
    c.add(this.add.rectangle(cx + CARD_W / 2, cy + CARD_H / 2, CARD_W, CARD_H, 0x160E0A).setStrokeStyle(1, border));
    c.add(this.add.image(cx + 22, cy + CARD_H / 2, e.tex).setDisplaySize(32, 32));

    // Name
    c.add(this.add.text(cx + 52, cy + 7,  e.boss ? `! ${e.name}` : e.name,
      { fontSize: '14px', fill: e.boss ? '#FF5544' : '#EDE0C4', fontFamily: 'monospace' }));

    // Stats
    c.add(this.add.text(cx + 52, cy + 27, e.stats, { fontSize: '10px', fill: '#6A8899', fontFamily: 'monospace' }));

    // Special ability
    const nightOnly = e.special?.startsWith('Night');
    const specColor = e.boss ? '#FF8844' : nightOnly ? '#9B6BB5' : '#C8A96E';
    c.add(this.add.text(cx + 52, cy + 46, e.special ?? 'No special ability',
      { fontSize: '11px', fill: e.special ? specColor : '#3A3020', fontFamily: 'monospace', wordWrap: { width: CARD_W - 120 } }));

    // Spawn wave badge — right-aligned in the card
    const spawnLabel = e.cave ? 'DEEP CAVE ONLY'
                     : e.raid ? 'RAID EVENT ONLY'
                     : e.boss ? `First: wave ${e.spawn}`
                     :          `Wave ${e.spawn}+`;
    const spawnColor = e.cave ? '#88EEEE'
                     : e.raid ? '#FF8888'
                     : e.boss ? '#FF8844'
                     :          '#4A7A3A';
    c.add(this.add.text(cx + CARD_W - 8, cy + 7, spawnLabel,
      { fontSize: '9px', fill: spawnColor, fontFamily: 'monospace' }).setOrigin(1, 0));
  }

  // ── Weather cards ─────────────────────────────────────────

  _buildWeatherContent() {
    const c = this.add.container(0, CONTENT_Y);
    WEATHER.forEach((w, i) => {
      const col = i % 2 === 0 ? COL_L : COL_R;
      const cy  = Math.floor(i / 2) * (CARD_H + CARD_GAP);
      this._addWeatherCard(c, col, cy, w);
    });
    return c;
  }

  _addWeatherCard(c, cx, cy, w) {
    const ww = { wordWrap: { width: CARD_W - 56 } };
    c.add(this.add.rectangle(cx + CARD_W / 2, cy + CARD_H / 2, CARD_W, CARD_H, 0x160E0A).setStrokeStyle(1, 0x3D2B1F));
    // Colour swatch
    const col = parseInt(w.color.slice(1), 16);
    c.add(this.add.rectangle(cx + 22, cy + CARD_H / 2, 22, 42, col).setStrokeStyle(1, 0x555555));
    c.add(this.add.text(cx + 44, cy + 7,  w.name,              { fontSize: '14px', fill: w.color,   fontFamily: 'monospace' }));
    c.add(this.add.text(cx + 44, cy + 27, `Enemy: ${w.enemy}`, { fontSize: '10px', fill: '#C8A96E', fontFamily: 'monospace', ...ww }));
    c.add(this.add.text(cx + 44, cy + 55, `Tower: ${w.towers}`, { fontSize: '10px', fill: '#BB8844', fontFamily: 'monospace', ...ww }));
    c.add(this.add.text(cx + 44, cy + 90, w.visual,             { fontSize: '10px', fill: '#5A7A99', fontFamily: 'monospace' }));
  }

  // ── How To Play content ───────────────────────────────────

  _buildHTPContent() {
    const c = this.add.container(0, CONTENT_Y);
    let y   = 10;
    const X = 40;
    const W = VW - 80;

    HTP_SECTIONS.forEach(sec => {
      // Section title bar
      c.add(this.add.rectangle(X + W / 2, y + 10, W, 24, 0x2A1C10).setStrokeStyle(1, 0x5A3A20));
      c.add(this.add.text(X + 10, y + 2, sec.title, { fontSize: '13px', fill: '#D4A017', fontFamily: 'monospace' }));
      y += 28;

      sec.lines.forEach(line => {
        c.add(this.add.text(X + 16, y, line, { fontSize: '11px', fill: '#C8A96E', fontFamily: 'monospace' }));
        y += 16;
      });

      y += 12;
    });

    c.htpTotalHeight = y;
    return c;
  }

  // ── Tab switching ─────────────────────────────────────────

  _showTab(tab) {
    this._tab    = tab;
    this._scrollY = 0;
    this._setTabHighlight(tab);
    this._towerContainer.setVisible(tab === 'towers').y = CONTENT_Y;
    this._enemyContainer.setVisible(tab === 'enemies').y = CONTENT_Y;
    this._weatherContainer.setVisible(tab === 'weather').y = CONTENT_Y;
    this._htpContainer.setVisible(tab === 'htp').y = CONTENT_Y;
    this._updateScrollHint();
  }

  _scroll(delta) {
    const max = this._maxScroll();
    this._scrollY = Phaser.Math.Clamp(this._scrollY + delta, 0, max);
    const con = this._tab === 'towers'  ? this._towerContainer
              : this._tab === 'enemies' ? this._enemyContainer
              : this._tab === 'weather' ? this._weatherContainer
              :                           this._htpContainer;
    con.y = CONTENT_Y - this._scrollY;
    this._updateScrollHint();
  }

  _maxScroll() {
    let totalH = 0;
    if (this._tab === 'towers')  totalH = Math.ceil(TOWERS.length  / 2) * (CARD_H + CARD_GAP);
    if (this._tab === 'enemies') totalH = Math.ceil(ENEMIES.length / 2) * (CARD_H + CARD_GAP);
    if (this._tab === 'weather') totalH = Math.ceil(WEATHER.length / 2) * (CARD_H + CARD_GAP);
    if (this._tab === 'htp') totalH = this._htpContainer?.htpTotalHeight ?? 800;
    return Math.max(0, totalH - (VH - CONTENT_Y - 10));
  }

  _updateScrollHint() {
    const show = this._maxScroll() > 5 && this._scrollY < this._maxScroll() - 5;
    this._fadeBar.setVisible(show);
    this._scrollHint.setVisible(show);
  }

  // ── Input ─────────────────────────────────────────────────

  _goBack() {
    if (this._returnTo === 'Game') {
      // Game is sleeping — wake it, then stop this scene
      this.scene.wake('Game');
      this.scene.stop('Help');
    } else {
      this.scene.start(this._returnTo ?? 'Menu', this._returnData);
    }
  }

  _setupInput() {
    this.input.keyboard.on('keydown-ESC',  () => this._goBack());
    this.input.on('wheel', (_p, _o, _dx, dy) => this._scroll(dy * 0.55));
    this.input.keyboard.on('keydown-DOWN', () => this._scroll(40));
    this.input.keyboard.on('keydown-UP',   () => this._scroll(-40));
    this.input.keyboard.on('keydown-S',    () => this._scroll(40));
    this.input.keyboard.on('keydown-W',    () => this._scroll(-40));
  }
}
