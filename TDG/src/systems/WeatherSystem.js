import { VW, VH, WEATHER_TYPES, WEATHER_CHANCE } from '../constants.js';

export class WeatherSystem {
  constructor(scene) {
    this.scene     = scene;
    this.current   = null;
    this._particles  = [];
    this._overlays   = [];
    this._lightTimer = null;
  }

  // ── Public API ───────────────────────────────────────────────

  roll() {
    if (Math.random() < WEATHER_CHANCE) {
      this.current = WEATHER_TYPES[Math.floor(Math.random() * WEATHER_TYPES.length)];
      this._apply();
    } else {
      this.clear();
    }
  }

  clear() {
    for (const sp of this._particles) { if (sp.active) sp.destroy(); }
    this._particles = [];
    for (const ov of this._overlays)  { if (ov.active) ov.destroy(); }
    this._overlays = [];
    if (this._lightTimer) { this._lightTimer.remove(false); this._lightTimer = null; }
    this.current = null;
  }

  update(delta) {
    for (const sp of this._particles) {
      if (!sp.active) continue;
      sp.x += sp._vx * (delta / 1000);
      sp.y += sp._vy * (delta / 1000);
      if (sp.y > VH + 8) { sp.y = -8;     sp.x = Phaser.Math.Between(0, VW); }
      if (sp.x < -8)     { sp.x = VW + 8; sp.y = Phaser.Math.Between(0, VH); }
      if (sp.x > VW + 8) { sp.x = -8;     sp.y = Phaser.Math.Between(0, VH); }
    }
  }

  // ── Effect queries ───────────────────────────────────────────

  /** Multiplier applied to every enemy's speed this night */
  enemySpeedMult() {
    switch (this.current) {
      case 'thunderstorm':
      case 'mega_storm':   return 1.4;
      case 'snowy':        return 0.6;
      case 'blizzard':     return 0.0;
      default:             return 1.0;
    }
  }

  /** Multiplier applied to every enemy's max-HP on spawn */
  enemyHPMult() {
    switch (this.current) {
      case 'blood_moon':    return 1.3;
      case 'mega_storm':    return 1.3;
      case 'solar_eclipse': return 1.15;
      default:              return 1.0;
    }
  }

  /** How many times the night's enemy count is multiplied (used by WaveManager) */
  enemyCountMult() {
    switch (this.current) {
      case 'full_moon':
      case 'mega_storm': return 2;
      default:           return 1;
    }
  }

  /** True if enemies should also trickle-spawn during the day this cycle */
  spawnsDuringDay() {
    return this.current === 'solar_eclipse';
  }

  isTowerDisabled(towerKey) {
    // Earthquake — ground shaking, all towers offline
    if (this.current === 'earthquake') return true;

    // Mega storm combines all weather effects simultaneously
    const isMega = this.current === 'mega_storm';

    if ((this.current === 'rain' || this.current === 'thunderstorm' || isMega) &&
        (towerKey === 'flame' || towerKey === 'cannon' || towerKey === 'bonefire')) {
      return true;
    }
    if ((this.current === 'foggy' || isMega) && towerKey === 'arrow') {
      return true;
    }
    // Sunbeamer needs direct sunlight
    if (towerKey === 'sunbeamer' &&
        (this.current === 'rain'  || this.current === 'thunderstorm' ||
         this.current === 'foggy' || this.current === 'blizzard'     ||
         this.current === 'snowy' || isMega || this.current === 'solar_eclipse')) {
      return true;
    }
    return false;
  }

  label() {
    const MAP = {
      thunderstorm:  'Thunderstorm',
      rain:          'Rain',
      blood_moon:    'Blood Moon',
      foggy:         'Foggy',
      blizzard:      'Blizzard',
      snowy:         'Snowy',
      full_moon:     'Full Moon',
      mega_storm:    'Mega Storm',
      solar_eclipse: 'Solar Eclipse',
      earthquake:    'Earthquake',
    };
    return MAP[this.current] ?? '';
  }

  effectDesc() {
    const MAP = {
      thunderstorm:  'Thunderstorm: enemies 1.4× speed, fire/cannon/bonefire disabled',
      rain:          'Rain: fire/cannon/bonefire towers offline',
      blood_moon:    'Blood Moon: enemies spawn with 1.3× HP',
      foggy:         'Foggy: Arrow Towers blinded and disabled',
      blizzard:      'Blizzard: enemies completely frozen — cannot move',
      snowy:         'Snowy: enemies slowed to 0.6× speed',
      full_moon:     'Full Moon: 2× enemy count this wave',
      mega_storm:    'Mega Storm: 1.4× speed + 1.3× HP + 2× count — all effects at once',
      solar_eclipse: 'Solar Eclipse: enemies spawn in daylight too, 1.15× HP',
      earthquake:    'Earthquake: ALL towers offline this night',
    };
    return MAP[this.current] ?? '';
  }

