/** How much of a value survives `dt` seconds. */
export type Decay = (dt: number) => number;
/** Exponential decay: attention halves every `halfLife` seconds and is independent of the sampling rate. */
export declare function halfLifeDecay(halfLife: number): Decay;
/** Attention is kept for good. */
export declare const noDecay: Decay;
