import type { ColourInput, Rgb, ViewerId } from "./types.js";
/** One viewer's colour and attention at a voxel. */
export interface Attending {
    id: ViewerId;
    colour: ColourInput;
    value: number;
}
/**
 * Decides a voxel's colour from who attended it. Returns null when no one did,
 * so a presentation can leave the voxel out.
 */
export interface ColourPolicy {
    readonly kind: string;
    /** `viewers` lists every viewer with their value at this voxel, attended or not. */
    resolve(viewers: readonly Attending[]): Rgb | null;
}
/**
 * Shared colour by interpolation: the voxel's colour is the attention-weighted
 * mean of its viewers' colours, for any number of viewers.
 *
 * Averaging in sRGB or OKLab turns opposite hues such as blue and orange into
 * grey, which is hard to read as "both of you". So lightness and chroma are
 * averaged, and hue takes the weighted circular mean, which travels the short
 * way round the wheel: the paper's blue and orange meet at a pink.
 *
 * Three or four viewers use the same formula. If their hues cancel out exactly,
 * the hue is undefined and the result fades to a neutral grey of their mean
 * lightness, rather than jumping to an arbitrary hue.
 */
export declare function interpolatedColours(options?: {
    threshold?: number;
}): ColourPolicy;
export interface ExplicitColourOptions {
    /** The one colour for any voxel that two or more viewers attended. */
    shared: ColourInput;
    threshold?: number;
}
/**
 * Shared colour chosen by the author, for when a fixed colour reads better than
 * a blend. A voxel attended by one viewer keeps that viewer's colour, and any
 * overlap, however many people, takes `shared`.
 */
export declare function explicitColours(options: ExplicitColourOptions): ColourPolicy;
/** Reads `#rgb`, `#rrggbb` or an sRGB triple. */
export declare function parseColour(colour: ColourInput): Rgb;
export declare function toHex([r, g, b]: Rgb): string;
