import { Engine, Scene, Vector3, BoundingInfo, HemisphericLight, MeshBuilder, ArcRotateCamera, WebGPUEngine, Mesh, StandardMaterial, Color3, AbstractMesh } from '@babylonjs/core'

export class Geometry {
  static Instance: Geometry = new Geometry()

  constructor() {
  }

  // 获取多个网格的合并包围盒
  public getCombinedBoundingBox(meshes: AbstractMesh[]): BoundingInfo {
        let min = new Vector3(Infinity, Infinity, Infinity);
        let max = new Vector3(-Infinity, -Infinity, -Infinity);

        meshes.forEach(mesh => {
            const boundingInfo = mesh.getBoundingInfo();
            const meshMin = boundingInfo.boundingBox.minimumWorld;
            const meshMax = boundingInfo.boundingBox.maximumWorld;

            // 更新整体最小/最大坐标
            min = Vector3.Minimize(min, meshMin);
            max = Vector3.Maximize(max, meshMax);
        });

        return new BoundingInfo(min, max);
    }
}
