import { FilesetResolver, HandLandmarker, FaceLandmarker } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
import { detectGesture, GestureSmoothing, GESTURES } from './gestures.js';
import { WatchScript } from './visuals/watchScript.js';

const videoEl   = document.getElementById('webcam');
const canvas    = document.getElementById('overlayCanvas');
const ctx       = canvas.getContext('2d');
const loadingOverlay = document.getElementById('loadingOverlay');
const loaderText     = document.getElementById('loaderText');
const loaderRetry    = document.getElementById('loaderRetry');
const gesturePill    = document.getElementById('gesturePill');
const gestureIcon    = document.getElementById('gestureIcon');
const gestureLabel   = document.getElementById('gestureLabel');
const slideCounter   = document.getElementById('slideCounter');
const slideNum       = document.getElementById('slideNum');
const slideTotal     = document.getElementById('slideTotal');
const recIndicator   = document.getElementById('recIndicator');
const recordBtn      = document.getElementById('recordBtn');
const fullscreenBtn  = document.getElementById('fullscreenBtn');
const codeBody       = document.getElementById('codeBody');

// ── Active visual ─────────────────────────────────────────────────────────────
const visual = new WatchScript();

// ── Gesture smoothing ─────────────────────────────────────────────────────────
const smoother = new GestureSmoothing(10);
let lastGesture = GESTURES.NONE;
let gestureCooldown = 0;
let pillTimeout = null;

// ── Face box state ────────────────────────────────────────────────────────────
let faceBox = null;

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
    const a = document.createElement('a'); a.href = url;
    a.download = `maester-labs-${Date.now()}.webm`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
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
  if (recorder.instance && recorder.instance.state !== 'inactive') recorder.instance.stop();
}

recordBtn.addEventListener('click', () => recorder.recording ? stopRecording() : startRecording());
fullscreenBtn.addEventListener('click', () => {
  document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
});

// ── Gesture handling ──────────────────────────────────────────────────────────
const GESTURE_META = {
  [GESTURES.OPEN_PALM]:   { icon: '🖐', label: 'show content' },
  [GESTURES.FIST]:        { icon: '👊', label: 'clear' },
  [GESTURES.PEACE]:       { icon: '✌️', label: 'compare' },
  [GESTURES.POINT_LEFT]:  { icon: '👈', label: 'previous' },
  [GESTURES.POINT_RIGHT]: { icon: '👉', label: 'next' },
  [GESTURES.PINCH]:       { icon: '🤏', label: 'pinch' },
  [GESTURES.NONE]:        { icon: '✋', label: 'show your hand' },
};

function handleGesture(gesture) {
  if (gesture === lastGesture) return;
  if (gestureCooldown > 0) return;
  lastGesture = gesture;

  const meta = GESTURE_META[gesture] || GESTURE_META[GESTURES.NONE];
  gestureIcon.textContent = meta.icon;
  gestureLabel.textContent = meta.label;

  if (gesture !== GESTURES.NONE) {
    gesturePill.classList.add('active');
    clearTimeout(pillTimeout);
    pillTimeout = setTimeout(() => gesturePill.classList.remove('active'), 1400);
  }

  switch (gesture) {
    case GESTURES.OPEN_PALM:
      visual.show();
      gestureCooldown = 20;
      updateCounter();
      break;
    case GESTURES.FIST:
      visual.hide();
      slideCounter.classList.add('hidden');
      gestureCooldown = 20;
      break;
    case GESTURES.POINT_RIGHT:
      visual.next();
      gestureCooldown = 25;
      updateCounter();
      break;
    case GESTURES.POINT_LEFT:
      visual.prev();
      gestureCooldown = 25;
      updateCounter();
      break;
  }
}

function updateCounter() {
  if (visual.visible) {
    slideCounter.classList.remove('hidden');
    slideNum.textContent = visual.scene + 1;
    slideTotal.textContent = visual.totalScenes;
  }
}

// ── Hand skeleton ─────────────────────────────────────────────────────────────
const CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16],
  [13,17],[17,18],[18,19],[19,20],
  [0,17],
];

