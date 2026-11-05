import { Box3, type BufferGeometry, type Camera, type Object3D } from "three";
import type { AttentionSession, AttentionSource, Target } from "../core/index.js";
export interface AttachOptions {
    /** Defaults to the object's uuid. */
    id?: string;
    /** Voxel edge length in the object's local units. Defaults to 1/32 of its longest side. */
    voxelSize?: number;
}
/** A three.js object with attention tracking attached. */
export interface AttachedTarget {
    object: Object3D;
    target: Target;
    /** The object's meshes merged into its local space, for replicas. */
    geometry: BufferGeometry;
    /** The voxel grid's box, in the object's local space. */
    bounds: Box3;
    /** Voxel edge length in the object's local units. */
    voxelSize: number;
    /** Voxelizes again at a new resolution. Views follow on their next update, and recorded attention starts from zero. */
    setVoxelSize(voxelSize: number): void;
    /** Stops tracking and forgets the recorded attention. */
    detach(): void;
}
/** Voxelizes any object that has meshes under it, and registers it with the session. */
export declare function attachAttention(session: AttentionSession, object: Object3D, options?: AttachOptions): AttachedTarget;
/** Head tracking as attention: a ray from the camera along its view direction. */
export declare function headRaySource(camera: Camera): AttentionSource;
