import * as BABYLON from '@babylonjs/core'

// 材质比较配置接口
export interface MaterialCompareConfig {
  colorThreshold: number      // 颜色差异阈值 (0-1)
  alphaThreshold: number      // 透明度差异阈值 (0-1) 
  metallicThreshold: number   // 金属度差异阈值 (0-1)
  roughnessThreshold: number  // 粗糙度差异阈值 (0-1)
  compareTextures: boolean    // 是否比较贴图
  textureUrlComparison: boolean // 是否比较贴图URL
}

// 材质信息接口
export interface MaterialInfo {
  material: BABYLON.Material
  meshes: BABYLON.AbstractMesh[]
  hash: string
}

// 材质优化结果接口
export interface OptimizationResult {
  originalCount: number
  optimizedCount: number
  removedCount: number
  materialGroups: MaterialInfo[][]
  mergedMaterials: BABYLON.Material[]
}

// 材质优化器类
export class MaterialOptimizer {
  private _scene: BABYLON.Scene
  private _config: MaterialCompareConfig

  constructor(scene: BABYLON.Scene, config?: Partial<MaterialCompareConfig>) {
    this._scene = scene
    this._config = {
      colorThreshold: 0.1,      // 10% 颜色差异
      alphaThreshold: 0.05,     // 5% 透明度差异
      metallicThreshold: 0.1,   // 10% 金属度差异
      roughnessThreshold: 0.1,  // 10% 粗糙度差异
      compareTextures: true,    // 默认比较贴图
      textureUrlComparison: true, // 默认比较贴图URL
      ...config
    }
  }

  // 优化场景材质
  public optimizeMaterials(): OptimizationResult {
    console.log('🔧 开始材质优化...')
    
    const materialInfos = this._analyzeMaterials()
    const originalCount = materialInfos.length
    
    console.log(`📊 发现 ${originalCount} 个材质`)
    
    const materialGroups = this._groupSimilarMaterials(materialInfos)
    const mergedMaterials = this._mergeMaterialGroups(materialGroups)
    
    const optimizedCount = mergedMaterials.length
    const removedCount = originalCount - optimizedCount
    
    console.log(`✅ 材质优化完成: ${originalCount} → ${optimizedCount} (减少 ${removedCount} 个)`)
    
    return {
      originalCount,
      optimizedCount,
      removedCount,
      materialGroups,
      mergedMaterials
    }
  }

  // 分析场景中的材质使用情况
  private _analyzeMaterials(): MaterialInfo[] {
    const materialMap = new Map<string, MaterialInfo>()
    
    // 遍历所有网格，收集材质使用信息
    this._scene.meshes.forEach(mesh => {
      if (mesh.material) {
        const materialId = mesh.material.id
        
        if (!materialMap.has(materialId)) {
          materialMap.set(materialId, {
            material: mesh.material,
            meshes: [],
            hash: this._generateMaterialHash(mesh.material)
          })
        }
        
        materialMap.get(materialId)!.meshes.push(mesh)
      }
    })
    
    return Array.from(materialMap.values())
  }

  // 生成材质特征哈希
  private _generateMaterialHash(material: BABYLON.Material): string {
    const features: string[] = []
    
    // 添加材质类型
    features.push(material.getClassName())
    
    if (material instanceof BABYLON.StandardMaterial) {
      // 漫反射颜色
      if (material.diffuseColor) {
        features.push(`diff:${this._colorToString(material.diffuseColor)}`)
      }
      
      // 镜面反射颜色
      if (material.specularColor) {
        features.push(`spec:${this._colorToString(material.specularColor)}`)
      }
      
      // 自发光颜色
      if (material.emissiveColor) {
        features.push(`emit:${this._colorToString(material.emissiveColor)}`)
      }
      
      // 透明度
      features.push(`alpha:${material.alpha.toFixed(2)}`)
      
      // 贴图信息
      if (this._config.compareTextures) {
        this._addTextureFeatures(material, features)
      }
      
    } else if (material instanceof BABYLON.PBRMaterial) {
      // 基础颜色
      if (material.albedoColor) {
        features.push(`base:${this._colorToString(material.albedoColor)}`)
      }
      
      // 金属度
      features.push(`metal:${(material.metallic || 0).toFixed(2)}`)
      
      // 粗糙度
      features.push(`rough:${(material.roughness || 0).toFixed(2)}`)
      
      // 透明度
      features.push(`alpha:${material.alpha.toFixed(2)}`)
      
      // 贴图信息
      if (this._config.compareTextures) {
        this._addPBRTextureFeatures(material, features)
      }
    }
    
    return features.join('|')
  }

