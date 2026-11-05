import type { ViewerId } from "./types.js";
/** The aggregations from the paper. */
export type AccumulatorKind = "sum" | "max" | "difference" | "count";
export declare const ACCUMULATOR_KINDS: readonly AccumulatorKind[];
/** A value at or above this counts as attended, unless a caller passes its own threshold. */
export declare const DEFAULT_ATTENDED_THRESHOLD = 0.05;
/**
 * Combines one voxel's per-viewer values.
 *
 * - `sum`: total attention, from 0 to the number of viewers.
 * - `max`: the highest individual attention.
 * - `difference`: highest minus lowest, so 0 means the group is balanced. With
 *   a single viewer there is no one to differ from, so it is that viewer's value.
 * - `count`: how many viewers are at or above `threshold`.
 */
export declare function aggregate(kind: AccumulatorKind, values: ArrayLike<number>, threshold?: number): number;
/** Maps an aggregate onto 0 to 1 for display, since `sum` and `count` grow with the group. */
export declare function normalised(kind: AccumulatorKind, value: number, viewerCount: number): number;
/**
 * One accumulator per viewer per voxel, for one target. This is the paper's
 * central difference from single-user attention awareness: identity is kept
 * and only combined at display time.
 */
export declare class AttentionField {
    readonly voxelCount: number;
    /** Per-viewer values saturate here. */
    readonly ceiling: number;
    private readonly channels;
    constructor(voxelCount: number, 
    /** Per-viewer values saturate here. */
    ceiling?: number);
    /** Starts a viewer at zero. Registering a viewer twice keeps what they have. */
    addViewer(viewer: ViewerId): void;
    removeViewer(viewer: ViewerId): void;
    get viewers(): ViewerId[];
    /** A viewer's values, one per voxel. The array is live: treat it as read-only. */
    channel(viewer: ViewerId): Float32Array;
    add(viewer: ViewerId, voxel: number, amount: number): void;
    /** Multiplies every value by `factor`. Decay uses this. */
    scale(factor: number): void;
    clear(): void;
}
