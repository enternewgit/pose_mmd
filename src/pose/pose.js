import { Pose } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';

const LANDMARK_COUNT = 33;
const EDITABLE_LANDMARK_INDEXES = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
const MIN_LANDMARK_Z = -0.35;
const MAX_LANDMARK_Z = 0.35;

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function createDefaultLandmarks() {
  return Array.from({ length: LANDMARK_COUNT }, () => ({
    x: 0.5,
    y: 0.5,
    z: 0,
    visibility: 1,
  }));
}

function findNearestEditableLandmark(landmarks, x, y, maxDistance = 0.11) {
  let nearestIndex = null;
  let nearestDistSq = maxDistance * maxDistance;

  for (const index of EDITABLE_LANDMARK_INDEXES) {
    const p = landmarks[index];
    if (!p) continue;
    const dx = p.x - x;
    const dy = p.y - y;
    const distSq = dx * dx + dy * dy;
    if (distSq < nearestDistSq) {
      nearestDistSq = distSq;
      nearestIndex = index;
    }
  }

  return nearestIndex;
}

function applyManualOverrides(landmarks, overrides) {
  for (const [index, point] of overrides.entries()) {
    if (!Number.isInteger(index) || index < 0 || index >= landmarks.length) continue;
    const current = landmarks[index] ?? { x: 0.5, y: 0.5, z: 0, visibility: 1 };
    landmarks[index] = {
      ...current,
      x: clamp01(point.x),
      y: clamp01(point.y),
      z: clamp(typeof point.z === 'number' ? point.z : current.z, MIN_LANDMARK_Z, MAX_LANDMARK_Z),
      visibility: 1,
    };
  }
}

function createPseudoLandmarks(timeSec, options = {}) {
  const lm = createDefaultLandmarks();

  const motionScale = options.enableAutoMotion ? 1 : 0;
  const swing = Math.sin(timeSec * 2.0) * 0.06 * motionScale;
  const bend = Math.sin(timeSec * 1.4 + 0.8) * 0.05 * motionScale;
  const step = Math.sin(timeSec * 2.4) * 0.04 * motionScale;

  // shoulders
  lm[11] = { x: 0.42, y: 0.36 + swing * 0.2, z: -0.05, visibility: 1 };
  lm[12] = { x: 0.58, y: 0.36 - swing * 0.2, z: -0.05, visibility: 1 };

  // elbows / wrists
  lm[13] = { x: 0.33, y: 0.48 - swing, z: -0.03, visibility: 1 };
  lm[14] = { x: 0.67, y: 0.48 + swing, z: -0.03, visibility: 1 };
  lm[15] = { x: 0.25, y: 0.58 - swing * 1.3, z: -0.02, visibility: 1 };
  lm[16] = { x: 0.75, y: 0.58 + swing * 1.3, z: -0.02, visibility: 1 };

  // hips
  lm[23] = { x: 0.46, y: 0.62, z: -0.02, visibility: 1 };
  lm[24] = { x: 0.54, y: 0.62, z: -0.02, visibility: 1 };

  // knees
  lm[25] = { x: 0.46 + step * 0.35, y: 0.79 - bend * 0.3, z: 0.00, visibility: 1 };
  lm[26] = { x: 0.54 - step * 0.35, y: 0.79 + bend * 0.3, z: 0.00, visibility: 1 };

  // ankles
  lm[27] = { x: 0.46 + step * 0.45, y: 0.93, z: -0.025, visibility: 1 };
  lm[28] = { x: 0.54 - step * 0.45, y: 0.93, z: -0.025, visibility: 1 };

  return lm;
}

