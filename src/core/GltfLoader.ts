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

                    // 创建根节点
                    const rootNode = new BABYLON.TransformNode("gltfRoot", _scene);

                    // 将所有网格添加到根节点
                    meshes.forEach((mesh, index) => {
                        console.log(`处理网格 ${index}: ${mesh.name}`);
                        mesh.parent = rootNode;
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

                    // 存储动画组引用
                    if (animationGroups.length > 0) {
                        console.log("可用动画:");
                        animationGroups.forEach((animGroup, index) => {
                            console.log(`  动画 ${index}: ${animGroup.name}`);
                        });

                        // 播放第一个动画（如果存在）
                        animationGroups[0].start(true); // true表示循环播放
                    }

                    resolve(rootNode);
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

    // 清除当前模型
    public clear(_scene: BABYLON.Scene): void {

    }
}
