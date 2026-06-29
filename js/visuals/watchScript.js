// All 6 scenes for the /watch video script
// Scene 1: Claude logo
// Scene 2: GitHub repo card + install command
// Scene 3: Claude Code terminal + paste
// Scene 4: Frame by frame animation
// Scene 5: Glass keyboard + type VIDEO
// Scene 6: Instagram profile

const GOLD = '#f5c518';
const PAPER = '#eae5d6';
const DARK = 'rgba(8,8,6,0.88)';
const GLASS = 'rgba(20,20,18,0.75)';
const GREEN = '#5fae6e';
const BLUE = '#4a9edd';

export class WatchScript {
  constructor() {
    this.scene = 0;
    this.visible = false;
    this.animT = 0;
    this.frameT = 0;
    this.frameIndex = 0;
    this.typedChars = 0;
    this.typeTimer = 0;
    this.keyFlash = null;
    this.keyFlashT = 0;
    this.tapFlash = null;
    this.tapFlashT = 0;
    this.particles = Array.from({length: 20}, () => ({
      x: Math.random(), y: Math.random(),
      vx: (Math.random()-0.5)*0.0005,
      vy: (Math.random()-0.5)*0.0005,
      r: 1+Math.random()*2, a: 0.1+Math.random()*0.3,
    }));
    this.KEYBOARD_WORD = 'VIDEO';
  }

  get totalScenes() { return 6; }

  show() { this.visible = true; this.animT = 0; }
  hide() { this.visible = false; this.animT = 0; }

  next() {
    if (this.scene < this.totalScenes - 1) {
      this.scene++;
      this.animT = 0;
      this.typedChars = 0;
      this.typeTimer = 0;
      this.frameIndex = 0;
      this.frameT = 0;
    }
  }

  prev() {
    if (this.scene > 0) {
      this.scene--;
      this.animT = 0;
      this.typedChars = 0;
      this.typeTimer = 0;
    }
  }

  // called from app.js when finger tap detected
  onFingerTap(normX, normY, W, H) {
    if (this.scene !== 4) return; // only scene 5 (index 4)
    const keys = this._getKeyboardKeys(W, H);
    keys.forEach(key => {
      const dx = normX * W - key.cx;
      const dy = normY * H - key.cy;
      if (Math.hypot(dx, dy) < key.r + 10) {
        this.keyFlash = key.label;
        this.keyFlashT = 1;
      }
    });
  }

  draw(ctx, W, H, faceBox) {
    if (!this.visible) return;
    this.animT += 0.018;

    // particles always visible when shown
    this._drawParticles(ctx, W, H);

    const ease = Math.min(1, this.animT / 0.5);
    const eased = 1 - Math.pow(1-ease, 3);

    ctx.save();
    ctx.globalAlpha = eased;

    switch (this.scene) {
      case 0: this._drawScene1(ctx, W, H, eased); break;
      case 1: this._drawScene2(ctx, W, H, eased); break;
      case 2: this._drawScene3(ctx, W, H, eased); break;
      case 3: this._drawScene4(ctx, W, H, eased); break;
      case 4: this._drawScene5(ctx, W, H, eased); break;
      case 5: this._drawScene6(ctx, W, H, eased); break;
    }

    ctx.restore();
  }