  // 添加标准材质贴图特征
  private _addTextureFeatures(material: BABYLON.StandardMaterial, features: string[]): void {
    const textures = [
      { name: 'diffuse', texture: material.diffuseTexture },
      { name: 'normal', texture: material.bumpTexture },
      { name: 'specular', texture: material.specularTexture },
      { name: 'emissive', texture: material.emissiveTexture }
    ]
    
    textures.forEach(({ name, texture }) => {
      if (texture) {
        if (this._config.textureUrlComparison && (texture as any).url) {
          features.push(`${name}:${(texture as any).url}`)
        } else {
          features.push(`${name}:${texture.uid}`)
        }
      }
    })
  }

  // 添加PBR材质贴图特征
  private _addPBRTextureFeatures(material: BABYLON.PBRMaterial, features: string[]): void {
    const textures = [
      { name: 'albedo', texture: material.albedoTexture },
      { name: 'normal', texture: material.bumpTexture },
      { name: 'metallic', texture: material.metallicTexture },
      { name: 'roughness', texture: material.microSurfaceTexture },
      { name: 'occlusion', texture: material.ambientTexture }
    ]
    
    textures.forEach(({ name, texture }) => {
      if (texture) {
        if (this._config.textureUrlComparison && (texture as any).url) {
          features.push(`${name}:${(texture as any).url}`)
        } else {
          features.push(`${name}:${texture.uid}`)
        }
      }
    })
  }

  // 颜色转字符串
  private _colorToString(color: BABYLON.Color3): string {
    return `${color.r.toFixed(2)},${color.g.toFixed(2)},${color.b.toFixed(2)}`
  }

  // 分组相似材质
  private _groupSimilarMaterials(materialInfos: MaterialInfo[]): MaterialInfo[][] {
    const groups: MaterialInfo[][] = []
    const processed = new Set<string>()
    
    materialInfos.forEach(info => {
      if (processed.has(info.material.id)) return
      
      const group = [info]
      processed.add(info.material.id)
      
      // 查找相似材质
      materialInfos.forEach(otherInfo => {
        if (processed.has(otherInfo.material.id)) return
        
        if (this._areMaterialsSimilar(info.material, otherInfo.material)) {
          group.push(otherInfo)
          processed.add(otherInfo.material.id)
        }
      })
      
      groups.push(group)
    })
    
    return groups
  }

  // 判断两个材质是否相似
  private _areMaterialsSimilar(mat1: BABYLON.Material, mat2: BABYLON.Material): boolean {
    // 类型必须相同
    if (mat1.getClassName() !== mat2.getClassName()) {
      return false
    }
    
    if (mat1 instanceof BABYLON.StandardMaterial && mat2 instanceof BABYLON.StandardMaterial) {
      return this._compareStandardMaterials(mat1, mat2)
    } else if (mat1 instanceof BABYLON.PBRMaterial && mat2 instanceof BABYLON.PBRMaterial) {
      return this._comparePBRMaterials(mat1, mat2)
    }
    
    return false
  }

