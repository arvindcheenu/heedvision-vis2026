import type { Presentation, PresentationContext } from "./types.js";
/**
 * Camera space, separated: a 2D panel over the view, beside the data. It shows
 * the object from the viewer's own angle, so it stays in step as they move,
 * with the data as a faint silhouette and attention on top.
 *
 * It adds a `<canvas class="caav-panel">` to the view's overlay element, which
 * it places at the bottom right. Style `.caav-panel` to change that.
 */
export declare function createCameraSeparated({ attached, overlay, style }: PresentationContext): Presentation;
