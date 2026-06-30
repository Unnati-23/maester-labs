// Church light show — gesture-controlled light overlay on real church photo
// Positions are mapped to the ACTUAL pillar/window locations in church1.jpg
const YELLOW = '#ffcc66';
const PURPLE = '#a64aff';
const PINK = '#ff4fa8';
const BLUE = '#3fb8ff';

// pillar x-positions as fraction of image width (measured from church1.jpg)
const PILLARS_LEFT  = [0.06, 0.23];   // near edge, second row
const PILLARS_RIGHT = [0.94, 0.77];   // near edge, second row
const WINDOW_ZONE = { x0: 0.38, x1: 0.64, y0: 0.30, y1: 0.66 };

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

  drawBackground(ctx, x, y, w, h) {
    if (!this.loaded) {
      ctx.fillStyle = '#020201';
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
    // near-black, just enough structure visible to read as a dark church
    ctx.filter = 'brightness(0.12) contrast(1.25) saturate(0.5)';
    ctx.drawImage(this.img, dx, dy, dw, dh);
    ctx.filter = 'none';
    ctx.restore();

    this._region = { x, y, w, h };
  }

  update() {
    this.t += 0.016;
    this.climbT = (this.climbT + 0.01) % 1;
    if (this.state.flicker) {
      this.state.flickerT += 0.016;
      if (this.state.flickerT > 0.15) {
        this.state.flickerT = 0;
        this.state.flickerOn = !this.state.flickerOn;
      }
    }
  }

  drawLights(ctx) {
    if (!this._region) return;
    const { x, y, w, h } = this._region;

    const yellowRightOn = this.state.rightYellow || (this.state.flicker && this.state.flickerOn);
    const yellowLeftOn  = this.state.leftYellow  || (this.state.flicker && this.state.flickerOn);

    if (yellowLeftOn)  this._drawWindowBeam(ctx, x, y, w, h, 'left', YELLOW);
    if (yellowRightOn) this._drawWindowBeam(ctx, x, y, w, h, 'right', YELLOW);

    if (this.state.purpleActive) {
      this._drawPillarLight(ctx, x, y, w, h, 'left', this.state.purpleColor);
      this._drawPillarLight(ctx, x, y, w, h, 'right', this.state.purpleColor);
    }

    if (this.state.blueActive) {
      this._drawCenterGlow(ctx, x, y, w, h);
    }
  }

  // ── window light shining through the stained glass, biased to one side ─────
  _drawWindowBeam(ctx, x, y, w, h, side, color) {
    const flicker = 0.88 + Math.sin(this.t * 10) * 0.1;
    const wx0 = x + w * WINDOW_ZONE.x0;
    const wx1 = x + w * WINDOW_ZONE.x1;
    const wy0 = y + h * WINDOW_ZONE.y0;
    const wy1 = y + h * WINDOW_ZONE.y1;
    const wcx = (wx0 + wx1) / 2;
    const ww = wx1 - wx0;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // glowing window core
    const coreGrad = ctx.createRadialGradient(wcx, (wy0+wy1)/2, 0, wcx, (wy0+wy1)/2, ww*1.3);
    coreGrad.addColorStop(0, this._hexA(color, 0.85 * flicker));
    coreGrad.addColorStop(0.4, this._hexA(color, 0.4 * flicker));
    coreGrad.addColorStop(1, `${color}00`);
    ctx.fillStyle = coreGrad;
    ctx.fillRect(wx0 - ww*0.5, wy0 - ww*0.3, ww*2, (wy1-wy0) + ww*0.6);

    // light spilling onto the floor/aisle on the chosen side
    const floorX = side === 'left' ? x + w*0.18 : x + w*0.82;
    const floorGrad = ctx.createRadialGradient(floorX, y+h*0.9, 0, floorX, y+h*0.9, w*0.32);
    floorGrad.addColorStop(0, this._hexA(color, 0.45 * flicker));
    floorGrad.addColorStop(1, `${color}00`);
    ctx.fillStyle = floorGrad;
    ctx.fillRect(x, y+h*0.55, w, h*0.45);

    // rim light along the near pillar on that side
    const pillarX = side === 'left' ? x + w * PILLARS_LEFT[0] : x + w * PILLARS_RIGHT[0];
    const pGrad = ctx.createLinearGradient(pillarX, y + h*0.3, pillarX, y + h);
    pGrad.addColorStop(0, `${color}00`);
    pGrad.addColorStop(0.5, this._hexA(color, 0.3 * flicker));
    pGrad.addColorStop(1, this._hexA(color, 0.5 * flicker));
    ctx.fillStyle = pGrad;
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.fillRect(pillarX - w*0.012, y + h*0.3, w*0.024, h*0.7);
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  // ── light wrapping/climbing a real pillar column, cylinder-shaped glow ─────
  _drawPillarLight(ctx, x, y, w, h, side, color) {
    const pillarXs = side === 'left' ? PILLARS_LEFT : PILLARS_RIGHT;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    pillarXs.forEach((frac, i) => {
      const px = x + w * frac;
      const delay = i * 0.18;
      const localT = Math.max(0, Math.min(1, ((this.climbT - delay) % 1) * 1.5));
      const baseY = y + h;
      const climbHeight = h * (0.1 + localT * 0.8);
      const topY = baseY - climbHeight;

      // pillar gets narrower with distance (second row = farther = thinner)
      const pillarW = w * (i === 0 ? 0.038 : 0.022);

      // cylinder shading: bright core + soft falloff on both edges (wrap-around look)
      const wrapGrad = ctx.createLinearGradient(px - pillarW/2, 0, px + pillarW/2, 0);
      wrapGrad.addColorStop(0,   `${color}00`);
      wrapGrad.addColorStop(0.25, this._hexA(color, 0.9));
      wrapGrad.addColorStop(0.5, this._hexA(color, 1));
      wrapGrad.addColorStop(0.75, this._hexA(color, 0.9));
      wrapGrad.addColorStop(1,   `${color}00`);

      // vertical fade (climbing effect, fades at the top)
      const vertGrad = ctx.createLinearGradient(0, baseY, 0, topY);
      vertGrad.addColorStop(0, this._hexA(color, 1));
      vertGrad.addColorStop(0.75, this._hexA(color, 0.7));
      vertGrad.addColorStop(1, `${color}00`);

      ctx.shadowColor = color;
      ctx.shadowBlur = w * 0.035;

      // draw column as series of thin horizontal slices so both gradients apply
      const sliceCount = 28;
      for (let s = 0; s < sliceCount; s++) {
        const sy = baseY - (climbHeight * s / sliceCount);
        const sh = climbHeight / sliceCount + 1;
        const vAlpha = 1 - (s / sliceCount) * 0.85;
        ctx.globalAlpha = vAlpha;
        ctx.fillStyle = wrapGrad;
        ctx.fillRect(px - pillarW/2, sy - sh, pillarW, sh);
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      // base pool of light on the floor at the foot of the pillar
      const poolGrad = ctx.createRadialGradient(px, baseY, 0, px, baseY, pillarW*4);
      poolGrad.addColorStop(0, this._hexA(color, 0.6));
      poolGrad.addColorStop(1, `${color}00`);
      ctx.fillStyle = poolGrad;
      ctx.fillRect(px - pillarW*4, baseY - pillarW*2, pillarW*8, pillarW*4);
    });

    ctx.restore();
  }

  // ── blue/patterned center glow at the stained glass + floor reflection ─────
  _drawCenterGlow(ctx, x, y, w, h) {
    const wx0 = x + w * WINDOW_ZONE.x0;
    const wx1 = x + w * WINDOW_ZONE.x1;
    const wy0 = y + h * WINDOW_ZONE.y0;
    const wy1 = y + h * WINDOW_ZONE.y1;
    const cx = (wx0+wx1)/2;
    const cy = (wy0+wy1)/2;
    const cw = wx1 - wx0;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cw*1.6);
    grad.addColorStop(0, this._hexA(BLUE, 0.7));
    grad.addColorStop(0.45, this._hexA(BLUE, 0.3));
    grad.addColorStop(1, `${BLUE}00`);
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);

    // sparkle / pattern texture inside the window glow
    for (let i = 0; i < 30; i++) {
      const angle = (i / 30) * Math.PI * 2 + this.t * 0.5;
      const r = cw * 0.55 * (0.4 + 0.5 * Math.abs(Math.sin(this.t * 1.5 + i)));
      const sx = cx + Math.cos(angle) * r;
      const sy = cy + Math.sin(angle) * r * 0.9;
      const size = 1 + Math.sin(this.t*3+i)*1;
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(0.4,size), 0, Math.PI*2);
      ctx.fillStyle = this._hexA(BLUE, 0.8);
      ctx.fill();
    }

    // long reflection down the center aisle to the floor
    const aisleGrad = ctx.createLinearGradient(cx, wy1, cx, y+h);
    aisleGrad.addColorStop(0, this._hexA(BLUE, 0.4));
    aisleGrad.addColorStop(1, `${BLUE}00`);
    ctx.fillStyle = aisleGrad;
    const aisleW0 = w*0.08, aisleW1 = w*0.32;
    ctx.beginPath();
    ctx.moveTo(cx - aisleW0, wy1);
    ctx.lineTo(cx + aisleW0, wy1);
    ctx.lineTo(cx + aisleW1, y+h);
    ctx.lineTo(cx - aisleW1, y+h);
    ctx.closePath();
    ctx.fill();

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
