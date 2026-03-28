import * as THREE from 'three';

/**
 * 2点間のベクトルから、基準方向ベクトルとの差分クォータニオンを計算する。
 * ボーンの「親→子」方向を表す回転として使用する。
 *
 * @param {THREE.Vector3} from - 始点（親ボーン位置）
 * @param {THREE.Vector3} to   - 終点（子ボーン位置）
 * @param {THREE.Vector3} restDirection - ボーンのレスト（初期）方向（正規化済みを想定）
 * @returns {THREE.Quaternion}
 */
export function computeRotationFromTwoPoints(from, to, restDirection) {
  const direction = new THREE.Vector3().subVectors(to, from).normalize();
  const quaternion = new THREE.Quaternion();
  // restDirectionは呼び出し側で単位ベクトルを渡す前提にして割り当てを減らす。
  quaternion.setFromUnitVectors(restDirection, direction);
  return quaternion;
}

/**
 * 2つのクォータニオンを球面線形補間（SLERP）する。
 * @param {THREE.Quaternion} q1
 * @param {THREE.Quaternion} q2
 * @param {number} t - 0〜1 の補間係数
 * @returns {THREE.Quaternion}
 */
export function slerpQuaternion(q1, q2, t) {
  return new THREE.Quaternion().slerpQuaternions(q1, q2, t);
}

/**
 * ラジアンを度に変換する。
 * @param {number} rad
 * @returns {number}
 */
export function radToDeg(rad) {
  return (rad * 180) / Math.PI;
}

/**
 * 度をラジアンに変換する。
 * @param {number} deg
 * @returns {number}
 */
export function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

/**
 * ベクトルを指定の長さにクランプする。
 * @param {THREE.Vector3} vec
 * @param {number} maxLength
 * @returns {THREE.Vector3}
 */
export function clampVectorLength(vec, maxLength) {
  const len = vec.length();
  if (len > maxLength) {
    return vec.clone().multiplyScalar(maxLength / len);
  }
  return vec.clone();
}
