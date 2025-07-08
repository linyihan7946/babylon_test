import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders/glTF"; // 注册GLTF加载器

// GLTF 文件加载器类
export class GltfLoader {
    static Instance: GltfLoader = new GltfLoader();

    constructor() {
    }

    // 加载 GLTF 文件
    public async load(url: string, _scene: BABYLON.Scene): Promise<BABYLON.TransformNode> {
        return new Promise((resolve, reject) => {
            BABYLON.SceneLoader.ImportMesh(
                "", // 不指定meshNames，加载所有网格
                "", // rootUrl
                url, // fileName
                _scene,
                (meshes, particleSystems, skeletons, animationGroups) => {
                    console.log("GLTF 加载完成，网格数量:", meshes.length);
                    console.log("动画组数量:", animationGroups.length);
                    console.log("骨骼数量:", skeletons.length);

                    if (meshes.length === 0) {
                        reject(new Error("没有加载到任何网格"));
                        return;
                    }

                    // 查找根节点（没有父节点或父节点是场景的节点）
                    const rootMeshes = meshes.filter(mesh => 
                        !mesh.parent || mesh.parent.name === "__root__"
                    );

                    // 创建一个包装根节点来管理整个模型
                    const wrapperRoot = new BABYLON.TransformNode("gltfWrapper", _scene);

                    // 将根网格设置为包装根节点的子节点，保持原有层级结构
                    rootMeshes.forEach((mesh, index) => {
                        console.log(`设置根网格 ${index}: ${mesh.name}`);
                        mesh.parent = wrapperRoot;
                    });

                    // 确保所有网格可见，但不改变层级结构
                    meshes.forEach((mesh) => {
                        mesh.isVisible = true;
                        
                        // 如果是Mesh类型，确保材质正确设置
                        if (mesh instanceof BABYLON.Mesh) {
                            // GLTF文件通常已经包含材质，这里只是确保可见性
                            if (!mesh.material) {
                                const material = new BABYLON.StandardMaterial("defaultMaterial", _scene);
                                material.diffuseColor = new BABYLON.Color3(0.7, 0.7, 0.7);
                                mesh.material = material;
                            }
                        }
                    });

                    // 打印层级结构用于调试
                    console.log("GLTF 层级结构:");
                    this._printHierarchy(wrapperRoot, 0);

                    // 存储动画组引用
                    if (animationGroups.length > 0) {
                        console.log("可用动画:");
                        animationGroups.forEach((animGroup, index) => {
                            console.log(`  动画 ${index}: ${animGroup.name}`);
                        });

                        // 播放第一个动画（如果存在）
                        animationGroups[0].start(true); // true表示循环播放
                    }

                    resolve(wrapperRoot);
                },
                (progress) => {
                    console.log(`加载进度: ${(progress.loaded / progress.total * 100).toFixed(1)}%`);
                },
                (error) => {
                    console.error("GLTF加载失败:", error);
                    reject(error);
                }
            );
        });
    }

    // 打印层级结构的辅助方法
    private _printHierarchy(node: BABYLON.Node, level: number): void {
        const indent = "  ".repeat(level);
        console.log(`${indent}${node.name} (${node.getClassName()})`);
        
        if (node.getChildren) {
            node.getChildren().forEach(child => {
                this._printHierarchy(child, level + 1);
            });
        }
    }

    // 清除当前模型
    public clear(_scene: BABYLON.Scene): void {

    }
}
