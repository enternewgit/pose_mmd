import * as THREE from 'three';

const BONE_BLEND = 0.2;
const IDENTITY_QUATERNION = new THREE.Quaternion();
const TARGET_QUATERNION = new THREE.Quaternion();

function ensureBindPoseCache(mesh) {
  if (!mesh || !mesh.skeleton) return;
  if (mesh.userData.bindPoseQuaternions) return;

  const bindPoseQuaternions = {};
  for (const bone of mesh.skeleton.bones) {
    bindPoseQuaternions[bone.name] = bone.quaternion.clone();
  }

  mesh.userData.bindPoseQuaternions = bindPoseQuaternions;
}

/**
 * MMDメッシュのボーンに回転を適用する。
 * @param {THREE.SkinnedMesh} mesh
 * @param {Object.<string, THREE.Quaternion>} boneRotations - ボーン名 → クォータニオン のマップ
 */
export function updateBones(mesh, boneRotations) {
  if (!mesh || !mesh.skeleton) return;

  ensureBindPoseCache(mesh);
  const bindPoseQuaternions = mesh.userData.bindPoseQuaternions ?? {};

  for (const bone of mesh.skeleton.bones) {
    const rotation = boneRotations[bone.name];
    const baseQuat = bindPoseQuaternions[bone.name] ?? IDENTITY_QUATERNION;

    if (rotation) {
      TARGET_QUATERNION.copy(baseQuat).multiply(rotation);
      bone.quaternion.slerp(TARGET_QUATERNION, BONE_BLEND);
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
