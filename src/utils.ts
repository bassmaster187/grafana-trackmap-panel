import * as L from 'leaflet';

export interface AntimeridianMidpoints {
  firstEnd: L.LatLngExpression;
  secondStart: L.LatLngExpression;
}

export function getAntimeridianMidpoints(
  start: L.LatLngTuple,
  end: L.LatLngTuple
): AntimeridianMidpoints | null {
  if (Math.abs(start[1] - end[1]) <= 180.0) {
    return null;
  }

  const startDistToAntimeridian = start[1] > 0 ? 180 - start[1] : 180 + start[1];
  const endDistToAntimeridian = end[1] > 0 ? 180 - end[1] : 180 + end[1];
  const latDifference = Math.abs(start[0] - end[0]);
  const alphaAngle =
    Math.atan(latDifference / (startDistToAntimeridian + endDistToAntimeridian)) *
    (180 / Math.PI) *
    (start[1] > 0 ? 1 : -1);
  const latDiffAtAntimeridian =
    Math.tan(alphaAngle * (Math.PI / 180)) * startDistToAntimeridian;
  const intersectionLat = start[0] + latDiffAtAntimeridian;

  const firstLineEnd: L.LatLngExpression = [intersectionLat, start[1] > 0 ? 180 : -180];
  const secondLineStart: L.LatLngExpression = [intersectionLat, end[1] > 0 ? 180 : -180];

  return { firstEnd: firstLineEnd, secondStart: secondLineStart };
}