  // ── Scene 1: Claude logo ───────────────────────────────────────────────────
  _drawScene1(ctx, W, H, t) {
    const cx = W * 0.82;
    const cy = H * 0.42;
    const size = Math.min(W, H) * 0.18 * t;

    // glow ring
    const grd = ctx.createRadialGradient(cx, cy, size*0.3, cx, cy, size*1.4);
    grd.addColorStop(0, 'rgba(245,197,24,0.18)');
    grd.addColorStop(1, 'rgba(245,197,24,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(cx, cy, size*1.4, 0, Math.PI*2);
    ctx.fill();

    // card background
    this._roundRect(ctx, cx - size*1.1, cy - size*1.1, size*2.2, size*2.2, 16);
    ctx.fillStyle = DARK;
    ctx.fill();
    ctx.strokeStyle = `rgba(245,197,24,${0.4*t})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Anthropic "A" logo drawn with canvas
    ctx.fillStyle = GOLD;
    ctx.font = `700 ${size*1.1}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✦', cx, cy - size*0.05);

    ctx.fillStyle = PAPER;
    ctx.font = `600 ${size*0.22}px IBM Plex Mono, monospace`;
    ctx.fillText('CLAUDE', cx, cy + size*0.65);

    ctx.fillStyle = `rgba(234,229,214,0.5)`;
    ctx.font = `400 ${size*0.15}px IBM Plex Mono, monospace`;
    ctx.fillText('by Anthropic', cx, cy + size*0.9);

    // label left side
    this._floatingLabel(ctx, W*0.04 + 220, H*0.38, 'SCENE 01', 'Claude can now watch videos', GOLD, t);
  }

  // ── Scene 2: GitHub repo card ──────────────────────────────────────────────
  _drawScene2(ctx, W, H, t) {
    const cardW = W * 0.32;
    const cardH = H * 0.56;
    const cardX = W - cardW - 24;
    const cardY = (H - cardH) / 2;

    // glass card
    this._roundRect(ctx, cardX, cardY, cardW, cardH, 14);
    ctx.fillStyle = GLASS;
    ctx.fill();
    ctx.strokeStyle = `rgba(245,197,24,${0.35*t})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // top bar
    this._roundRectTop(ctx, cardX, cardY, cardW, 4, 14);
    ctx.fillStyle = GOLD;
    ctx.fill();

    let y = cardY + 28;
    // GitHub logo text
    ctx.fillStyle = `rgba(234,229,214,0.4)`;
    ctx.font = `500 10px IBM Plex Mono, monospace`;
    ctx.textAlign = 'left';
    ctx.fillText('github.com / bradautomates', cardX+16, y);

    y += 22;
    ctx.fillStyle = GOLD;
    ctx.font = `700 15px IBM Plex Mono, monospace`;
    ctx.fillText('claude-video', cardX+16, y);

    y += 18;
    ctx.fillStyle = `rgba(234,229,214,0.6)`;
    ctx.font = `400 10px IBM Plex Mono, monospace`;
    ctx.fillText('gives Claude the ability to watch', cardX+16, y);
    y += 14;
    ctx.fillText('any video — URL or local file', cardX+16, y);

    // divider
    y += 20;
    ctx.strokeStyle = 'rgba(234,229,214,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cardX+16, y); ctx.lineTo(cardX+cardW-16, y);
    ctx.stroke();

    // install command box
    y += 18;
    ctx.fillStyle = `rgba(245,197,24,0.08)`;
    this._roundRect(ctx, cardX+16, y-14, cardW-32, 44, 6);
    ctx.fill();
    ctx.strokeStyle = `rgba(245,197,24,0.2)`;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = 'rgba(234,229,214,0.35)';
    ctx.font = `400 9px IBM Plex Mono, monospace`;
    ctx.fillText('INSTALL COMMAND', cardX+24, y+2);

    ctx.fillStyle = GOLD;
    ctx.font = `600 9.5px IBM Plex Mono, monospace`;
    ctx.fillText('gh repo clone', cardX+24, y+18);
    ctx.fillStyle = GREEN;
    ctx.fillText('bradautomates/claude-video', cardX+24, y+30);

    // copy button
    y += 58;
    const btnX = cardX + cardW/2 - 50;
    this._roundRect(ctx, btnX, y, 100, 28, 6);
    ctx.fillStyle = this.tapFlash === 'copy' ? GOLD : 'rgba(245,197,24,0.15)';
    ctx.fill();
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = this.tapFlash === 'copy' ? '#1a1400' : GOLD;
    ctx.font = `600 11px IBM Plex Mono, monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('📋 COPY', btnX+50, y+18);
    ctx.textAlign = 'left';

    // tap hint
    y += 44;
    ctx.fillStyle = 'rgba(234,229,214,0.3)';
    ctx.font = `400 9.5px IBM Plex Mono, monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('☝️ tap to copy', cardX + cardW/2, y);
    ctx.textAlign = 'left';

    this._floatingLabel(ctx, W*0.04+220, H*0.38, 'SCENE 02', 'The GitHub repo that fixes it', BLUE, t);
  }

  // ── Scene 3: Claude Code terminal ─────────────────────────────────────────
  _drawScene3(ctx, W, H, t) {
    const cardW = W * 0.35;
    const cardH = H * 0.52;
    const cardX = W - cardW - 24;
    const cardY = (H - cardH) / 2;

    this._roundRect(ctx, cardX, cardY, cardW, cardH, 12);
    ctx.fillStyle = 'rgba(6,6,4,0.92)';
    ctx.fill();
    ctx.strokeStyle = `rgba(74,158,221,${0.4*t})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // terminal header
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    this._roundRectTop(ctx, cardX, cardY, cardW, 30, 12);
    ctx.fill();

    ctx.fillStyle = '#e0533d'; ctx.beginPath(); ctx.arc(cardX+14, cardY+15, 5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#f5c518'; ctx.beginPath(); ctx.arc(cardX+26, cardY+15, 5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#5fae6e'; ctx.beginPath(); ctx.arc(cardX+38, cardY+15, 5, 0, Math.PI*2); ctx.fill();

    ctx.fillStyle = 'rgba(234,229,214,0.4)';
    ctx.font = `500 10px IBM Plex Mono, monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('Claude Code', cardX + cardW/2, cardY+19);
    ctx.textAlign = 'left';

    let ty = cardY + 52;
    const lineH = 18;

    // prompt lines
    const lines = [
      { type: 'prompt', text: '$ ' },
      { type: 'paste', text: 'gh repo clone bradautomates/claude-video' },
      { type: 'output', text: 'Cloning into claude-video...' },
      { type: 'output', text: '✓ Done! Skill installed.' },
      { type: 'gap' },
      { type: 'prompt2', text: '$ /watch https://youtu.be/...' },
      { type: 'thinking', text: '◐ Claude is watching...' },
    ];

    const totalChars = lines.filter(l => l.type === 'paste' || l.type === 'prompt2').reduce((s,l) => s+l.text.length, 0);
    this.typeTimer += 0.04;
    const charsToShow = Math.floor(this.typeTimer * 60);

    let charCount = 0;
    lines.forEach(line => {
      if (line.type === 'gap') { ty += lineH*0.5; return; }

      ctx.font = `400 10px IBM Plex Mono, monospace`;
      if (line.type === 'prompt') {
        ctx.fillStyle = GREEN;
        ctx.fillText('❯ ', cardX+16, ty);
        ty += lineH; return;
      }
      if (line.type === 'paste') {
        ctx.fillStyle = GREEN; ctx.fillText('❯ ', cardX+16, ty);
        ctx.fillStyle = GOLD;
        const visible = line.text.slice(0, Math.max(0, charsToShow - charCount));
        ctx.fillText(visible, cardX+30, ty);
        if (charsToShow - charCount < line.text.length) {
          ctx.fillStyle = PAPER; ctx.fillText('▌', cardX+30+ctx.measureText(visible).width, ty);
        }
        charCount += line.text.length;
      } else if (line.type === 'output') {
        if (charsToShow > charCount + 30) {
          ctx.fillStyle = 'rgba(234,229,214,0.55)';
          ctx.fillText(line.text, cardX+16, ty);
        }
      } else if (line.type === 'prompt2') {
        if (charsToShow > charCount + 60) {
          ctx.fillStyle = GREEN; ctx.fillText('❯ ', cardX+16, ty);
          ctx.fillStyle = PAPER;
          const show = line.text.slice(0, Math.max(0, charsToShow - charCount - 60));
          ctx.fillText(show, cardX+30, ty);
          if (charsToShow - charCount - 60 < line.text.length) {
            ctx.fillText('▌', cardX+30+ctx.measureText(show).width, ty);
          }
        }
      } else if (line.type === 'thinking') {
        if (charsToShow > charCount + 120) {
          ctx.fillStyle = BLUE; ctx.fillText(line.text, cardX+16, ty);
        }
      }
      ty += lineH;
    });

    this._floatingLabel(ctx, W*0.04+220, H*0.38, 'SCENE 03', 'Paste into Claude Code', BLUE, t);
  }

  // ── Scene 4: Frame by frame ────────────────────────────────────────────────
  _drawScene4(ctx, W, H, t) {
    this.frameT += 0.025;
    if (this.frameT > 1) { this.frameT = 0; this.frameIndex = (this.frameIndex+1) % 5; }

    const cx = W * 0.8;
    const cy = H * 0.45;
    const fw = W * 0.28;
    const fh = H * 0.32;

    // main frame box
    this._roundRect(ctx, cx - fw/2, cy - fh/2, fw, fh, 10);
    ctx.fillStyle = 'rgba(10,10,8,0.85)';
    ctx.fill();
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // simulated video frames
    const frameColors = ['#1a2a3a','#1a3a2a','#2a1a3a','#3a2a1a','#1a1a3a'];
    ctx.fillStyle = frameColors[this.frameIndex];
    this._roundRect(ctx, cx-fw/2+8, cy-fh/2+8, fw-16, fh-40, 6);
    ctx.fill();

    // scan line animation
    const scanY = cy - fh/2 + 8 + (fh-48) * this.frameT;
    ctx.strokeStyle = `rgba(245,197,24,0.6)`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx-fw/2+8, scanY);
    ctx.lineTo(cx+fw/2-8, scanY);
    ctx.stroke();

    // frame counter
    ctx.fillStyle = 'rgba(234,229,214,0.4)';
    ctx.font = `500 9px IBM Plex Mono, monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(`FRAME ${this.frameIndex * 24 + 1} / 120`, cx, cy+fh/2-14);
    ctx.textAlign = 'left';

    // word bubbles floating out
    const words = ['every frame', 'every word', 'full transcript', 'time codes', 'breakdown'];
    words.forEach((w, i) => {
      const angle = (i / words.length) * Math.PI * 2 + this.animT * 0.3;
      const r = Math.min(fw, fh) * 0.9;
      const wx = cx + Math.cos(angle) * r;
      const wy = cy + Math.sin(angle) * r * 0.6;
      ctx.globalAlpha = 0.7 * t;
      ctx.fillStyle = 'rgba(10,10,8,0.8)';
      const tw = ctx.measureText(w).width + 16;
      this._roundRect(ctx, wx - tw/2, wy - 10, tw, 20, 10);
      ctx.fill();
      ctx.fillStyle = GOLD;
      ctx.font = `500 9px IBM Plex Mono, monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(w, wx, wy+4);
      ctx.textAlign = 'left';
    });
    ctx.globalAlpha = t;

    this._floatingLabel(ctx, W*0.04+220, H*0.38, 'SCENE 04', 'Claude watches every frame', GREEN, t);
  }

  // ── Scene 5: Glass keyboard ────────────────────────────────────────────────
  _drawScene5(ctx, W, H, t) {
    const keys = this._getKeyboardKeys(W, H);
    const word = this.KEYBOARD_WORD;

    // auto type timer
    this.typeTimer += 0.018;
    const charsTyped = Math.min(word.length, Math.floor(this.typeTimer * 2.5));

    // keyboard background glass
    const kbW = W * 0.35;
    const kbH = H * 0.28;
    const kbX = W - kbW - 20;
    const kbY = H * 0.62;

    this._roundRect(ctx, kbX, kbY, kbW, kbH, 14);
    ctx.fillStyle = 'rgba(15,15,12,0.7)';
    ctx.fill();
    ctx.strokeStyle = `rgba(245,197,24,0.25)`;
    ctx.lineWidth = 1;
    ctx.stroke();

    // comment box above keyboard
    const boxW = kbW;
    const boxH = 48;
    const boxX = kbX;
    const boxY = kbY - boxH - 12;
    this._roundRect(ctx, boxX, boxY, boxW, boxH, 8);
    ctx.fillStyle = 'rgba(10,10,8,0.9)';
    ctx.fill();
    ctx.strokeStyle = `rgba(74,158,221,0.4)`;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = 'rgba(234,229,214,0.35)';
    ctx.font = `400 9px IBM Plex Mono, monospace`;
    ctx.fillText('💬 Add a comment...', boxX+12, boxY+16);

    ctx.fillStyle = GOLD;
    ctx.font = `600 14px IBM Plex Mono, monospace`;
    ctx.fillText(word.slice(0, charsTyped), boxX+12, boxY+36);
    if (charsTyped < word.length) {
      ctx.fillStyle = PAPER;
      ctx.fillText('▌', boxX+12+ctx.measureText(word.slice(0, charsTyped)).width, boxY+36);
    }

    // draw keys
    keys.forEach(key => {
      const isFlashing = this.keyFlash === key.label;
      const isTyped = word.includes(key.label) && word.indexOf(key.label) < charsTyped;

      ctx.save();
      this._roundRect(ctx, key.cx - key.r, key.cy - key.r*0.7, key.r*2, key.r*1.4, 6);
      ctx.fillStyle = isFlashing
        ? GOLD
        : isTyped
          ? 'rgba(245,197,24,0.25)'
          : 'rgba(234,229,214,0.08)';
      ctx.fill();
      ctx.strokeStyle = isFlashing || isTyped
        ? GOLD
        : 'rgba(234,229,214,0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = isFlashing ? '#1a1400' : isTyped ? GOLD : 'rgba(234,229,214,0.7)';
      ctx.font = `600 ${key.r*0.7}px IBM Plex Mono, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(key.label, key.cx, key.cy);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.restore();
    });

    if (this.keyFlashT > 0) this.keyFlashT -= 0.08;
    else this.keyFlash = null;

    this._floatingLabel(ctx, W*0.04+220, H*0.55, 'SCENE 05', 'Comment "VIDEO" to get it', GOLD, t);
  }

  // ── Scene 6: Instagram profile ─────────────────────────────────────────────
  _drawScene6(ctx, W, H, t) {
    const cardW = W * 0.32;
    const cardH = H * 0.5;
    const cardX = W - cardW - 24;
    const cardY = (H - cardH) / 2;

    this._roundRect(ctx, cardX, cardY, cardW, cardH, 14);
    ctx.fillStyle = DARK;
    ctx.fill();
    ctx.strokeStyle = `rgba(224,83,61,${0.5*t})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // instagram gradient top bar
    const grad = ctx.createLinearGradient(cardX, cardY, cardX+cardW, cardY);
    grad.addColorStop(0, '#f09433');
    grad.addColorStop(0.25, '#e6683c');
    grad.addColorStop(0.5, '#dc2743');
    grad.addColorStop(0.75, '#cc2366');
    grad.addColorStop(1, '#bc1888');
    this._roundRectTop(ctx, cardX, cardY, cardW, 4, 14);
    ctx.fillStyle = grad;
    ctx.fill();

    // avatar circle
    const avCx = cardX + cardW/2;
    const avCy = cardY + 60;
    const avR = 28;
    ctx.beginPath();
    ctx.arc(avCx, avCy, avR+3, 0, Math.PI*2);
    ctx.strokeStyle = '#dc2743';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(avCx, avCy, avR, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(245,197,24,0.15)';
    ctx.fill();
    ctx.fillStyle = GOLD;
    ctx.font = `700 22px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✦', avCx, avCy);
    ctx.textBaseline = 'alphabetic';

    // name
    ctx.fillStyle = PAPER;
    ctx.font = `700 13px IBM Plex Mono, monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('aiwithunnati', avCx, avCy + avR + 20);

    ctx.fillStyle = 'rgba(234,229,214,0.45)';
    ctx.font = `400 10px IBM Plex Mono, monospace`;
    ctx.fillText('Unnati Tripathi', avCx, avCy + avR + 36);

    // stats
    const stats = [['27K+', 'likes'], ['10K', 'views'], ['AI', 'content']];
    const statY = avCy + avR + 62;
    stats.forEach((s, i) => {
      const sx = cardX + (i+0.5) * (cardW/3);
      ctx.fillStyle = GOLD;
      ctx.font = `700 13px IBM Plex Mono, monospace`;
      ctx.fillText(s[0], sx, statY);
      ctx.fillStyle = 'rgba(234,229,214,0.4)';
      ctx.font = `400 9px IBM Plex Mono, monospace`;
      ctx.fillText(s[1], sx, statY+14);
    });

    // follow button
    const btnY = statY + 36;
    this._roundRect(ctx, cardX+20, btnY, cardW-40, 30, 6);
    const btnGrad = ctx.createLinearGradient(cardX+20, btnY, cardX+cardW-20, btnY);
    btnGrad.addColorStop(0, '#f09433');
    btnGrad.addColorStop(1, '#bc1888');
    ctx.fillStyle = btnGrad;
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `700 11px IBM Plex Mono, monospace`;
    ctx.fillText('FOLLOW', cardX+cardW/2, btnY+19);

    // handle
    const handleY = btnY + 48;
    ctx.fillStyle = 'rgba(234,229,214,0.3)';
    ctx.font = `400 10px IBM Plex Mono, monospace`;
    ctx.fillText('@aiwithunnati', cardX+cardW/2, handleY);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    this._floatingLabel(ctx, W*0.04+220, H*0.38, 'SCENE 06', 'Follow for more Claude tips', '#dc2743', t);
  }

  // ── Keyboard key positions ─────────────────────────────────────────────────
  _getKeyboardKeys(W, H) {
    const kbW = W * 0.35;
    const kbX = W - kbW - 20;
    const kbY = H * 0.64;
    const rows = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
    const keyR = kbW * 0.043;
    const keys = [];
    rows.forEach((row, ri) => {
      const letters = row.split('');
      const rowW = letters.length * keyR * 2.4;
      const startX = kbX + kbW/2 - rowW/2 + keyR;
      letters.forEach((l, ci) => {
        keys.push({
          label: l,
          cx: startX + ci * keyR * 2.4,
          cy: kbY + ri * keyR * 1.9 + keyR,
          r: keyR,
        });
      });
    });
    return keys;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  _drawParticles(ctx, W, H) {
    this.particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = 1; if (p.x > 1) p.x = 0;
      if (p.y < 0) p.y = 1; if (p.y > 1) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x*W, p.y*H, p.r, 0, Math.PI*2);
      ctx.fillStyle = `rgba(245,197,24,${p.a*0.35})`;
      ctx.fill();
    });
  }

  _floatingLabel(ctx, x, y, tag, subtitle, color, t) {
    ctx.save();
    ctx.globalAlpha = 0.9 * t;
    ctx.fillStyle = 'rgba(8,8,6,0.85)';
    this._roundRect(ctx, x, y, 200, 52, 8);
    ctx.fill();
    ctx.strokeStyle = `${color}55`;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = `600 9px IBM Plex Mono, monospace`;
    ctx.textAlign = 'left';
    ctx.fillText(tag, x+12, y+17);
    ctx.fillStyle = 'rgba(234,229,214,0.65)';
    ctx.font = `400 10px IBM Plex Mono, monospace`;
    ctx.fillText(subtitle, x+12, y+36);
    ctx.restore();
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.lineTo(x+w-r, y);
    ctx.quadraticCurveTo(x+w, y, x+w, y+r);
    ctx.lineTo(x+w, y+h-r);
    ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
    ctx.lineTo(x+r, y+h);
    ctx.quadraticCurveTo(x, y+h, x, y+h-r);
    ctx.lineTo(x, y+r);
    ctx.quadraticCurveTo(x, y, x+r, y);
    ctx.closePath();
  }

  _roundRectTop(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.lineTo(x+w-r, y);
    ctx.quadraticCurveTo(x+w, y, x+w, y+r);
    ctx.lineTo(x+w, y+h);
    ctx.lineTo(x, y+h);
    ctx.lineTo(x, y+r);
    ctx.quadraticCurveTo(x, y, x+r, y);
    ctx.closePath();
  }
}
