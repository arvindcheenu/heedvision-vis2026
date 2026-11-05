import type { Presentation, PresentationContext } from "./types.js";
/**
 * Camera space, embedded: attention flattened onto the faces of the object's
 * bounding box. Only the faces turned towards the viewer's camera show, so it
 * stays in view from anywhere, at the cost of depth.
 */
export declare function createCameraEmbedded({ attached, scene, layer, style }: PresentationContext): Presentation;
