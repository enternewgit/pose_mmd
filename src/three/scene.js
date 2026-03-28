import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * Three.js のシーン・カメラ・レンダラーを初期化して返す。
 * @returns {{ scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer }}
 */
export function initScene() {
  const canvas = document.getElementById('mmd-canvas');

  // シーン
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);

  // カメラ
  const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 10, 20);
  camera.lookAt(0, 10, 0);

  // レンダラー
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;

  // ライト
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(5, 10, 5);
  dirLight.castShadow = true;
  scene.add(dirLight);

  // グリッドヘルパー（開発用）
  const gridHelper = new THREE.GridHelper(20, 20, 0x444466, 0x333355);
  scene.add(gridHelper);

  // ウィンドウリサイズ対応
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { scene, camera, renderer };
}

/**
 * マウスでカメラを操作できる OrbitControls を初期化する。
 * @param {THREE.PerspectiveCamera} camera
 * @param {THREE.WebGLRenderer} renderer
 * @returns {OrbitControls}
 */
export function initCameraControls(camera, renderer) {
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.7;
  controls.zoomSpeed = 0.9;
  controls.panSpeed = 0.8;
  controls.target.set(0, 10, 0);
  controls.update();
  return controls;
}

/**
 * シーンをレンダリングする。
 * @param {THREE.WebGLRenderer} renderer
 * @param {THREE.Scene} scene
 * @param {THREE.Camera} camera
 */
export function renderScene(renderer, scene, camera) {
  renderer.render(scene, camera);
}

/**
 * 指定オブジェクト全体が収まるようにカメラを再配置する。
 * @param {THREE.PerspectiveCamera} camera
 * @param {THREE.Object3D} object
 */
export function frameCameraToObject(camera, object) {
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) return;

  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  if (!Number.isFinite(size.x) || !Number.isFinite(size.y) || !Number.isFinite(size.z)) {
    return;
  }

  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = (camera.fov * Math.PI) / 180;
  const distance = (maxDim * 0.5) / Math.tan(fov * 0.5) * 1.6;

  camera.position.set(center.x, center.y + size.y * 0.35, center.z + distance);
  camera.near = Math.max(0.01, distance / 100);
  camera.far = Math.max(100, distance * 100);
  camera.lookAt(center);
  camera.updateProjectionMatrix();
}

/**
 * 現在のターゲットを中心に、真横から見るカメラ位置へ移動する。
 * @param {THREE.PerspectiveCamera} camera
 * @param {OrbitControls} controls
 * @param {number} [distanceScale=1]
 */
export function setSideView(camera, controls, distanceScale = 1) {
  const target = controls?.target ?? new THREE.Vector3(0, 10, 0);
  const distance = camera.position.distanceTo(target) * distanceScale;
  camera.position.set(target.x + distance, target.y, target.z);
  camera.lookAt(target);
  camera.updateProjectionMatrix();
  if (controls) controls.update();
}
