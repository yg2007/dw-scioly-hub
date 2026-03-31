import { C } from '../../ui';

/**
 * Get the text color for a synergy score.
 * Null = gray, >= 80 = teal, >= 60 = gold, < 60 = coral
 */
export function getSynergyColor(score) {
  if (score === null) return C.gray400;
  if (score >= 80) return C.teal;
  if (score >= 60) return C.gold;
  return C.coral;
}

/**
 * Get the background color for a synergy score.
 * Null = light gray, >= 80 = light teal, >= 60 = light gold, < 60 = light coral
 */
export function getSynergyBg(score) {
  if (score === null) return C.gray100;
  if (score >= 80) return '#E2F0E6';
  if (score >= 60) return '#FCEEE4';
  return '#FFEAE2';
}
