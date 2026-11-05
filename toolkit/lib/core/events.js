/** A small typed event emitter. */
export class AttentionEmitter {
    listeners = new Map();
    /** Starts listening, and returns a function that stops. */
    on(type, listener) {
        let set = this.listeners.get(type);
        if (!set)
            this.listeners.set(type, (set = new Set()));
        set.add(listener);
        return () => set.delete(listener);
    }
    emit(type, event) {
        for (const listener of this.listeners.get(type) ?? [])
            listener(event);
    }
}
