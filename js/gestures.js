// Gesture detection engine
export const GESTURES = {
  NONE: 'none',
  OPEN_PALM: 'open_palm',
  FIST: 'fist',
  PEACE: 'peace',
  POINT_LEFT: 'point_left',
  POINT_RIGHT: 'point_right',
  PINCH: 'pinch',
};

const LM = {
  WRIST: 0, THUMB_TIP: 4,
  INDEX_MCP: 5, INDEX_TIP: 8,
  MIDDLE_MCP: 9, MIDDLE_TIP: 12,
  RING_MCP: 13, RING_TIP: 16,
  PINKY_MCP: 17, PINKY_TIP: 20,
};

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function isExtended(tip, mcp, wrist) {
  return dist(tip, wrist) > dist(mcp, wrist);
}

export function detectGesture(landmarks) {
  const wrist = landmarks[LM.WRIST];
  const indexTip = landmarks[LM.INDEX_TIP];
  const indexMcp = landmarks[LM.INDEX_MCP];
  const middleTip = landmarks[LM.MIDDLE_TIP];
  const middleMcp = landmarks[LM.MIDDLE_MCP];
  const ringTip = landmarks[LM.RING_TIP];
  const ringMcp = landmarks[LM.RING_MCP];
  const pinkyTip = landmarks[LM.PINKY_TIP];
  const pinkyMcp = landmarks[LM.PINKY_MCP];
  const thumbTip = landmarks[LM.THUMB_TIP];

  const indexUp = isExtended(indexTip, indexMcp, wrist);
  const middleUp = isExtended(middleTip, middleMcp, wrist);
  const ringUp = isExtended(ringTip, ringMcp, wrist);
  const pinkyUp = isExtended(pinkyTip, pinkyMcp, wrist);

  const pinching = dist(thumbTip, indexTip) < 0.06;

  // fist — all fingers curled
  if (!indexUp && !middleUp && !ringUp && !pinkyUp) return GESTURES.FIST;

  // pinch
  if (pinching && !middleUp && !ringUp) return GESTURES.PINCH;

  // peace / v-sign — index + middle up, ring + pinky down
  if (indexUp && middleUp && !ringUp && !pinkyUp) return GESTURES.PEACE;

  // open palm — at least 3 fingers up
  if ([indexUp, middleUp, ringUp, pinkyUp].filter(Boolean).length >= 3) return GESTURES.OPEN_PALM;

  // point left/right — only index up, check direction
  if (indexUp && !middleUp && !ringUp && !pinkyUp) {
    const dx = indexTip.x - wrist.x;
    if (dx > 0.08) return GESTURES.POINT_LEFT;   // mirrored so left = positive x
    if (dx < -0.08) return GESTURES.POINT_RIGHT;
  }

  return GESTURES.NONE;
}

// Smoothing — hold a gesture for N frames before committing
export class GestureSmoothing {
  constructor(holdFrames = 4) {
    this.holdFrames = holdFrames;
    this.candidate = GESTURES.NONE;
    this.count = 0;
    this.confirmed = GESTURES.NONE;
  }

  update(raw) {
    if (raw === this.candidate) {
      this.count++;
      if (this.count >= this.holdFrames) {
        this.confirmed = this.candidate;
      }
    } else {
      this.candidate = raw;
      this.count = 1;
    }
    return this.confirmed;
  }

  reset() {
    this.candidate = GESTURES.NONE;
    this.count = 0;
    this.confirmed = GESTURES.NONE;
  }
}
