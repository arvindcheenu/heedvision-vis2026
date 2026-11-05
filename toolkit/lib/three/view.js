import { createShading, explicitTrigger, interpolatedColours, shade, } from "../core/index.js";
import { createCameraEmbedded } from "./presentations/camera-embedded.js";
import { createCameraSeparated } from "./presentations/camera-separated.js";
import { DEFAULT_STYLE } from "./presentations/types.js";
import { createWorldEmbedded } from "./presentations/world-embedded.js";
import { createWorldSeparated } from "./presentations/world-separated.js";
/**
 * One viewer's display of one target. It ties a trigger policy, an accumulator,
 * a colour policy and a presentation together, and each can be swapped at any
 * time. The defaults are the paper's HeedVision: world-space, embedded,
 * explicitly triggered.
 */
export class AttentionView {
    shadingBuffers;
    options;
    context;
    presentations = new Map();
    active;
    kind;
    grid;
    movedMiniatureTo = null;
    shown = false;
    stale = true;
    lastSample = -1;
    trigger;
    accumulator;
    colour;
    threshold;
    constructor(options) {
        this.options = options;
        this.trigger = options.trigger ?? explicitTrigger();
        this.accumulator = options.accumulator ?? "sum";
        this.colour = options.colour ?? interpolatedColours();
        this.threshold = options.threshold;
        this.grid = options.attached.target.grid;
        this.shadingBuffers = createShading(this.grid.count);
        this.context = {
            attached: options.attached,
            scene: options.scene,
            overlay: options.overlay,
            layer: options.layer,
            style: options.style ?? DEFAULT_STYLE,
        };
        if (options.layer !== undefined)
            options.camera.layers.enable(options.layer);
        this.setPresentation(options.presentation ?? "world-embedded");
    }
    /** The latest colour, opacity and counts for each voxel. */
    get shading() {
        return this.shadingBuffers;
    }
    get presentation() {
        return this.kind;
    }
    /** Whether the viewer currently sees attention. */
    get visible() {
        return this.shown;
    }
    /** The movable miniature, when the world-separated presentation is active. */
    get miniature() {
        return this.kind === "world-separated" ? this.active : null;
    }
    setPresentation(kind) {
        this.active?.setVisible(false);
        let next = this.presentations.get(kind);
        if (!next) {
            next = PRESENTATIONS[kind](this.context);
            if (kind === "world-separated" && this.movedMiniatureTo)
                next.moveTo(...this.movedMiniatureTo.toArray());
            this.presentations.set(kind, next); // kept, so a moved miniature stays where it was put
        }
        this.active = next;
        this.kind = kind;
        this.active.setVisible(this.shown);
        this.stale = true;
    }
    setTrigger(trigger) {
        this.trigger = trigger;
    }
    setAccumulator(accumulator) {
        this.accumulator = accumulator;
        this.stale = true;
    }
    setColourPolicy(colour) {
        this.colour = colour;
        this.stale = true;
    }
    setThreshold(threshold) {
        this.threshold = threshold;
        this.stale = true;
    }
    /** Runs the trigger and redraws what changed. Call once per frame, after `session.tick`. */
    update(dt) {
        const { session, viewer, attached, camera } = this.options;
        if (attached.target.grid !== this.grid)
            this.rebuild();
        const visible = this.trigger.update(session.triggerContext(viewer, dt));
        if (visible !== this.shown) {
            this.shown = visible;
            this.active.setVisible(visible);
            this.stale = true;
        }
        if (!visible)
            return;
        if (this.stale || session.sampleCount !== this.lastSample) {
            shade(session, attached.target, this.shadingBuffers, { accumulator: this.accumulator, colour: this.colour, threshold: this.threshold });
            this.active.draw(this.shadingBuffers);
            this.stale = false;
            this.lastSample = session.sampleCount;
        }
        this.active.follow(camera, dt);
    }
    /** The voxels changed, so everything built from them is rebuilt. A moved miniature keeps its place. */
    rebuild() {
        const miniature = this.presentations.get("world-separated");
        if (miniature)
            this.movedMiniatureTo = miniature.object.position.clone();
        this.disposePresentations();
        this.grid = this.options.attached.target.grid;
        this.shadingBuffers = createShading(this.grid.count);
        this.setPresentation(this.kind);
    }
    disposePresentations() {
        for (const presentation of this.presentations.values())
            presentation.dispose();
        this.presentations.clear();
    }
    dispose() {
        this.disposePresentations();
    }
}
const PRESENTATIONS = {
    "world-embedded": createWorldEmbedded,
    "world-separated": createWorldSeparated,
    "camera-embedded": createCameraEmbedded,
    "camera-separated": createCameraSeparated,
};
export function createAttentionView(options) {
    return new AttentionView(options);
}