function drawPseudoPreview(canvasEl, landmarks, controlState) {
  if (!canvasEl) return;
  const ctx = canvasEl.getContext('2d');
  if (!ctx) return;

  const width = canvasEl.width;
  const height = canvasEl.height;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = 'rgba(10, 16, 44, 0.78)';
  ctx.fillRect(0, 0, width, height);

  const lines = [
    [11, 13], [13, 15],
    [12, 14], [14, 16],
    [11, 12], [11, 23], [12, 24], [23, 24],
    [23, 25], [25, 27],
    [24, 26], [26, 28],
  ];

  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(132, 194, 255, 0.95)';
  for (const [a, b] of lines) {
    const p1 = landmarks[a];
    const p2 = landmarks[b];
    if (!p1 || !p2) continue;
    ctx.beginPath();
    ctx.moveTo(p1.x * width, p1.y * height);
    ctx.lineTo(p2.x * width, p2.y * height);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  for (let i = 0; i < landmarks.length; i += 1) {
    const p = landmarks[i];
    if (!p) continue;
    const isEditable = EDITABLE_LANDMARK_INDEXES.includes(i);
    const isOverridden = controlState.overrides.has(i);

    ctx.fillStyle = isOverridden
      ? 'rgba(255, 205, 96, 0.95)'
      : isEditable
        ? 'rgba(132, 194, 255, 0.95)'
        : 'rgba(255, 255, 255, 0.9)';

    ctx.beginPath();
    const depthScale = isEditable ? (1.0 + (-p.z * 0.85)) : 1.0;
    const radius = (isEditable ? 3.3 : 2.2) * clamp(depthScale, 0.65, 1.55);
    ctx.arc(p.x * width, p.y * height, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  if (controlState.selectedIndex !== null && landmarks[controlState.selectedIndex]) {
    const p = landmarks[controlState.selectedIndex];
    ctx.strokeStyle = 'rgba(255, 205, 96, 0.95)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x * width, p.y * height, 10, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = '12px sans-serif';
  ctx.fillText('Drag joints', 8, 16);
  ctx.fillText('Mouse wheel: joint depth (Z)', 8, 32);
  ctx.fillText('Right click: reset joint', 8, 48);

  if (controlState.selectedIndex !== null && landmarks[controlState.selectedIndex]) {
    const selected = landmarks[controlState.selectedIndex];
    ctx.fillStyle = 'rgba(255, 205, 96, 0.95)';
    ctx.fillText(`Selected ${controlState.selectedIndex} z=${selected.z.toFixed(3)}`, 8, height - 10);
  }
}

function bindPointerControl(inputEl, controlState) {
  if (!inputEl) {
    return () => {};
  }

  const updatePointer = (event) => {
    const rect = inputEl.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return {
      x: clamp01((event.clientX - rect.left) / rect.width),
      y: clamp01((event.clientY - rect.top) / rect.height),
    };
  };

  const onPointerDown = (event) => {
    const p = updatePointer(event);
    if (!p) return;
    const selected = findNearestEditableLandmark(controlState.latestLandmarks, p.x, p.y);
    if (selected === null) return;
    controlState.dragging = true;
    controlState.selectedIndex = selected;
    const base = controlState.overrides.get(selected) ?? controlState.latestLandmarks[selected] ?? { z: 0 };
    controlState.overrides.set(selected, { ...p, z: base.z ?? 0 });
  };

  const onPointerMove = (event) => {
    if (!controlState.dragging || controlState.selectedIndex === null) return;
    const p = updatePointer(event);
    if (!p) return;
    const base =
      controlState.overrides.get(controlState.selectedIndex)
      ?? controlState.latestLandmarks[controlState.selectedIndex]
      ?? { z: 0 };
    controlState.overrides.set(controlState.selectedIndex, { ...p, z: base.z ?? 0 });
  };

  const onWheel = (event) => {
    if (controlState.selectedIndex === null) return;
    event.preventDefault();
    const index = controlState.selectedIndex;
    const base = controlState.overrides.get(index) ?? controlState.latestLandmarks[index];
    if (!base) return;

    const step = event.shiftKey ? 0.02 : 0.01;
    const delta = event.deltaY < 0 ? -step : step;
    const nextZ = clamp((base.z ?? 0) + delta, MIN_LANDMARK_Z, MAX_LANDMARK_Z);
    controlState.overrides.set(index, {
      x: clamp01(base.x),
      y: clamp01(base.y),
      z: nextZ,
    });
  };

  const onPointerUp = () => {
    controlState.dragging = false;
  };

  const onPointerLeave = () => {
    controlState.dragging = false;
  };

  const onContextMenu = (event) => {
    event.preventDefault();
    const p = updatePointer(event);
    if (!p) return;
    const selected = findNearestEditableLandmark(controlState.latestLandmarks, p.x, p.y);
    if (selected === null) return;
    controlState.overrides.delete(selected);
    if (controlState.selectedIndex === selected) {
      controlState.selectedIndex = null;
    }
  };

  inputEl.addEventListener('pointerdown', onPointerDown);
  inputEl.addEventListener('pointermove', onPointerMove);
  inputEl.addEventListener('pointerup', onPointerUp);
  inputEl.addEventListener('pointerleave', onPointerLeave);
  inputEl.addEventListener('contextmenu', onContextMenu);
  inputEl.addEventListener('wheel', onWheel, { passive: false });

  return () => {
    inputEl.removeEventListener('pointerdown', onPointerDown);
    inputEl.removeEventListener('pointermove', onPointerMove);
    inputEl.removeEventListener('pointerup', onPointerUp);
    inputEl.removeEventListener('pointerleave', onPointerLeave);
    inputEl.removeEventListener('contextmenu', onContextMenu);
    inputEl.removeEventListener('wheel', onWheel);
  };
}

/**
 * 擬似ランドマークを一定周期で生成する。
 * @param {(landmarks: Array) => void} onResults
 * @param {{ fps?: number, inputEl?: HTMLElement, previewCanvasEl?: HTMLCanvasElement, enableAutoMotion?: boolean }} options
 * @returns {() => void} 停止関数
 */
export function startPseudoPose(onResults, options = {}) {
  const fps = options.fps ?? 30;
  const intervalMs = Math.max(16, Math.round(1000 / fps));
  const startedAt = performance.now();
  const controlState = {
    selectedIndex: null,
    dragging: false,
    latestLandmarks: createDefaultLandmarks(),
    overrides: new Map(),
  };
  const unbindPointer = bindPointerControl(options.inputEl, controlState);

  const timerId = window.setInterval(() => {
    const timeSec = (performance.now() - startedAt) / 1000;
    const landmarks = createPseudoLandmarks(timeSec, {
      enableAutoMotion: options.enableAutoMotion === true,
    });
    applyManualOverrides(landmarks, controlState.overrides);
    controlState.latestLandmarks = landmarks;
    onResults(landmarks);
    drawPseudoPreview(options.previewCanvasEl, landmarks, controlState);
  }, intervalMs);

  console.log('擬似ランドマーク再生を開始しました（関節点をドラッグで調整可能）。');
  return () => {
    window.clearInterval(timerId);
    unbindPointer();
    drawPseudoPreview(options.previewCanvasEl, createDefaultLandmarks(), {
      selectedIndex: null,
      dragging: false,
      latestLandmarks: createDefaultLandmarks(),
      overrides: new Map(),
    });
    console.log('擬似ランドマーク再生を停止しました。');
  };
}

/**
 * MediaPipe Pose を初期化し、毎フレームのランドマーク結果を callback に渡す。
 * @param {HTMLVideoElement} videoEl
 * @param {(landmarks: Array) => void} onResults
 * @param {{ onCameraUnavailable?: (error: unknown) => void, onCameraReady?: () => void }} options
 */
export function initPose(videoEl, onResults, options = {}) {
  if (!videoEl) {
    console.warn('video要素が見つからないため、Pose初期化をスキップしました。');
    options.onCameraUnavailable?.(new Error('video element not found'));
    return;
  }

  const pose = new Pose({
    locateFile: (file) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
  });

  pose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: false,
    smoothSegmentation: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  pose.onResults((results) => {
    if (results.poseLandmarks) {
      onResults(results.poseLandmarks);
    }
  });

  const camera = new Camera(videoEl, {
    onFrame: async () => {
      await pose.send({ image: videoEl });
    },
    width: 640,
    height: 480,
  });

  camera
    .start()
    .then(() => {
      options.onCameraReady?.();
    })
    .catch((err) => {
      if (err?.name === 'NotFoundError') {
        console.warn('Webカメラが見つかりません。モデル表示のみで続行します。');
        options.onCameraUnavailable?.(err);
        return;
      }
      console.error('カメラの起動に失敗しました:', err);
      options.onCameraUnavailable?.(err);
    });
}
