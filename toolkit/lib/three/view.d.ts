import type { Camera, Scene } from "three";
import { type AccumulatorKind, type AttentionSession, type ColourPolicy, type Shading, type TriggerPolicy, type ViewerId } from "../core/index.js";
import type { AttachedTarget } from "./attach.js";
import { type PresentationKind, type PresentationStyle } from "./presentations/types.js";
import { type Miniature } from "./presentations/world-separated.js";
export interface AttentionViewOptions {
    session: AttentionSession;
    attached: AttachedTarget;
    /** Whose view this is: their trigger context drives it, and their camera renders it. */
    viewer: ViewerId;
    camera: Camera;
    scene: Scene;
    /** Holds screen-space panels. Only the camera-separated presentation needs it. */
    overlay?: HTMLElement;
    /** Keeps this view's objects to one three.js layer, when several views render one scene. */
    layer?: number;
    presentation?: PresentationKind;
    trigger?: TriggerPolicy;
    accumulator?: AccumulatorKind;
    colour?: ColourPolicy;
    /** Voxels below this display value stay transparent. */
    threshold?: number;
    style?: PresentationStyle;
}
/**
 * One viewer's display of one target. It ties a trigger policy, an accumulator,
 * a colour policy and a presentation together, and each can be swapped at any
 * time. The defaults are the paper's HeedVision: world-space, embedded,
 * explicitly triggered.
 */
export declare class AttentionView {
    private shadingBuffers;
    private readonly options;
    private readonly context;
    private readonly presentations;
    private active;
    private kind;
    private grid;
    private movedMiniatureTo;
    private shown;
    private stale;
    private lastSample;
    trigger: TriggerPolicy;
    accumulator: AccumulatorKind;
    colour: ColourPolicy;
    threshold: number | undefined;
    constructor(options: AttentionViewOptions);
    /** The latest colour, opacity and counts for each voxel. */
    get shading(): Shading;
    get presentation(): PresentationKind;
    /** Whether the viewer currently sees attention. */
    get visible(): boolean;
    /** The movable miniature, when the world-separated presentation is active. */
    get miniature(): Miniature | null;
    setPresentation(kind: PresentationKind): void;
    setTrigger(trigger: TriggerPolicy): void;
    setAccumulator(accumulator: AccumulatorKind): void;
    setColourPolicy(colour: ColourPolicy): void;
    setThreshold(threshold: number | undefined): void;
    /** Runs the trigger and redraws what changed. Call once per frame, after `session.tick`. */
    update(dt: number): void;
    /** The voxels changed, so everything built from them is rebuilt. A moved miniature keeps its place. */
    private rebuild;
    private disposePresentations;
    dispose(): void;
}
export declare function createAttentionView(options: AttentionViewOptions): AttentionView;