  // 比较标准材质
  private _compareStandardMaterials(mat1: BABYLON.StandardMaterial, mat2: BABYLON.StandardMaterial): boolean {
    // 比较颜色
    if (!this._compareColors(mat1.diffuseColor, mat2.diffuseColor, this._config.colorThreshold)) {
      return false
    }
    
    if (!this._compareColors(mat1.specularColor, mat2.specularColor, this._config.colorThreshold)) {
      return false
    }
    
    if (!this._compareColors(mat1.emissiveColor, mat2.emissiveColor, this._config.colorThreshold)) {
      return false
    }
    
    // 比较透明度
    if (Math.abs(mat1.alpha - mat2.alpha) > this._config.alphaThreshold) {
      return false
    }
    
    // 比较贴图
    if (this._config.compareTextures) {
      return this._compareStandardTextures(mat1, mat2)
    }
    
    return true
  }

  // 比较PBR材质
  private _comparePBRMaterials(mat1: BABYLON.PBRMaterial, mat2: BABYLON.PBRMaterial): boolean {
    // 比较基础颜色
    if (!this._compareColors(mat1.albedoColor, mat2.albedoColor, this._config.colorThreshold)) {
      return false
    }
    
    // 比较金属度
    if (Math.abs((mat1.metallic || 0) - (mat2.metallic || 0)) > this._config.metallicThreshold) {
      return false
    }
    
    // 比较粗糙度
    if (Math.abs((mat1.roughness || 0) - (mat2.roughness || 0)) > this._config.roughnessThreshold) {
      return false
    }
    
    // 比较透明度
    if (Math.abs(mat1.alpha - mat2.alpha) > this._config.alphaThreshold) {
      return false
    }
    
    // 比较贴图
    if (this._config.compareTextures) {
      return this._comparePBRTextures(mat1, mat2)
    }
    
    return true
  }

  // 比较颜色
  private _compareColors(color1: BABYLON.Color3, color2: BABYLON.Color3, threshold: number): boolean {
    if (!color1 && !color2) return true
    if (!color1 || !color2) return false
    
    const diff = Math.abs(color1.r - color2.r) + Math.abs(color1.g - color2.g) + Math.abs(color1.b - color2.b)
    return diff <= threshold * 3 // 乘以3因为有三个颜色分量
  }

  // 比较标准材质贴图
  private _compareStandardTextures(mat1: BABYLON.StandardMaterial, mat2: BABYLON.StandardMaterial): boolean {
    const textures1 = [mat1.diffuseTexture, mat1.bumpTexture, mat1.specularTexture, mat1.emissiveTexture]
    const textures2 = [mat2.diffuseTexture, mat2.bumpTexture, mat2.specularTexture, mat2.emissiveTexture]
    
    return this._compareTextureArrays(textures1, textures2)
  }

  // 比较PBR材质贴图
  private _comparePBRTextures(mat1: BABYLON.PBRMaterial, mat2: BABYLON.PBRMaterial): boolean {
    const textures1 = [mat1.albedoTexture, mat1.bumpTexture, mat1.metallicTexture, mat1.microSurfaceTexture, mat1.ambientTexture]
    const textures2 = [mat2.albedoTexture, mat2.bumpTexture, mat2.metallicTexture, mat2.microSurfaceTexture, mat2.ambientTexture]
    
    return this._compareTextureArrays(textures1, textures2)
  }

  // 比较贴图数组
  private _compareTextureArrays(textures1: (BABYLON.BaseTexture | null)[], textures2: (BABYLON.BaseTexture | null)[]): boolean {
    for (let i = 0; i < textures1.length; i++) {
      const tex1 = textures1[i]
      const tex2 = textures2[i]
      
      if (!tex1 && !tex2) continue
      if (!tex1 || !tex2) return false
      
      if (this._config.textureUrlComparison) {
        const url1 = (tex1 as any).url || ''
        const url2 = (tex2 as any).url || ''
        if (url1 !== url2) return false
      } else {
        if (tex1.uid !== tex2.uid) return false
      }
    }
    
    return true
  }

