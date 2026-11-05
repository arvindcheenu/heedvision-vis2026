import type { Ray, Vec3 } from "./types.js";
export interface VoxelHit {
    voxel: number;
    /** Ray parameter at entry. It is a world distance when the ray came from a unit world direction. */
    t: number;
}
/**
 * A sparse set of occupied cells in a regular grid. Voxels are numbered 0 to
 * count - 1. Only occupied cells exist, so an attention value is stored only
 * where there is geometry.
 */
export declare class VoxelGrid {
    /** Minimum corner of cell (0, 0, 0). */
    readonly origin: Vec3;
    readonly size: number;
    readonly dims: Vec3;
    /** Occupied cells as a flat list of i, j, k triples. */
    readonly cells: Uint32Array;
    readonly count: number;
    private readonly byCell;
    constructor(
    /** Minimum corner of cell (0, 0, 0). */
    origin: Vec3, size: number, dims: Vec3, 
    /** Occupied cells as a flat list of i, j, k triples. */
    cells: Uint32Array);
    private key;
    /** The voxel at a cell, or -1 when that cell is empty or outside the grid. */
    at(i: number, j: number, k: number): number;
    /** Centre of a voxel, in the grid's local space. */
    centre(voxel: number): Vec3;
    /** Distance between two voxels in cells (Chebyshev: a cube, not a sphere). */
    cellDistance(a: number, b: number): number;
    /** Calls `visit` with each voxel within `radius` cells of `voxel` (Euclidean) and its distance. */
    forEachNear(voxel: number, radius: number, visit: (voxel: number, distance: number) => void): void;
    /** The nearest occupied voxel along a ray (Amanatides and Woo grid traversal), or null. */
    raycast(ray: Ray): VoxelHit | null;
}
