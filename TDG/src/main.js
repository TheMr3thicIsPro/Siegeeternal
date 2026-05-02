// ============================================================
// SIEGE ETERNAL — Phaser Config & Game Bootstrap
// ============================================================
import { VW, VH } from './constants.js';
import './systems/MobileOverlay.js';  // self-initialises the DOM overlay singleton
import { BootScene }      from './scenes/BootScene.js';
import { MenuScene }      from './scenes/MenuScene.js';
import { GameScene }      from './scenes/GameScene.js';
import { GameOverScene }  from './scenes/GameOverScene.js';
import { HelpScene }      from './scenes/HelpScene.js';
import { CaveScene }      from './scenes/CaveScene.js';
import { DeepCaveScene }    from './scenes/DeepCaveScene.js';
import { BlueprintsScene }  from './scenes/BlueprintsScene.js';

const config = {
  type: Phaser.AUTO,
  width:  VW,
  height: VH,
  backgroundColor: '#0a0808',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: VW,
    height: VH,
  },
  parent: 'game-container',
  input: {
    gamepad: true,
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0 }, debug: false },
  },
  scene: [BootScene, MenuScene, HelpScene, BlueprintsScene, GameScene, CaveScene, DeepCaveScene, GameOverScene],
};

new Phaser.Game(config);
