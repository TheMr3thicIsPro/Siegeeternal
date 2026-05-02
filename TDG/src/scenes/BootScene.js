// ============================================================
// BootScene — generates all textures programmatically
// ============================================================
import { VW, VH, TS } from '../constants.js';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    this._generateTextures();
    this.scene.start('Menu');
  }

  _generateTextures() {
    // Helper: create a Graphics object, run draw callback, bake to texture, destroy
    const tex = (key, w, h, draw) => {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      draw(g);
      g.generateTexture(key, w, h);
      g.destroy();
    };

    // ── Ground tiles (grass) ──────────────────────────────
    const gndVariants = [
      { base: 0x4A7C3F, dark: 0x3A6030, light: 0x60A050 },  // gnd0 — mid grass
      { base: 0x527543, dark: 0x42603A, light: 0x6AAA58 },  // gnd1 — lighter grass
      { base: 0x3E6836, dark: 0x304F28, light: 0x527845 },  // gnd2 — darker grass
    ];
    gndVariants.forEach(({ base, dark, light }, i) => tex(`gnd${i}`, TS, TS, g => {
      // Base grass fill
      g.fillStyle(base);  g.fillRect(0, 0, TS, TS);
      // Dark shadow patches (gives depth / clumping)
      g.fillStyle(dark, 0.40);
      g.fillRect(2 + i * 4,  6,  3, 2);
      g.fillRect(20 - i * 2, 18, 4, 2);
      g.fillRect(12,         26, 3, 2);
      // Bright grass blades (1-px wide thin vertical strokes)
      g.fillStyle(light, 0.70);
      g.fillRect(4 + i * 3,  7,  1, 4);
      g.fillRect(21 - i,     19, 1, 4);
      g.fillRect(14,         27, 1, 3);
      g.fillRect(28 - i * 2, 4,  1, 4);
      g.fillRect(8 + i,      13, 1, 3);
      // Tiny yellow flower on gnd1
      if (i === 1) { g.fillStyle(0xFFEE44, 0.60); g.fillRect(26, 8, 2, 2); }
      // Tiny stone pebble on gnd2
      if (i === 2) { g.fillStyle(0x9A9080, 0.50); g.fillCircle(7, 24, 2); }
      // Subtle tile-edge darkening for a soft grid feel
      g.fillStyle(dark, 0.15);
      g.fillRect(0, 0, TS, 1); g.fillRect(0, 0, 1, TS);
    }));

    tex('deep', TS, TS, g => {
      g.fillStyle(0x1C1620); g.fillRect(0, 0, TS, TS);
      g.fillStyle(0x261B2A, 0.5); g.fillRect(3, 3, 26, 26);
      g.fillStyle(0x1A1218, 0.3); g.fillRect(5, 5, 6, 1); g.fillRect(18, 22, 8, 1);
    });

    // boundary wall
    tex('bwall', TS, TS, g => {
      g.fillStyle(0x4A4540); g.fillRect(0, 0, TS, TS);
      g.fillStyle(0x3A3530);
      g.fillRect(0, 0, TS, 2); g.fillRect(0, 0, 2, TS);
      g.fillRect(0, 15, TS, 2); g.fillRect(16, 0, 2, 15);
      g.fillStyle(0x5A5550);
      g.fillRect(3, 3, 12, 11); g.fillRect(18, 3, 12, 11);
      g.fillRect(3, 18, 12, 11); g.fillRect(18, 18, 12, 11);
    });

    // ── Wall types ────────────────────────────────────────
    // Wood wall — warm brown planks
    tex('wall_wood', TS, TS, g => {
      g.fillStyle(0x8B6040); g.fillRect(0, 0, TS, TS);
      g.fillStyle(0x6B4828);
      g.fillRect(0, 0, TS, 2); g.fillRect(0, 10, TS, 2); g.fillRect(0, 21, TS, 2); g.fillRect(0, 30, TS, 2);
      g.fillRect(0, 0, 2, 10); g.fillRect(14, 0, 2, 10);
      g.fillRect(7, 10, 2, 11); g.fillRect(22, 10, 2, 11);
      g.fillStyle(0xA07858, 0.6); g.fillRect(3, 3, 9, 5); g.fillRect(17, 3, 11, 5);
      g.fillRect(9, 13, 11, 5); g.fillRect(24, 13, 6, 5);
    });

    // Stone wall — grey masonry (canonical wall_stone key)
    tex('wall_stone', TS, TS, g => {
      g.fillStyle(0x7A7065); g.fillRect(0, 0, TS, TS);
      g.fillStyle(0x5A5550);
      g.fillRect(0, 0, TS, 2); g.fillRect(0, 0, 2, TS);
      g.fillRect(0, 15, TS, 2); g.fillRect(16, 0, 2, 14);
      g.fillStyle(0x9A908A);
      g.fillRect(4, 4, 10, 9); g.fillRect(18, 4, 10, 9);
      g.fillRect(4, 20, 10, 8); g.fillRect(18, 20, 10, 8);
    });
    // Legacy alias for save-compatibility
    tex('pwall', TS, TS, g => {
      g.fillStyle(0x7A7065); g.fillRect(0, 0, TS, TS);
      g.fillStyle(0x5A5550);
      g.fillRect(0, 0, TS, 2); g.fillRect(0, 0, 2, TS);
      g.fillRect(0, 15, TS, 2); g.fillRect(16, 0, 2, 14);
      g.fillStyle(0x9A908A);
      g.fillRect(4, 4, 10, 9); g.fillRect(18, 4, 10, 9);
      g.fillRect(4, 20, 10, 8); g.fillRect(18, 20, 10, 8);
    });

    // Iron wall — dark metallic with rivets
    tex('wall_iron', TS, TS, g => {
      g.fillStyle(0x4A4E58); g.fillRect(0, 0, TS, TS);
      g.fillStyle(0x35383E);
      g.fillRect(0, 0, TS, 2); g.fillRect(0, 0, 2, TS);
      g.fillRect(0, 15, TS, 2); g.fillRect(16, 0, 2, 14);
      g.fillStyle(0x6A7080); g.fillRect(3, 3, 11, 10); g.fillRect(18, 3, 11, 10);
      g.fillRect(3, 18, 11, 10); g.fillRect(18, 18, 11, 10);
      // Rivets
      g.fillStyle(0x90A0B0);
      g.fillCircle(4, 4, 1.5); g.fillCircle(13, 4, 1.5); g.fillCircle(4, 12, 1.5); g.fillCircle(13, 12, 1.5);
      g.fillCircle(19, 4, 1.5); g.fillCircle(28, 4, 1.5); g.fillCircle(19, 12, 1.5); g.fillCircle(28, 12, 1.5);
    });

    // Crystal wall — glowing blue-teal crystal facets
    tex('wall_crystal', TS, TS, g => {
      g.fillStyle(0x1E3A4A); g.fillRect(0, 0, TS, TS);
      g.fillStyle(0x2A6080, 0.8);
      g.fillRect(0, 0, TS, 2); g.fillRect(0, 0, 2, TS);
      g.fillRect(0, 15, TS, 2); g.fillRect(16, 0, 2, 14);
      // Crystal facets
      g.fillStyle(0x4ABCCC); g.fillTriangle(4, 14, 14, 4, 14, 14);
      g.fillStyle(0x2A9AAA); g.fillTriangle(4, 14, 14, 14, 9, 22);
      g.fillStyle(0x5BBCB0); g.fillTriangle(18, 14, 28, 4, 28, 14);
      g.fillStyle(0x3A9C90); g.fillTriangle(18, 14, 28, 14, 23, 22);
      g.fillStyle(0x7DDDD6, 0.5);
      g.fillRect(6, 5, 2, 6); g.fillRect(20, 5, 2, 6);
    });

    // Cave entrance — bear cave: rocky arch + dark oval mouth
    tex('cave_entrance', 48, 48, g => {
      // Earthy background
      g.fillStyle(0x2E1E10); g.fillRect(0, 0, 48, 48);
      // Rocky mass — left boulder
      g.fillStyle(0x6A6055); g.fillEllipse(8, 30, 22, 32);
      // Rocky mass — right boulder
      g.fillStyle(0x605850); g.fillEllipse(40, 30, 22, 32);
      // Rocky arch — top
      g.fillStyle(0x706860); g.fillEllipse(24, 10, 38, 24);
      // Rock highlights
      g.fillStyle(0x8A8075, 0.7); g.fillEllipse(10, 22, 12, 14);
      g.fillStyle(0x807870, 0.7); g.fillEllipse(38, 22, 12, 14);
      // Dark cave mouth
      g.fillStyle(0x040205); g.fillEllipse(24, 30, 28, 34);
      // Inner shadow
      g.fillStyle(0x0A060E, 0.5); g.fillEllipse(24, 28, 20, 24);
      // Rock cracks
      g.fillStyle(0x3A3530);
      g.fillRect(9, 25, 3, 1); g.fillRect(12, 28, 2, 1);
      g.fillRect(34, 25, 3, 1); g.fillRect(35, 28, 2, 1);
      // Dirt/moss at base
      g.fillStyle(0x3A5A2A, 0.55); g.fillEllipse(16, 46, 14, 6);
      g.fillStyle(0x3A5020, 0.45); g.fillEllipse(33, 46, 10, 5);
    });

    // Cave floor — dark stone, subtle cracked pattern
    tex('cave_floor', TS, TS, g => {
      g.fillStyle(0x1E1A24); g.fillRect(0, 0, TS, TS);
      g.fillStyle(0x2A2535, 0.5); g.fillRect(3, 8, 9, 1); g.fillRect(18, 4, 7, 1);
      g.fillStyle(0x161320, 0.6); g.fillRect(5, 18, 12, 1); g.fillRect(20, 22, 8, 1);
      g.fillStyle(0x302840, 0.3); g.fillRect(0, 0, 2, TS); g.fillRect(0, 0, TS, 2);
    });

    // ── Resource nodes ─────────────────────────────────────
    tex('tree', TS, TS, g => {
      g.fillStyle(0x3D2E1A); g.fillRect(13, 20, 6, 12);
      g.fillStyle(0x3A5631); g.fillCircle(16, 12, 11);
      g.fillStyle(0x4A6741); g.fillCircle(16, 11, 9);
      g.fillStyle(0x5A7A51, 0.5); g.fillCircle(12, 9, 5);
    });

    tex('stonenode', TS, TS, g => {
      g.fillStyle(0x7A7065); g.fillEllipse(16, 19, 26, 18);
      g.fillStyle(0x9A908A); g.fillEllipse(12, 14, 12, 8);
      g.fillStyle(0x5A5550); g.fillEllipse(22, 22, 7, 5);
    });

    tex('coalnode', TS, TS, g => {
      g.fillStyle(0x252525); g.fillEllipse(16, 18, 22, 16);
      g.fillStyle(0xD2691E, 0.7); g.fillCircle(12, 14, 3); g.fillCircle(20, 18, 2);
      g.fillStyle(0xFF6400, 0.35); g.fillCircle(15, 17, 2);
    });

    tex('ironnode', TS, TS, g => {
      g.fillStyle(0x8B7355); g.fillEllipse(16, 18, 24, 18);
      g.fillStyle(0xC0A882); g.fillEllipse(11, 13, 10, 7);
      g.fillStyle(0xA08060); g.fillEllipse(21, 20, 7, 5);
    });

    tex('goldnode', TS, TS, g => {
      g.fillStyle(0xD4A017); g.fillEllipse(16, 18, 22, 16);
      g.fillStyle(0xF0C030); g.fillEllipse(11, 13, 10, 7);
      g.fillStyle(0xFFE060, 0.7); g.fillCircle(10, 12, 4);
      g.fillStyle(0xA07010); g.fillEllipse(22, 21, 7, 5);
    });

    tex('crystalnode', TS, TS, g => {
      g.fillStyle(0x3BBCB0, 0.2); g.fillRect(0, 0, TS, TS);
      g.fillStyle(0x5BBCB0); g.fillTriangle(16, 4, 9, 28, 23, 28);
      g.fillStyle(0x3A9C90); g.fillTriangle(16, 8, 11, 28, 16, 28);
      g.fillStyle(0x7DDDD6, 0.6); g.fillTriangle(13, 11, 9, 24, 17, 24);
    });

    // Pickaxe tool icon
    tex('pickaxe', TS, TS, g => {
      g.fillStyle(0x5C4033); g.fillRect(8, 20, 5, 12);
      g.fillStyle(0xC0A882); g.fillTriangle(6, 4, 24, 12, 8, 20);
      g.fillStyle(0x8B7355); g.fillRect(7, 18, 3, 4);
    });

    // Bed structure
    tex('bed', TS, TS, g => {
      g.fillStyle(0x8B6040); g.fillRect(4, 16, 24, 12);
      g.fillStyle(0xC8B0A0); g.fillRect(4, 8,  24, 10);
      g.fillStyle(0xEDE0C4); g.fillEllipse(10, 11, 10, 8);
      g.fillStyle(0x6B4828); g.fillRect(4, 16, 3, 14); g.fillRect(25, 16, 3, 14);
    });

    // Wood sword
    tex('sword_wood', TS, TS, g => {
      g.fillStyle(0x8B6040); g.fillRect(14, 4, 4, 20);
      g.fillStyle(0x6B4828); g.fillRect(10, 22, 12, 3);
      g.fillStyle(0xA07858); g.fillRect(15, 25, 2, 5);
    });

    // Stone sword
    tex('sword_stone', TS, TS, g => {
      g.fillStyle(0x9A908A); g.fillRect(14, 4, 4, 20);
      g.fillStyle(0x7A7065); g.fillRect(10, 22, 12, 3);
      g.fillStyle(0x8B7355); g.fillRect(15, 25, 2, 5);
    });

    // Iron sword
    tex('sword_iron', TS, TS, g => {
      g.fillStyle(0xC0C8D0); g.fillRect(14, 3, 4, 21);
      g.fillStyle(0x8090A0); g.fillRect(9, 22, 14, 3);
      g.fillStyle(0x8B7355); g.fillRect(15, 25, 2, 5);
      g.fillStyle(0xE0E8F0, 0.6); g.fillRect(15, 4, 2, 18);
    });

    // Crystal sword
    tex('sword_crystal', TS, TS, g => {
      g.fillStyle(0x4ABCCC); g.fillRect(14, 3, 4, 21);
      g.fillStyle(0x2A9AAA); g.fillRect(9, 22, 14, 3);
      g.fillStyle(0x8B7355); g.fillRect(15, 25, 2, 5);
      g.fillStyle(0x7DDDD6, 0.7); g.fillRect(15, 4, 2, 18);
    });

    // Iron chestplate icon
    tex('armor_iron', TS, TS, g => {
      g.fillStyle(0x6A7080); g.fillRect(6, 8, 20, 18);
      g.fillStyle(0x8090A0); g.fillRect(8, 6, 6, 4); g.fillRect(18, 6, 6, 4);
      g.fillStyle(0x4A5060); g.fillRect(6, 8, 20, 3); g.fillRect(6, 8, 3, 18); g.fillRect(23, 8, 3, 18);
      g.fillStyle(0x90A0B0, 0.5); g.fillRect(9, 11, 14, 8);
    });

    // Crystal chestplate icon
    tex('armor_crystal', TS, TS, g => {
      g.fillStyle(0x1E3A4A); g.fillRect(6, 8, 20, 18);
      g.fillStyle(0x4ABCCC); g.fillRect(8, 6, 6, 4); g.fillRect(18, 6, 6, 4);
      g.fillStyle(0x2A6080); g.fillRect(6, 8, 20, 3); g.fillRect(6, 8, 3, 18); g.fillRect(23, 8, 3, 18);
      g.fillStyle(0x5BBCB0, 0.6); g.fillTriangle(10, 12, 22, 12, 16, 22);
    });

    // ── Player ────────────────────────────────────────────
    tex('player', TS, TS, g => {
      g.fillStyle(0xC8A96E); g.fillEllipse(16, 20, 18, 22);
      g.fillStyle(0x8B7355); g.fillCircle(16, 9, 6);
      g.fillStyle(0xC8A96E, 0.5); g.fillTriangle(11, 7, 21, 7, 16, 15);
    });

    // ── Enemies (32×32) ───────────────────────────────────
    tex('e_shambler', TS, TS, g => {
      g.fillStyle(0xC45C3A); g.fillEllipse(16, 21, 20, 16); g.fillEllipse(16, 11, 14, 12);
      g.fillStyle(0xA43C1A, 0.5); g.fillRect(8, 20, 16, 2);
    });

    tex('e_skitterer', TS, TS, g => {
      g.fillStyle(0xE87A5D); g.fillEllipse(16, 19, 14, 10); g.fillEllipse(16, 13, 8, 8);
      g.fillStyle(0xD86A4D);
      for (let i = 0; i < 3; i++) { g.fillRect(6 + i * 4, 20, 1, 5); g.fillRect(19 + i * 3, 20, 1, 5); }
    });

    tex('e_ironback', TS, TS, g => {
      g.fillStyle(0x6B7B8D); g.fillRect(5, 12, 22, 14); g.fillEllipse(16, 12, 18, 8);
      g.fillStyle(0x8B9BAD); g.fillEllipse(16, 17, 20, 14);
      g.fillStyle(0x5B6B7D); g.fillRect(5, 15, 22, 2);
    });

    tex('e_burrower', TS, TS, g => {
      g.fillStyle(0x8B6914); g.fillEllipse(16, 18, 18, 12); g.fillEllipse(16, 12, 9, 12);
      g.fillStyle(0x6B4910, 0.5); g.fillRect(9, 18, 14, 2); g.fillRect(9, 22, 14, 2);
    });

    tex('e_looter', TS, TS, g => {
      g.fillStyle(0xD4A017); g.fillRect(12, 8, 8, 18); g.fillCircle(16, 8, 5);
      g.fillStyle(0xB4801A); g.fillEllipse(23, 20, 9, 11);
      g.fillStyle(0xC49027, 0.5); g.fillCircle(23, 20, 4);
    });

    tex('e_shamanbeast', TS, TS, g => {
      g.fillStyle(0xA87DC8); g.fillRect(13, 10, 6, 20); g.fillCircle(16, 8, 5);
      g.fillStyle(0xC8A040); g.fillRect(24, 4, 2, 22); g.fillCircle(25, 4, 3);
      g.fillStyle(0x9B6BB5, 0.25); g.fillEllipse(16, 30, 14, 5);
    });

    tex('e_shade', TS, TS, g => {
      g.fillStyle(0x9B6BB5, 0.12); g.fillEllipse(16, 16, 18, 22);
      g.fillStyle(0x9B6BB5, 0.45); g.fillEllipse(16, 10, 10, 12);
      g.lineStyle(1.5, 0xBB8BD5, 0.55); g.strokeEllipse(16, 16, 18, 22);
    });

    tex('e_nightcrawler', TS, TS, g => {
      g.fillStyle(0x7B3F8C); g.fillEllipse(16, 16, 16, 12);
      g.fillStyle(0x6B2F7C);
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 4;
        g.fillRect(16 + Math.cos(a) * 7 - 1, 16 + Math.sin(a) * 7 - 1, 2, 7);
        g.fillRect(16 - Math.cos(a) * 7 - 1, 16 + Math.sin(a) * 7 - 1, 2, 7);
      }
    });

    tex('e_voidbat', TS, TS, g => {
      g.fillStyle(0x6B4499); g.fillEllipse(16, 16, 10, 8);
      g.fillStyle(0x8B64B9, 0.65);
      g.fillTriangle(16, 16, 2, 8, 14, 21);
      g.fillTriangle(16, 16, 30, 8, 18, 21);
    });

    // Boss sprites (48×48)
    tex('e_siege_hulk', 48, 48, g => {
      g.fillStyle(0xD4A017); g.fillRect(4, 10, 40, 34);
      g.fillStyle(0xA07010); g.fillRect(8, 14, 32, 26);
      g.fillStyle(0x604010); g.fillRect(14, 18, 20, 12);
      g.fillStyle(0xF0C030); g.fillRect(18, 20, 6, 2); g.fillRect(22, 18, 2, 6);
    });

    tex('e_pale_mother', 48, 48, g => {
      g.fillStyle(0xE8D8F8, 0.8); g.fillRect(16, 8, 16, 36); g.fillCircle(24, 8, 9);
      g.fillStyle(0xD0C0E8, 0.4); g.fillEllipse(24, 42, 22, 6);
      g.fillStyle(0xC8B8E8, 0.5); for (let i = 0; i < 3; i++) g.fillCircle(8 + i * 16, 24, 4);
    });

    tex('e_ironclad', 48, 48, g => {
      g.fillStyle(0x8090A8); g.fillRect(4, 6, 40, 38);
      g.fillStyle(0x607090); g.fillRect(4, 6, 40, 8); g.fillRect(4, 6, 8, 38); g.fillRect(36, 6, 8, 38);
      g.fillStyle(0xA0B0C8); g.fillRect(14, 16, 20, 12);
      g.fillStyle(0x60A0C0); g.fillCircle(24, 22, 5);
    });

    // ── Towers ────────────────────────────────────────────
    tex('tw_arrow', TS, TS, g => {
      g.fillStyle(0x8B7355); g.fillRect(6, 16, 20, 16); g.fillRect(10, 9, 12, 9);
      g.fillStyle(0x7A6545); g.fillRect(6, 6, 4, 5); g.fillRect(14, 6, 4, 5); g.fillRect(22, 6, 4, 5);
    });

    tex('tw_ballista', TS, TS, g => {
      g.fillStyle(0x5C4033); g.fillRect(8, 18, 16, 13);
      g.fillStyle(0x4A3025); g.fillRect(4, 14, 24, 6);
      g.fillStyle(0x6C5045); g.fillRect(14, 8, 4, 8);
    });

    tex('tw_flame', TS, TS, g => {
      g.fillStyle(0xC45C3A); g.fillRect(6, 18, 20, 13);
      g.fillStyle(0xFF8C00); g.fillTriangle(10, 18, 16, 5, 22, 18);
      g.fillStyle(0xFF4500, 0.7); g.fillTriangle(13, 18, 16, 10, 19, 18);
    });

    tex('tw_bonefire', TS, TS, g => {
      g.fillStyle(0x3D2B1F); g.fillRect(10, 22, 12, 9);
      g.fillStyle(0xFF6400); g.fillTriangle(8, 22, 16, 5, 24, 22);
      g.fillStyle(0xFFAA00); g.fillTriangle(11, 22, 16, 10, 21, 22);
      g.fillStyle(0xFFDD00); g.fillTriangle(13, 22, 16, 15, 19, 22);
    });

    tex('tw_frost', TS, TS, g => {
      g.fillStyle(0x5BBCB0); g.fillRect(12, 13, 8, 18); g.fillTriangle(6, 13, 26, 13, 16, 2);
      g.fillStyle(0x3A9C90, 0.45); g.fillTriangle(10, 13, 22, 13, 16, 6);
    });

    tex('tw_cannon', TS, TS, g => {
      g.fillStyle(0x4A4A4A); g.fillRect(4, 18, 24, 12); g.fillCircle(14, 20, 9);
      g.fillStyle(0x2A2A2A); g.fillRect(18, 14, 11, 6);
    });

    tex('tw_volt', TS, TS, g => {
      g.fillStyle(0x8B8030); g.fillRect(10, 14, 12, 17);
      g.fillStyle(0xF0E060); g.fillTriangle(6, 14, 26, 14, 16, 2);
      g.fillStyle(0xFFFF99, 0.6); g.fillRect(13, 6, 6, 8);
    });

    tex('tw_longbow', TS, TS, g => {
      g.fillStyle(0x6B4828); g.fillRect(6, 18, 20, 14);
      g.lineStyle(3, 0x5C3A1E); g.strokeEllipse(16, 12, 12, 28);
      g.lineStyle(1.5, 0xEDE0C4); g.lineBetween(16, 1, 16, 27);
      g.lineStyle(2, 0xC0A882); g.lineBetween(10, 12, 22, 12);
      g.fillStyle(0xD4A017); g.fillCircle(16, 12, 3);
    });

    tex('tw_poison', TS, TS, g => {
      g.fillStyle(0x3A6B2A); g.fillRect(6, 16, 20, 14);
      g.fillStyle(0x5A9B3A); g.fillCircle(16, 13, 8);
      g.fillStyle(0x2A8B1A, 0.7); g.fillCircle(13, 12, 4); g.fillCircle(19, 11, 3);
    });

    // ── Machines ─────────────────────────────────────────
    tex('mc_wood', TS, TS, g => {
      g.fillStyle(0x6B8F4E); g.fillRect(4, 13, 24, 15);
      g.fillStyle(0x5A7A40); g.fillRect(4, 13, 4, 15);
      g.fillStyle(0xB0B0B0); g.fillCircle(22, 18, 6);
      g.fillStyle(0x909090);
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; g.fillRect(22 + Math.cos(a) * 5, 18 + Math.sin(a) * 5, 2, 2); }
    });

    tex('mc_stone', TS, TS, g => {
      g.fillStyle(0x7A7065); g.fillRect(4, 15, 24, 13);
      g.fillStyle(0x5A5550); g.fillTriangle(14, 4, 18, 4, 16, 15); g.fillRect(12, 9, 8, 6);
    });

    tex('mc_kiln', TS, TS, g => {
      g.fillStyle(0x8B2500); g.fillRect(4, 10, 24, 18);
      g.fillStyle(0xFF4500); g.fillRect(10, 14, 12, 10);
      g.fillStyle(0xFF8C00, 0.65); g.fillRect(12, 15, 8, 6);
    });

    tex('mc_scrap', TS, TS, g => {
      g.fillStyle(0x6B7B8D); g.fillRect(2, 16, 28, 13); g.fillRect(2, 13, 8, 5); g.fillRect(22, 13, 8, 5);
      g.fillStyle(0x9AB0C0); g.fillRect(6, 18, 20, 6);
    });

    // ── Projectiles ───────────────────────────────────────
    tex('proj_arrow',  8, 8, g => { g.fillStyle(0xEDE0C4); g.fillCircle(4, 4, 3); });
    tex('proj_flame',  8, 8, g => { g.fillStyle(0xFF6400); g.fillCircle(4, 4, 4); });
    tex('proj_ice',    8, 8, g => { g.fillStyle(0x5BBCB0); g.fillCircle(4, 4, 3); });
    tex('proj_volt',   8, 8, g => { g.fillStyle(0xFFFF60); g.fillCircle(4, 4, 4); });
    tex('proj_poison', 8, 8, g => { g.fillStyle(0x5ADB3A); g.fillCircle(4, 4, 3); });
    tex('particle',    6, 6, g => { g.fillStyle(0xEDE0C4); g.fillCircle(3, 3, 3); });

    // ── UI / HUD ──────────────────────────────────────────
    const iconDefs = [
      ['ico_wood', 0x6B8F4E], ['ico_stone', 0x7A7065], ['ico_bone', 0xEDE0C4],
      ['ico_coal', 0x333333], ['ico_iron', 0xC0A882],  ['ico_crystal', 0x5BBCB0],
      ['ico_gold', 0xD4A017],
    ];
    iconDefs.forEach(([k, c]) => tex(k, 10, 10, g => { g.fillStyle(c); g.fillRect(0, 0, 10, 10); }));

    tex('cursor',     TS, TS, g => { g.lineStyle(2, 0xFFFFFF, 0.8); g.strokeRect(2, 2, 28, 28); g.lineStyle(1, 0xFFFFFF, 0.3); g.lineBetween(16, 0, 16, 32); g.lineBetween(0, 16, 32, 16); });
    tex('cursor_red', TS, TS, g => { g.lineStyle(2, 0xFF4444, 0.9); g.strokeRect(2, 2, 28, 28); g.fillStyle(0xFF0000, 0.15); g.fillRect(2, 2, 28, 28); });

    // Souls icon — purple wisp
    tex('ico_souls', 10, 10, g => {
      g.fillStyle(0xAA44FF); g.fillCircle(5, 5, 4);
      g.fillStyle(0xCC88FF, 0.6); g.fillCircle(4, 4, 2);
    });

    // Fire Wall — orange-red crackling flames
    tex('wall_fire', TS, TS, g => {
      g.fillStyle(0x1A0A00); g.fillRect(0, 0, TS, TS);
      g.fillStyle(0xFF4500, 0.8); g.fillTriangle(4, TS, 10, 10, 16, TS);
      g.fillStyle(0xFF6400, 0.7); g.fillTriangle(16, TS, 22, 8, 28, TS);
      g.fillStyle(0xFFAA00, 0.6); g.fillTriangle(8, TS, 13, 16, 18, TS);
      g.fillStyle(0xFFDD00, 0.5); g.fillTriangle(18, TS, 22, 18, 26, TS);
      g.fillStyle(0xFF2200, 0.4);
      g.fillRect(0, 0, TS, 2); g.fillRect(0, 0, 2, TS);
      g.fillRect(0, TS - 2, TS, 2); g.fillRect(TS - 2, 0, 2, TS);
    });

    // Sunbeamer tower — crystal lens + sun rays
    tex('tw_sunbeamer', TS, TS, g => {
      g.fillStyle(0x8B7355); g.fillRect(10, 20, 12, 12);
      g.fillStyle(0xFFDD44); g.fillCircle(16, 13, 7);
      g.fillStyle(0xFFFF99, 0.7); g.fillCircle(16, 13, 4);
      g.fillStyle(0xFFCC00, 0.6);
      g.fillRect(14, 2, 4, 5);
      g.fillRect(22, 5, 5, 4);
      g.fillRect(25, 12, 5, 4);
      g.fillRect(2, 12, 5, 4);
      g.fillRect(5, 5, 4, 5);
    });

    // Upgrade token icon — gold star
    tex('upgrade_token', TS, TS, g => {
      g.fillStyle(0xD4A017);
      g.fillTriangle(16, 4, 20, 14, 30, 14);
      g.fillTriangle(16, 4, 12, 14, 2, 14);
      g.fillTriangle(16, 28, 20, 18, 30, 18);
      g.fillTriangle(16, 28, 12, 18, 2, 18);
      g.fillRect(12, 12, 8, 8);
      g.fillStyle(0xFFE060, 0.7); g.fillCircle(16, 16, 5);
    });

    // Regen token icon — green cross / heal
    tex('regen_token', TS, TS, g => {
      g.fillStyle(0x228822); g.fillRect(12, 4, 8, 24); g.fillRect(4, 12, 24, 8);
      g.fillStyle(0x44FF44, 0.6); g.fillRect(13, 5, 6, 22); g.fillRect(5, 13, 22, 6);
    });

    // Sun beam projectile — bright yellow
    tex('proj_sunbeam', 8, 8, g => { g.fillStyle(0xFFEE00); g.fillCircle(4, 4, 4); g.fillStyle(0xFFFFAA, 0.8); g.fillCircle(4, 4, 2); });

    // Mob Soul Wall
    tex('wall_mob_soul', TS, TS, g => {
      g.fillStyle(0x1A0A2E); g.fillRect(0, 0, TS, TS);
      g.fillStyle(0x6A0DAD, 0.7);
      g.fillRect(0, 0, TS, 2); g.fillRect(0, 0, 2, TS);
      g.fillRect(0, 15, TS, 2); g.fillRect(16, 0, 2, 14);
      g.fillStyle(0xAA44FF, 0.5); g.fillCircle(9, 9, 5); g.fillCircle(23, 23, 4);
      g.fillStyle(0xCC88FF, 0.3); g.fillCircle(9, 9, 3); g.fillCircle(23, 23, 2);
    });

    // Crystal Wraith — deep cave exclusive (ghostly teal crystal form)
    tex('e_cave_wraith', TS, TS, g => {
      // Translucent ethereal body
      g.fillStyle(0x44CCCC, 0.15); g.fillEllipse(16, 18, 22, 26);
      // Crystal shard core (asymmetric for an alien feel)
      g.fillStyle(0x5DDDD6, 0.85); g.fillTriangle(16, 4, 10, 22, 22, 22);
      g.fillStyle(0x3ABAB0, 0.90); g.fillTriangle(16, 6, 13, 22, 16, 22);
      // Side crystal shards
      g.fillStyle(0x88EEEE, 0.70); g.fillTriangle(8, 16, 4, 26, 12, 24);
      g.fillStyle(0x66DDDD, 0.70); g.fillTriangle(24, 16, 28, 26, 20, 24);
      // Glowing inner core
      g.fillStyle(0xCCFFFF, 0.90); g.fillCircle(16, 14, 4);
      g.fillStyle(0xFFFFFF, 0.60); g.fillCircle(16, 13, 2);
      // Wisp trails at bottom
      g.fillStyle(0x44CCCC, 0.30); g.fillEllipse(13, 28, 6, 4); g.fillEllipse(19, 30, 5, 3);
    });

    // TowerTacker enemy
    tex('e_towertacker', TS, TS, g => {
      g.fillStyle(0xFF3300); g.fillRect(10, 14, 12, 10);
      g.fillStyle(0xFF6600); g.fillCircle(16, 11, 6);
      g.fillStyle(0xFFAA00); g.fillRect(8, 20, 4, 6); g.fillRect(20, 20, 4, 6);
      g.fillStyle(0xFF0000, 0.8); g.fillTriangle(12, 14, 20, 14, 16, 8);
    });

    // Raid Chief — raid boss, armoured bandit leader (crimson + dark plate)
    tex('e_raid_chief', TS, TS, g => {
      // Armoured body — dark red plate
      g.fillStyle(0x8B1A1A); g.fillRect(9, 14, 14, 14);
      // Helmet — dark crimson dome with visor slit
      g.fillStyle(0xAA2222); g.fillEllipse(16, 10, 16, 14);
      g.fillStyle(0x330000); g.fillRect(11, 9, 10, 3); // visor slit
      // Shoulder pauldrons
      g.fillStyle(0x771111); g.fillRect(5, 15, 5, 7); g.fillRect(22, 15, 5, 7);
      // Legs
      g.fillStyle(0x660000); g.fillRect(9, 26, 5, 5); g.fillRect(18, 26, 5, 5);
      // Sword glint
      g.fillStyle(0xCCCCCC, 0.9); g.fillRect(23, 10, 3, 14);
      g.fillStyle(0xFFFFFF, 0.6); g.fillRect(24, 11, 1, 12);
      // Highlight on helmet
      g.fillStyle(0xFF4444, 0.4); g.fillEllipse(14, 8, 6, 5);
    });

    // Bow weapon icon
    tex('bow', TS, TS, g => {
      g.lineStyle(3, 0x8B6040); g.strokeEllipse(16, 16, 10, 26);
      g.lineStyle(1, 0xC8A882); g.lineBetween(16, 3, 16, 29);
      g.lineStyle(2, 0xEDE0C4); g.lineBetween(11, 16, 21, 16);
    });

    // Upgraded Bow icon — glowing emerald-tipped
    tex('bow_upgraded', TS, TS, g => {
      g.lineStyle(3, 0x5BBCB0); g.strokeEllipse(16, 16, 10, 26);
      g.lineStyle(1, 0x3A9C90); g.lineBetween(16, 3, 16, 29);
      g.lineStyle(2, 0x7DDDD6); g.lineBetween(11, 16, 21, 16);
      g.fillStyle(0x5BBCB0, 0.7); g.fillCircle(16, 3, 3);
    });

    // Iron pickaxe icon
    tex('iron_pickaxe', TS, TS, g => {
      g.fillStyle(0x5C4033); g.fillRect(8, 20, 5, 12);
      g.fillStyle(0xC0C8D0); g.fillTriangle(6, 4, 24, 12, 8, 20);
      g.fillStyle(0x8090A0); g.fillRect(7, 18, 3, 4);
    });

    // Crystal pickaxe icon
    tex('crystal_pickaxe', TS, TS, g => {
      g.fillStyle(0x3D2B1F); g.fillRect(8, 20, 5, 12);
      g.fillStyle(0x5BBCB0); g.fillTriangle(6, 4, 24, 12, 8, 20);
      g.fillStyle(0x3A9C90); g.fillRect(7, 18, 3, 4);
      g.fillStyle(0x7DDDD6, 0.7); g.fillTriangle(8, 6, 20, 10, 10, 16);
    });

    // Emerald pickaxe icon
    tex('emerald_pickaxe', TS, TS, g => {
      g.fillStyle(0x2E4A2E); g.fillRect(8, 20, 5, 12);
      g.fillStyle(0x50C878); g.fillTriangle(6, 4, 24, 12, 8, 20);
      g.fillStyle(0x228B22); g.fillRect(7, 18, 3, 4);
      g.fillStyle(0x90EE90, 0.7); g.fillTriangle(8, 6, 20, 10, 10, 16);
    });

    // Ruby pickaxe icon
    tex('ruby_pickaxe', TS, TS, g => {
      g.fillStyle(0x3D2B1F); g.fillRect(8, 20, 5, 12);
      g.fillStyle(0xCC2244); g.fillTriangle(6, 4, 24, 12, 8, 20);
      g.fillStyle(0x881122); g.fillRect(7, 18, 3, 4);
      g.fillStyle(0xFF6688, 0.7); g.fillTriangle(8, 6, 20, 10, 10, 16);
    });

    // Ruby ore node
    tex('rubynode', TS, TS, g => {
      g.fillStyle(0x8B1A2E); g.fillEllipse(16, 18, 22, 16);
      g.fillStyle(0xCC2244); g.fillEllipse(11, 13, 10, 7);
      g.fillStyle(0xFF4466, 0.8); g.fillCircle(10, 12, 4);
      g.fillStyle(0x660011); g.fillEllipse(22, 21, 7, 5);
    });

    // Emerald ore node
    tex('emeraldnode', TS, TS, g => {
      g.fillStyle(0x1A4A2A); g.fillEllipse(16, 18, 22, 16);
      g.fillStyle(0x50C878); g.fillEllipse(11, 13, 10, 7);
      g.fillStyle(0x90EE90, 0.8); g.fillCircle(10, 12, 4);
      g.fillStyle(0x0A6B28); g.fillEllipse(22, 21, 7, 5);
    });

    // Ruby sword icon
    tex('sword_ruby', TS, TS, g => {
      g.fillStyle(0xCC2244); g.fillRect(14, 3, 4, 21);
      g.fillStyle(0x881122); g.fillRect(9, 22, 14, 3);
      g.fillStyle(0x8B7355); g.fillRect(15, 25, 2, 5);
      g.fillStyle(0xFF6688, 0.7); g.fillRect(15, 4, 2, 18);
    });

    // Emerald sword icon
    tex('sword_emerald', TS, TS, g => {
      g.fillStyle(0x50C878); g.fillRect(14, 3, 4, 21);
      g.fillStyle(0x228B22); g.fillRect(9, 22, 14, 3);
      g.fillStyle(0x8B7355); g.fillRect(15, 25, 2, 5);
      g.fillStyle(0x90EE90, 0.7); g.fillRect(15, 4, 2, 18);
    });

    // Bone chestplate icon
    tex('armor_bone', TS, TS, g => {
      g.fillStyle(0xC8B89A); g.fillRect(6, 8, 20, 18);
      g.fillStyle(0xEDE0C4); g.fillRect(8, 6, 6, 4); g.fillRect(18, 6, 6, 4);
      g.fillStyle(0xA89A7A); g.fillRect(6, 8, 20, 3); g.fillRect(6, 8, 3, 18); g.fillRect(23, 8, 3, 18);
      g.fillStyle(0xFFFFDD, 0.5); g.fillRect(9, 11, 14, 8);
    });

    // Ruby chestplate icon
    tex('armor_ruby', TS, TS, g => {
      g.fillStyle(0x8B1A2E); g.fillRect(6, 8, 20, 18);
      g.fillStyle(0xCC2244); g.fillRect(8, 6, 6, 4); g.fillRect(18, 6, 6, 4);
      g.fillStyle(0x660011); g.fillRect(6, 8, 20, 3); g.fillRect(6, 8, 3, 18); g.fillRect(23, 8, 3, 18);
      g.fillStyle(0xFF4466, 0.5); g.fillTriangle(10, 12, 22, 12, 16, 22);
    });

    // Emerald chestplate icon
    tex('armor_emerald', TS, TS, g => {
      g.fillStyle(0x1A4A2A); g.fillRect(6, 8, 20, 18);
      g.fillStyle(0x50C878); g.fillRect(8, 6, 6, 4); g.fillRect(18, 6, 6, 4);
      g.fillStyle(0x0A6B28); g.fillRect(6, 8, 20, 3); g.fillRect(6, 8, 3, 18); g.fillRect(23, 8, 3, 18);
      g.fillStyle(0x90EE90, 0.5); g.fillTriangle(10, 12, 22, 12, 16, 22);
    });

    // Speed Boots icon
    tex('boots_speed', TS, TS, g => {
      g.fillStyle(0x5BBCB0); g.fillRect(4, 18, 18, 10); g.fillRect(4, 10, 10, 10);
      g.fillStyle(0x3A9C90); g.fillRect(4, 26, 22, 4);
      g.fillStyle(0x7DDDD6, 0.8); g.fillRect(6, 12, 6, 6);
      // Speed lines
      g.fillStyle(0xFFFFFF, 0.5); g.fillRect(14, 13, 10, 1); g.fillRect(16, 16, 8, 1);
    });

    // ── Helmets ─────────────────────────────────────────────
    // Helper: helmet shape = brim bottom + rounded top
    const mkHelmet = (primary, accent, shine) => g => {
      g.fillStyle(primary); g.fillRect(4, 10, 24, 16);   // main body
      g.fillStyle(primary); g.fillRect(6,  7, 20,  6);   // dome
      g.fillStyle(accent);  g.fillRect(2, 22, 28,  4);   // brim
      g.fillStyle(shine, 0.4); g.fillRect(8, 9, 8, 5);   // highlight
    };
    tex('helmet_emerald', TS, TS, mkHelmet(0x1A6B3A, 0x50C878, 0xA0FFB0));
    tex('helmet_ruby',    TS, TS, mkHelmet(0x7B0E23, 0xCC2244, 0xFF99AA));
    tex('helmet_bone',    TS, TS, mkHelmet(0xC8B89A, 0xEDE0C4, 0xFFFFEE));
    tex('helmet_iron',    TS, TS, mkHelmet(0x4A5A70, 0x7090B0, 0xCCDDEE));
    tex('helmet_crystal', TS, TS, mkHelmet(0x2A5A8A, 0x5BBCB0, 0xAAEEFF));

    // ── Pants ───────────────────────────────────────────────
    // Helper: pants shape = wide waist + two legs
    const mkPants = (primary, accent) => g => {
      g.fillStyle(primary); g.fillRect(4, 4, 24, 10);    // waist
      g.fillStyle(primary); g.fillRect(4, 12, 10, 16);   // left leg
      g.fillStyle(primary); g.fillRect(18, 12, 10, 16);  // right leg
      g.fillStyle(accent);  g.fillRect(4, 4, 24, 2);     // belt
      g.fillStyle(accent);  g.fillRect(6, 12, 8, 1);     // left leg stripe
      g.fillStyle(accent);  g.fillRect(20, 12, 8, 1);    // right leg stripe
    };
    tex('pants_emerald', TS, TS, mkPants(0x1A4A2A, 0x50C878));
    tex('pants_ruby',    TS, TS, mkPants(0x5C0A1A, 0xCC2244));
    tex('pants_bone',    TS, TS, mkPants(0xB0A080, 0xEDE0C4));
    tex('pants_iron',    TS, TS, mkPants(0x3A4A5A, 0x7090B0));
    tex('pants_crystal', TS, TS, mkPants(0x1A3A5A, 0x5BBCB0));

    // ── Set Boots ───────────────────────────────────────────
    // Helper: boot shape = foot + ankle
    const mkBoot = (primary, accent) => g => {
      g.fillStyle(primary); g.fillRect(4, 10, 14, 16);   // ankle/calf
      g.fillStyle(primary); g.fillRect(4, 22, 22, 8);    // foot
      g.fillStyle(accent);  g.fillRect(4, 28, 22, 2);    // sole
      g.fillStyle(accent, 0.6); g.fillRect(6, 12, 8, 6); // highlight
    };
    tex('boots_emerald', TS, TS, mkBoot(0x1A6B3A, 0x50C878));
    tex('boots_ruby',    TS, TS, mkBoot(0x7B0E23, 0xCC2244));
    tex('boots_bone',    TS, TS, mkBoot(0xB0A080, 0xEDE0C4));
    tex('boots_iron',    TS, TS, mkBoot(0x3A4A5A, 0x7090B0));
    tex('boots_crystal', TS, TS, mkBoot(0x1A3A5A, 0x5BBCB0));

    // Ruby icon for HUD resource bar
    tex('ico_ruby', 10, 10, g => { g.fillStyle(0xCC2244); g.fillRect(0, 0, 10, 10); });
    // Emerald icon for HUD resource bar
    tex('ico_emerald', 10, 10, g => { g.fillStyle(0x50C878); g.fillRect(0, 0, 10, 10); });

    // ── Food & cows ───────────────────────────────────────
    // Cow — simple white/brown body
    tex('cow', TS, TS, g => {
      g.fillStyle(0xF0EAD0); g.fillEllipse(16, 20, 22, 14);
      g.fillStyle(0xF0EAD0); g.fillCircle(16, 10, 7);
      g.fillStyle(0x8B6040);
      g.fillEllipse(9, 20, 6, 10); g.fillEllipse(14, 20, 6, 10);
      g.fillEllipse(18, 20, 6, 10); g.fillEllipse(23, 20, 6, 10);
      g.fillStyle(0xC87040, 0.7); g.fillEllipse(8, 17, 7, 5);
      g.fillStyle(0xFF88AA, 0.8); g.fillEllipse(16, 27, 8, 4);
    });

    // Campfire — stacked logs with flames
    tex('campfire', TS, TS, g => {
      g.fillStyle(0x8B6040); g.fillRect(8, 22, 6, 8); g.fillRect(18, 22, 6, 8);
      g.fillStyle(0x6B4828); g.fillRect(5, 26, 22, 4);
      g.fillStyle(0xFF4500, 0.9); g.fillTriangle(10, 26, 16, 6, 22, 26);
      g.fillStyle(0xFF8C00, 0.8); g.fillTriangle(12, 26, 16, 11, 20, 26);
      g.fillStyle(0xFFDD00, 0.7); g.fillTriangle(14, 26, 16, 16, 18, 26);
    });

    // Raw meat — pink/red chunk
    tex('raw_meat', TS, TS, g => {
      g.fillStyle(0xCC5566); g.fillEllipse(16, 18, 22, 16);
      g.fillStyle(0xFF8899, 0.7); g.fillEllipse(13, 14, 10, 7);
      g.fillStyle(0xEE4455, 0.5); g.fillEllipse(20, 20, 8, 6);
    });

    // Cooked meat — brown
    tex('cooked_meat', TS, TS, g => {
      g.fillStyle(0x8B4513); g.fillEllipse(16, 18, 22, 16);
      g.fillStyle(0xC06030, 0.8); g.fillEllipse(13, 14, 10, 7);
      g.fillStyle(0x5A2A0A, 0.6); g.fillEllipse(20, 21, 8, 5);
      g.fillStyle(0xFFCC44, 0.4); g.fillEllipse(11, 16, 5, 3);
    });

    // ── Traps ─────────────────────────────────────────────
    // Landmine — flat disc with trigger
    tex('landmine', TS, TS, g => {
      g.fillStyle(0x3A3A3A); g.fillCircle(16, 18, 11);
      g.fillStyle(0x555555); g.fillCircle(16, 18, 9);
      g.fillStyle(0xCC4400); g.fillCircle(16, 14, 3);
      g.fillStyle(0x888888); g.fillRect(14, 26, 4, 4);
    });

    // Tripwire — thin line with stakes
    tex('tripwire', TS, TS, g => {
      g.fillStyle(0x8B6040); g.fillRect(4, 24, 4, 7); g.fillRect(24, 24, 4, 7);
      g.lineStyle(1.5, 0xC8A882, 0.9); g.lineBetween(4, 24, 28, 24);
      g.fillStyle(0xC8A882, 0.5); g.fillRect(0, 23, TS, 2);
    });

    // Spike pit — dark hole with spikes
    tex('spike_pit', TS, TS, g => {
      g.fillStyle(0x1A0E08); g.fillEllipse(16, 20, 26, 18);
      g.fillStyle(0xC0A882);
      g.fillTriangle(10, 22, 12, 10, 14, 22);
      g.fillTriangle(15, 22, 17, 8,  19, 22);
      g.fillTriangle(20, 22, 22, 12, 24, 22);
    });

    // Glue pool — sticky yellow-green puddle
    tex('glue_pool', TS, TS, g => {
      g.fillStyle(0xAACC22, 0.7); g.fillEllipse(16, 20, 28, 16);
      g.fillStyle(0xCCEE44, 0.5); g.fillEllipse(14, 18, 14, 8);
      g.fillStyle(0xDDFF55, 0.4); g.fillEllipse(18, 22, 8, 5);
    });

    // Uncurse Token — teal gem with cleansing aura
    tex('uncurse_token', TS, TS, g => {
      g.fillStyle(0x0A1A18); g.fillRect(0, 0, TS, TS);
      g.fillStyle(0x00DDAA, 0.9); g.fillTriangle(16, 4, 26, 22, 6, 22);
      g.fillStyle(0x00FFCC, 0.6); g.fillTriangle(16, 8, 23, 20, 9, 20);
      g.fillStyle(0xFFFFFF, 0.85); g.fillCircle(16, 15, 3);
      g.lineStyle(1, 0x44FFCC, 0.7);
      g.strokeCircle(16, 16, 12);
    });

    // Torch — stick with flame
    tex('torch', TS, TS, g => {
      g.fillStyle(0x8B6040); g.fillRect(13, 16, 6, 14); // handle
      g.fillStyle(0x3A2010); g.fillRect(12, 14, 8, 4);  // wrap
      g.fillStyle(0xFF8C00, 0.9); g.fillTriangle(10, 14, 16, 2, 22, 14); // outer flame
      g.fillStyle(0xFFDD00, 1);   g.fillTriangle(13, 14, 16, 5, 19, 14); // inner flame
      g.fillStyle(0xFFFFAA, 0.8); g.fillCircle(16, 9, 3); // glow core
    });

    // ── Desert ground tiles ────────────────────────────────
    const desertVariants = [
      { base: 0xD4A96A, dark: 0xB88A4A, light: 0xE8C080 },
      { base: 0xCC9F5E, dark: 0xAA8040, light: 0xE0B870 },
      { base: 0xBE9050, dark: 0x9A7030, light: 0xD4A860 },
    ];
    desertVariants.forEach(({ base, dark, light }, i) => tex(`gnd_desert${i}`, TS, TS, g => {
      g.fillStyle(base);  g.fillRect(0, 0, TS, TS);
      // sand ripples
      g.fillStyle(dark, 0.30);
      g.fillRect(4 + i * 3,  8,  18, 1);
      g.fillRect(6 - i,      16, 20, 1);
      g.fillRect(2 + i * 2,  24, 16, 1);
      // bright sand highlights
      g.fillStyle(light, 0.45);
      g.fillRect(8 + i * 2,  6,  12, 1);
      g.fillRect(10 - i,     14, 14, 1);
      // pebble on desert0
      if (i === 0) { g.fillStyle(0xB07850, 0.6); g.fillCircle(24, 10, 2); }
      // cactus stub on desert2
      if (i === 2) { g.fillStyle(0x3A8A2A, 0.8); g.fillRect(13, 18, 4, 8); g.fillRect(9, 20, 12, 3); }
      // edge darkening
      g.fillStyle(dark, 0.15);
      g.fillRect(0, 0, TS, 1); g.fillRect(0, 0, 1, TS);
    }));

    // ── Snow ground tiles ──────────────────────────────────
    const snowVariants = [
      { base: 0xDCEAF0, dark: 0xA8C0CC, light: 0xF0F8FF },
      { base: 0xCEDFE8, dark: 0x9CB0BC, light: 0xE8F4FC },
      { base: 0xE4EEFA, dark: 0xB4C8D8, light: 0xF8FCFF },
    ];
    snowVariants.forEach(({ base, dark, light }, i) => tex(`gnd_snow${i}`, TS, TS, g => {
      g.fillStyle(base);  g.fillRect(0, 0, TS, TS);
      // snow surface bumps
      g.fillStyle(dark, 0.28);
      g.fillEllipse(8 + i * 4, 10, 8, 3);
      g.fillEllipse(22 - i * 2, 22, 10, 3);
      // sparkle highlights
      g.fillStyle(light, 0.75);
      g.fillCircle(6 + i,       7, 1);
      g.fillCircle(22 - i * 2, 18, 1);
      g.fillCircle(14,          27, 1);
      // boot prints on snow1
      if (i === 1) { g.fillStyle(dark, 0.55); g.fillEllipse(10, 14, 4, 3); g.fillEllipse(18, 22, 4, 3); }
      // icy gloss patch on snow2
      if (i === 2) { g.fillStyle(0xAADDEE, 0.35); g.fillEllipse(20, 10, 12, 6); }
      g.fillStyle(dark, 0.12);
      g.fillRect(0, 0, TS, 1); g.fillRect(0, 0, 1, TS);
    }));

    // ── Supply crate — mini objective drop ─────────────────
    tex('supply_crate', TS, TS, g => {
      g.fillStyle(0x8B6040); g.fillRect(4, 4, 24, 24);
      g.fillStyle(0x6B4828);
      g.fillRect(4,  4, 24, 3); g.fillRect(4, 25, 24, 3);
      g.fillRect(4,  4,  3, 24); g.fillRect(25, 4, 3, 24);
      g.fillRect(14, 4,  4, 24);
      g.fillStyle(0xA07858, 0.7); g.fillRect(6, 8, 7, 8); g.fillRect(19, 8, 7, 8);
      // golden clasp
      g.fillStyle(0xD4A017, 0.9); g.fillRect(14, 13, 4, 6); g.fillRect(12, 15, 8, 2);
    });

    // ── Chests ─────────────────────────────────────────────
    tex('chest_locked', TS, TS, g => {
      // Body
      g.fillStyle(0x8B6040); g.fillRect(4, 13, 24, 15);
      // Lid
      g.fillStyle(0xA07858); g.fillRect(4, 6, 24, 9);
      // Lid trim
      g.fillStyle(0xD4A017); g.fillRect(4, 14, 24, 2);
      // Corner bands
      g.fillStyle(0x6B4828);
      g.fillRect(4, 6, 3, 22); g.fillRect(25, 6, 3, 22);
      // Lock plate
      g.fillStyle(0xC8A040); g.fillRect(13, 12, 6, 7);
      // Keyhole
      g.fillStyle(0x1A0A00); g.fillCircle(16, 14, 1.5); g.fillRect(15, 14, 2, 4);
    });

    tex('chest_open', TS, TS, g => {
      // Open lid (tilted back)
      g.fillStyle(0xA07858); g.fillRect(4, 2, 24, 7);
      g.fillStyle(0x6B4828); g.fillRect(4, 2, 3, 7); g.fillRect(25, 2, 3, 7);
      // Body
      g.fillStyle(0x8B6040); g.fillRect(4, 12, 24, 16);
      g.fillStyle(0x6B4828); g.fillRect(4, 12, 3, 16); g.fillRect(25, 12, 3, 16);
      // Lid trim
      g.fillStyle(0xD4A017); g.fillRect(4, 11, 24, 2);
      // Interior glow
      g.fillStyle(0xFFDD44, 0.45); g.fillRect(7, 13, 18, 11);
      // Gold coins
      g.fillStyle(0xFFCC00, 0.9);
      g.fillCircle(11, 19, 3); g.fillCircle(17, 17, 2); g.fillCircle(22, 20, 3);
    });

    // ── Keys ───────────────────────────────────────────────
    tex('key_regular', TS, TS, g => {
      // Bow
      g.fillStyle(0xC8A882); g.fillCircle(12, 12, 6);
      g.fillStyle(0x8B7355); g.fillCircle(12, 12, 3);
      // Shaft
      g.fillStyle(0xC8A882); g.fillRect(17, 10, 12, 4);
      // Teeth
      g.fillRect(25, 14, 3, 4); g.fillRect(20, 14, 3, 3);
    });

    tex('key_boss', TS, TS, g => {
      // Ornate gold bow
      g.fillStyle(0xD4A017); g.fillCircle(11, 12, 7);
      g.fillStyle(0xA07010); g.fillCircle(11, 12, 4);
      g.fillStyle(0xFFE060, 0.7); g.fillCircle(10, 11, 2);
      // Red gem centre
      g.fillStyle(0xCC2244); g.fillCircle(11, 12, 2);
      // Shaft
      g.fillStyle(0xD4A017); g.fillRect(17, 10, 13, 4);
      // Teeth (taller)
      g.fillRect(26, 14, 3, 5); g.fillRect(21, 14, 3, 4); g.fillRect(16, 14, 3, 3);
    });

    // ── River & Bridge ────────────────────────────────────
    tex('river', TS, TS, g => {
      g.fillStyle(0x1A4A8B); g.fillRect(0, 0, TS, TS);
      g.fillStyle(0x2A6AAB, 0.6); g.fillRect(2, 4, 28, 4); g.fillRect(2, 14, 24, 3); g.fillRect(4, 22, 26, 3);
      g.fillStyle(0x5BBCDD, 0.25); g.fillRect(3, 5, 10, 2); g.fillRect(18, 15, 8, 2);
    });
    tex('bridge', TS, TS, g => {
      g.fillStyle(0x6B4828); g.fillRect(0, 8, TS, 16);
      g.fillStyle(0x8B6040); g.fillRect(0, 10, TS, 12);
      // Planks
      g.fillStyle(0x5A3820);
      for (let x = 0; x < 4; x++) g.fillRect(x * 8, 10, 2, 12);
      // Rope rails
      g.lineStyle(2, 0xC8A882, 0.8); g.lineBetween(0, 9, TS, 9); g.lineBetween(0, 21, TS, 21);
    });

    // ── Cursed ground (area 2) — dark violet, clearly distinct from void ─
    const cursedBases = [0x3A1060, 0x2E0A52, 0x441268];
    for (let i = 0; i < 3; i++) {
      tex(`gnd_cursed${i}`, TS, TS, g => {
        // Base: visible dark violet
        g.fillStyle(cursedBases[i]); g.fillRect(0, 0, TS, TS);
        // Darker patch for surface variation
        g.fillStyle(0x220840, 0.55); g.fillRect(i * 3, i * 4, 14 + i, 12 + i);
        // Glowing purple vein / wisp
        g.fillStyle(0xAA44EE, 0.35); g.fillCircle(8 + i * 6, 9 + i * 5, 3 + i);
        g.fillStyle(0x8822CC, 0.25); g.fillRect(4 + i, 20 + i, 10, 3);
        // Subtle crack lines
        g.fillStyle(0x110330, 0.70);
        g.fillRect(0, 0, TS, 1); g.fillRect(0, 0, 1, TS);
        g.fillRect(i * 4, i * 3 + 6, 8, 1);
      });
    }

    // ── New Chest types ───────────────────────────────────
    tex('chest_cursed', TS, TS, g => {
      g.fillStyle(0x3A0A5A); g.fillRect(4, 13, 24, 15);
      g.fillStyle(0x5A0A8A); g.fillRect(4, 6, 24, 9);
      g.fillStyle(0xAA44FF); g.fillRect(4, 14, 24, 2);
      g.fillStyle(0x2A0040); g.fillRect(4, 6, 3, 22); g.fillRect(25, 6, 3, 22);
      g.fillStyle(0x7722BB); g.fillRect(13, 12, 6, 7);
      g.fillStyle(0xCC88FF, 0.6); g.fillCircle(16, 14, 2);
    });
    tex('chest_trap', TS, TS, g => {
      g.fillStyle(0x4A1A0A); g.fillRect(4, 13, 24, 15);
      g.fillStyle(0x8B2A0A); g.fillRect(4, 6, 24, 9);
      g.fillStyle(0xFF4400); g.fillRect(4, 14, 24, 2);
      g.fillStyle(0x2A0A00); g.fillRect(4, 6, 3, 22); g.fillRect(25, 6, 3, 22);
      g.fillStyle(0xCC3300); g.fillRect(13, 12, 6, 7);
      // Skull icon
      g.fillStyle(0xFFFFFF, 0.8); g.fillCircle(16, 14, 2); g.fillRect(14, 14, 4, 3);
    });
    tex('chest_legendary', TS, TS, g => {
      g.fillStyle(0x4A3800); g.fillRect(4, 13, 24, 15);
      g.fillStyle(0x8B6800); g.fillRect(4, 6, 24, 9);
      g.fillStyle(0xFFDD00); g.fillRect(4, 14, 24, 2);
      g.fillStyle(0xD4A017); g.fillRect(4, 6, 3, 22); g.fillRect(25, 6, 3, 22);
      g.fillStyle(0xFFE060); g.fillRect(13, 12, 6, 7);
      g.fillStyle(0xFFFFAA, 0.9); g.fillCircle(16, 14, 2);
      // Stars
      g.fillStyle(0xFFDD44, 0.9); g.fillCircle(8, 8, 2); g.fillCircle(24, 8, 2); g.fillCircle(16, 4, 2);
    });
    tex('chest_blueprint', TS, TS, g => {
      g.fillStyle(0x0A2A4A); g.fillRect(4, 13, 24, 15);
      g.fillStyle(0x0A4A8A); g.fillRect(4, 6, 24, 9);
      g.fillStyle(0x44AAFF); g.fillRect(4, 14, 24, 2);
      g.fillStyle(0x0A1A3A); g.fillRect(4, 6, 3, 22); g.fillRect(25, 6, 3, 22);
      // Blueprint paper icon
      g.fillStyle(0xDDEEFF, 0.9); g.fillRect(12, 9, 8, 10);
      g.lineStyle(1, 0x44AAFF, 0.8); g.lineBetween(13, 11, 19, 11); g.lineBetween(13, 13, 19, 13); g.lineBetween(13, 15, 17, 15);
    });

    // ── Cursed resource nodes ─────────────────────────────
    tex('cursed_node', TS, TS, g => {
      g.fillStyle(0x440066); g.fillEllipse(16, 18, 22, 16);
      g.fillStyle(0x8833CC); g.fillEllipse(11, 13, 10, 7);
      g.fillStyle(0xCC44FF, 0.7); g.fillCircle(10, 12, 4);
      g.fillStyle(0xAA44FF, 0.4); g.fillCircle(18, 20, 3);
    });
    tex('void_node', TS, TS, g => {
      g.fillStyle(0x000033); g.fillEllipse(16, 18, 22, 16);
      g.fillStyle(0x2222AA); g.fillEllipse(11, 13, 10, 7);
      g.fillStyle(0x4444FF, 0.7); g.fillCircle(10, 12, 4);
      g.fillStyle(0x6688FF, 0.5); g.fillCircle(20, 19, 3);
    });
    tex('corrupt_wood', TS, TS, g => {
      g.fillStyle(0x2A1A0A); g.fillRect(13, 20, 6, 12);
      g.fillStyle(0x3A2030); g.fillCircle(16, 12, 11);
      g.fillStyle(0x4A2A40); g.fillCircle(16, 11, 9);
      g.fillStyle(0x6633AA, 0.4); g.fillCircle(12, 9, 5);
    });

    // ── Relics ─────────────────────────────────────────────
    tex('relic_blood', TS, TS, g => {
      g.fillStyle(0xFF2244); g.fillCircle(16, 16, 12);
      g.fillStyle(0x880011); g.fillCircle(16, 16, 8);
      g.fillStyle(0xFF6688, 0.7); g.fillCircle(13, 13, 4);
    });
    tex('relic_time', TS, TS, g => {
      g.fillStyle(0x44FFAA); g.fillCircle(16, 16, 12);
      g.fillStyle(0x008855); g.fillCircle(16, 16, 8);
      g.fillStyle(0x88FFCC, 0.7); g.fillCircle(13, 13, 4);
      g.lineStyle(2, 0xFFFFFF, 0.5); g.lineBetween(16, 8, 16, 16); g.lineBetween(16, 16, 22, 16);
    });
    tex('relic_greed', TS, TS, g => {
      g.fillStyle(0xFFCC00); g.fillCircle(16, 16, 12);
      g.fillStyle(0xAA8800); g.fillCircle(16, 16, 8);
      g.fillStyle(0xFFEE66, 0.7); g.fillCircle(13, 13, 4);
    });
    tex('relic_soul', TS, TS, g => {
      g.fillStyle(0xAA44FF); g.fillCircle(16, 16, 12);
      g.fillStyle(0x550088); g.fillCircle(16, 16, 8);
      g.fillStyle(0xCC88FF, 0.7); g.fillCircle(13, 13, 4);
    });

    // ── Blueprint item icon ────────────────────────────────
    tex('blueprint_item', TS, TS, g => {
      g.fillStyle(0x0A2A5A); g.fillRect(4, 4, 24, 24);
      g.fillStyle(0xDDEEFF, 0.95); g.fillRect(6, 6, 20, 20);
      g.lineStyle(1.5, 0x4499FF, 0.9);
      g.lineBetween(8, 9, 24, 9); g.lineBetween(8, 12, 24, 12);
      g.lineBetween(8, 15, 20, 15); g.lineBetween(8, 18, 22, 18);
      g.lineBetween(8, 21, 18, 21);
      g.fillStyle(0x44AAFF, 0.4); g.fillRect(6, 6, 20, 3);
    });

    // ── Cursed Tower sprites ───────────────────────────────
    tex('tw_soul_turret', TS, TS, g => {
      g.fillStyle(0x2A1040); g.fillRect(8, 16, 16, 15);
      g.fillStyle(0xAA44FF); g.fillCircle(16, 12, 8);
      g.fillStyle(0x550088); g.fillCircle(16, 12, 5);
      g.fillStyle(0xCC88FF, 0.6); g.fillCircle(14, 10, 3);
    });
    tex('tw_curse_totem', TS, TS, g => {
      g.fillStyle(0x2A0A3A); g.fillRect(12, 8, 8, 22);
      g.fillStyle(0x440066); g.fillEllipse(16, 7, 14, 10);
      g.fillStyle(0xAA44FF, 0.5); g.fillCircle(16, 7, 4);
      g.fillStyle(0x6622AA);
      g.fillRect(6, 14, 20, 3); g.fillRect(6, 20, 20, 3);
    });
    tex('tw_void_cannon', TS, TS, g => {
      g.fillStyle(0x0A0A2A); g.fillRect(4, 18, 24, 13);
      g.fillStyle(0x2222AA); g.fillCircle(14, 20, 9);
      g.fillStyle(0x0000AA); g.fillRect(18, 12, 11, 8);
      g.fillStyle(0x4444FF, 0.5); g.fillCircle(14, 20, 5);
    });
    tex('tw_blood_tower', TS, TS, g => {
      g.fillStyle(0x3A0000); g.fillRect(8, 14, 16, 17);
      g.fillStyle(0x880000); g.fillRect(10, 10, 12, 6);
      g.fillStyle(0xFF2244, 0.7); g.fillEllipse(16, 10, 14, 8);
      g.fillStyle(0xCC0000); g.fillRect(14, 6, 4, 6);
    });
    tex('tw_chain_spire', TS, TS, g => {
      g.fillStyle(0x1A2040); g.fillRect(12, 14, 8, 17);
      g.fillStyle(0x4466FF); g.fillTriangle(6, 14, 26, 14, 16, 2);
      g.fillStyle(0x2244CC, 0.5); g.fillTriangle(10, 14, 22, 14, 16, 6);
      g.lineStyle(1.5, 0x88AAFF, 0.8); g.lineBetween(6, 14, 26, 14);
    });
    tex('tw_grave_tower', TS, TS, g => {
      g.fillStyle(0x1A1A1A); g.fillRect(8, 12, 16, 19);
      g.fillStyle(0x333333); g.fillRect(10, 8, 12, 6);
      g.fillStyle(0x222222); g.fillRect(14, 4, 4, 6);
      g.fillStyle(0x44CC44, 0.4); g.fillCircle(16, 6, 3);
      g.lineStyle(1.5, 0x44AA44, 0.6); g.lineBetween(12, 8, 20, 8);
    });

    // ── Cursed enemy sprites ──────────────────────────────
    tex('e_soul_eater', TS, TS, g => {
      g.fillStyle(0xAA44FF, 0.2); g.fillEllipse(16, 18, 24, 20);
      g.fillStyle(0xAA44FF, 0.8); g.fillEllipse(16, 12, 14, 14);
      g.fillStyle(0xCC88FF, 0.5); g.fillEllipse(14, 10, 6, 6);
      g.lineStyle(1, 0xCC66FF, 0.7); g.strokeEllipse(16, 18, 24, 20);
    });
    tex('e_ravager', TS, TS, g => {
      g.fillStyle(0x8B0000); g.fillEllipse(16, 20, 18, 14); g.fillEllipse(16, 11, 12, 12);
      g.fillStyle(0xFF2222, 0.6); g.fillRect(9, 19, 14, 3);
      g.fillStyle(0xFF4444); g.fillTriangle(10, 11, 22, 11, 16, 5);
    });
    tex('e_hex_shaman', TS, TS, g => {
      g.fillStyle(0x4B0082); g.fillRect(13, 10, 6, 20); g.fillCircle(16, 8, 5);
      g.fillStyle(0xAA44FF); g.fillRect(22, 4, 2, 22); g.fillCircle(23, 4, 3);
      g.fillStyle(0xFF44FF, 0.4); g.fillEllipse(16, 28, 16, 6);
    });
    tex('e_splitter_beast', TS, TS, g => {
      g.fillStyle(0x660044); g.fillRect(6, 12, 20, 14); g.fillEllipse(16, 12, 18, 10);
      g.fillStyle(0xAA2266); g.fillEllipse(16, 17, 20, 14);
      g.fillStyle(0xFF4488, 0.4); g.fillRect(7, 15, 18, 2);
    });
    tex('e_siege_leech', TS, TS, g => {
      g.fillStyle(0x2A4400); g.fillEllipse(16, 18, 20, 14); g.fillEllipse(16, 12, 10, 12);
      g.fillStyle(0x4A8800, 0.7); g.fillEllipse(16, 12, 8, 10);
      g.fillStyle(0x88CC00, 0.5); g.fillCircle(16, 10, 3);
    });
    tex('e_void_brute', 40, 40, g => {
      g.fillStyle(0x0A0A1A); g.fillRect(4, 8, 32, 28);
      g.fillStyle(0x1A1A3A); g.fillRect(4, 8, 32, 8); g.fillRect(4, 8, 8, 28); g.fillRect(28, 8, 8, 28);
      g.fillStyle(0x2222AA); g.fillRect(14, 18, 12, 8);
      g.fillStyle(0x4444FF, 0.5); g.fillCircle(20, 22, 4);
    });

    // ── Cursed projectiles ─────────────────────────────────
    tex('proj_soul',  8, 8, g => { g.fillStyle(0xAA44FF); g.fillCircle(4, 4, 4); g.fillStyle(0xCC88FF, 0.6); g.fillCircle(3, 3, 2); });
    tex('proj_curse', 8, 8, g => { g.fillStyle(0x660088); g.fillCircle(4, 4, 4); g.fillStyle(0xAA00CC, 0.7); g.fillCircle(4, 4, 2); });
    tex('proj_void',  10, 10, g => { g.fillStyle(0x0000AA); g.fillCircle(5, 5, 5); g.fillStyle(0x2222FF, 0.7); g.fillCircle(4, 4, 3); });
    tex('proj_blood', 8, 8, g => { g.fillStyle(0xCC0000); g.fillCircle(4, 4, 4); g.fillStyle(0xFF4444, 0.6); g.fillCircle(3, 3, 2); });
    tex('proj_grave', 8, 8, g => { g.fillStyle(0x44AA44); g.fillCircle(4, 4, 4); g.fillStyle(0x88FF88, 0.5); g.fillCircle(3, 3, 2); });

    // ── Skeleton minion (grave tower spawn) ───────────────
    tex('e_skeleton', TS, TS, g => {
      g.fillStyle(0xEEEECC); g.fillEllipse(16, 9, 10, 10);
      g.fillStyle(0xCCCCAA); g.fillRect(13, 14, 6, 12); g.fillRect(8, 14, 4, 8); g.fillRect(20, 14, 4, 8);
      g.fillRect(12, 24, 4, 7); g.fillRect(17, 24, 4, 7);
      g.fillStyle(0x111100); g.fillCircle(14, 9, 1.5); g.fillCircle(18, 9, 1.5);
    });

    // ── Cursed resource icons for HUD ─────────────────────
    tex('ico_cursed_essence', 10, 10, g => { g.fillStyle(0xCC22FF); g.fillRect(0, 0, 10, 10); });
    tex('ico_void_shards',    10, 10, g => { g.fillStyle(0x4422FF); g.fillRect(0, 0, 10, 10); });
    tex('ico_corrupted_wood', 10, 10, g => { g.fillStyle(0x553311); g.fillRect(0, 0, 10, 10); });
    tex('ico_corrupted_stone',10, 10, g => { g.fillStyle(0x664455); g.fillRect(0, 0, 10, 10); });
  }
}
