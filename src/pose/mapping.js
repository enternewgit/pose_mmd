import * as THREE from 'three';
import { computeRotationFromTwoPoints } from '../utils/math.js';

const QUERY = new URLSearchParams(window.location.search);

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

const ENABLE_POSE_MIRROR = QUERY.get('poseMirror') === '1';

const POSE_Y_SIGN = Number(QUERY.get('poseYSign') ?? '-1');

// 腕の各関節を下げるためのYオフセット（MediaPipe座標系で下方向が+）。
const ARM_SHOULDER_Y_OFFSET =
  Number(QUERY.get('armShoulderYOffset') ?? '-0.1');
const ARM_ELBOW_Y_OFFSET =
  Number(QUERY.get('armElbowYOffset') ?? '-0.2');
const ARM_WRIST_Y_OFFSET =
  Number(QUERY.get('armWristYOffset') ?? '-0.3');

const REST_LEFT_ARM = new THREE.Vector3(-1, 0, 0);
const REST_RIGHT_ARM = new THREE.Vector3(1, 0, 0);
const REST_LEG = new THREE.Vector3(0, -1, 0);

/**
 * MediaPipe ランドマーク配列を THREE.Vector3 に変換する。
 * MediaPipe の座標系 (x: 右, y: 下, z: 奥) を Three.js 座標系 (x: 右, y: 上, z: 手前) に変換する。
 * @param {{ x: number, y: number, z: number }} lm
 * @returns {THREE.Vector3}
 */
function toVec3(lm, yOffset = 0) {
  return new THREE.Vector3(lm.x, (lm.y + yOffset) * POSE_Y_SIGN, -lm.z);
}

function resolveSideIndices() {
  if (ENABLE_POSE_MIRROR) {
    return {
      left: {
        SHOULDER: LM.RIGHT_SHOULDER,
        ELBOW: LM.RIGHT_ELBOW,
        WRIST: LM.RIGHT_WRIST,
        HIP: LM.RIGHT_HIP,
        KNEE: LM.RIGHT_KNEE,
        ANKLE: LM.RIGHT_ANKLE,
      },
      right: {
        SHOULDER: LM.LEFT_SHOULDER,
        ELBOW: LM.LEFT_ELBOW,
        WRIST: LM.LEFT_WRIST,
        HIP: LM.LEFT_HIP,
        KNEE: LM.LEFT_KNEE,
        ANKLE: LM.LEFT_ANKLE,
      },
    };
  }

  return {
    left: {
      SHOULDER: LM.LEFT_SHOULDER,
      ELBOW: LM.LEFT_ELBOW,
      WRIST: LM.LEFT_WRIST,
      HIP: LM.LEFT_HIP,
      KNEE: LM.LEFT_KNEE,
      ANKLE: LM.LEFT_ANKLE,
    },
    right: {
      SHOULDER: LM.RIGHT_SHOULDER,
      ELBOW: LM.RIGHT_ELBOW,
      WRIST: LM.RIGHT_WRIST,
      HIP: LM.RIGHT_HIP,
      KNEE: LM.RIGHT_KNEE,
      ANKLE: LM.RIGHT_ANKLE,
    },
  };
}

/**
 * MediaPipe Pose ランドマーク配列を MMD ボーン回転マップに変換する。
 * @param {Array<{ x: number, y: number, z: number, visibility?: number }>} landmarks
 * @returns {Object.<string, THREE.Quaternion>}
 */
export function mapPoseToMMD(landmarks) {
  const rotations = {};

  const { left, right } = resolveSideIndices();

  const getVec = (index, yOffset = 0) => {
    const lm = landmarks[index];
    if (!lm) return null;
    return toVec3(lm, yOffset);
  };

  // 左上腕（肩→肘）
  const leftShoulderVec = getVec(left.SHOULDER, ARM_SHOULDER_Y_OFFSET);
  const leftElbowVec = getVec(left.ELBOW, ARM_ELBOW_Y_OFFSET);
  if (!leftShoulderVec || !leftElbowVec) return rotations;
  rotations['左腕'] = computeRotationFromTwoPoints(
    leftShoulderVec,
    leftElbowVec,
    REST_LEFT_ARM
  );

  // 右上腕（肩→肘）
  const rightShoulderVec = getVec(right.SHOULDER, ARM_SHOULDER_Y_OFFSET);
  const rightElbowVec = getVec(right.ELBOW, ARM_ELBOW_Y_OFFSET);
  if (!rightShoulderVec || !rightElbowVec) return rotations;
  rotations['右腕'] = computeRotationFromTwoPoints(
    rightShoulderVec,
    rightElbowVec,
    REST_RIGHT_ARM
  );

  // 左前腕（肘→手首）
  const leftWristVec = getVec(left.WRIST, ARM_WRIST_Y_OFFSET);
  if (!leftWristVec) return rotations;
  rotations['左ひじ'] = computeRotationFromTwoPoints(
    leftElbowVec,
    leftWristVec,
    REST_LEFT_ARM
  );

  // 右前腕（肘→手首）
  const rightWristVec = getVec(right.WRIST, ARM_WRIST_Y_OFFSET);
  if (!rightWristVec) return rotations;
  rotations['右ひじ'] = computeRotationFromTwoPoints(
    rightElbowVec,
    rightWristVec,
    REST_RIGHT_ARM
  );

  // 左大腿（腰→膝）
  const leftHipVec = getVec(left.HIP);
  const leftKneeVec = getVec(left.KNEE);
  if (!leftHipVec || !leftKneeVec) return rotations;
  rotations['左足'] = computeRotationFromTwoPoints(
    leftHipVec,
    leftKneeVec,
    REST_LEG
  );

  // 右大腿（腰→膝）
  const rightHipVec = getVec(right.HIP);
  const rightKneeVec = getVec(right.KNEE);
  if (!rightHipVec || !rightKneeVec) return rotations;
  rotations['右足'] = computeRotationFromTwoPoints(
    rightHipVec,
    rightKneeVec,
    REST_LEG
  );

  // 左下腿（膝→足首）
  const leftAnkleVec = getVec(left.ANKLE);
  if (!leftAnkleVec) return rotations;
  rotations['左ひざ'] = computeRotationFromTwoPoints(
    leftKneeVec,
    leftAnkleVec,
    REST_LEG
  );

  // 右下腿（膝→足首）
  const rightAnkleVec = getVec(right.ANKLE);
  if (!rightAnkleVec) return rotations;
  rotations['右ひざ'] = computeRotationFromTwoPoints(
    rightKneeVec,
    rightAnkleVec,
    REST_LEG
  );

  return rotations;
}
