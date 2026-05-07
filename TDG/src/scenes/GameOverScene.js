// ============================================================
// GameOverScene — death screen
// ============================================================
import { VW, VH } from '../constants.js';

export class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOver'); }

  init(data) {
    this.waveReached = data?.wave ?? 0;
    this.slotId      = data?.slotId ?? 1;
    this.deathCause  = data?.deathCause ?? null;
  }

  create() {
    const cx = VW / 2, cy = VH / 2;
    this.add.rectangle(cx, cy, VW, VH, 0x0a0808);
    this.cameras.main.fadeIn(400, 0, 0, 0);

    this.add.text(cx, cy - 145, 'YOU FELL', {
      fontSize: '52px', fill: '#CC2200', fontFamily: 'monospace',
      stroke: '#1a0000', strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(cx, cy - 72, `Day ${this.waveReached} — The siege consumed you.`, {
      fontSize: '18px', fill: '#EDE0C4', fontFamily: 'monospace',
    }).setOrigin(0.5);

    if (this.deathCause) {
      this.add.text(cx, cy - 50, `Killed by: ${this.deathCause}`, {
        fontSize: '14px', fill: '#FF6655', fontFamily: 'monospace', fontStyle: 'italic',
      }).setOrigin(0.5);
    }

    this.add.text(cx, cy - (this.deathCause ? 30 : 48), 'Your world has been lost.', {
      fontSize: '13px', fill: '#882222', fontFamily: 'monospace',
      fontStyle: 'italic',
    }).setOrigin(0.5);

    // High score (migrate old key)
    const legacyBest = localStorage.getItem('dungeonkeep_best');
    if (legacyBest) { localStorage.setItem('siege_eternal_best', legacyBest); localStorage.removeItem('dungeonkeep_best'); }
    const prev = parseInt(localStorage.getItem('siege_eternal_best') || '0');
    const newBest = Math.max(prev, this.waveReached);
    localStorage.setItem('siege_eternal_best', String(newBest));
    const isRecord = this.waveReached > 0 && this.waveReached >= prev;

    this.add.text(cx, cy - 28, `Best: Day ${newBest}${isRecord ? '  ★ NEW RECORD!' : ''}`, {
      fontSize: '15px', fill: '#D4A017', fontFamily: 'monospace',
    }).setOrigin(0.5);

    this._makeBtn(cx - 120, cy + 55, 'TRY AGAIN', () => {
      localStorage.removeItem(`siege_eternal_save_${this.slotId}`);
      this.scene.start('Game', { newGame: true, slotId: this.slotId });
    });

    this.add.text(cx, cy + 120, 'CONTROLS', {
      fontSize: '12px', fill: '#7A6545', fontFamily: 'monospace',
    }).setOrigin(0.5);

    [
      'WASD: Move  |  E: Harvest resource  |  F: Build/Craft menu',
      'Left click: Place  |  Right click: Cancel  |  Survive as long as you can',
    ].forEach((line, i) => {
      this.add.text(cx, cy + 142 + i * 18, line, {
        fontSize: '10px', fill: '#5A4535', fontFamily: 'monospace',
      }).setOrigin(0.5);
    });

    this._makeBtn(cx + 120, cy + 55, 'MAIN MENU', () => {
      localStorage.removeItem(`siege_eternal_save_${this.slotId}`);
      this.scene.start('Menu');
    });
  }

  _makeBtn(x, y, label, cb) {
    const btn = this.add.text(x, y, label, {
      fontSize: '20px', fill: '#EDE0C4', fontFamily: 'monospace',
      backgroundColor: '#3D2B1F', padding: { x: 16, y: 9 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    btn.on('pointerover',  () => btn.setStyle({ fill: '#FFE090' }));
    btn.on('pointerout',   () => btn.setStyle({ fill: '#EDE0C4' }));
    btn.on('pointerdown',  cb);
    return btn;
  }
}
