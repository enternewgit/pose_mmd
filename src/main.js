import * as THREE from 'three';
import {
  initScene,
  renderScene,
  frameCameraToObject,
  initCameraControls,
  setSideView,
} from './three/scene.js';
import { loadMMDModel } from './three/model.js';
import { updateBones } from './three/animation.js';
import { initPose, startPseudoPose } from './pose/pose.js';
import { mapPoseToMMD } from './pose/mapping.js';

const QUERY = new URLSearchParams(window.location.search);
const MODEL_PATH = '/models/model.pmx'; // public/ 以下のモデルパス
const ENABLE_POSE = QUERY.get('pose') !== '0';
const ENABLE_PSEUDO_FALLBACK = QUERY.get('pseudoFallback') !== '0';
const ENABLE_PSEUDO_AUTO_MOTION = QUERY.get('pseudoMotion') === '1';
const ENABLE_SIDE_VIEW = QUERY.get('sideView') === '1';

async function main() {
  // Three.js シーン初期化
  const { scene, camera, renderer } = initScene();
  const controls = initCameraControls(camera, renderer);

  // MMDモデル読み込み
  let mesh = null;
  try {
    mesh = await loadMMDModel(scene, MODEL_PATH);
    frameCameraToObject(camera, mesh);
    if (controls) {
      const center = new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3());
      controls.target.copy(center);
      controls.update();
    }
    if (ENABLE_SIDE_VIEW) {
      setSideView(camera, controls, 1.05);
    }
  } catch (e) {
    console.error(`MMDモデルの読み込みに失敗しました (${MODEL_PATH})。モデルなしで起動します:`, e);
  }

  // MediaPipe Pose 初期化（デフォルトOFF。?pose=1 で有効化）
  const videoEl = document.getElementById('webcam');
  const landmarkPadEl = document.getElementById('landmark-pad');
  const applyLandmarks = (landmarks) => {
    if (!mesh) return;
    const boneRotations = mapPoseToMMD(landmarks);
    updateBones(mesh, boneRotations);
  };

  const showWebcamPreview = () => {
    if (videoEl) videoEl.style.display = 'block';
    if (landmarkPadEl) landmarkPadEl.style.display = 'none';
  };

  const showLandmarkPad = () => {
    if (videoEl) videoEl.style.display = 'none';
    if (landmarkPadEl) landmarkPadEl.style.display = 'block';
  };

  let stopPseudoPose = null;
  if (ENABLE_POSE) {
    showWebcamPreview();
    initPose(videoEl, applyLandmarks, {
      onCameraReady: () => {
        showWebcamPreview();
        console.log('Webカメラから骨格検知を開始しました。');
      },
      onCameraUnavailable: () => {
        if (!ENABLE_PSEUDO_FALLBACK || stopPseudoPose) return;
        showLandmarkPad();
        stopPseudoPose = startPseudoPose(applyLandmarks, {
          fps: 30,
          inputEl: landmarkPadEl,
          previewCanvasEl: landmarkPadEl,
          enableAutoMotion: ENABLE_PSEUDO_AUTO_MOTION,
        });
        console.log('カメラ未接続のため、擬似ランドマークへフォールバックしました。');
        if (!ENABLE_PSEUDO_AUTO_MOTION) {
          console.log('擬似ランドマークの自動ゆらぎは無効です（?pseudoMotion=1 で有効化）。');
        }
      },
    });
  } else {
    if (videoEl) videoEl.style.display = 'none';
    if (landmarkPadEl) landmarkPadEl.style.display = 'none';
    console.log('Pose連携を無効化しています。URLに ?pose=0 を外すと有効化できます。');
  }

  // アニメーションループ
  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderScene(renderer, scene, camera);
  }
  animate();
}

main().catch(console.error);
