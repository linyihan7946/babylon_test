import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders/SPLAT"; // 关键：注册加载器

// SPZ 文件加载器类
export class SPZLoader {
  private _scene: BABYLON.Scene;
  private _currentSplatSystem?: BABYLON.TransformNode;

  constructor(scene: BABYLON.Scene) {
    this._scene = scene;
  }

  // 加载 SPZ 文件
  public async load(url: string): Promise<BABYLON.TransformNode> {
    const result = await BABYLON.ImportMeshAsync(url, this._scene);
    const gaussianSplattingMesh = result.meshes[0] as BABYLON.GaussianSplattingMesh;
    
    // 获取并打印点集数目
    const pointCount = gaussianSplattingMesh.getTotalVertices(); // 每个点有3个坐标(x,y,z)
    console.log(`点云加载完成，总点数: ${pointCount}`);
    
    return gaussianSplattingMesh;
  }

  // 清除当前点云
  public clear(): void {
    if (this._currentSplatSystem) {
      this._currentSplatSystem.dispose();
      this._currentSplatSystem = undefined;
    }
  }
}
