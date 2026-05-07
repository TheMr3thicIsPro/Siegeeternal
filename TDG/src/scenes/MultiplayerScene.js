// ============================================================
// MultiplayerScene — 2-player co-op lobby (Supabase Realtime)
// ============================================================
import { VW, VH } from '../constants.js';
import { multiplayerSys } from '../systems/MultiplayerSystem.js';

export class MultiplayerScene extends Phaser.Scene {
  constructor() { super('Multiplayer'); }

  create() {
    this.cameras.main.fadeIn(400, 0, 0, 0);
    const cx = VW / 2, cy = VH / 2;

    this.add.rectangle(cx, cy, VW, VH, 0x060810);

    this.add.text(cx, 55, 'MULTIPLAYER', {
      fontSize: '32px', fill: '#88BBFF', fontFamily: 'monospace', fontStyle: 'bold',
      stroke: '#000022', strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(cx, 95, '2-Player Co-op  —  if one player falls, both lose', {
      fontSize: '11px', fill: '#445566', fontFamily: 'monospace',
    }).setOrigin(0.5);

    const back = this.add.text(20, 18, '< BACK', {
      fontSize: '12px', fill: '#887766', fontFamily: 'monospace',
      backgroundColor: '#1A1008', padding: { x: 8, y: 4 },
    }).setInteractive({ useHandCursor: true });
    back.on('pointerover', () => back.setStyle({ fill: '#FFFFFF' }));
    back.on('pointerout',  () => back.setStyle({ fill: '#887766' }));
    back.on('pointerdown', () => { multiplayerSys.disconnect(); this.scene.start('Menu'); });

    if (!window.supabase) {
      this.add.text(cx, cy - 30, 'Supabase not loaded.', {
        fontSize: '16px', fill: '#FF6644', fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.add.text(cx, cy + 4, 'Add to index.html:  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"><\/script>', {
        fontSize: '9px', fill: '#AA6633', fontFamily: 'monospace',
        wordWrap: { width: VW - 80 }, align: 'center',
      }).setOrigin(0.5);
      return;
    }

    this._objs = [];
    this._showModeSelect(cx, cy);
  }

  _btn(x, y, label, bgCol, cb) {
    const bg = this.add.rectangle(x, y, 210, 62, bgCol)
      .setStrokeStyle(2, 0x88BBFF).setInteractive({ useHandCursor: true });
    const t  = this.add.text(x, y, label, {
      fontSize: '17px', fill: '#FFFFFF', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);
    bg.on('pointerover', () => bg.setAlpha(0.75));
    bg.on('pointerout',  () => bg.setAlpha(1));
    bg.on('pointerdown', cb);
    this._objs.push(bg, t);
    return { bg, t };
  }

  _showModeSelect(cx, cy) {
    this._btn(cx - 140, cy, 'HOST GAME', 0x0D2218, () => this._hostGame(cx, cy));
    this._btn(cx + 140, cy, 'JOIN GAME', 0x0D0D28, () => this._joinGame(cx, cy));

    const note = this.add.text(cx, cy + 70, 'HOST creates a room  ·  GUEST enters the 6-letter code', {
      fontSize: '10px', fill: '#334455', fontFamily: 'monospace',
    }).setOrigin(0.5);
    this._objs.push(note);
  }

  _clear() {
    this._objs.forEach(o => o?.destroy());
    this._objs = [];
  }

  async _hostGame(cx, cy) {
    this._clear();
    const seed = Math.floor(Math.random() * 999999);
    const code = await multiplayerSys.createRoom(seed, 0);

    if (!code) {
      this._showError(cx, cy, 'Could not connect to Supabase. Check credentials in MultiplayerSystem.js.');
      return;
    }

    this.add.text(cx, cy - 90, 'Your room code:', {
      fontSize: '13px', fill: '#888888', fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(cx, cy - 50, code, {
      fontSize: '52px', fill: '#FFD700', fontFamily: 'monospace', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);

    const waitTxt = this.add.text(cx, cy + 20, 'Waiting for partner...', {
      fontSize: '13px', fill: '#88BBFF', fontFamily: 'monospace',
    }).setOrigin(0.5);

    let dots = 0;
    const ticker = this.time.addEvent({
      delay: 500, loop: true,
      callback: () => { dots = (dots + 1) % 4; waitTxt.setText('Waiting for partner' + '.'.repeat(dots)); },
    });

    this.time.delayedCall(120000, () => {
      ticker.remove();
      waitTxt.setText('Timed out — no partner joined.').setStyle({ fill: '#FF4444' });
    });

    multiplayerSys.onPartnerJoin = () => {
      ticker.remove();
      waitTxt.setText('Partner joined! Starting...').setStyle({ fill: '#44FF88' });
      this.time.delayedCall(1200, () => {
        this.cameras.main.fadeOut(400, 0, 0, 0);
        this.time.delayedCall(400, () => {
          this.scene.start('Game', {
            newGame: true, slotId: 1, hardcore: false, challengeMods: {},
            multiplayer: true, isHost: true, mpSeed: seed, mpRoomCode: code,
          });
        });
      });
    };
  }

  _joinGame(cx, cy) {
    this._clear();

    this.add.text(cx, cy - 90, 'Enter 6-letter room code:', {
      fontSize: '13px', fill: '#888888', fontFamily: 'monospace',
    }).setOrigin(0.5);

    let code = '';
    const codeTxt = this.add.text(cx, cy - 50, '______', {
      fontSize: '46px', fill: '#FFD700', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);

    const update = () => codeTxt.setText((code + '______').slice(0, 6));

    this.input.keyboard.on('keydown', (ev) => {
      if (ev.key === 'Backspace') { code = code.slice(0, -1); update(); return; }
      if (code.length < 6 && /^[A-Za-z0-9]$/.test(ev.key)) { code += ev.key.toUpperCase(); update(); }
    });

    const statusTxt = this.add.text(cx, cy + 20, '', {
      fontSize: '12px', fill: '#88BBFF', fontFamily: 'monospace',
    }).setOrigin(0.5);

    const joinBtn = this.add.text(cx, cy + 70, '[ JOIN ]', {
      fontSize: '18px', fill: '#FFD700', fontFamily: 'monospace', fontStyle: 'bold',
      backgroundColor: '#0D0D28', padding: { x: 18, y: 9 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    joinBtn.on('pointerover', () => joinBtn.setStyle({ fill: '#FFFFFF' }));
    joinBtn.on('pointerout',  () => joinBtn.setStyle({ fill: '#FFD700' }));

    joinBtn.on('pointerdown', async () => {
      if (code.length < 6) { statusTxt.setText('Enter full 6-letter code.'); return; }
      joinBtn.disableInteractive();
      statusTxt.setText('Connecting...');
      const info = await multiplayerSys.joinRoom(code);
      if (!info) {
        statusTxt.setText('Failed — check code and try again.').setStyle({ fill: '#FF4444' });
        joinBtn.setInteractive({ useHandCursor: true });
        return;
      }
      statusTxt.setText('Connected! Starting...').setStyle({ fill: '#44FF88' });
      this.time.delayedCall(800, () => {
        this.cameras.main.fadeOut(400, 0, 0, 0);
        this.time.delayedCall(400, () => {
          this.scene.start('Game', {
            newGame: true, slotId: 1, hardcore: false, challengeMods: {},
            multiplayer: true, isHost: false, mpSeed: info.seed, mpRoomCode: code,
          });
        });
      });
    });
  }

  _showError(cx, cy, msg) {
    this.add.text(cx, cy, msg, {
      fontSize: '13px', fill: '#FF4444', fontFamily: 'monospace',
      wordWrap: { width: VW - 80 }, align: 'center',
    }).setOrigin(0.5);
  }
}
