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

const ENABLE_POSE_MIRROR =
  new URLSearchParams(window.location.search).get('poseMirror') === '1';

const POSE_Y_SIGN =
  Number(new URLSearchParams(window.location.search).get('poseYSign') ?? '-1');

// 腕の各関節を下げるためのYオフセット（MediaPipe座標系で下方向が+）。
const ARM_SHOULDER_Y_OFFSET =
  Number(new URLSearchParams(window.location.search).get('armShoulderYOffset') ?? '-0.1');
const ARM_ELBOW_Y_OFFSET =
  Number(new URLSearchParams(window.location.search).get('armElbowYOffset') ?? '-0.2');
const ARM_WRIST_Y_OFFSET =
  Number(new URLSearchParams(window.location.search).get('armWristYOffset') ?? '-0.3');

/**
 * MediaPipe ランドマーク配列を THREE.Vector3 に変換する。
 * MediaPipe の座標系 (x: 右, y: 下, z: 奥) を Three.js 座標系 (x: 右, y: 上, z: 手前) に変換する。
 * @param {{ x: number, y: number, z: number }} lm
 * @returns {THREE.Vector3}
 */
function toVec3(lm) {
  return new THREE.Vector3(lm.x, lm.y * POSE_Y_SIGN, -lm.z);
}

function withYOffset(lm, offsetY) {
  return {
    ...lm,
    y: lm.y + offsetY,
  };
}

/**
 * MediaPipe Pose ランドマーク配列を MMD ボーン回転マップに変換する。
 * @param {Array<{ x: number, y: number, z: number, visibility?: number }>} landmarks
 * @returns {Object.<string, THREE.Quaternion>}
 */
export function mapPoseToMMD(landmarks) {
  const rotations = {};

  const left = ENABLE_POSE_MIRROR
    ? {
        SHOULDER: LM.RIGHT_SHOULDER,
        ELBOW: LM.RIGHT_ELBOW,
        WRIST: LM.RIGHT_WRIST,
        HIP: LM.RIGHT_HIP,
        KNEE: LM.RIGHT_KNEE,
        ANKLE: LM.RIGHT_ANKLE,
      }
    : {
        SHOULDER: LM.LEFT_SHOULDER,
        ELBOW: LM.LEFT_ELBOW,
        WRIST: LM.LEFT_WRIST,
        HIP: LM.LEFT_HIP,
        KNEE: LM.LEFT_KNEE,
        ANKLE: LM.LEFT_ANKLE,
      };

  const right = ENABLE_POSE_MIRROR
    ? {
        SHOULDER: LM.LEFT_SHOULDER,
        ELBOW: LM.LEFT_ELBOW,
        WRIST: LM.LEFT_WRIST,
        HIP: LM.LEFT_HIP,
        KNEE: LM.LEFT_KNEE,
        ANKLE: LM.LEFT_ANKLE,
      }
    : {
        SHOULDER: LM.RIGHT_SHOULDER,
        ELBOW: LM.RIGHT_ELBOW,
        WRIST: LM.RIGHT_WRIST,
        HIP: LM.RIGHT_HIP,
        KNEE: LM.RIGHT_KNEE,
        ANKLE: LM.RIGHT_ANKLE,
      };

  // 左上腕（肩→肘）
  const leftShoulderVec = toVec3(withYOffset(landmarks[left.SHOULDER], ARM_SHOULDER_Y_OFFSET));
  const leftElbowVec = toVec3(withYOffset(landmarks[left.ELBOW], ARM_ELBOW_Y_OFFSET));
  rotations['左腕'] = computeRotationFromTwoPoints(
    leftShoulderVec,
    leftElbowVec,
    // このモデルでは左腕のレスト方向は -X 側が自然。
    new THREE.Vector3(-1, 0, 0)
  );

  // 右上腕（肩→肘）
  const rightShoulderVec = toVec3(withYOffset(landmarks[right.SHOULDER], ARM_SHOULDER_Y_OFFSET));
  const rightElbowVec = toVec3(withYOffset(landmarks[right.ELBOW], ARM_ELBOW_Y_OFFSET));
  rotations['右腕'] = computeRotationFromTwoPoints(
    rightShoulderVec,
    rightElbowVec,
    // このモデルでは右腕のレスト方向は +X 側が自然。
    new THREE.Vector3(1, 0, 0)
  );

  // 左前腕（肘→手首）
  const leftWristVec = toVec3(withYOffset(landmarks[left.WRIST], ARM_WRIST_Y_OFFSET));
  rotations['左ひじ'] = computeRotationFromTwoPoints(
    leftElbowVec,
    leftWristVec,
    new THREE.Vector3(-1, 0, 0)
  );

  // 右前腕（肘→手首）
  const rightWristVec = toVec3(withYOffset(landmarks[right.WRIST], ARM_WRIST_Y_OFFSET));
  rotations['右ひじ'] = computeRotationFromTwoPoints(
    rightElbowVec,
    rightWristVec,
    new THREE.Vector3(1, 0, 0)
  );

  // 左大腿（腰→膝）
  const leftHipVec = toVec3(landmarks[left.HIP]);
  const leftKneeVec = toVec3(landmarks[left.KNEE]);
  rotations['左足'] = computeRotationFromTwoPoints(
    leftHipVec,
    leftKneeVec,
    new THREE.Vector3(0, -1, 0)
  );

  // 右大腿（腰→膝）
  const rightHipVec = toVec3(landmarks[right.HIP]);
  const rightKneeVec = toVec3(landmarks[right.KNEE]);
  rotations['右足'] = computeRotationFromTwoPoints(
    rightHipVec,
    rightKneeVec,
    new THREE.Vector3(0, -1, 0)
  );

  // 左下腿（膝→足首）
  const leftAnkleVec = toVec3(landmarks[left.ANKLE]);
  rotations['左ひざ'] = computeRotationFromTwoPoints(
    leftKneeVec,
    leftAnkleVec,
    new THREE.Vector3(0, -1, 0)
  );

  // 右下腿（膝→足首）
  const rightAnkleVec = toVec3(landmarks[right.ANKLE]);
  rotations['右ひざ'] = computeRotationFromTwoPoints(
    rightKneeVec,
    rightAnkleVec,
    new THREE.Vector3(0, -1, 0)
  );

  return rotations;
}
