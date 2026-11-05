import { type Camera } from "three";
import type { Vec3 } from "../core/index.js";
export interface SpatialTooltipOptions {
    camera: Camera;
    /** The element over the canvas that holds the tooltip. It needs its own positioning context. */
    overlay: HTMLElement;
}
export interface SpatialTooltip {
    /** Shows text anchored to a world-space point. With `seconds`, it hides itself after that long. */
    show(point: Vec3, text: string, options?: {
        seconds?: number;
    }): void;
    hide(): void;
    /** Keeps the tooltip on its point as the camera moves. Call once per frame. */
    update(dt: number): void;
    dispose(): void;
}
/**
 * A label pinned to a point in space, drawn as a DOM element so it stays sharp
 * and screen readers can read it. Pair it with a session event to get an
 * event-driven tooltip. Style it through `.caav-tooltip`.
 */
export declare function createSpatialTooltip({ camera, overlay }: SpatialTooltipOptions): SpatialTooltip;
