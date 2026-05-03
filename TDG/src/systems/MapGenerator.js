// ============================================================
// MapGenerator — procedural map creation
// ============================================================
import { TS, MW, MH, RESOURCE_NODES, CHEST_DEFS, CURSED_RESOURCE_NODES, DUNGEON_W, DUNGEON_H } from '../constants.js';
import { valueNoise, fbmNoise } from '../utils.js';

// River cuts across ~30% from top. Player spawns at row 30 (centre).
// Cursed zone = everything north of the river.
const RIVER_START_ROW_FRAC = 0.30;
const RIVER_WIDTH           = 3;

export class MapGenerator {
  constructor(scene) {
    this.scene = scene;
  }

  /** Build the full map: individual tile images + resource nodes + structures */
  generate(seed) {
    const scene = this.scene;

    // Init map data grid
    for (let y = 0; y < MH; y++) {
      scene.mapData[y] = [];
      for (let x = 0; x < MW; x++) {
        scene.mapData[y][x] = { terrain: 'ground', resource: null, structure: null };
      }
    }

    // Compute river band
    const riverTop = Math.round(MH * RIVER_START_ROW_FRAC);
    const riverBot = riverTop + RIVER_WIDTH - 1;
    scene.riverTop     = riverTop;
    scene.riverBot     = riverBot;
    scene.cursedZoneMaxY = riverTop - 1;

    const theme     = scene.mapTheme ?? 'grass';
    const gndPrefix = theme === 'desert' ? 'gnd_desert'
                    : theme === 'snow'   ? 'gnd_snow'
                    :                      'gnd';

    const cx = Math.floor(MW / 2);
    const cy = Math.floor(MH / 2);

    // ── Render every tile as an individual Image ──────────
    // No RenderTexture — RTs clip to the camera's initial viewport,
    // leaving tiles south of the visible area black. Individual images
    // are culled per-frame by the camera and batched by WebGL automatically.
    for (let y = 0; y < MH; y++) {
      for (let x = 0; x < MW; x++) {
        let key;
        const wx = x * TS + TS / 2;
        const wy = y * TS + TS / 2;
        const isBorder = x === 0 || y === 0 || x === MW - 1 || y === MH - 1;

        let bankTint = 0xFFFFFF;

        if (isBorder) {
          scene.mapData[y][x].terrain = 'bwall';
          key = 'bwall';
        } else if (y >= riverTop && y <= riverBot) {
          scene.mapData[y][x].terrain = 'river';
          key = 'river';
        } else if (y < riverTop) {
          scene.mapData[y][x].cursedZone = true;
          key = `gnd_cursed${Math.floor(valueNoise(x, y, seed) * 3)}`;
          // Southern bank of cursed zone — slightly lighter to show river edge
          if (y === riverTop - 1) bankTint = 0xBBAA99;
        } else {
          key = `${gndPrefix}${Math.floor(valueNoise(x, y, seed) * 3)}`;
          // Northern bank of safe zone — earthy tint to show river edge
          if (y === riverBot + 1) bankTint = 0xCC9966;
        }

        const img = scene.add.image(wx, wy, key).setDepth(-10);
        if (bankTint !== 0xFFFFFF) img.setTint(bankTint);
      }
    }

    this._spawnNodes(seed, cx, cy, riverTop, riverBot);
    this._spawnCursedNodes(seed, riverTop);
    this._placeCaveEntrance(seed, cx, cy, riverTop, riverBot);
    this._placeDungeonEntrance(seed, riverTop);
    this._buildRiverWalls(riverTop, riverBot);
    this._placeChests(seed, cx, cy, riverTop, riverBot);
    this._placeStarterChest(cx, cy);
  }

