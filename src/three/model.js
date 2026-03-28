import * as THREE from 'three';
import { MMDLoader } from 'three/examples/jsm/loaders/MMDLoader.js';

const QUERY = new URLSearchParams(window.location.search);
const ENABLE_MODEL_DEBUG = QUERY.get('debugModel') === '1';
const ENABLE_SAFE_MATERIAL = QUERY.get('safeMaterial') === '1';

function normalizeMaterial(material) {
  material.visible = true;
  material.transparent = false;
  material.opacity = 1.0;
  material.alphaTest = 0;
  material.depthWrite = true;
  material.side = THREE.DoubleSide;
  material.needsUpdate = true;
}

/**
 * MMDモデル（.pmx / .pmd）を読み込んでシーンに追加する。
 * @param {THREE.Scene} scene
 * @param {string} modelPath - public/ 以下のモデルパス
 * @returns {Promise<THREE.SkinnedMesh>}
 */
export function loadMMDModel(scene, modelPath) {
  return new Promise((resolve, reject) => {
    const loader = new MMDLoader();
    // PMX内のテクスチャ名は相対名のみのことが多いため、配置先を明示する。
    loader.setResourcePath('/textures/');
    loader.load(
      modelPath,
      (mesh) => {
        mesh.updateMatrixWorld(true);

        const hatMorphName = '戴帽';
        if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
          const morphIndex = mesh.morphTargetDictionary[hatMorphName];
          if (morphIndex !== undefined) {
            mesh.morphTargetInfluences[morphIndex] = 1.0;
            mesh.updateMorphTargets();
            mesh.updateMatrixWorld(true);
            console.log(`モーフ ${hatMorphName} をONにしました`);
          }
        }

        let meshCount = 0;
        mesh.traverse((obj) => {
          if (!obj.isMesh || !obj.material) return;
          meshCount += 1;

          if (ENABLE_MODEL_DEBUG) {
            const debugMat = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide });
            debugMat.morphTargets = !!obj.morphTargetInfluences;
            debugMat.skinning = !!obj.isSkinnedMesh;
            obj.material = debugMat;
          } else if (ENABLE_SAFE_MATERIAL) {
            // PMX由来のマテリアル/テクスチャで不可視になるケースを避けるフォールバック。
            const safeMat = new THREE.MeshStandardMaterial({
              color: 0xd8ddef,
              roughness: 0.6,
              metalness: 0.05,
              side: THREE.DoubleSide,
            });
            safeMat.morphTargets = !!obj.morphTargetInfluences;
            safeMat.skinning = !!obj.isSkinnedMesh;
            obj.material = safeMat;
          }

          if (Array.isArray(obj.material)) {
            for (const m of obj.material) {
              normalizeMaterial(m);
            }
          } else {
            normalizeMaterial(obj.material);
          }
          obj.frustumCulled = false;
        });

        // PMXの原点・スケールがモデルごとに異なるため、初期表示しやすい位置と大きさへ正規化する。
        const box = new THREE.Box3().setFromObject(mesh);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        const targetHeight = 15;
        if (size.y > 0) {
          const scale = targetHeight / size.y;
          mesh.scale.setScalar(scale);
        }

        mesh.position.x -= center.x;
        mesh.position.z -= center.z;

        box.setFromObject(mesh);
        const minY = box.min.y;
        mesh.position.y -= minY;

        // 一部のスキンメッシュでバウンディングが不正な場合でも非表示にならないようにする。
        mesh.frustumCulled = false;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);

        if (ENABLE_MODEL_DEBUG) {
          const boxHelper = new THREE.BoxHelper(mesh, 0xff4444);
          scene.add(boxHelper);
          const axesHelper = new THREE.AxesHelper(5);
          axesHelper.position.copy(mesh.position);
          scene.add(axesHelper);
          console.log('検出メッシュ数:', meshCount);
          console.log('モデルデバッグ表示を有効化しています (?debugModel=1)');
        } else if (ENABLE_SAFE_MATERIAL) {
          console.log('安全マテリアルを有効化しています (?safeMaterial=1)');
        }
        console.log('モデル境界サイズ:', size.x.toFixed(2), size.y.toFixed(2), size.z.toFixed(2));
        console.log('MMDモデル読み込み成功:', modelPath);
        resolve(mesh);
      },
      (progress) => {
        const pct = progress.total
          ? Math.round((progress.loaded / progress.total) * 100)
          : '?';
        console.log(`モデル読み込み中: ${pct}%`);
      },
      (error) => {
        reject(error);
      }
    );
  });
}
