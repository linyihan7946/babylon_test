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
    return new Promise((resolve, reject) => {
      BABYLON.SceneLoader.ImportMesh(
        "spz_file", // meshNames
        "", // rootUrl
        url, // fileName
        this._scene,
        (meshes) => {
          console.log("SPZ 加载完成");
          const rootNode = new BABYLON.TransformNode("root", this._scene);
          meshes.forEach(mesh => mesh.parent = rootNode);
          resolve(rootNode);
        },
        (progress) => {
          console.log(`加载进度: ${(progress.loaded / progress.total * 100).toFixed(1)}%`);
        },
        (error) => {
          console.error("加载失败:", error);
          reject(error);
        }
      );
    });
  }

  // 清除当前点云
  public clear(): void {
    if (this._currentSplatSystem) {
      this._currentSplatSystem.dispose();
      this._currentSplatSystem = undefined;
    }
  }
}
