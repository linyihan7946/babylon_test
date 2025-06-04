import * as BABYLON from "@babylonjs/core";

export class PLYLoader {
  private _scene: BABYLON.Scene;
  private _engine: BABYLON.Engine;
  private _currentMesh?: BABYLON.Mesh;
  private _pointSize: number = 1;

  constructor(scene: BABYLON.Scene) {
    this._scene = scene;
    this._engine = scene.getEngine() as BABYLON.Engine;
  }

  // 加载PLY文件
  public async load(url: string): Promise<BABYLON.Mesh> {
    try {
      // 清除之前的点云
      this.clear();

      // 下载PLY文件
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.text();

      // 解析PLY文件
      const plyData = this._parsePLY(data);
      
      // 创建点云网格
      this._currentMesh = this._createPointCloud(plyData, url);
      return this._currentMesh;
    } catch (error) {
      console.error("Failed to load PLY file:", error);
      throw error;
    }
  }

  // 清除当前点云
  public clear(): void {
    if (this._currentMesh) {
      this._currentMesh.dispose();
      this._currentMesh = undefined;
    }
  }

  // 设置点大小
  public setPointSize(size: number): void {
    this._pointSize = size;
    if (this._currentMesh) {
      const material = this._currentMesh.material as BABYLON.StandardMaterial;
      if (material) {
        material.pointSize = size;
      }
    }
  }

  // 解析PLY文件
  private _parsePLY(data: string): PLYData {
    const lines = data.split('\n');
    let lineIndex = 0;
    
    // 检查文件头
    if (lines[lineIndex++] !== 'ply') {
      throw new Error('Invalid PLY file: missing PLY header');
    }

    // 解析头部信息
    let vertexCount = 0;
    let hasColors = false;
    let format = '';

    while (lineIndex < lines.length) {
      const line = lines[lineIndex++].trim();
      if (line === 'end_header') break;

      const parts = line.split(' ');
      if (parts[0] === 'format') {
        format = parts[1];
      } else if (parts[0] === 'element' && parts[1] === 'vertex') {
        vertexCount = parseInt(parts[2]);
      } else if (parts[0] === 'property' && parts[1] === 'uchar' && parts[2].startsWith('red')) {
        hasColors = true;
      }
    }

    // 解析顶点数据
    const positions = new Float32Array(vertexCount * 3);
    const colors = hasColors ? new Uint8Array(vertexCount * 4) : undefined;
    let vertexIndex = 0;

    while (lineIndex < lines.length && vertexIndex < vertexCount) {
      const line = lines[lineIndex++].trim();
      if (!line) continue;

      const values = line.split(' ').map(Number);
      
      // 位置 (x, y, z)
      positions[vertexIndex * 3] = values[0];
      positions[vertexIndex * 3 + 1] = values[1];
      positions[vertexIndex * 3 + 2] = values[2];

      // 颜色 (r, g, b, a)
      if (hasColors && colors) {
        colors[vertexIndex * 4] = values[3];     // r
        colors[vertexIndex * 4 + 1] = values[4]; // g
        colors[vertexIndex * 4 + 2] = values[5]; // b
        colors[vertexIndex * 4 + 3] = 255;       // a
      }

      vertexIndex++;
    }

    return {
      positions,
      colors,
      count: vertexCount
    };
  }

  // 创建点云网格
  private _createPointCloud(data: PLYData, name: string): BABYLON.Mesh {
    // 创建网格
    const mesh = new BABYLON.Mesh(name, this._scene);
    
    // 设置顶点数据
    mesh.setVerticesData(BABYLON.VertexBuffer.PositionKind, data.positions, false);
    if (data.colors) {
      const floatColors = new Float32Array(data.colors.length);
      for (let i = 0; i < data.colors.length; i++) {
        floatColors[i] = data.colors[i] / 255.0;
      }
      mesh.setVerticesData(BABYLON.VertexBuffer.ColorKind, floatColors, false);
    }

    // 创建材质
    const material = new BABYLON.StandardMaterial(name + "_material", this._scene);
    material.emissiveColor = new BABYLON.Color3(1, 1, 1);
    material.pointSize = this._pointSize;
    material.disableLighting = true;
    material.alpha = 1.0;
    material.backFaceCulling = false;
    mesh.material = material;

    // 设置绘制模式为点
    mesh.isVisible = true;

    console.log('点云创建完成:', {
      vertexCount: data.count,
      pointSize: this._pointSize,
      hasColors: !!data.colors
    });

    return mesh;
  }
}

// PLY数据结构接口
interface PLYData {
  positions: Float32Array;
  colors?: Uint8Array;
  count: number;
} 