  _spawnNodes(seed, cx, cy, riverTop, riverBot) {
    const scene = this.scene;

    for (let y = 1; y < MH - 1; y++) {
      // Skip river and cursed zone
      if (y >= riverTop && y <= riverBot) continue;
      if (y < riverTop) continue;

      for (let x = 1; x < MW - 1; x++) {
        if (Math.abs(x - cx) < 8 && Math.abs(y - cy) < 8) continue;
        const chance = valueNoise(x * 7, y * 7, seed + 9999);
        if (chance >= 0.14) continue;
        const roll = valueNoise(x * 13, y * 13, seed + 1111);
        let cumulative = 0;
        for (const nt of RESOURCE_NODES) {
          cumulative += nt.w;
          if (roll < cumulative) {
            const range  = nt.amt[1] - nt.amt[0] + 1;
            const amount = nt.amt[0] + Math.floor(valueNoise(x, y, seed) * range);
            const sprite = scene.add.sprite(x * TS + TS / 2, y * TS + TS / 2, nt.key).setDepth(2);
            scene.mapData[y][x].resource = { type: nt.res, amt: amount, maxAmt: amount, sprite, tileX: x, tileY: y, respawnTimer: 0 };
            break;
          }
        }
      }
    }
  }

  _spawnCursedNodes(seed, riverTop) {
    const scene = this.scene;
    for (let y = 1; y < riverTop - 1; y++) {
      for (let x = 1; x < MW - 1; x++) {
        const cell = scene.mapData[y][x];
        if (cell.terrain !== 'ground' && cell.terrain !== undefined) continue;
        if (cell.resource || cell.structure) continue;
        const chance = valueNoise(x * 7 + 333, y * 7 + 444, seed + 22222);
        if (chance >= 0.12) continue;
        const roll = valueNoise(x * 11 + 555, y * 11 + 666, seed + 33333);
        let cumulative = 0;
        for (const nt of CURSED_RESOURCE_NODES) {
          cumulative += nt.w;
          if (roll < cumulative) {
            const range  = nt.amt[1] - nt.amt[0] + 1;
            const amount = nt.amt[0] + Math.floor(valueNoise(x, y, seed) * range);
            const sprite = scene.add.sprite(x * TS + TS / 2, y * TS + TS / 2, nt.key).setDepth(2);
            cell.resource = { type: nt.res, amt: amount, maxAmt: amount, sprite, tileX: x, tileY: y, respawnTimer: 0 };
            break;
          }
        }
      }
    }
  }

  /**
   * Create static physics bodies on all river tiles so the player
   * (and enemies) cannot walk through. These bodies are stored in
   * scene.riverGroup. When a bridge is placed, that tile's body
   * is removed from the group.
   */
  _buildRiverWalls(riverTop, riverBot) {
    const scene = this.scene;
    scene.riverGroup = scene.physics.add.staticGroup();
    // Map from tile key "tx,ty" → static body sprite for removal on bridge placement
    scene.riverBodies = {};

    for (let y = riverTop; y <= riverBot; y++) {
      for (let x = 1; x < MW - 1; x++) {
        const wx = x * TS + TS / 2;
        const wy = y * TS + TS / 2;
        // Invisible static rect
        const blocker = scene.add.rectangle(wx, wy, TS, TS, 0x000000, 0).setDepth(-5);
        scene.physics.add.existing(blocker, true);
        scene.riverGroup.add(blocker, false);
        scene.riverBodies[`${x},${y}`] = blocker;
      }
    }
    scene.riverGroup.refresh();
  }