  // 合并材质组
  private _mergeMaterialGroups(groups: MaterialInfo[][]): BABYLON.Material[] {
    const mergedMaterials: BABYLON.Material[] = []
    
    groups.forEach((group, index) => {
      if (group.length === 1) {
        // 单个材质，不需要合并
        mergedMaterials.push(group[0].material)
      } else {
        // 多个相似材质，合并为一个
        console.log(`🔗 合并材质组 ${index + 1}: ${group.length} 个材质 → 1 个`)
        
        const masterMaterial = group[0].material
        const mergedMaterial = this._createMergedMaterial(masterMaterial, `Merged_${index + 1}`)
        
        // 将所有网格的材质替换为合并后的材质
        group.forEach(info => {
          info.meshes.forEach(mesh => {
            mesh.material = mergedMaterial
          })
          
          // 删除原材质（除了主材质）
          if (info.material !== masterMaterial) {
            info.material.dispose()
          }
        })
        
        mergedMaterials.push(mergedMaterial)
      }
    })
    
    return mergedMaterials
  }

  // 创建合并后的材质
  private _createMergedMaterial(sourceMaterial: BABYLON.Material, name: string): BABYLON.Material {
    if (sourceMaterial instanceof BABYLON.StandardMaterial) {
      const merged = new BABYLON.StandardMaterial(name, this._scene)
      
      // 复制属性
      merged.diffuseColor = sourceMaterial.diffuseColor.clone()
      merged.specularColor = sourceMaterial.specularColor.clone()
      merged.emissiveColor = sourceMaterial.emissiveColor.clone()
      merged.alpha = sourceMaterial.alpha
      
      // 复制贴图
      merged.diffuseTexture = sourceMaterial.diffuseTexture
      merged.bumpTexture = sourceMaterial.bumpTexture
      merged.specularTexture = sourceMaterial.specularTexture
      merged.emissiveTexture = sourceMaterial.emissiveTexture
      
      return merged
    } else if (sourceMaterial instanceof BABYLON.PBRMaterial) {
      const merged = new BABYLON.PBRMaterial(name, this._scene)
      
      // 复制属性
      merged.albedoColor = sourceMaterial.albedoColor.clone()
      merged.metallic = sourceMaterial.metallic
      merged.roughness = sourceMaterial.roughness
      merged.alpha = sourceMaterial.alpha
      
      // 复制贴图
      merged.albedoTexture = sourceMaterial.albedoTexture
      merged.bumpTexture = sourceMaterial.bumpTexture
      merged.metallicTexture = sourceMaterial.metallicTexture
      merged.microSurfaceTexture = sourceMaterial.microSurfaceTexture
      merged.ambientTexture = sourceMaterial.ambientTexture
      
      return merged
    }
    
    // 默认返回原材质的克隆
    const cloned = sourceMaterial.clone(name)
    return cloned || sourceMaterial
  }

  // 获取优化建议
  public getOptimizationSuggestions(): string[] {
    const materialInfos = this._analyzeMaterials()
    const suggestions: string[] = []
    
    // 统计材质类型
    const typeCount = new Map<string, number>()
    materialInfos.forEach(info => {
      const type = info.material.getClassName()
      typeCount.set(type, (typeCount.get(type) || 0) + 1)
    })
    
    suggestions.push(`📊 发现 ${materialInfos.length} 个材质`)
    typeCount.forEach((count, type) => {
      suggestions.push(`  - ${type}: ${count} 个`)
    })
    
    // 分析潜在的合并机会
    const groups = this._groupSimilarMaterials(materialInfos)
    const mergableGroups = groups.filter(group => group.length > 1)
    
    if (mergableGroups.length > 0) {
      suggestions.push(`🔗 可合并的材质组: ${mergableGroups.length} 个`)
      const totalReduction = mergableGroups.reduce((sum, group) => sum + (group.length - 1), 0)
      suggestions.push(`💡 预计可减少 ${totalReduction} 个材质`)
    } else {
      suggestions.push(`✅ 未发现可合并的材质`)
    }
    
    return suggestions
  }
} 