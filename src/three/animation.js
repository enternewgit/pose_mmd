import * as THREE from 'three';

/**
 * MMDメッシュのボーンに回転を適用する。
 * @param {THREE.SkinnedMesh} mesh
 * @param {Object.<string, THREE.Quaternion>} boneRotations - ボーン名 → クォータニオン のマップ
 */
export function updateBones(mesh, boneRotations) {
  if (!mesh || !mesh.skeleton) return;

  for (const bone of mesh.skeleton.bones) {
    const rotation = boneRotations[bone.name];
    if (rotation) {
      bone.quaternion.copy(rotation);
    }
  }
}

/**
 * MMDメッシュの全ボーン名を返す（デバッグ用）。
 * @param {THREE.SkinnedMesh} mesh
 * @returns {string[]}
 */
export function listBoneNames(mesh) {
  if (!mesh || !mesh.skeleton) return [];
  return mesh.skeleton.bones.map((b) => b.name);
}
