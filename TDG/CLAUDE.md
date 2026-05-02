# Siege Eternal — Project Context

**Project:** Tower-defence / survival game built with **Phaser 3** (browser, no bundler).  
**Path:** `C:\Users\ROY0016\.qoder\TDG`  
**Entry:** `src/main.js` — registers all scenes, boots via `BootScene`.

---

## Game Overview

Survive endless waves of enemies at night. Day = safe build/gather time (1 min). Night = enemy wave (1 min). Every 10th wave spawns a boss. Player dies → world save is permanently deleted (permadeath both modes).

---

## Scene Graph

| Scene key | File | Role |
|-----------|------|------|
| `Boot` | `scenes/BootScene.js` | Generates ALL textures programmatically (no asset files) |
| `Menu` | `scenes/MenuScene.js` | Save-slot picker, new/load, hardcore toggle |
| `Game` | `scenes/GameScene.js` | Main overworld — player, enemies, building, HUD |
| `Cave` | `scenes/CaveScene.js` | Normal cave (E near entrance to enter, E to exit) |
| `DeepCave` | `scenes/DeepCaveScene.js` | Pitch-black cave (torch required), Crystal Wraith enemy |
| `GameOver` | `scenes/GameOverScene.js` | Death screen — world deleted before transition |
| `Help` | `scenes/HelpScene.js` | Codex: Towers / Enemies / Weather / How To Play |

Cave scenes sleep/wake Phaser scenes (not start/stop). State shared via `this.registry`.

---

## Systems

| System | File | Responsibility |
|--------|------|----------------|
| `MapGenerator` | `systems/MapGenerator.js` | Procedural RenderTexture map, resource nodes, cave entrance, chests |
| `EnemyManager` | `systems/EnemyManager.js` | Spawn, update, AI, phase-shift, regen, drops, kills |
| `TowerManager` | `systems/TowerManager.js` | Place/sell towers/walls/machines, projectiles, upgrades |
| `WaveManager` | `systems/WaveManager.js` | Day/night timer, wave spawning, boss logic, perk offers, mini-obj trigger |
| `WeatherSystem` | `systems/WeatherSystem.js` | 35% chance each night, 10 types, buffs/debuffs |
| `HUD` | `systems/HUD.js` | Resource panel, wave clock, player bars, craft menu, cursor, labels |
| `SoundManager` | `systems/SoundManager.js` | Web Audio API procedural sounds — singleton `soundMgr` |
| `PerkSystem` | `systems/PerkSystem.js` | 22 run-specific perks, 3-card pick overlay every 5 waves |
| `MiniObjectiveSystem` | `systems/MiniObjectiveSystem.js` | Night mini-objectives: supply drop defend / elite kill |
| `MobileOverlay` | `systems/MobileOverlay.js` | DOM overlay for portrait mobile: announcements + resource bar |

---

## Constants (`src/constants.js`) — Key Exports

- `TS=32, MW=60, MH=60` — tile size and map grid
- `VW=960, VH=640` — viewport
- `DAY_DUR=NIGHT_DUR=60000` — 1 min each
- `TOWER_DEFS, MACHINE_DEFS, WALL_DEFS` — crafting costs + stats
- `ENEMY_DEFS` — includes `cave_wraith` (deep cave only, phase-shift, regen, gemDrop)
- `BOSS_CYCLE = ['pale_mother','siege_hulk','ironclad']`
- `DAY_ENEMIES, NIGHT_ENEMIES, DEEP_CAVE_ENEMIES` — spawn pools
- `ENEMY_UNLOCK_WAVE` — wave thresholds per enemy type
- `CHEST_DEFS` — regular chest (key_regular) + boss chest (key_boss) rewards
- `MAP_THEMES = ['grass','desert','snow']` — random per new game

---

## Player & Controls

