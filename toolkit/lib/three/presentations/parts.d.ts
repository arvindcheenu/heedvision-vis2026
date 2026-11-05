import { Group, ShaderMaterial, type Object3D } from "three";
import type { Shading, VoxelGrid } from "../../core/index.js";
/** Pieces the world-space and box presentations share. */
/** Puts an object and its children on a view's layer. */
export declare function setLayer(object: Object3D, layer: number | undefined): void;
/** Keeps a group on the attached object's pose without becoming its child, so the object's own hierarchy stays untouched. */
export declare function createFollower(object: Object3D): {
    group: Group<import("three").Object3DEventMap>;
    follow(): void;
};
/**
 * Attention as translucent cubes, one instance per voxel. Colours are sRGB and
 * pass straight through to the screen.
 *
 * Drawn in two passes: depth first, then colour on the front-most surface only.
 * Without this, cubes blend through each other and a voxel's colour no longer
 * says who attended it.
 */
export declare function createVoxelCloud(grid: VoxelGrid): {
    object: Group<import("three").Object3DEventMap>;
    draw(shading: Shading): void;
    dispose(): void;
};
/** Flat-shaded neutral material for the data's replica. It needs no scene lights. */
export declare function createReplicaMaterial(ink: string): ShaderMaterial;
