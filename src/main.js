import { initScene, renderScene } from './three/scene.js';
import { loadMMDModel } from './three/model.js';
import { updateBones } from './three/animation.js';
import { initPose } from './pose/pose.js';
import { mapPoseToMMD } from './pose/mapping.js';

const MODEL_PATH = '/models/model.pmx';

async function main() {
  // Three.js シーン初期化
  const { scene, camera, renderer } = initScene();

  // MMDモデル読み込み
  let mesh = null;
  try {
    mesh = await loadMMDModel(scene, MODEL_PATH);
  } catch (e) {
    console.warn('MMDモデルが見つかりません。モデルなしで起動します:', e.message);
  }

  // MediaPipe Pose 初期化
  const videoEl = document.getElementById('webcam');
  initPose(videoEl, (landmarks) => {
    if (!mesh) return;
    const boneRotations = mapPoseToMMD(landmarks);
    updateBones(mesh, boneRotations);
  });

  // アニメーションループ
  function animate() {
    requestAnimationFrame(animate);
    renderScene(renderer, scene, camera);
  }
  animate();
}

main().catch(console.error);
