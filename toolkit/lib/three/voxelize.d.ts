import { BufferGeometry, type Object3D } from "three";
import { VoxelGrid } from "../core/index.js";
/**
 * Copies every mesh under `object` into one position-only geometry, in the
 * local space of `object`. Attention is stored in that space, so it stays on
 * the object when the object moves.
 */
export declare function mergeGeometry(object: Object3D): BufferGeometry;
/**
 * Finds the grid cells that touch the geometry's surface. A bounding volume
 * hierarchy over the triangles makes each box test cheap, and whole empty
 * blocks of cells are ruled out with one test by splitting recursively.
 */
export declare function voxelize(geometry: BufferGeometry, voxelSize: number): VoxelGrid;
