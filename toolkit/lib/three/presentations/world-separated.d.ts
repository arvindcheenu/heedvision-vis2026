import { type Object3D } from "three";
import type { Presentation, PresentationContext } from "./types.js";
export interface MiniatureOptions {
    /** Size relative to the object. */
    scale?: number;
}
export interface Miniature extends Presentation {
    /** Everything in the miniature. Raycast against it to pick it up. */
    readonly object: Object3D;
    /** Moves the miniature to a world position. It then stays there. */
    moveTo(x: number, y: number, z: number): void;
}
/**
 * World space, separated: a small replica that floats beside the object and
 * mirrors its attention. It starts to the viewer's right the first time it
 * appears, and then stays fixed in the world until moved.
 */
export declare function createWorldSeparated({ attached, scene, layer, style }: PresentationContext, { scale }?: MiniatureOptions): Miniature;