  displayColor() {
    const MAP = {
      thunderstorm:  '#FFD700',
      rain:          '#6699CC',
      blood_moon:    '#FF2222',
      foggy:         '#AAAAAA',
      blizzard:      '#DDEEFF',
      snowy:         '#CCDDFF',
      full_moon:     '#FFCC88',
      mega_storm:    '#CC4422',
      solar_eclipse: '#CC8800',
      earthquake:    '#CC9955',
    };
    return MAP[this.current] ?? '#FFFFFF';
  }

  // ── Internal ─────────────────────────────────────────────────

  _apply() {
    const type = this.current;
    this.clear();
    this.current = type;

    switch (this.current) {
      case 'thunderstorm':
        this._makeRain(80, 0x8888FF);
        this._makeLightning();
        break;

      case 'rain':
        this._makeRain(60, 0x4466AA);
        break;

      case 'blood_moon':
        this._makeOverlay(0xFF0000, 0.18);
        break;

      case 'foggy':
        this._makeOverlay(0x888888, 0.30);
        break;

      case 'blizzard':
        this._makeSnow(100, true);
        this._makeOverlay(0xFFFFFF, 0.10);
        break;

      case 'snowy':
        this._makeSnow(50, false);
        break;

      case 'full_moon':
        // Warm orange moonlight shimmer
        this._makeOverlay(0xFF9900, 0.10);
        break;

      case 'mega_storm':
        // Every effect at once except blizzard
        this._makeRain(80, 0x8888FF);
        this._makeLightning();
        this._makeOverlay(0xFF0000, 0.12);   // blood-moon tint
        this._makeOverlay(0x888888, 0.18);   // fog layer
        this._makeSnow(25, false);            // light snow on top
        break;

      case 'solar_eclipse':
        // Sky goes dark orange/black — foreboding
        this._makeOverlay(0x220500, 0.60);
        break;

      case 'earthquake':
        this._makeOverlay(0x664422, 0.22);
        // Shake camera to sell the effect
        this.scene.cameras?.main?.shake(1200, 0.010);
        break;
    }
  }

  _makeRain(count, color) {
    const scene = this.scene;
    for (let i = 0; i < count; i++) {
      const sp = scene.add.rectangle(
        Phaser.Math.Between(0, VW),
        Phaser.Math.Between(0, VH),
        2, 10, color
      );
      sp.setScrollFactor(0).setDepth(38).setAlpha(0.55);
      sp._vx = -25;
      sp._vy = Phaser.Math.Between(350, 550);
      this._particles.push(sp);
    }
  }

  _makeSnow(count, intense) {
    const scene = this.scene;
    for (let i = 0; i < count; i++) {
      const sp = scene.add.rectangle(
        Phaser.Math.Between(0, VW),
        Phaser.Math.Between(0, VH),
        3, 3, 0xFFFFFF
      );
      sp.setScrollFactor(0).setDepth(38).setAlpha(0.75);
      if (intense) {
        sp._vy = Phaser.Math.Between(250, 380);
        sp._vx = -(Phaser.Math.Between(80, 150));
      } else {
        sp._vy = Phaser.Math.Between(60, 110);
        sp._vx = Phaser.Math.Between(-25, 25);
      }
      this._particles.push(sp);
    }
  }

  _makeOverlay(color, alpha) {
    const sp = this.scene.add.rectangle(VW / 2, VH / 2, VW, VH, color, alpha);
    sp.setScrollFactor(0).setDepth(36);
    this._overlays.push(sp);
  }

  _makeLightning() {
    const self = this;
    const doFlash = () => {
      if (!self.scene || !self.current) return;
      self.scene.cameras.main.flash(120, 255, 255, 220, true);
      self.scene.cameras.main.shake(180, 0.003);
      self._lightTimer = self.scene.time.delayedCall(
        Phaser.Math.Between(3000, 10000),
        doFlash
      );
    };
    this._lightTimer = this.scene.time.delayedCall(
      Phaser.Math.Between(3000, 10000),
      doFlash
    );
  }
}