function drawHand(landmarks) {
  const W = canvas.width, H = canvas.height;
  const pts = landmarks.map(lm => ({ x: (1-lm.x)*W, y: lm.y*H }));
  ctx.save();
  ctx.strokeStyle = 'rgba(245,197,24,0.65)';
  ctx.lineWidth = 1.8;
  ctx.shadowColor = 'rgba(245,197,24,0.4)';
  ctx.shadowBlur = 5;
  CONNECTIONS.forEach(([a,b]) => {
    ctx.beginPath(); ctx.moveTo(pts[a].x, pts[a].y);
    ctx.lineTo(pts[b].x, pts[b].y); ctx.stroke();
  });
  ctx.fillStyle = GOLD;
  ctx.shadowBlur = 3;
  pts.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, Math.PI*2); ctx.fill(); });
  ctx.restore();

  // finger tip for keyboard tap detection (index tip = landmark 8)
  const tip = pts[8];
  const normX = 1 - landmarks[8].x;
  const normY = landmarks[8].y;
  visual.onFingerTap(normX, normY, W, H);

  // fingertip glow
  ctx.save();
  ctx.beginPath();
  ctx.arc(tip.x, tip.y, 8, 0, Math.PI*2);
  ctx.fillStyle = 'rgba(245,197,24,0.25)';
  ctx.fill();
  ctx.restore();
}

// ── Code panel content ────────────────────────────────────────────────────────
const CODE_LINES = [
  '<span class="code-cmt">// maester labs</span>',
  '<span class="code-kw">import</span> { HandLandmarker }',
  '  <span class="code-kw">from</span> <span class="code-str">"@mediapipe/tasks"</span>',
  '',
  '<span class="code-kw">const</span> visual = <span class="code-kw">new</span>',
  '  <span class="code-fn">WatchScript</span>()',
  '',
  '<span class="code-fn">detectGesture</span>(landmarks)',
  '  .then(g => {',
  '    <span class="code-kw">if</span> (g === <span class="code-str">"open_palm"</span>)',
  '      visual.<span class="code-fn">show</span>()',
  '    <span class="code-kw">if</span> (g === <span class="code-str">"fist"</span>)',
  '      visual.<span class="code-fn">hide</span>()',
  '    <span class="code-kw">if</span> (g === <span class="code-str">"point_right"</span>)',
  '      visual.<span class="code-fn">next</span>()',
  '  })',
  '',
  '<span class="code-kw">function</span> <span class="code-fn">renderLoop</span>() {',
  '  visual.<span class="code-fn">draw</span>(ctx, W, H)',
  '  <span class="code-fn">requestAnimationFrame</span>',
  '    (<span class="code-fn">renderLoop</span>)',
  '}',
  '',
  '<span class="code-cmt">// © aiwithunnati</span>',
];

codeBody.innerHTML = CODE_LINES.map(l => `<span class="code-line">${l}</span>`).join('\n');

// ── Main render loop ──────────────────────────────────────────────────────────
let handLandmarker = null;

function renderLoop() {
  if (videoEl.readyState < 2 || !handLandmarker) { requestAnimationFrame(renderLoop); return; }

  canvas.width  = videoEl.videoWidth;
  canvas.height = videoEl.videoHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (gestureCooldown > 0) gestureCooldown--;

  const result = handLandmarker.detectForVideo(videoEl, performance.now());
  const hands  = result.landmarks || [];

  if (hands.length > 0) {
    const raw      = detectGesture(hands[0]);
    const smoothed = smoother.update(raw);
    handleGesture(smoothed);
    drawHand(hands[0]);
  } else {
    smoother.reset();
    if (lastGesture !== GESTURES.NONE) {
      lastGesture = GESTURES.NONE;
      gestureIcon.textContent = '✋';
      gestureLabel.textContent = 'show your hand';
    }
  }

  visual.draw(ctx, canvas.width, canvas.height, faceBox);
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
    loaderText.textContent = err.name === 'NotAllowedError'
      ? 'camera permission denied — enable and retry'
      : err.message || 'something went wrong';
    loaderRetry.classList.remove('hidden');
  }
}

loaderRetry.addEventListener('click', () => {
  loaderText.style.color = '';
  loaderRetry.classList.add('hidden');
  boot();
});

boot();
