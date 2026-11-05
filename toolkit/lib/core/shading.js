import { aggregate, normalised, DEFAULT_ATTENDED_THRESHOLD } from "./accumulators.js";
export function createShading(voxelCount) {
    return { rgb: new Float32Array(voxelCount * 3), alpha: new Float32Array(voxelCount), attended: 0, shared: 0 };
}
/**
 * Combines a target's accumulators into one colour and opacity per voxel. The
 * accumulator sets the opacity and the colour policy sets the colour, as in the
 * paper's opacity-driven revisualization.
 */
export function shade(session, target, shading, options) {
    const { accumulator, colour } = options;
    const threshold = options.threshold ?? DEFAULT_ATTENDED_THRESHOLD;
    const { field } = target;
    const viewers = [...session.viewers.values()];
    const channels = viewers.map((v) => field.channel(v.id));
    const scratch = viewers.map((v) => ({ id: v.id, colour: v.colour, value: 0 }));
    const values = new Float32Array(viewers.length);
    let attended = 0;
    let shared = 0;
    for (let voxel = 0; voxel < field.voxelCount; voxel++) {
        let present = 0;
        for (let i = 0; i < channels.length; i++) {
            const value = channels[i][voxel];
            values[i] = value;
            scratch[i].value = value;
            if (value >= threshold)
                present++;
        }
        const display = present === 0 ? 0 : normalised(accumulator, aggregate(accumulator, values, threshold), viewers.length);
        const rgb = display >= threshold ? colour.resolve(scratch) : null;
        if (!rgb) {
            shading.alpha[voxel] = 0;
            continue;
        }
        shading.rgb[3 * voxel] = rgb[0];
        shading.rgb[3 * voxel + 1] = rgb[1];
        shading.rgb[3 * voxel + 2] = rgb[2];
        shading.alpha[voxel] = display;
        attended++;
        if (present >= 2)
            shared++;
    }
    shading.attended = attended;
    shading.shared = shared;
}
