import { AttentionField } from "./accumulators.js";
import { createSampleClock } from "./capture.js";
import { halfLifeDecay } from "./decay.js";
import { AttentionEmitter } from "./events.js";
/** The hub: viewers and targets register here, and `tick` runs capture, recording and decay. */
export class AttentionSession {
    viewers = new Map();
    targets = new Map();
    clock;
    gain;
    influenceRadius;
    regionRadius;
    dwellTime;
    decay;
    states = new Map();
    emitter = new AttentionEmitter();
    samples = 0;
    constructor(options = {}) {
        this.clock = createSampleClock(options.captureRate ?? 10);
        this.gain = options.gain ?? 0.4;
        this.influenceRadius = options.influenceRadius ?? 0;
        this.regionRadius = options.regionRadius ?? 2;
        this.dwellTime = options.dwellTime ?? 1.5;
        this.decay = options.decay ?? halfLifeDecay(30);
    }
    /** Changes any setting while running. Recorded attention is kept. */
    configure(options) {
        if (options.captureRate !== undefined)
            this.clock = createSampleClock(options.captureRate);
        if (options.gain !== undefined)
            this.gain = options.gain;
        if (options.influenceRadius !== undefined)
            this.influenceRadius = options.influenceRadius;
        if (options.regionRadius !== undefined)
            this.regionRadius = options.regionRadius;
        if (options.dwellTime !== undefined)
            this.dwellTime = options.dwellTime;
        if (options.decay !== undefined)
            this.decay = options.decay;
    }
    /** Listens for attention events, and returns a function that stops listening. */
    on(type, listener) {
        return this.emitter.on(type, listener);
    }
    registerViewer(options) {
        if (this.viewers.has(options.id))
            throw new Error(`viewer "${options.id}" is already registered`);
        const viewer = { ...options, label: options.label ?? options.id };
        this.viewers.set(viewer.id, viewer);
        this.states.set(viewer.id, { gaze: null, anchor: null, dwell: 0, dwellFired: false, others: [] });
        for (const target of this.targets.values())
            target.field.addViewer(viewer.id);
        return viewer;
    }
    /** Forgets a viewer and their recorded attention. */
    removeViewer(id) {
        this.viewers.delete(id);
        this.states.delete(id);
        for (const target of this.targets.values())
            target.field.removeViewer(id);
        for (const state of this.states.values())
            state.others = state.others.filter((other) => other !== id);
    }
    registerTarget(options) {
        if (this.targets.has(options.id))
            throw new Error(`target "${options.id}" is already registered`);
        const target = { ...options, field: this.createField(options.grid) };
        this.targets.set(target.id, target);
        return target;
    }
    removeTarget(id) {
        this.targets.delete(id);
        this.forgetGazeOn(id);
    }
    /** Swaps a target's voxels, for a new resolution. Its recorded attention starts again from zero. */
    replaceGrid(id, grid) {
        const target = this.targets.get(id);
        if (!target)
            throw new Error(`unknown target "${id}"`);
        target.grid = grid;
        target.field = this.createField(grid);
        this.forgetGazeOn(id);
    }
    createField(grid) {
        const field = new AttentionField(grid.count);
        for (const id of this.viewers.keys())
            field.addViewer(id);
        return field;
    }
    forgetGazeOn(id) {
        for (const state of this.states.values()) {
            if (state.gaze?.target.id === id)
                state.gaze = null;
            if (state.anchor?.target.id === id)
                state.anchor = null;
        }
    }
    /** Clears all recorded attention and keeps everyone registered. */
    reset() {
        for (const target of this.targets.values())
            target.field.clear();
    }
    /** Counts samples taken, so a view can repaint only when something changed. */
    get sampleCount() {
        return this.samples;
    }
    /** Advances by `dt` seconds. Call it once per frame. */
    tick(dt) {
        const due = this.clock.advance(dt);
        for (let i = 0; i < due; i++)
            this.sample();
    }
    sample() {
        const period = this.clock.period;
        const factor = this.decay(period);
        if (factor !== 1)
            for (const target of this.targets.values())
                target.field.scale(factor);
        const previous = new Map();
        for (const viewer of this.viewers.values()) {
            const state = this.states.get(viewer.id);
            previous.set(viewer.id, state.gaze);
            const ray = viewer.source.sample();
            state.gaze = ray ? this.nearestHit(ray) : null;
            if (state.gaze)
                this.record(viewer.id, state.gaze, this.gain * period);
            this.updateDwell(state, period);
        }
        this.samples++;
        // Events go out once everyone has moved, so joint attention sees this sample's gazes.
        for (const [id, state] of this.states) {
            this.emitGazeEvents(id, state, previous.get(id) ?? null);
            this.emitJointEvents(id, state, previous.get(id) ?? null);
        }
    }
    /** The nearest voxel across all targets, so one object can occlude another. */
    nearestHit(ray) {
        let best = null;
        for (const target of this.targets.values()) {
            const hit = target.grid.raycast(target.toLocal(ray));
            if (hit && (!best || hit.t < best.distance)) {
                const { origin: o, direction: d } = ray;
                best = {
                    target,
                    voxel: hit.voxel,
                    distance: hit.t,
                    point: [o[0] + hit.t * d[0], o[1] + hit.t * d[1], o[2] + hit.t * d[2]],
                };
            }
        }
        return best;
    }
    record(viewer, gaze, amount) {
        const { grid, field } = gaze.target;
        const radius = this.influenceRadius;
        if (radius === 0) {
            field.add(viewer, gaze.voxel, amount);
            return;
        }
        // The centre gets the most, falling off linearly to a quarter at the edge.
        grid.forEachNear(gaze.voxel, radius, (voxel, distance) => {
            field.add(viewer, voxel, amount * (1 - 0.75 * (distance / radius)));
        });
    }
    updateDwell(state, period) {
        const { gaze, anchor } = state;
        if (gaze && anchor && this.sameRegion(anchor, gaze)) {
            state.dwell += period;
            return;
        }
        state.anchor = gaze && { target: gaze.target, voxel: gaze.voxel };
        state.dwell = 0;
        state.dwellFired = false;
    }
    sameRegion(a, b) {
        return a.target === b.target && a.target.grid.cellDistance(a.voxel, b.voxel) <= this.regionRadius;
    }
    othersInRegion(viewer, gaze) {
        if (!gaze)
            return [];
        const others = [];
        for (const [other, state] of this.states) {
            if (other !== viewer && state.gaze && this.sameRegion(gaze, state.gaze))
                others.push(other);
        }
        return others;
    }
    describe(viewer, gaze) {
        return { viewer, target: gaze.target.id, voxel: gaze.voxel, point: gaze.point, localPoint: gaze.target.grid.centre(gaze.voxel) };
    }
    emitGazeEvents(id, state, previous) {
        const { gaze } = state;
        if (previous && previous.target !== gaze?.target)
            this.emitter.emit("gazeleave", this.describe(id, previous));
        if (gaze && previous?.target !== gaze.target)
            this.emitter.emit("gazeenter", this.describe(id, gaze));
        if (gaze && !state.dwellFired && state.dwell >= this.dwellTime) {
            state.dwellFired = true;
            this.emitter.emit("dwell", { ...this.describe(id, gaze), seconds: state.dwell });
        }
    }
    emitJointEvents(id, state, previous) {
        const before = state.others;
        state.others = this.othersInRegion(id, state.gaze);
        if (before.length === 0 && state.others.length > 0) {
            this.emitter.emit("jointstart", { ...this.describe(id, state.gaze), others: state.others });
        }
        else if (before.length > 0 && state.others.length === 0) {
            const last = state.gaze ?? previous;
            if (last)
                this.emitter.emit("jointend", { ...this.describe(id, last), others: before });
        }
    }
    /** The viewer's latest gaze, or null when they are looking at nothing registered. */
    gaze(viewer) {
        return this.states.get(viewer)?.gaze ?? null;
    }
    /** The measurements an implicit trigger bases its decision on. */
    triggerContext(viewer, dt) {
        const state = this.states.get(viewer);
        return { dt, dwell: state?.dwell ?? 0, joint: state ? this.othersInRegion(viewer, state.gaze).length : 0 };
    }
}
export function createSession(options) {
    return new AttentionSession(options);
}
