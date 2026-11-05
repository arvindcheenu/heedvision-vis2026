import { type AccumulatorKind } from "./accumulators.js";
import type { ColourPolicy } from "./colour.js";
import type { AttentionSession, Target } from "./session.js";
/** What presentations draw: a colour and opacity per voxel, plus a summary for text alternatives. */
export interface Shading {
    /** sRGB triples, one per voxel. */
    rgb: Float32Array;
    /** Opacity from 0 to 1, one per voxel. */
    alpha: Float32Array;
    /** Voxels with any visible attention. */
    attended: number;
    /** Voxels attended by two or more viewers. */
    shared: number;
}
export declare function createShading(voxelCount: number): Shading;
export interface ShadeOptions {
    accumulator: AccumulatorKind;
    colour: ColourPolicy;
    /** Voxels below this display value stay transparent. */
    threshold?: number;
}
/**
 * Combines a target's accumulators into one colour and opacity per voxel. The
 * accumulator sets the opacity and the colour policy sets the colour, as in the
 * paper's opacity-driven revisualization.
 */
export declare function shade(session: AttentionSession, target: Target, shading: Shading, options: ShadeOptions): void;
