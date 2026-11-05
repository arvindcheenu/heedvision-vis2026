import { Box3, Matrix3, Matrix4, Vector3 } from "three";
import { mergeGeometry, voxelize } from "./voxelize.js";
/** Voxelizes any object that has meshes under it, and registers it with the session. */
export function attachAttention(session, object, options = {}) {
    const geometry = mergeGeometry(object);
    const voxelSize = options.voxelSize ?? defaultVoxelSize(geometry);
    const grid = voxelize(geometry, voxelSize);
    const id = options.id ?? object.uuid;
    const target = session.registerTarget({ id, grid, toLocal: worldToLocal(object) });
    const attached = {
        object,
        target,
        geometry,
        bounds: gridBounds(grid),
        voxelSize,
        setVoxelSize(size) {
            const next = voxelize(geometry, size);
            session.replaceGrid(id, next);
            attached.bounds = gridBounds(next);
            attached.voxelSize = size;
        },
        detach() {
            session.removeTarget(id);
            geometry.dispose();
        },
    };
    return attached;
}
function defaultVoxelSize(geometry) {
    geometry.computeBoundingBox();
    const size = geometry.boundingBox.getSize(new Vector3());
    return Math.max(size.x, size.y, size.z) / 32;
}
function gridBounds(grid) {
    const min = new Vector3(...grid.origin);
    const max = new Vector3(grid.dims[0], grid.dims[1], grid.dims[2]).multiplyScalar(grid.size).add(min);
    return new Box3(min, max);
}
/** Moves a ray into the object's local space. The direction keeps its scale, so `t` stays a world distance. */
function worldToLocal(object) {
    const inverse = new Matrix4();
    const rotation = new Matrix3();
    const origin = new Vector3();
    const direction = new Vector3();
    return (ray) => {
        object.updateWorldMatrix(true, false);
        inverse.copy(object.matrixWorld).invert();
        rotation.setFromMatrix4(inverse);
        origin.set(...ray.origin).applyMatrix4(inverse);
        direction.set(...ray.direction).applyMatrix3(rotation);
        return { origin: [origin.x, origin.y, origin.z], direction: [direction.x, direction.y, direction.z] };
    };
}
/** Head tracking as attention: a ray from the camera along its view direction. */
export function headRaySource(camera) {
    const origin = new Vector3();
    const direction = new Vector3();
    return {
        sample() {
            camera.updateWorldMatrix(true, false);
            camera.getWorldPosition(origin);
            camera.getWorldDirection(direction);
            return { origin: [origin.x, origin.y, origin.z], direction: [direction.x, direction.y, direction.z] };
        },
    };
}
