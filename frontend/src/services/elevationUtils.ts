/**
 * @file elevationUtils.ts
 * @description Provides robust elevation smoothing and gain/loss calculation algorithms
 * with configurable parameters via Vite environment variables.
 */

export interface ElevationStats {
  elevationGain: number;
  elevationLoss: number;
}

/**
 * Smooths trackpoint elevations using a moving average filter and calculates
 * accurate elevation gain and loss with a noise deadband threshold.
 * Parameters can be configured via environment variables:
 * - VITE_ELEVATION_SMOOTHING_WINDOW (default: 5)
 * - VITE_ELEVATION_THRESHOLD (default: 1.5 meters)
 */
export function processElevationData<T extends { ele?: number }>(
  points: T[],
  defaultEle: number = 400
): { points: T[]; elevationGain: number; elevationLoss: number } {
  if (points.length === 0) {
    return { points, elevationGain: 0, elevationLoss: 0 };
  }

  // 1. Extract raw elevations with fallback
  const rawEles = points.map(p => (p.ele !== undefined && !isNaN(p.ele) ? p.ele : defaultEle));

  // 2. Determine smoothing window radius from env or default to 5
  const envWindow = Number((import.meta as any).env?.VITE_ELEVATION_SMOOTHING_WINDOW);
  const windowRadius = !isNaN(envWindow) && envWindow >= 0 ? envWindow : 5;

  const smoothedEles: number[] = new Array(rawEles.length);
  if (windowRadius === 0) {
    for (let i = 0; i < rawEles.length; i++) {
      smoothedEles[i] = Math.round(rawEles[i] * 10) / 10;
    }
  } else {
    for (let i = 0; i < rawEles.length; i++) {
      let sum = 0;
      let count = 0;
      for (let j = Math.max(0, i - windowRadius); j <= Math.min(rawEles.length - 1, i + windowRadius); j++) {
        sum += rawEles[j];
        count++;
      }
      smoothedEles[i] = Math.round((sum / count) * 10) / 10;
    }
  }

  // 3. Calculate gain and loss with deadband threshold from env or default to 1.5m
  const envThreshold = Number((import.meta as any).env?.VITE_ELEVATION_THRESHOLD);
  const threshold = !isNaN(envThreshold) && envThreshold >= 0 ? envThreshold : 1.5;

  let eleGain = 0;
  let eleLoss = 0;

  for (let i = 1; i < smoothedEles.length; i++) {
    const diff = smoothedEles[i] - smoothedEles[i - 1];
    if (diff > threshold) {
      eleGain += diff;
    } else if (diff < -threshold) {
      eleLoss += Math.abs(diff);
    }
  }

  // 4. Attach smoothed elevations back to points
  const updatedPoints = points.map((pt, idx) => ({
    ...pt,
    ele: smoothedEles[idx],
  }));

  return {
    points: updatedPoints,
    elevationGain: Math.round(eleGain),
    elevationLoss: Math.round(eleLoss),
  };
}
