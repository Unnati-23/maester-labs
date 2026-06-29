// Visual: "The GitHub repo that lets Claude watch videos"
// Triggered by open palm, navigate with swipe, clear with fist

const GOLD = '#f5c518';
const PAPER = '#eae5d6';
const DARK = 'rgba(8,8,6,0.82)';
const GREEN = '#5fae6e';

const SLIDES = [
  {
    label: 'THE REPO',
    title: '/watch',
    subtitle: 'gives Claude the ability to watch any video',
    body: 'One slash command. Paste any URL.\nClaude downloads, extracts frames,\ntranscribes, and answers your question.',
    accent: GOLD,
    icon: '📺',
  },
  {
    label: 'HOW IT WORKS',
    title: 'Under the hood',
    subtitle: 'three tools working together',
    body: 'yt-dlp  →  downloads the video\nffmpeg  →  extracts frames as images\nWhisper →  transcribes the audio',
    accent: '#4a9edd',
    icon: '⚙️',
  },
  {
    label: 'THE RESULT',
    title: 'Claude sees everything',
    subtitle: 'frames + transcript in one pass',
    body: 'Ask "what happens at 2:30?"\nAsk "summarize this lecture"\nAsk "what bug is in this screen recording?"',
    accent: GREEN,
    icon: '👁️',
  },
  {
    label: 'INSTALL IT',
    title: 'One command',
    subtitle: 'works in Claude Code desktop',
    body: 'gh repo clone bradautomates/claude-video\n~/.claude/skills/watch\n\nthen just type /watch <url>',
    accent: GOLD,
    icon: '⚡',
    code: true,
  },
];

export class WatchVisual {
  constructor() {
    this.currentSlide = 0;
    this.visible = false;
    this.animT = 0;
    this.particles = [];
    this.initParticles();
  }

  get totalSlides() { return SLIDES.length; }

  show() {
    this.visible = true;
    this.animT = 0;
  }

  hide() {
    this.visible = false;
  }

  next() {
    if (this.currentSlide < SLIDES.length - 1) {
      this.currentSlide++;
      this.animT = 0;
    }
  }

  prev() {
    if (this.currentSlide > 0) {
      this.currentSlide--;
      this.animT = 0;
    }
  }

  initParticles() {
    for (let i = 0; i < 18; i++) {
      this.particles.push({
        x: Math.random(), y: Math.random(),
        vx: (Math.random() - 0.5) * 0.0006,
        vy: (Math.random() - 0.5) * 0.0006,
        r: 1.5 + Math.random() * 2.5,
        alpha: 0.2 + Math.random() * 0.4,
      });
    }
  }

  draw(ctx, W, H) {
    if (!this.visible) return;
    this.animT += 0.02;

    const slide = SLIDES[this.currentSlide];
    const t = Math.min(1, this.animT / 0.6);
    const ease = 1 - Math.pow(1 - t, 3);

    // floating particles
    this.particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = 1; if (p.x > 1) p.x = 0;
      if (p.y < 0) p.y = 1; if (p.y > 1) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x * W, p.y * H, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(245,197,24,${p.alpha * ease * 0.5})`;
      ctx.fill();
    });

    // main card — right side
    const cardW = Math.min(420, W * 0.38);
    const cardH = Math.min(360, H * 0.55);
    const cardX = W - cardW - 40;
    const cardY = (H - cardH) / 2;
    const slideOffset = (1 - ease) * 60;

    ctx.save();
    ctx.globalAlpha = ease;
    ctx.translate(slideOffset, 0);

    // card background
    ctx.fillStyle = DARK;
    roundRect(ctx, cardX, cardY, cardW, cardH, 12);
    ctx.fill();

    // accent top bar
    ctx.fillStyle = slide.accent;
    roundRectTop(ctx, cardX, cardY, cardW, 4, 12);
    ctx.fill();

    // label
    ctx.fillStyle = slide.accent;
    ctx.font = `600 10px 'IBM Plex Mono', monospace`;
    ctx.letterSpacing = '0.15em';
    ctx.fillText(slide.label, cardX + 24, cardY + 28);

    // icon
    ctx.font = `32px serif`;
    ctx.fillText(slide.icon, cardX + cardW - 56, cardY + 36);

    // title
    ctx.fillStyle = PAPER;
    ctx.font = `700 ${Math.min(28, cardW * 0.07)}px 'IBM Plex Mono', monospace`;
    ctx.fillText(slide.title, cardX + 24, cardY + 72);

    // subtitle
    ctx.fillStyle = slide.accent;
    ctx.font = `400 11px 'IBM Plex Mono', monospace`;
    wrapText(ctx, slide.subtitle, cardX + 24, cardY + 96, cardW - 48, 16);

    // divider
    ctx.strokeStyle = `rgba(234,229,214,0.12)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cardX + 24, cardY + 112);
    ctx.lineTo(cardX + cardW - 24, cardY + 112);
    ctx.stroke();

    // body
    const bodyColor = slide.code ? GOLD : `rgba(234,229,214,0.8)`;
    ctx.fillStyle = bodyColor;
    ctx.font = `${slide.code ? '500' : '400'} 12px 'IBM Plex Mono', monospace`;
    const lines = slide.body.split('\n');
    lines.forEach((line, i) => {
      ctx.fillText(line, cardX + 24, cardY + 140 + i * 22);
    });

    // slide dots
    const dotY = cardY + cardH - 24;
    const dotSpacing = 14;
    const dotsStartX = cardX + cardW / 2 - (SLIDES.length * dotSpacing) / 2;
    SLIDES.forEach((_, i) => {
      ctx.beginPath();
      ctx.arc(dotsStartX + i * dotSpacing, dotY, i === this.currentSlide ? 4 : 2.5, 0, Math.PI * 2);
      ctx.fillStyle = i === this.currentSlide ? slide.accent : `rgba(234,229,214,0.3)`;
      ctx.fill();
    });

    ctx.restore();

    // left side floating tag
    const tagY = H / 2;
    const tagX = 40;
    ctx.save();
    ctx.globalAlpha = ease * 0.9;
    ctx.fillStyle = DARK;
    roundRect(ctx, tagX, tagY - 30, 220, 60, 8);
    ctx.fill();
    ctx.fillStyle = GOLD;
    ctx.font = '700 11px IBM Plex Mono, monospace';
    ctx.fillText('MAESTER LABS', tagX + 16, tagY - 8);
    ctx.fillStyle = `rgba(234,229,214,0.7)`;
    ctx.font = '400 11px IBM Plex Mono, monospace';
    ctx.fillText('by @aiwithunnati', tagX + 16, tagY + 12);
    ctx.restore();
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function roundRectTop(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(ctx, text, x, y, maxW, lineH) {
  const words = text.split(' ');
  let line = '';
  let cy = y;
  words.forEach(word => {
    const test = line + word + ' ';
    if (ctx.measureText(test).width > maxW && line !== '') {
      ctx.fillText(line.trim(), x, cy);
      line = word + ' ';
      cy += lineH;
    } else {
      line = test;
    }
  });
  ctx.fillText(line.trim(), x, cy);
}
