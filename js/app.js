import { FilesetResolver, HandLandmarker } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
import { detectGesture, GestureSmoothing, GESTURES } from './gestures.js';
import { WatchVisual } from './visuals/watch.js';

const videoEl = document.getElementById('webcam');
const canvas = document.getElementById('overlayCanvas');
const ctx = canvas.getContext('2d');
const loadingOverlay = document.getElementById('loadingOverlay');
const loaderText = document.getElementById('loaderText');
const loaderRetry = document.getElementById('loaderRetry');
const gestureLabel = document.getElementById('gestureLabel');
const gestureIcon = document.getElementById('gestureIcon');
const gesturePill = document.querySelector('.gesture-pill');
const slideCounter = document.getElementById('slideCounter');
const slideNum = document.getElementById('slideNum');
const slideTotal = document.getElementById('slideTotal');
const recIndicator = document.getElementById('recIndicator');
const recordBtn = document.getElementById('recordBtn');
const fullscreenBtn = document.getElementById('fullscreenBtn');

// ── Active visual (swap this per video) ──────────────────────────────────────
const visual = new WatchVisual();

// ── Gesture smoothing ─────────────────────────────────────────────────────────
const smoother = new GestureSmoothing(10);
let lastGesture = GESTURES.NONE;
let gestureTimeout = null;

// ── Recorder ──────────────────────────────────────────────────────────────────
const recorder = { instance: null, chunks: [], recording: false };

function startRecording() {
  recorder.chunks = [];
  const stream = canvas.captureStream(30);
  recorder.instance = new MediaRecorder(stream, { mimeType: 'video/webm' });
  recorder.instance.ondataavailable = e => { if (e.data.size > 0) recorder.chunks.push(e.data); };
  recorder.instance.onstop = () => {
    const blob = new Blob(recorder.chunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `maester-labs-${Date.now()}.webm`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    recIndicator.classList.add('hidden');
    recordBtn.textContent = '⏺';
    recorder.recording = false;
  };
  recorder.instance.start();
  recorder.recording = true;
  recIndicator.classList.remove('hidden');
  recordBtn.textContent = '⏹';
}

function stopRecording() {
  if (recorder.instance && recorder.instance.state !== 'inactive') {
    recorder.instance.stop();
  }
}

recordBtn.addEventListener('click', () => {
  recorder.recording ? stopRecording() : startRecording();
});

fullscreenBtn.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
});

// ── Gesture handler ───────────────────────────────────────────────────────────
const GESTURE_META = {
  [GESTURES.OPEN_PALM]: { icon: '🖐', label: 'show content' },
  [GESTURES.FIST]:      { icon: '👊', label: 'clear' },
  [GESTURES.PEACE]:     { icon: '✌️', label: 'compare' },
  [GESTURES.POINT_LEFT]:  { icon: '👈', label: 'previous' },
  [GESTURES.POINT_RIGHT]: { icon: '👉', label: 'next' },
  [GESTURES.PINCH]:     { icon: '🤏', label: 'pinch' },
  [GESTURES.NONE]:      { icon: '✋', label: 'show your hand' },
};

function handleGesture(gesture) {
  if (gesture === lastGesture) return;
  lastGesture = gesture;

  const meta = GESTURE_META[gesture] || GESTURE_META[GESTURES.NONE];
  gestureIcon.textContent = meta.icon;
  gestureLabel.textContent = meta.label;

  if (gesture !== GESTURES.NONE) {
    gesturePill.classList.add('active');
    clearTimeout(gestureTimeout);
    gestureTimeout = setTimeout(() => gesturePill.classList.remove('active'), 1500);
  }

  switch (gesture) {
    case GESTURES.OPEN_PALM:
      visual.show();
      updateSlideCounter();
      break;
    case GESTURES.FIST:
      visual.hide();
      slideCounter.classList.add('hidden');
      break;
    case GESTURES.POINT_RIGHT:
      visual.next();
      updateSlideCounter();
      break;
    case GESTURES.POINT_LEFT:
      visual.prev();
      updateSlideCounter();
      break;
  }
}

function updateSlideCounter() {
  if (visual.visible) {
    slideCounter.classList.remove('hidden');
    slideNum.textContent = visual.currentSlide + 1;
    slideTotal.textContent = visual.totalSlides;
  }
}

// ── Hand skeleton drawing ─────────────────────────────────────────────────────
const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16],
  [13,17],[17,18],[18,19],[19,20],
  [0,17],
];

function drawHandSkeleton(landmarks) {
  const W = canvas.width, H = canvas.height;
  const pts = landmarks.map(lm => ({
    x: (1 - lm.x) * W,
    y: lm.y * H,
  }));

  ctx.save();
  ctx.strokeStyle = 'rgba(245,197,24,0.7)';
  ctx.lineWidth = 2;
  ctx.shadowColor = 'rgba(245,197,24,0.5)';
  ctx.shadowBlur = 6;
  HAND_CONNECTIONS.forEach(([a, b]) => {
    ctx.beginPath();
    ctx.moveTo(pts[a].x, pts[a].y);
    ctx.lineTo(pts[b].x, pts[b].y);
    ctx.stroke();
  });
  ctx.fillStyle = '#f5c518';
  ctx.shadowBlur = 4;
  pts.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

// ── Main loop ─────────────────────────────────────────────────────────────────
let handLandmarker = null;

function renderLoop() {
  if (videoEl.readyState >= 2 && handLandmarker) {
    canvas.width = videoEl.videoWidth;
    canvas.height = videoEl.videoHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const result = handLandmarker.detectForVideo(videoEl, performance.now());
    const hands = result.landmarks || [];

    if (hands.length > 0) {
      const raw = detectGesture(hands[0]);
      const smoothed = smoother.update(raw);
      handleGesture(smoothed);
      drawHandSkeleton(hands[0]);
    } else {
      smoother.reset();
      handleGesture(GESTURES.NONE);
    }

    visual.draw(ctx, canvas.width, canvas.height);
  }
  requestAnimationFrame(renderLoop);
}

// ── Boot ──────────────────────────────────────────────────────────────────────
async function boot() {
  try {
    loaderText.textContent = 'starting camera…';
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      audio: false,
    });
    videoEl.srcObject = stream;
    await new Promise(r => { videoEl.onloadedmetadata = () => { videoEl.play(); r(); }; });

    loaderText.textContent = 'loading hand tracking model…';
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
    );
    handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
        delegate: 'GPU',
      },
      runningMode: 'video',
      numHands: 1,
      minHandDetectionConfidence: 0.6,
      minHandPresenceConfidence: 0.6,
      minTrackingConfidence: 0.6,
    });

    loadingOverlay.classList.add('hidden');
    requestAnimationFrame(renderLoop);
  } catch (err) {
    loaderText.style.color = '#e0533d';
    if (err.name === 'NotAllowedError') {
      loaderText.textContent = 'camera permission denied — enable and retry';
    } else {
      loaderText.textContent = err.message || 'something went wrong';
    }
    loaderRetry.classList.remove('hidden');
  }
}

loaderRetry.addEventListener('click', () => {
  loaderText.style.color = '';
  loaderRetry.classList.add('hidden');
  boot();
});

boot();