| Key | Action |
|-----|--------|
| WASD | Move |
| E | Harvest / Enter cave / Use bed / Open chest |
| L or Click | Melee attack (requires sword) |
| Q | Trigger active perk (Dash / Berserk / Time Slow) |
| F | Open/close craft menu |
| X | Toggle sell mode |
| ESC | Pause |
| Gamepad | Full support: sticks=move/cursor, A=interact, B=craft, X=attack, Y=sell, RT=click, LT=perk |

---

## Inventory Resources

`wood, stone, bone, coal, iron, crystal, gold, ruby, emerald, souls, raw_meat, cooked_meat, key_regular, key_boss`

- `key_regular` — 5% drop from Crystal Wraith (deep cave). Opens Regular Chest.
- `key_boss` — 15% drop from bosses. Opens Boss Chest.

---

## Map Themes

Each new game randomly picks one of three surface themes (saved with world):
- **Grass** — green tiles `gnd0/1/2`
- **Desert** — sandy tiles `gnd_desert0/1/2`
- **Snow** — snowy tiles `gnd_snow0/1/2`

MapGenerator reads `scene.mapTheme` before `generate()`.

---

## Chests

Each map has **2 Regular Chests** + **1 Boss Chest** placed by `MapGenerator._placeChests()`.
- Seeds are deterministic from map seed — same positions every load.
- E near a chest to open. `_tryChest()` in GameScene handles interaction.
- Save stores which chests are open (`s.chests[]`).

---

## Crystal Wraith (Deep Cave Exclusive)

```js
cave_wraith: { hp:140, spd:35, dmg:22, sz:18, phaseShift:true, regen:0.8, gemDrop:true, cave:true }
```

- 30% teleport on HP damage (1.5s cooldown)
- Regenerates 0.8 HP/s
- On death: drops crystal(50%) / ruby(30%) / emerald(20%) + 5% chance `key_regular`
- Appears in `DEEP_CAVE_ENEMIES` pool (weight ×2)

---

## Wave System

- **Wave 0** = grace period (day only, no enemies)
- Night starts → `waveMgr.startNight()` → `_spawnWave()`
- Boss every 10th wave. Normal order: pale_mother(10/20) → siege_hulk(30/40) → ironclad(50) → cycle
- **Boss kill escalation**: each boss death buffs ALL enemies +15% HP/dmg/count permanently (`scene.bossBuff`)
- **Bounty rounds**: 20% chance wave 10+, one enemy type, 2× drops
- **Sleep (Bed)**: 1.75× speed both modes
- **Permadeath**: `localStorage.removeItem(saveSlotKey)` at moment of death — no reload-cheat

---

## Perk System

- `PerkSystem` in `scene.perkSys`
- 22 perks across 6 categories: COMBAT, TOWER, ECONOMY, ACTIVE, CHAOS, STRATEGY
- Every 5th wave at dawn: 3 random perk cards offered, pick 1 (or skip)
- Q key / LT gamepad → `perkSys.triggerActive()` for active perks (Dash/Berserk/Time Slow)
- `perkSys.serialize()` / `restore()` for save/load
- Active perks: Dash (5s CD), Berserk (60s CD), Time Slow (90s CD)

---

## Mini Objectives

- `MiniObjectiveSystem` in `scene.miniObjSys`
- 65% chance each night from wave 3 (spawned 4s into night)
- **Supply Drop**: HP-200 crate at map center, 60s timer. Enemies deal 2× dmg to it. Defend until wave clear → wood/stone/iron/coal/bone/souls reward.
- **Elite Kill**: 3×HP / 2×dmg / 1.5×spd golden enemy, 90s timer → crystal/iron/gold/bone/souls reward.
- HUD panel bottom-left shows type + countdown.
- `onWaveCleared()` called from `WaveManager.onWaveCleared()`.

---

## Sound System

`soundMgr` (singleton) — Web Audio API, fully procedural (no files):
`hit, die, bossDie, bossAlert, playerHurt, harvest, mine, build, craft, dayStart, nightStart, shoot, phaseShift`

---

## Save System

Save key: `siege_eternal_save_${slotId}` (up to 3 slots).

