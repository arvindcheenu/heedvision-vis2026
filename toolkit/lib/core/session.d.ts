import { AttentionField } from "./accumulators.js";
import { type AttentionSource } from "./capture.js";
import { type Decay } from "./decay.js";
import { type AttentionEventMap, type AttentionEventType } from "./events.js";
import type { TriggerContext } from "./trigger.js";
import type { ColourInput, Ray, TargetId, Vec3, ViewerId } from "./types.js";
import type { VoxelGrid } from "./voxel-grid.js";
export interface SessionOptions {
    /** Attention samples per second. The paper uses 10. */
    captureRate?: number;
    /** Attention gained per second of steady gaze. The default saturates a voxel in 2.5 s. */
    gain?: number;
    /** Radius of the region of influence, in voxels. 0 is the paper's single voxel. */
    influenceRadius?: number;
    decay?: Decay;
    /** Gazes within this many voxels count as the same region, for dwell and joint attention. */
    regionRadius?: number;
    /** Seconds of steady gaze before a `dwell` event fires. */
    dwellTime?: number;
}
export interface ViewerOptions {
    id: ViewerId;
    colour: ColourInput;
    source: AttentionSource;
    /** Display name. Defaults to the id. */
    label?: string;
}
export interface Viewer extends ViewerOptions {
    label: string;
}
export interface TargetOptions {
    id: TargetId;
    grid: VoxelGrid;
    /** Moves a world-space ray into the grid's local space without normalising it, so `t` stays a world distance. */
    toLocal: (ray: Ray) => Ray;
}
export interface Target extends TargetOptions {
    field: AttentionField;
}
/** Where a viewer is looking, once a sample has hit something. */
export interface Gaze {
    target: Target;
    voxel: number;
    distance: number;
    /** World-space hit point. */
    point: Vec3;
}
/** The hub: viewers and targets register here, and `tick` runs capture, recording and decay. */
export declare class AttentionSession {
    readonly viewers: Map<string, Viewer>;
    readonly targets: Map<string, Target>;
    private clock;
    private gain;
    private influenceRadius;
    private regionRadius;
    private dwellTime;
    private decay;
    private readonly states;
    private readonly emitter;
    private samples;
    constructor(options?: SessionOptions);
    /** Changes any setting while running. Recorded attention is kept. */
    configure(options: SessionOptions): void;
    /** Listens for attention events, and returns a function that stops listening. */
    on<T extends AttentionEventType>(type: T, listener: (event: AttentionEventMap[T]) => void): () => void;
    registerViewer(options: ViewerOptions): Viewer;
    /** Forgets a viewer and their recorded attention. */
    removeViewer(id: ViewerId): void;
    registerTarget(options: TargetOptions): Target;
    removeTarget(id: TargetId): void;
    /** Swaps a target's voxels, for a new resolution. Its recorded attention starts again from zero. */
    replaceGrid(id: TargetId, grid: VoxelGrid): void;
    private createField;
    private forgetGazeOn;
    /** Clears all recorded attention and keeps everyone registered. */
    reset(): void;
    /** Counts samples taken, so a view can repaint only when something changed. */
    get sampleCount(): number;
    /** Advances by `dt` seconds. Call it once per frame. */
    tick(dt: number): void;
    private sample;
    /** The nearest voxel across all targets, so one object can occlude another. */
    private nearestHit;
    private record;
    private updateDwell;
    private sameRegion;
    private othersInRegion;
    private describe;
    private emitGazeEvents;
    private emitJointEvents;
    /** The viewer's latest gaze, or null when they are looking at nothing registered. */
    gaze(viewer: ViewerId): Gaze | null;
    /** The measurements an implicit trigger bases its decision on. */
    triggerContext(viewer: ViewerId, dt: number): TriggerContext;
}
export declare function createSession(options?: SessionOptions): AttentionSession;
