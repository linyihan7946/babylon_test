import * as BABYLON from "@babylonjs/core";
import * as pako from "pako";

// SPZ 文件加载器类
export class SPZLoader {
  private _scene: BABYLON.Scene;
  private _engine: BABYLON.Engine;
  private _splatMaterial?: BABYLON.ShaderMaterial;
  private _currentSplatSystem?: BABYLON.TransformNode;
  private _pointSize: number = 0.1;

  constructor(scene: BABYLON.Scene) {
    this._scene = scene;
    this._engine = scene.getEngine() as BABYLON.Engine;
    this._initSplatMaterial();
  }

  // 初始化高斯泼溅材质
  private _initSplatMaterial() {
    // 顶点着色器
    const vertexShader = `
      precision highp float;
      
      attribute vec3 position;
      attribute vec4 color;
      attribute vec3 scale;
      attribute vec4 rotation;
      
      uniform mat4 view;
      uniform mat4 projection;
      uniform vec2 resolution;
      
      varying vec4 vColor;
      
      vec3 rotateVector(vec4 q, vec3 v) {
        return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
      }
      
      void main() {
        vec3 scaledPos = position * scale;
        vec3 rotatedPos = rotateVector(rotation, scaledPos);
        
        vec4 viewPos = view * vec4(rotatedPos, 1.0);
        vec4 projected = projection * viewPos;
        
        gl_Position = projected;
        gl_PointSize = clamp(projected.w * 0.5 / resolution.y, 1.0, 128.0);
        
        vColor = color;
      }
    `;

    // 片段着色器
    const fragmentShader = `
      precision highp float;
      
      varying vec4 vColor;
      
      void main() {
        vec2 coord = gl_PointCoord - vec2(0.5);
        float radius = length(coord);
        if (radius > 0.5) discard;
        
        float alpha = exp(-2.0 * radius * radius);
        gl_FragColor = vec4(vColor.rgb, vColor.a * alpha);
      }
    `;

    // 创建着色器材质
    this._splatMaterial = new BABYLON.ShaderMaterial(
      "splatMaterial",
      this._scene,
      {
        vertexSource: vertexShader,
        fragmentSource: fragmentShader
      },
      {
        attributes: ["position", "color", "scale", "rotation"],
        uniforms: ["view", "projection", "resolution"]
      }
    );

    // 设置材质属性
    this._splatMaterial.backFaceCulling = false;
    this._splatMaterial.alphaMode = BABYLON.Constants.ALPHA_ONEONE;
  }

  // 设置点大小
  public setPointSize(size: number): void {
    this._pointSize = size;
    if (this._currentSplatSystem) {
      const material = this._currentSplatSystem.getChildMeshes()[0]?.material as BABYLON.ShaderMaterial;
      if (material) {
        material.setFloat("pointSize", size);
      }
    }
  }

  // 加载 SPZ 文件
  public async load(url: string): Promise<BABYLON.TransformNode> {
    try {
      // 清除之前的点云
      this.clear();
      
      // 1. 下载 SPZ 文件
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      // 2. 解压数据
      const compressedData = await response.arrayBuffer();
      const decompressedData = pako.inflate(new Uint8Array(compressedData));
      
      // 3. 解析二进制数据
      const splatData = this._parseSPZ(decompressedData.buffer);
      
      // 4. 创建点云系统
      this._currentSplatSystem = this._createSplatSystem(splatData, url);
      return this._currentSplatSystem;
    } catch (error) {
      console.error("Failed to load SPZ file:", error);
      throw error;
    }
  }

  // 清除当前点云
  public clear(): void {
    if (this._currentSplatSystem) {
      this._currentSplatSystem.dispose();
      this._currentSplatSystem = undefined;
    }
  }

  // 解析 SPZ 二进制数据
  private _parseSPZ(data: ArrayBuffer): SplatData {
    const view = new DataView(data);
    let offset = 0;
    
    // 读取魔数 "SPZ"
    const magic = new TextDecoder().decode(new Uint8Array(data, offset, 3));
    offset += 3;
    if (magic !== "SPZ") {
      throw new Error(`Invalid SPZ file: magic number mismatch (${magic})`);
    }
    
    // 读取版本号
    const version = view.getUint8(offset++);
    if (version !== 1) {
      throw new Error(`Unsupported SPZ version: ${version}`);
    }
    
    // 读取点数量
    const splatCount = view.getUint32(offset, true); offset += 4;
    
    // 读取点数据
    const positions = new Float32Array(splatCount * 3);
    const colors = new Uint8Array(splatCount * 4);
    const scales = new Float32Array(splatCount * 3);
    const rotations = new Float32Array(splatCount * 4);
    
    for (let i = 0; i < splatCount; i++) {
      // 位置 (3x float32)
      positions[i * 3] = view.getFloat32(offset, true); offset += 4;
      positions[i * 3 + 1] = view.getFloat32(offset, true); offset += 4;
      positions[i * 3 + 2] = view.getFloat32(offset, true); offset += 4;
      
      // 颜色 (4x uint8)
      colors[i * 4] = view.getUint8(offset++);
      colors[i * 4 + 1] = view.getUint8(offset++);
      colors[i * 4 + 2] = view.getUint8(offset++);
      colors[i * 4 + 3] = view.getUint8(offset++);
      
      // 缩放 (3x float32)
      scales[i * 3] = view.getFloat32(offset, true); offset += 4;
      scales[i * 3 + 1] = view.getFloat32(offset, true); offset += 4;
      scales[i * 3 + 2] = view.getFloat32(offset, true); offset += 4;
      
      // 旋转 (4x float32)
      rotations[i * 4] = view.getFloat32(offset, true); offset += 4;
      rotations[i * 4 + 1] = view.getFloat32(offset, true); offset += 4;
      rotations[i * 4 + 2] = view.getFloat32(offset, true); offset += 4;
      rotations[i * 4 + 3] = view.getFloat32(offset, true); offset += 4;
    }
    
    return {
      positions,
      colors,
      scales,
      rotations,
      count: splatCount
    };
  }

  // 创建点云系统
  private _createSplatSystem(data: SplatData, name: string): BABYLON.TransformNode {
    // 创建父节点
    const rootNode = new BABYLON.TransformNode(name, this._scene);
    
    // 创建点云系统
    const splatSystem = new BABYLON.Mesh(name + "_splats", this._scene);
    splatSystem.parent = rootNode;
    
    // 设置顶点数据
    splatSystem.setVerticesData(BABYLON.VertexBuffer.PositionKind, data.positions, false);
    splatSystem.setVerticesData("color", new Float32Array(data.colors), false);
    splatSystem.setVerticesData("scale", data.scales, false);
    splatSystem.setVerticesData("rotation", data.rotations, false);
    splatSystem.setIndices([]); // 点云不需要索引
    
    // 设置材质
    if (this._splatMaterial) {
      splatSystem.material = this._splatMaterial;
      
      // 更新材质分辨率
      this._splatMaterial.onBind = (mesh) => {
        if (mesh && this._splatMaterial) {
          this._splatMaterial.setVector2(
            "resolution", 
            new BABYLON.Vector2(
              this._engine.getRenderWidth(),
              this._engine.getRenderHeight()
            )
          );
        }
      };
    }
    
    // 设置绘制模式为点
    splatSystem.setEnabled(false);
    splatSystem.isVisible = true;
    
    return rootNode;
  }
}

// SPZ 数据结构接口
interface SplatData {
  positions: Float32Array;
  colors: Uint8Array;
  scales: Float32Array;
  rotations: Float32Array;
  count: number;
}