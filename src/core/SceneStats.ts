import * as BABYLON from '@babylonjs/core'

// 场景统计接口
export interface SceneStatistics {
  materialCount: number
  materialTypes: { [key: string]: number }
  geometryCount: number
  geometryTypes: { [key: string]: number }
  totalTriangles: number
  textureCount: number
  textureTypes: { [key: string]: number }
  meshCount: number
  nodeCount: number
  memoryUsage: {
    vertices: number
    indices: number
    textures: number
  }
}

// 材质信息接口
export interface MaterialInfo {
  name: string
  type: string
  id: string
  textureCount: number
}

// 几何体信息接口
export interface GeometryInfo {
  name: string
  type: string
  id: string
  vertices: number
  indices: number
  triangles: number
}

// 贴图信息接口
export interface TextureInfo {
  name: string
  type: string
  url: string
  size: { width: number, height: number }
  format: string
}

// 场景数据统计类
export class SceneStats {
  private _scene: BABYLON.Scene
  
  constructor(scene: BABYLON.Scene) {
    this._scene = scene
  }

  // 获取场景统计信息
  public getStatistics(): SceneStatistics {
    const materialStats = this._getMaterialStatistics()
    const geometryStats = this._getGeometryStatistics()
    const textureStats = this._getTextureStatistics()
    const triangleCount = this._getTotalTriangles()
    const memoryUsage = this._getMemoryUsage()

    return {
      materialCount: materialStats.count,
      materialTypes: materialStats.types,
      geometryCount: geometryStats.count,
      geometryTypes: geometryStats.types,
      totalTriangles: triangleCount,
      textureCount: textureStats.count,
      textureTypes: textureStats.types,
      meshCount: this._scene.meshes.length,
      nodeCount: this._scene.getNodes().length,
      memoryUsage: memoryUsage
    }
  }

  // 获取详细的材质信息
  public getMaterialDetails(): MaterialInfo[] {
    const materials: MaterialInfo[] = []
    
    this._scene.materials.forEach(material => {
      const textureCount = this._countMaterialTextures(material)
      
      materials.push({
        name: material.name || 'Unnamed Material',
        type: material.getClassName(),
        id: material.id,
        textureCount: textureCount
      })
    })

    return materials
  }

  // 获取详细的几何体信息
  public getGeometryDetails(): GeometryInfo[] {
    const geometries: GeometryInfo[] = []
    
    this._scene.meshes.forEach(mesh => {
      if (mesh instanceof BABYLON.Mesh && mesh.geometry) {
        const geometry = mesh.geometry
        const vertices = geometry.getTotalVertices()
        const indices = geometry.getTotalIndices()
        const triangles = indices > 0 ? Math.floor(indices / 3) : 0

        geometries.push({
          name: mesh.name || 'Unnamed Mesh',
          type: mesh.getClassName(),
          id: mesh.id,
          vertices: vertices,
          indices: indices,
          triangles: triangles
        })
      }
    })

    return geometries
  }

  // 获取详细的贴图信息
  public getTextureDetails(): TextureInfo[] {
    const textures: TextureInfo[] = []
    const processedTextures = new Set<string>()
    
    this._scene.textures.forEach(texture => {
      if (!processedTextures.has(texture.uid)) {
        processedTextures.add(texture.uid)
        
        textures.push({
          name: texture.name || 'Unnamed Texture',
          type: texture.getClassName(),
          url: (texture as any).url || '',
          size: {
            width: texture.getSize().width,
            height: texture.getSize().height
          },
          format: this._getTextureFormat(texture)
        })
      }
    })

    return textures
  }

