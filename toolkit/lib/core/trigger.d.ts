/** What a trigger may base its decision on, for one viewer at one moment. */
export interface TriggerContext {
    /** Seconds since the last update. */
    dt: number;
    /** Seconds this viewer's gaze has rested on the same region; 0 when they look away. */
    dwell: number;
    /** How many other viewers are looking at the same region right now. */
    joint: number;
}
/** Decides when a viewer sees the attention display. Each view has its own. */
export interface TriggerPolicy {
    readonly kind: "always" | "explicit" | "implicit";
    update(context: TriggerContext): boolean;
    /** Only an explicit trigger responds: `on` sets the state, and no argument toggles it. */
    request(on?: boolean): void;
}
/** Attention is always shown. */
export declare function alwaysOn(): TriggerPolicy;
/** Shown only while the viewer has asked for it. The paper's HeedVision uses this. */
export declare function explicitTrigger(initial?: boolean): TriggerPolicy;
export interface ImplicitOptions {
    /** Seconds of steady gaze that count as interest. */
    dwell?: number;
    /** Seconds the display stays after the condition ends, so it does not flicker. */
    hold?: number;
    /** Replaces the default condition: gaze rested for `dwell`, or someone else is looking at the same region. */
    when?: (context: TriggerContext) => boolean;
}
/**
 * The system decides. By default attention appears once a viewer settles on a
 * region or another viewer joins them there, and stays out of the way while
 * they move around, which guards against the Midas touch.
 */
export declare function implicitTrigger(options?: ImplicitOptions): TriggerPolicy;
