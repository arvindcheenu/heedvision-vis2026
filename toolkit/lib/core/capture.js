/**
 * Turns variable frame times into a fixed sampling rate. `advance(dt)` returns
 * how many samples are due. After a long stall it returns at most `maxBurst`,
 * so a hidden tab does not credit minutes of attention to one frozen pose.
 */
export function createSampleClock(rate, maxBurst = 2) {
    if (rate <= 0)
        throw new RangeError(`capture rate must be positive, got ${rate}`);
    const period = 1 / rate;
    let elapsed = 0;
    return {
        period,
        advance(dt) {
            elapsed += dt;
            const due = Math.floor(elapsed / period + 1e-9);
            elapsed -= due * period;
            if (due > maxBurst)
                elapsed = 0;
            return Math.min(due, maxBurst);
        },
    };
}
