/** Attention is always shown. */
export function alwaysOn() {
    return { kind: "always", update: () => true, request() { } };
}
/** Shown only while the viewer has asked for it. The paper's HeedVision uses this. */
export function explicitTrigger(initial = false) {
    let visible = initial;
    return {
        kind: "explicit",
        update: () => visible,
        request(on = !visible) {
            visible = on;
        },
    };
}
/**
 * The system decides. By default attention appears once a viewer settles on a
 * region or another viewer joins them there, and stays out of the way while
 * they move around, which guards against the Midas touch.
 */
export function implicitTrigger(options = {}) {
    const dwell = options.dwell ?? 1.5;
    const hold = options.hold ?? 2;
    const when = options.when ?? ((c) => c.dwell >= dwell || c.joint > 0);
    let remaining = 0;
    return {
        kind: "implicit",
        update(context) {
            remaining = when(context) ? hold : Math.max(0, remaining - context.dt);
            return remaining > 0;
        },
        request() { },
    };
}
