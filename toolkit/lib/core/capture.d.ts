import type { Ray } from "./types.js";
/**
 * Where a viewer's attention comes from. A head-tracked camera, an eye tracker
 * or a pointer all fit: return the current gaze ray in world space, or null
 * when there is none (tracking lost, viewer away).
 */
export interface AttentionSource {
    sample(): Ray | null;
}
/**
 * Turns variable frame times into a fixed sampling rate. `advance(dt)` returns
 * how many samples are due. After a long stall it returns at most `maxBurst`,
 * so a hidden tab does not credit minutes of attention to one frozen pose.
 */
export declare function createSampleClock(rate: number, maxBurst?: number): {
    period: number;
    advance(dt: number): number;
};
