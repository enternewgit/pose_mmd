import * as THREE from 'three';
import { MMDLoader } from 'three/examples/jsm/loaders/MMDLoader.js';

/**
 * MMDモデル（.pmx / .pmd）を読み込んでシーンに追加する。
 * @param {THREE.Scene} scene
 * @param {string} modelPath - public/ 以下のモデルパス
 * @returns {Promise<THREE.SkinnedMesh>}
 */
export function loadMMDModel(scene, modelPath) {
  return new Promise((resolve, reject) => {
    const loader = new MMDLoader();
    loader.load(
      modelPath,
      (mesh) => {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
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