  // 打印统计信息到控制台
  public printStatistics(): void {
    const stats = this.getStatistics()
    
    console.group('🎬 场景统计信息')
    
    console.group('📊 基本统计')
    console.log(`节点总数: ${stats.nodeCount}`)
    console.log(`网格数量: ${stats.meshCount}`)
    console.log(`总三角面数: ${stats.totalTriangles.toLocaleString()}`)
    console.groupEnd()

    console.group('🎨 材质统计')
    console.log(`材质总数: ${stats.materialCount}`)
    Object.entries(stats.materialTypes).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`)
    })
    console.groupEnd()

    console.group('📐 几何体统计')
    console.log(`几何体总数: ${stats.geometryCount}`)
    Object.entries(stats.geometryTypes).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`)
    })
    console.groupEnd()

    console.group('🖼️ 贴图统计')
    console.log(`贴图总数: ${stats.textureCount}`)
    Object.entries(stats.textureTypes).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`)
    })
    console.groupEnd()

    console.group('💾 内存使用')
    console.log(`顶点数据: ${(stats.memoryUsage.vertices / 1024 / 1024).toFixed(2)} MB`)
    console.log(`索引数据: ${(stats.memoryUsage.indices / 1024 / 1024).toFixed(2)} MB`)
    console.log(`贴图数据: ${(stats.memoryUsage.textures / 1024 / 1024).toFixed(2)} MB`)
    console.log(`总计: ${((stats.memoryUsage.vertices + stats.memoryUsage.indices + stats.memoryUsage.textures) / 1024 / 1024).toFixed(2)} MB`)
    console.groupEnd()

    console.groupEnd()
  }

  // 获取材质统计
  private _getMaterialStatistics(): { count: number, types: { [key: string]: number } } {
    const types: { [key: string]: number } = {}
    
    this._scene.materials.forEach(material => {
      const className = material.getClassName()
      types[className] = (types[className] || 0) + 1
    })

    return {
      count: this._scene.materials.length,
      types: types
    }
  }

  // 获取几何体统计
  private _getGeometryStatistics(): { count: number, types: { [key: string]: number } } {
    const types: { [key: string]: number } = {}
    let count = 0
    
    this._scene.meshes.forEach(mesh => {
      if (mesh instanceof BABYLON.Mesh && mesh.geometry) {
        count++
        const className = mesh.getClassName()
        types[className] = (types[className] || 0) + 1
      }
    })

    return {
      count: count,
      types: types
    }
  }

  // 获取贴图统计
  private _getTextureStatistics(): { count: number, types: { [key: string]: number } } {
    const types: { [key: string]: number } = {}
    const uniqueTextures = new Set<string>()
    
    this._scene.textures.forEach(texture => {
      if (!uniqueTextures.has(texture.uid)) {
        uniqueTextures.add(texture.uid)
        const className = texture.getClassName()
        types[className] = (types[className] || 0) + 1
      }
    })

    return {
      count: uniqueTextures.size,
      types: types
    }
  }

  // 计算总三角面数
  private _getTotalTriangles(): number {
    let totalTriangles = 0
    
    this._scene.meshes.forEach(mesh => {
      if (mesh instanceof BABYLON.Mesh && mesh.geometry) {
        const indices = mesh.geometry.getTotalIndices()
        totalTriangles += indices > 0 ? Math.floor(indices / 3) : 0
      }
    })

    return totalTriangles
  }

  // 计算材质中的贴图数量
  private _countMaterialTextures(material: BABYLON.Material): number {
    let count = 0
    
    // 检查常见的贴图属性
    const textureProperties = [
      'diffuseTexture', 'emissiveTexture', 'specularTexture', 'normalTexture',
      'bumpTexture', 'ambientTexture', 'opacityTexture', 'reflectionTexture',
      'lightmapTexture', 'refractionTexture', 'metallicTexture', 'roughnessTexture',
      'baseTexture', 'normalTexture', 'metallicRoughnessTexture', 'occlusionTexture'
    ]
    
    textureProperties.forEach(prop => {
      if ((material as any)[prop] && (material as any)[prop] instanceof BABYLON.BaseTexture) {
        count++
      }
    })

    return count
  }

  // 获取贴图格式
  private _getTextureFormat(texture: BABYLON.BaseTexture): string {
    if (texture instanceof BABYLON.Texture) {
      // 尝试从URL获取格式
      const url = texture.url
      if (url) {
        const extension = url.split('.').pop()?.toLowerCase()
        return extension || 'unknown'
      }
    }
    return 'unknown'
  }

  // 估算内存使用
  private _getMemoryUsage(): { vertices: number, indices: number, textures: number } {
    let verticesMemory = 0
    let indicesMemory = 0
    let texturesMemory = 0

    // 计算顶点和索引内存
    this._scene.meshes.forEach(mesh => {
      if (mesh instanceof BABYLON.Mesh && mesh.geometry) {
        const geometry = mesh.geometry
        const vertices = geometry.getTotalVertices()
        const indices = geometry.getTotalIndices()
        
        // 假设每个顶点包含位置(3)+法线(3)+UV(2) = 8个float = 32字节
        verticesMemory += vertices * 32
        
        // 每个索引4字节
        indicesMemory += indices * 4
      }
    })

    // 计算贴图内存（估算）
    const processedTextures = new Set<string>()
    this._scene.textures.forEach(texture => {
      if (!processedTextures.has(texture.uid)) {
        processedTextures.add(texture.uid)
        const size = texture.getSize()
        // 假设RGBA格式，每像素4字节
        texturesMemory += size.width * size.height * 4
      }
    })

    return {
      vertices: verticesMemory,
      indices: indicesMemory,
      textures: texturesMemory
    }
  }
} 