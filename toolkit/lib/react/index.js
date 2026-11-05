import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { createSession } from "../core/index.js";
import { attachAttention, createAttentionView, headRaySource } from "../three/index.js";
/** A session that ticks with the render loop. Its options are read once. */
export function useAttentionSession(options) {
    const [session] = useState(() => createSession(options));
    useFrame((_, dt) => session.tick(dt));
    return session;
}
/** Attaches attention to the object in `ref`, and detaches it on unmount. */
export function useAttachAttention(session, ref, options = {}) {
    const [attached, setAttached] = useState(null);
    const { id, voxelSize } = options;
    useEffect(() => {
        if (!ref.current)
            return;
        const next = attachAttention(session, ref.current, { id, voxelSize });
        setAttached(next);
        return () => {
            next.detach();
            setAttached(null);
        };
    }, [session, ref, id, voxelSize]);
    return attached;
}
/** Registers this canvas's camera as a head-tracked viewer. */
export function useHeadTrackedViewer(session, viewer) {
    const camera = useThree((state) => state.camera);
    const { id, colour, label } = viewer;
    useEffect(() => {
        session.registerViewer({ id, colour, label, source: headRaySource(camera) });
        return () => session.removeViewer(id);
    }, [session, camera, id, colour, label]);
}
/** One viewer's display in this canvas. Changing a setting updates the view in place. */
export function useAttentionView(session, attached, viewer, settings = {}) {
    const camera = useThree((state) => state.camera);
    const scene = useThree((state) => state.scene);
    const [view, setView] = useState(null);
    const initial = useRef(settings);
    useEffect(() => {
        if (!attached)
            return;
        const next = createAttentionView({ ...initial.current, session, attached, viewer, camera, scene });
        setView(next);
        return () => {
            next.dispose();
            setView(null);
        };
    }, [session, attached, viewer, camera, scene]);
    const { presentation, trigger, accumulator, colour } = settings;
    useEffect(() => {
        if (presentation)
            view?.setPresentation(presentation);
    }, [view, presentation]);
    useEffect(() => {
        if (trigger)
            view?.setTrigger(trigger);
    }, [view, trigger]);
    useEffect(() => {
        if (accumulator)
            view?.setAccumulator(accumulator);
    }, [view, accumulator]);
    useEffect(() => {
        if (colour)
            view?.setColourPolicy(colour);
    }, [view, colour]);
    useFrame((_, dt) => view?.update(dt));
    return view;
}
