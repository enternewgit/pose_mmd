import * as THREE from 'three';
import { computeRotationFromTwoPoints } from '../utils/math.js';

/**
 * MediaPipe Pose のランドマーク番号定数
 * https://developers.google.com/mediapipe/solutions/vision/pose_landmarker
 */
const LM = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
};

/**
 * MediaPipe ランドマーク配列を THREE.Vector3 に変換する。
 * MediaPipe の座標系 (x: 右, y: 下, z: 奥) を Three.js 座標系 (x: 右, y: 上, z: 手前) に変換する。
 * @param {{ x: number, y: number, z: number }} lm
 * @returns {THREE.Vector3}
 */
function toVec3(lm) {
  return new THREE.Vector3(lm.x, -lm.y, -lm.z);
}

/**
 * MediaPipe Pose ランドマーク配列を MMD ボーン回転マップに変換する。
 * @param {Array<{ x: number, y: number, z: number, visibility?: number }>} landmarks
 * @returns {Object.<string, THREE.Quaternion>}
 */
export function mapPoseToMMD(landmarks) {
  const rotations = {};

  // 左上腕（肩→肘）
  const leftShoulderVec = toVec3(landmarks[LM.LEFT_SHOULDER]);
  const leftElbowVec = toVec3(landmarks[LM.LEFT_ELBOW]);
  rotations['左腕'] = computeRotationFromTwoPoints(
    leftShoulderVec,
    leftElbowVec,
    new THREE.Vector3(1, 0, 0)
  );

  // 右上腕（肩→肘）
  const rightShoulderVec = toVec3(landmarks[LM.RIGHT_SHOULDER]);
  const rightElbowVec = toVec3(landmarks[LM.RIGHT_ELBOW]);
  rotations['右腕'] = computeRotationFromTwoPoints(
    rightShoulderVec,
    rightElbowVec,
    new THREE.Vector3(-1, 0, 0)
  );

  // 左前腕（肘→手首）
  const leftWristVec = toVec3(landmarks[LM.LEFT_WRIST]);
  rotations['左ひじ'] = computeRotationFromTwoPoints(
    leftElbowVec,
    leftWristVec,
    new THREE.Vector3(1, 0, 0)
  );

  // 右前腕（肘→手首）
  const rightWristVec = toVec3(landmarks[LM.RIGHT_WRIST]);
  rotations['右ひじ'] = computeRotationFromTwoPoints(
    rightElbowVec,
    rightWristVec,
    new THREE.Vector3(-1, 0, 0)
  );

  // 左大腿（腰→膝）
  const leftHipVec = toVec3(landmarks[LM.LEFT_HIP]);
  const leftKneeVec = toVec3(landmarks[LM.LEFT_KNEE]);
  rotations['左足'] = computeRotationFromTwoPoints(
    leftHipVec,
    leftKneeVec,
    new THREE.Vector3(0, -1, 0)
  );

  // 右大腿（腰→膝）
  const rightHipVec = toVec3(landmarks[LM.RIGHT_HIP]);
  const rightKneeVec = toVec3(landmarks[LM.RIGHT_KNEE]);
  rotations['右足'] = computeRotationFromTwoPoints(
    rightHipVec,
    rightKneeVec,
    new THREE.Vector3(0, -1, 0)
  );

  // 左下腿（膝→足首）
  const leftAnkleVec = toVec3(landmarks[LM.LEFT_ANKLE]);
  rotations['左ひざ'] = computeRotationFromTwoPoints(
    leftKneeVec,
    leftAnkleVec,
    new THREE.Vector3(0, -1, 0)
  );

  // 右下腿（膝→足首）
  const rightAnkleVec = toVec3(landmarks[LM.RIGHT_ANKLE]);
  rotations['右ひざ'] = computeRotationFromTwoPoints(
    rightKneeVec,
    rightAnkleVec,
    new THREE.Vector3(0, -1, 0)
  );

  return rotations;
}
