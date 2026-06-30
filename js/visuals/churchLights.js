// Church light show — gesture-controlled light overlay on real church photo
const YELLOW = '#ffcc66';
const PURPLE = '#b14aff';
const PINK = '#ff5fb8';
const BLUE = '#4ab8ff';

export class ChurchLights {
  constructor(imageSrc) {
    this.img = new Image();
    this.img.src = imageSrc;
    this.loaded = false;
    this.img.onload = () => { this.loaded = true; };

    this.state = {
      rightYellow: false,
      leftYellow: false,
      flicker: false,
      flickerOn: false,
      flickerT: 0,
      purpleActive: false,
      purpleColor: PURPLE,
      blueActive: false,
    };

    this.t = 0;
    this.climbT = 0;
  }

  // ── image draw, cover-fit into a region ───────────────────────────────────
  drawBackground(ctx, x, y, w, h) {
    if (!this.loaded) {
      ctx.fillStyle = '#050504';
      ctx.fillRect(x, y, w, h);
      return;
    }
    const imgRatio = this.img.width / this.img.height;
    const boxRatio = w / h;
    let dw, dh, dx, dy;
    if (imgRatio > boxRatio) {
      dh = h; dw = h * imgRatio;
      dx = x - (dw - w) / 2; dy = y;
    } else {
      dw = w; dh = w / imgRatio;
      dx = x; dy = y - (dh - h) / 2;
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    // darken base image so lights pop
    ctx.filter = 'brightness(0.25) saturate(0.7)';
    ctx.drawImage(this.img, dx, dy, dw, dh);
    ctx.filter = 'none';
    ctx.restore();

    this._region = { x, y, w, h };
  }

  update() {
    this.t += 0.016;
    this.climbT = (this.climbT + 0.012) % 1;
    if (this.state.flicker) {
      this.state.flickerT += 0.016;
      if (this.state.flickerT > 0.18) {
        this.state.flickerT = 0;
        this.state.flickerOn = !this.state.flickerOn;
      }
    }
  }

  drawLights(ctx) {
    if (!this._region) return;
    const { x, y, w, h } = this._region;

    // ── Yellow window lights (left/right sides) ──────────────────────────────
    const yellowRightOn = this.state.rightYellow || (this.state.flicker && this.state.flickerOn);
    const yellowLeftOn  = this.state.leftYellow  || (this.state.flicker && this.state.flickerOn);

    if (yellowRightOn) this._drawWindowGlow(ctx, x, y, w, h, 'right', YELLOW);
    if (yellowLeftOn)  this._drawWindowGlow(ctx, x, y, w, h, 'left', YELLOW);

    // ── Purple/pink climbing pillar lights ────────────────────────────────────
    if (this.state.purpleActive) {
      this._drawPillarClimb(ctx, x, y, w, h, 'left', this.state.purpleColor);
      this._drawPillarClimb(ctx, x, y, w, h, 'right', this.state.purpleColor);
    }

    // ── Blue center glow ───────────────────────────────────────────────────────
    if (this.state.blueActive) {
      this._drawCenterGlow(ctx, x, y, w, h);
    }
  }

  // window light glow on left or right third of the image
  _drawWindowGlow(ctx, x, y, w, h, side, color) {
    const regionW = w * 0.32;
    const rx = side === 'left' ? x : x + w - regionW;
    const flicker = 0.85 + Math.sin(this.t * 8) * 0.08;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const grad = ctx.createLinearGradient(rx, y, rx + (side === 'left' ? regionW : -regionW), y);
    grad.addColorStop(0, `${color}00`);
    grad.addColorStop(0.5, `${this._hexA(color, 0.35 * flicker)}`);
    grad.addColorStop(1, `${color}00`);
    ctx.fillStyle = grad;
    ctx.fillRect(rx, y, regionW, h);

    // vertical light beams (simulating window rays)
    const beamCount = 3;
    for (let i = 0; i < beamCount; i++) {
      const bx = side === 'left'
        ? rx + regionW * (0.25 + i * 0.25)
        : rx + regionW * (0.75 - i * 0.25);
      const beamGrad = ctx.createLinearGradient(bx, y, bx, y + h);
      beamGrad.addColorStop(0, this._hexA(color, 0.5 * flicker));
      beamGrad.addColorStop(0.6, this._hexA(color, 0.15 * flicker));
      beamGrad.addColorStop(1, `${color}00`);
      ctx.fillStyle = beamGrad;
      const beamW = w * 0.05;
      ctx.beginPath();
      ctx.moveTo(bx - beamW * 0.3, y);
      ctx.lineTo(bx + beamW * 0.3, y);
      ctx.lineTo(bx + beamW, y + h);
      ctx.lineTo(bx - beamW, y + h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // purple/pink ray climbing pillars from bottom to top
  _drawPillarClimb(ctx, x, y, w, h, side, color) {
    const pillarXs = side === 'left'
      ? [x + w * 0.06, x + w * 0.16, x + w * 0.26]
      : [x + w * 0.94, x + w * 0.84, x + w * 0.74];

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    pillarXs.forEach((px, i) => {
      const delay = i * 0.15;
      const localT = Math.max(0, Math.min(1, (this.climbT - delay) * 1.6 % 1));
      const climbHeight = h * (0.15 + localT * 0.75);
      const topY = y + h - climbHeight;
      const pillarW = w * 0.018;

      const grad = ctx.createLinearGradient(px, y + h, px, topY);
      grad.addColorStop(0, this._hexA(color, 0.9));
      grad.addColorStop(0.7, this._hexA(color, 0.5));
      grad.addColorStop(1, `${color}00`);

      ctx.fillStyle = grad;
      ctx.shadowColor = color;
      ctx.shadowBlur = 20;
      ctx.fillRect(px - pillarW/2, topY, pillarW, climbHeight);
      ctx.shadowBlur = 0;
    });

    // base glow on floor
    const floorGrad = ctx.createRadialGradient(
      side === 'left' ? x + w*0.15 : x + w*0.85, y+h, 0,
      side === 'left' ? x + w*0.15 : x + w*0.85, y+h, w*0.25
    );
    floorGrad.addColorStop(0, this._hexA(color, 0.4));
    floorGrad.addColorStop(1, `${color}00`);
    ctx.fillStyle = floorGrad;
    ctx.fillRect(x, y + h*0.7, w, h*0.3);

    ctx.restore();
  }

  // blue patterned glow in center + floor reflection
  _drawCenterGlow(ctx, x, y, w, h) {
    const cx = x + w/2;
    const cy = y + h * 0.32;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // center wall glow
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, w*0.35);
    grad.addColorStop(0, this._hexA(BLUE, 0.55));
    grad.addColorStop(0.5, this._hexA(BLUE, 0.25));
    grad.addColorStop(1, `${BLUE}00`);
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);

    // sparkle pattern
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2 + this.t * 0.4;
      const r = w * 0.12 * (0.5 + 0.5 * Math.sin(this.t * 2 + i));
      const sx = cx + Math.cos(angle) * r;
      const sy = cy + Math.sin(angle) * r * 0.6;
      const size = 1.5 + Math.sin(this.t*3+i)*1.2;
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(0.5,size), 0, Math.PI*2);
      ctx.fillStyle = this._hexA(BLUE, 0.7);
      ctx.fill();
    }

    // floor reflection
    const floorGrad = ctx.createLinearGradient(cx, y+h*0.7, cx, y+h);
    floorGrad.addColorStop(0, this._hexA(BLUE, 0.3));
    floorGrad.addColorStop(1, `${BLUE}00`);
    ctx.fillStyle = floorGrad;
    ctx.fillRect(x + w*0.25, y+h*0.7, w*0.5, h*0.3);

    ctx.restore();
  }

  _hexA(hex, alpha) {
    const r = parseInt(hex.slice(1,3), 16);
    const g = parseInt(hex.slice(3,5), 16);
    const b = parseInt(hex.slice(5,7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
}

export { YELLOW, PURPLE, PINK, BLUE };
