import { type RefObject } from "react";
import type { Object3D } from "three";
import { type AttentionSession, type ColourInput, type SessionOptions, type ViewerId } from "../core/index.js";
import { type AttachOptions, type AttachedTarget, type AttentionView, type AttentionViewOptions } from "../three/index.js";
/** A session that ticks with the render loop. Its options are read once. */
export declare function useAttentionSession(options?: SessionOptions): AttentionSession;
/** Attaches attention to the object in `ref`, and detaches it on unmount. */
export declare function useAttachAttention(session: AttentionSession, ref: RefObject<Object3D | null>, options?: AttachOptions): AttachedTarget | null;
/** Registers this canvas's camera as a head-tracked viewer. */
export declare function useHeadTrackedViewer(session: AttentionSession, viewer: {
    id: ViewerId;
    colour: ColourInput;
    label?: string;
}): void;
type ViewSettings = Pick<AttentionViewOptions, "presentation" | "trigger" | "accumulator" | "colour" | "overlay" | "style" | "threshold">;
/** One viewer's display in this canvas. Changing a setting updates the view in place. */
export declare function useAttentionView(session: AttentionSession, attached: AttachedTarget | null, viewer: ViewerId, settings?: ViewSettings): AttentionView | null;
export {};
