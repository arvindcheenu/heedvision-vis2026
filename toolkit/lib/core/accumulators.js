export const ACCUMULATOR_KINDS = ["sum", "max", "difference", "count"];
/** A value at or above this counts as attended, unless a caller passes its own threshold. */
export const DEFAULT_ATTENDED_THRESHOLD = 0.05;
/**
 * Combines one voxel's per-viewer values.
 *
 * - `sum`: total attention, from 0 to the number of viewers.
 * - `max`: the highest individual attention.
 * - `difference`: highest minus lowest, so 0 means the group is balanced. With
 *   a single viewer there is no one to differ from, so it is that viewer's value.
 * - `count`: how many viewers are at or above `threshold`.
 */
export function aggregate(kind, values, threshold = DEFAULT_ATTENDED_THRESHOLD) {
    const n = values.length;
    if (n === 0)
        return 0;
    let sum = 0;
    let max = -Infinity;
    let min = Infinity;
    let count = 0;
    for (let i = 0; i < n; i++) {
        const v = values[i];
        sum += v;
        if (v > max)
            max = v;
        if (v < min)
            min = v;
        if (v >= threshold)
            count++;
    }
    switch (kind) {
        case "sum":
            return sum;
        case "max":
            return max;
        case "difference":
            return n === 1 ? max : max - min;
        case "count":
            return count;
    }
}
/** Maps an aggregate onto 0 to 1 for display, since `sum` and `count` grow with the group. */
export function normalised(kind, value, viewerCount) {
    if (kind === "count")
        return viewerCount > 0 ? value / viewerCount : 0;
    return Math.min(1, value);
}
/** Values below this are flushed to zero by `scale`, so decayed voxels end up exactly empty. */
const FLUSH_BELOW = 1e-3;
/**
 * One accumulator per viewer per voxel, for one target. This is the paper's
 * central difference from single-user attention awareness: identity is kept
 * and only combined at display time.
 */
export class AttentionField {
    voxelCount;
    ceiling;
    channels = new Map();
    constructor(voxelCount, 
    /** Per-viewer values saturate here. */
    ceiling = 1) {
        this.voxelCount = voxelCount;
        this.ceiling = ceiling;
    }
    /** Starts a viewer at zero. Registering a viewer twice keeps what they have. */
    addViewer(viewer) {
        if (!this.channels.has(viewer))
            this.channels.set(viewer, new Float32Array(this.voxelCount));
    }
    removeViewer(viewer) {
        this.channels.delete(viewer);
    }
    get viewers() {
        return [...this.channels.keys()];
    }
    /** A viewer's values, one per voxel. The array is live: treat it as read-only. */
    channel(viewer) {
        const values = this.channels.get(viewer);
        if (!values)
            throw new Error(`unknown viewer "${viewer}"`);
        return values;
    }
    add(viewer, voxel, amount) {
        const values = this.channel(viewer);
        values[voxel] = Math.min(this.ceiling, values[voxel] + amount);
    }
    /** Multiplies every value by `factor`. Decay uses this. */
    scale(factor) {
        for (const values of this.channels.values()) {
            for (let v = 0; v < values.length; v++) {
                const next = values[v] * factor;
                values[v] = next < FLUSH_BELOW ? 0 : next;
            }
        }
    }
    clear() {
        for (const values of this.channels.values())
            values.fill(0);
    }
}