Key save fields:
```js
{ seed, wave, hp, mp, inventory, hasRevive, px, py, caveEntrance,
  phase, hasPickaxe, pickaxeKey, weapon, armor, helmet, pants, setBoots,
  playerAttackDmg, bossKillCount, bossBuff, mapTheme, perks, chests,
  isHardcore, hasTorch, ...towerMgr.serialize() }
```

MapTheme and seed MUST be loaded before `mapGen.generate()` (done in early block at top of `create()`).

---

## Cave System

- `GameScene._startCaveTransition()` pushes ALL shared state to `this.registry`
- `slotId` and `saveSlotKey` pushed to registry so cave scenes can delete save on death
- Deep cave entry: E press required (not auto-proximity)
- `DEEP CAVE [E]` label on entrance glyph

---

## File Size Reference (approx)

| File | Lines |
|------|-------|
| GameScene.js | ~1100 |
| HUD.js | ~800 |
| EnemyManager.js | ~420 |
| TowerManager.js | ~500 |
| WaveManager.js | ~250 |
| MapGenerator.js | ~200 |
| BootScene.js | ~750 |
| PerkSystem.js | ~400 |
| MiniObjectiveSystem.js | ~320 |
| HelpScene.js | ~510 |

---

## Key Patterns

- **Immutable enemy defs**: `enemy.def = { ...enemy.def, dmg: newVal }` never mutate originals
- **Phase-shift init**: `enemy._lastHp = null` → `(enemy._lastHp ?? enemy.hp)` avoids false first-frame trigger
- **Texture generation**: all textures baked in `BootScene._generateTextures()` using Phaser Graphics → `generateTexture(key, w, h)`
- **No bundler**: ES modules via `<script type="module">`, direct browser import
- **Registry for cave**: `this.registry.set('saveSlotKey', ...)` so cave scenes access it

---

## Mandatory Development Rule — Keep Version History & Codex Current

> **ENFORCE THIS ON EVERY CHANGE.** After adding, removing, or modifying any feature, system, enemy, perk, mutation, synergy, or mechanic you MUST do both of the following before considering the task done:

### 1 — Bump `VERSION_HISTORY` in `src/scenes/MenuScene.js`

- Add a new entry at the **top** of the `VERSION_HISTORY` array (latest first).
- Use the next logical semver bump (`v0.9.x` patch → `v0.10.0` minor → `v1.0.0` major).
- Keep `notes` concise but complete — one bullet per significant change, separated by `·`.
- Export the new version from `CURRENT_VERSION` at the top of that file.

```js
// Example entry to prepend:
{ ver: 'v0.10.0', date: 'May 2026', notes: 'New feature A · Fixed bug B · Removed system C' },
```

### 2 — Update the relevant section(s) of `src/scenes/HelpScene.js`

Edit whichever of the following arrays / sections describe the changed feature:

| Changed area | Section(s) to update |
|---|---|
| Tower / machine / wall | `TOWERS` array |
| Enemy (surface or cave) | `ENEMIES` array |
| Weather effect | `WEATHER` array |
| Mutation | `HTP_SECTIONS` → "Mutation Rounds" |
| Tower synergy | `HTP_SECTIONS` → "Tower Synergies" |
| Perk | `HTP_SECTIONS` → "Run Perks" |
| Controls / keybinds | `HTP_SECTIONS` → "Controls" |
| General mechanic | `HTP_SECTIONS` → "How To Play" |

> If a new category is added that does not fit any existing section, create a new entry in `HTP_SECTIONS`.

---

## Recent Session Changes (Apr 2026)

