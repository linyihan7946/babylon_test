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
        "", // 不指定meshNames，加载所有网格
        "", // rootUrl
        url, // fileName
        this._scene,
        (meshes) => {
          console.log("SPZ 加载完成，网格数量:", meshes.length);
          if (meshes.length === 0) {
            reject(new Error("没有加载到任何网格"));
            return;
          }
          
          const rootNode = new BABYLON.TransformNode("root", this._scene);
          meshes.forEach(mesh => {
            console.log("处理网格:", mesh.name);
            mesh.parent = rootNode;
            // 确保网格可见
            mesh.isVisible = true;
            // 如果是Mesh类型，设置材质
            if (mesh instanceof BABYLON.Mesh) {
              const material = new BABYLON.StandardMaterial("pointMaterial", this._scene);
              material.emissiveColor = new BABYLON.Color3(0, 1, 0);
              material.pointSize = 0.1;
              material.disableLighting = true;
              mesh.material = material;
            }
          });
          
          this._currentSplatSystem = rootNode;
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
