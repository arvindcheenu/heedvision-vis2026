/** Exponential decay: attention halves every `halfLife` seconds and is independent of the sampling rate. */
export function halfLifeDecay(halfLife) {
    if (halfLife <= 0)
        throw new RangeError(`half-life must be positive, got ${halfLife}`);
    return (dt) => Math.pow(0.5, dt / halfLife);
}
/** Attention is kept for good. */
export const noDecay = () => 1;