1. **Crystal Wraith** — deep cave enemy, phase-shift, regen, gem + 5% key drop
2. **SoundManager** — full procedural audio via Web Audio API, master gain node for global volume
3. **Permadeath** — save deleted at death moment in all 3 scenes
4. **Map Themes** — grass/desert/snow terrain with matching BootScene textures
5. **Chests & Keys** — 2 regular + 1 boss chest per map, key drops from wraith/bosses
6. **PerkSystem** — 22 perks, 3-card overlay every 5 waves, Q key active ability
7. **MiniObjectiveSystem** — supply drop + elite kill mini-objectives each night
8. **Deep cave E-press entry** — removed auto-enter proximity trigger
9. **Boss kill escalation** — +15% enemy buffs per boss death, permanent
10. **HelpScene codex** — updated with all new systems (Map Themes, Chests, Perks, Mini Objectives)
11. **Mobile overlay** — key items added to RES_COLORS
12. **HUD** — key_regular/key_boss shown in resource panel when owned
13. **MutationSystem** — 15 per-wave modifiers (v0.9.0), announcements, dawn clear
14. **Tower Synergies** — 7 element combos: TOXIC BLAST, CHAIN STORM, SHATTER, NEURO SHOCK, OVERLOAD, DECAY FREEZE, CURSED AMPLIFY
15. **Build-menu keyboard nav** — 1-6 tabs, arrow keys to navigate slots, Enter to select
16. **SettingsStore** — persistent settings (cursor sensitivity, screen shake, SFX volume, particles)
17. **MenuScene** — version history panel, Settings overlay, 3-button footer (Codex/Blueprints/Settings)
18. **HelpScene codex** — Mutations section, Tower Synergies section, full 22-perk detail list
19. **CLAUDE.md rule** — mandatory version history + codex update on every feature change
20. **Raids (v0.10.0)** — camp always south of river; non-boss raiders drop 2×2 arrow towers on kill; raid auto-clears at wave end with partial reward
21. **Cursed enemies** — CURSED_ENEMY_KEYS set exported; cursed types blocked from spawning outside cursed zone; always purple tint; blocked by river physics (bridge removes blocker)
22. **Bridge cost** — reduced to 200 wood + 100 stone
23. **Pickaxe tiers** — ruby_pick/emerald_pick bumped to tier 4 so crystal_pick doesn't block crafting
24. **Chest respawn** — every 3 waves at dawn all opened chests reset
25. **Permanent mutations** — 15% chance at dawn for active mutation to become a permanent world curse
26. **Elite enemies** — 50% stronger (4.5× HP, 3× dmg, 2.25× spd)
27. **Codex in pause menu** — [CODEX] button launches HelpScene; ESC/BACK returns to game
28. **TikTok watermark** — "join.vibeschool on tiktok" bottom-right of main menu
29. **Armour system (v0.11.0)** — 5 sets (emerald/ruby/bone/iron/crystal), each with helmet+chest+pants+boots; full set bonuses; ARMOUR tab (#6) in craft menu; `_getArmorSet()` + `_recalcArmor()` in HUD; helmet/pants/setBoots saved/loaded/registry'd
30. **5-slot hotbar** — bottom-centre HUD, keys 1-5 when craft closed; slot 1=eat, slot 3=uncurse; hotbar renders item icon + count
31. **Backpack overhaul** — pre-build once + visibility toggle (no more freeze); EQUIPPED section at top; zero-count resources hidden; larger 12-13px text
32. **Dynamic resource panel** — only rows with >0 count shown, reflowed each frame
33. **Set bonus effects** — Ruby slow aura (64px at night), Bone ghost chance (20%), Ruby pants dodge (15%), Iron flat -8 dmg reduction (EnemyManager)
34. **Build-menu 7 tabs** — added ARMOUR tab between Gear and Cursed; keyboard nav keys 1-7
35. **Cave armour bonuses (v0.11.1)** — CaveScene + DeepCaveScene now carry helmet/pants/setBoots via registry; `_getArmorSet()` + `_getCaveSpeedMult()` helpers in both scenes; emerald boots +12% cave speed; emerald pants -100ms mine delay; full emerald set +25% dmg + 0.5 HP lifesteal per kill; emerald helmet +40px torch radius in deep cave
36. **Crystal craft discount** — `_getCraftDiscount()` in HUD applies 15% discount when crystal_pants equipped, 20% discount for full crystal set; applied to all slot purchases via `scaledCost`