  _placeCaveEntrance(seed, cx, cy, riverTop, riverBot) {
    const scene = this.scene;

    let tx = 2 + (Math.abs(seed * 7 + 37) % (MW - 4));
    let ty = 2 + (Math.abs(seed * 11 + 19) % (MH - 4));
    tx = Math.max(2, Math.min(MW - 3, tx));
    // Force cave entrance south of river (safe zone)
    ty = Math.max(riverBot + 2, Math.min(MH - 3, ty));

    while (Math.abs(tx - cx) + Math.abs(ty - cy) < 14) {
      tx = (tx + 7) % (MW - 4) + 2;
    }

    let found = null;
    outer: for (let r = 0; r <= 8; r++) {
      for (let dx2 = -r; dx2 <= r; dx2++) {
        for (let dy2 = -r; dy2 <= r; dy2++) {
          if (Math.abs(dx2) !== r && Math.abs(dy2) !== r) continue;
          const x = tx + dx2, y = ty + dy2;
          if (x < 2 || y < 2 || x >= MW - 2 || y >= MH - 2) continue;
          // Stay south of river
          if (y < riverBot + 2) continue;
          const cell = scene.mapData[y][x];
          if (cell.terrain === 'deep' || cell.terrain === 'bwall' || cell.terrain === 'river') continue;
          if (cell.resource || cell.isCaveEntrance) continue;
          found = { x, y };
          break outer;
        }
      }
    }

    if (!found) {
      outer2: for (let y = riverBot + 2; y < MH - 2; y++) {
        for (let x = 2; x < MW - 2; x++) {
          if (Math.abs(x - cx) + Math.abs(y - cy) < 14) continue;
          const cell = scene.mapData[y][x];
          if (cell.terrain === 'deep' || cell.terrain === 'bwall' || cell.terrain === 'river') continue;
          if (cell.resource || cell.isCaveEntrance) continue;
          found = { x, y };
          break outer2;
        }
      }
    }
    if (!found) return;

    const { x, y } = found;
    scene.mapData[y][x].isCaveEntrance = true;
    scene.add.sprite(x * TS + TS / 2, y * TS + TS / 2, 'cave_entrance').setDepth(2);
    scene.caveEntranceTile = { x, y };

    const label = scene.add.text(x * TS + TS / 2, y * TS - 12, 'CAVE', {
      fontSize: '11px', color: '#FFD700', fontStyle: 'bold', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5, 1).setDepth(3);
    scene.tweens.add({ targets: label, alpha: { from: 0.5, to: 1 }, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /**
   * Place chests:
   * South of river (safe zone): 2 regular + 1 boss
   * North of river (cursed zone): 1 cursed + 1 legendary + 1 blueprint + 1 trap
   */
  _placeChests(seed, cx, cy, riverTop, riverBot) {
    const scene = this.scene;
    scene.chests = [];

    // South-of-river chests (original 3)
    const southTypes = ['regular', 'regular', 'boss'];
    this._placeChestGroup(seed, cx, cy, southTypes, riverBot + 1, MH - 2, 0);

    // Cursed zone chests
    const northTypes = ['cursed', 'legendary', 'blueprint', 'trap'];
    this._placeChestGroup(seed + 11111, cx, cy, northTypes, 1, riverTop - 1, 100);
  }

  _placeChestGroup(seed, cx, cy, types, minY, maxY, seedOffset) {
    const scene = this.scene;
    const positions = [];
    const TOTAL = types.length;
    for (let a = 0; a < 600 && positions.length < TOTAL; a++) {
      const tx = 2 + Math.floor(valueNoise(a * 17 + 1 + seedOffset, a * 23 + 3 + seedOffset, seed + 77777) * (MW - 4));
      const ty = minY + Math.floor(valueNoise(a * 19 + 5 + seedOffset, a * 29 + 7 + seedOffset, seed + 88888) * (maxY - minY));
      if (ty < minY || ty > maxY) continue;
      const cell = scene.mapData[ty]?.[tx];
      if (!cell) continue;
      if (cell.terrain === 'bwall' || cell.terrain === 'deep' || cell.terrain === 'river') continue;
      if (cell.resource || cell.structure || cell.isCaveEntrance || cell.isChest) continue;
      let tooClose = false;
      for (const p of positions) {
        if (Math.abs(p.tx - tx) + Math.abs(p.ty - ty) < 8) { tooClose = true; break; }
      }
      if (tooClose) continue;
      positions.push({ tx, ty });
    }

    const CHEST_TEX = {
      regular: 'chest_locked', boss: 'chest_locked',
      cursed: 'chest_cursed', trap: 'chest_trap',
      legendary: 'chest_legendary', blueprint: 'chest_blueprint',
    };
    const CHEST_LABEL = {
      regular: 'CHEST', boss: 'BOSS CHEST',
      cursed: 'CURSED CHEST', trap: '??? CHEST',
      legendary: 'LEGENDARY!', blueprint: 'BLUEPRINT CHEST',
    };
    const CHEST_COL = {
      regular: '#C8A882', boss: '#D4A017',
      cursed: '#CC44FF', trap: '#FF4400',
      legendary: '#FFDD00', blueprint: '#44AAFF',
    };

    positions.forEach((pos, i) => {
      const type  = types[i];
      if (!type) return;
      const { tx, ty } = pos;
      const wx = tx * TS + TS / 2, wy = ty * TS + TS / 2;
      const sp = scene.add.sprite(wx, wy, CHEST_TEX[type] ?? 'chest_locked').setDepth(3);
      const chest = { type, tx, ty, sprite: sp, isOpen: false, label: null };
      scene.chests.push(chest);
      scene.mapData[ty][tx].isChest = true;

      const lbl = scene.add.text(wx, wy - 22, CHEST_LABEL[type] ?? 'CHEST', {
        fontSize: '9px', color: CHEST_COL[type] ?? '#C8A882', fontFamily: 'monospace',
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5, 1).setDepth(4);
      scene.tweens.add({ targets: lbl, alpha: { from: 0.6, to: 1 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      chest.label = lbl;
    });
  }

  /** Place the dungeon entrance in the cursed zone (north of river) */
  _placeDungeonEntrance(seed, riverTop) {
    const scene = this.scene;
    // Deterministic position in cursed zone, away from borders
    let tx = 4 + (Math.abs(seed * 5 + 91) % (MW - 8));
    let ty = 2 + (Math.abs(seed * 13 + 47) % Math.max(1, riverTop - 4));
    tx = Math.max(3, Math.min(MW - 4, tx));
    ty = Math.max(2, Math.min(riverTop - 2, ty));

    // Find nearest clear cell
    let found = null;
    outer: for (let r = 0; r <= 10; r++) {
      for (let dx2 = -r; dx2 <= r; dx2++) {
        for (let dy2 = -r; dy2 <= r; dy2++) {
          if (Math.abs(dx2) !== r && Math.abs(dy2) !== r) continue;
          const x = tx + dx2, y = ty + dy2;
          if (x < 2 || y < 1 || x >= MW - 2 || y >= riverTop - 1) continue;
          const cell = scene.mapData[y]?.[x];
          if (!cell) continue;
          if (cell.terrain === 'bwall' || cell.terrain === 'river') continue;
          if (cell.resource || cell.structure || cell.isCaveEntrance || cell.isChest) continue;
          found = { x, y };
          break outer;
        }
      }
    }
    if (!found) return;

    const { x, y } = found;
    scene.mapData[y][x].isDungeonEntrance = true;
    scene.dungeonEntranceTile = { x, y };

    scene.add.sprite(x * TS + TS / 2, y * TS + TS / 2, 'dungeon_entrance').setDepth(3);
    const lbl = scene.add.text(x * TS + TS / 2, y * TS - 12, 'DUNGEON [E]', {
      fontSize: '10px', color: '#AA55FF', fontStyle: 'bold', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5, 1).setDepth(4);
    scene.tweens.add({ targets: lbl, alpha: { from: 0.5, to: 1 }, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /** Place a single free starter chest a few tiles east of spawn */
  _placeStarterChest(cx, cy) {
    const scene = this.scene;
    // Try offsets radiating east of center until we find a clear tile
    const offsets = [
      { dx: 3, dy: 0 }, { dx: 3, dy: 1 }, { dx: 3, dy: -1 },
      { dx: 4, dy: 0 }, { dx: 2, dy: 2 }, { dx: 0, dy: 3 },
    ];
    for (const { dx, dy } of offsets) {
      const tx = cx + dx, ty = cy + dy;
      const cell = scene.mapData[ty]?.[tx];
      if (!cell) continue;
      if (cell.terrain === 'bwall' || cell.terrain === 'deep' || cell.terrain === 'river') continue;
      if (cell.resource || cell.structure || cell.isChest || cell.isCaveEntrance) continue;

      const wx = tx * TS + TS / 2, wy = ty * TS + TS / 2;
      const sp  = scene.add.sprite(wx, wy, 'chest_locked').setDepth(3).setTint(0xAAFFAA);
      const chest = { type: 'starter', tx, ty, sprite: sp, isOpen: false, label: null };
      scene.chests.push(chest);
      scene.mapData[ty][tx].isChest = true;

      const lbl = scene.add.text(wx, wy - 22, 'STARTER CHEST', {
        fontSize: '9px', color: '#AAFFAA', fontFamily: 'monospace',
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5, 1).setDepth(4);
      scene.tweens.add({ targets: lbl, alpha: { from: 0.5, to: 1 }, duration: 700, yoyo: true, repeat: -1 });
      chest.label = lbl;
      return;
    }
  }
}
