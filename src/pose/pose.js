import { Pose } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';

/**
 * MediaPipe Pose を初期化し、毎フレームのランドマーク結果を callback に渡す。
 * @param {HTMLVideoElement} videoEl
 * @param {(landmarks: Array) => void} onResults
 */
export function initPose(videoEl, onResults) {
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

  camera.start().catch((err) => {
    console.error('カメラの起動に失敗しました:', err);
  });
}
