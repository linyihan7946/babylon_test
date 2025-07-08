import * as BABYLON from '@babylonjs/core'

// 网格实例化配置接口
export interface InstancerConfig {
  minInstanceCount: number     // 最小实例数量阈值
  preserveHierarchy: boolean   // 是否保持层级结构
  preserveAnimations: boolean  // 是否保持动画
  mergeSubMeshes: boolean     // 是否合并子网格
}

// 网格组信息接口
export interface MeshGroup {
  geometryId: string
  materialId: string
  meshes: BABYLON.Mesh[]
  instancedMesh?: BABYLON.InstancedMesh[]
  masterMesh?: BABYLON.Mesh
}

// 实例化结果接口
export interface InstancerResult {
  originalMeshCount: number
  optimizedMeshCount: number
  instancedGroups: MeshGroup[]
  totalInstancesCreated: number
  memoryReduction: string
}

// 网格实例化器类
export class MeshInstancer {
  private _scene: BABYLON.Scene
  private _config: InstancerConfig

  constructor(scene: BABYLON.Scene, config?: Partial<InstancerConfig>) {
    this._scene = scene
    this._config = {
      minInstanceCount: 2,        // 至少2个相同网格才实例化
      preserveHierarchy: true,    // 保持层级结构
      preserveAnimations: false,  // 默认不保持动画
      mergeSubMeshes: false,      // 默认不合并子网格
      ...config
    }
  }

  // 执行网格实例化优化
  public createInstances(): InstancerResult {
    console.log('🔧 开始网格实例化优化...')
    
    const meshGroups = this._analyzeMeshes()
    const originalMeshCount = this._scene.meshes.length
    
    console.log(`📊 发现 ${originalMeshCount} 个网格`)
    
    const instancedGroups = this._createInstanceGroups(meshGroups)
    const totalInstancesCreated = instancedGroups.reduce((sum, group) => 
      sum + (group.instancedMesh?.length || 0), 0
    )
    
    const optimizedMeshCount = this._scene.meshes.length
    const memoryReduction = this._calculateMemoryReduction(originalMeshCount, optimizedMeshCount)
    
    console.log(`✅ 网格实例化完成: ${originalMeshCount} → ${optimizedMeshCount} 个网格`)
    console.log(`🎯 创建了 ${totalInstancesCreated} 个实例`)
    
    return {
      originalMeshCount,
      optimizedMeshCount,
      instancedGroups,
      totalInstancesCreated,
      memoryReduction
    }
  }

  // 分析场景中的网格
  private _analyzeMeshes(): MeshGroup[] {
    const groupMap = new Map<string, MeshGroup>()
    
    // 遍历所有网格，按几何体和材质分组
    this._scene.meshes.forEach(mesh => {
      if (!(mesh instanceof BABYLON.Mesh) || !mesh.geometry) {
        return
      }
      
      // 跳过已经是实例的网格
      if (mesh instanceof BABYLON.InstancedMesh) {
        return
      }
      
      const geometryId = mesh.geometry.id || 'unknown'
      const materialId = mesh.material?.id || 'no-material'
      const groupKey = `${geometryId}_${materialId}`
      
      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, {
          geometryId,
          materialId,
          meshes: [],
          instancedMesh: [],
          masterMesh: undefined
        })
      }
      
      groupMap.get(groupKey)!.meshes.push(mesh)
    })
    
    // 只返回符合最小实例数量要求的组
    return Array.from(groupMap.values()).filter(group => 
      group.meshes.length >= this._config.minInstanceCount
    )
  }

  // 创建实例组
  private _createInstanceGroups(meshGroups: MeshGroup[]): MeshGroup[] {
    const instancedGroups: MeshGroup[] = []
    
    meshGroups.forEach((group, index) => {
      console.log(`🔗 实例化组 ${index + 1}: ${group.meshes.length} 个网格`)
      
      // 选择第一个网格作为主网格
      const masterMesh = group.meshes[0]
      group.masterMesh = masterMesh
      
      // 为其他网格创建实例
      const instances: BABYLON.InstancedMesh[] = []
      
      for (let i = 1; i < group.meshes.length; i++) {
        const sourceMesh = group.meshes[i]
        
        // 创建实例
        const instance = masterMesh.createInstance(`${masterMesh.name}_instance_${i}`)
        
        // 复制变换矩阵
        instance.position = sourceMesh.position.clone()
        instance.rotation = sourceMesh.rotation.clone()
        instance.scaling = sourceMesh.scaling.clone()
        
        // 复制其他属性
        instance.isVisible = sourceMesh.isVisible
        instance.isPickable = sourceMesh.isPickable
        instance.checkCollisions = sourceMesh.checkCollisions
        
        // 如果需要保持层级结构
        if (this._config.preserveHierarchy && sourceMesh.parent) {
          instance.parent = sourceMesh.parent
        }
        
        // 复制自定义属性
        this._copyCustomProperties(sourceMesh, instance)
        
        instances.push(instance)
        
        // 删除原网格
        sourceMesh.dispose()
      }
      
      group.instancedMesh = instances
      instancedGroups.push(group)
    })
    
    return instancedGroups
  }

  // 复制自定义属性
  private _copyCustomProperties(source: BABYLON.Mesh, target: BABYLON.InstancedMesh): void {
    // 复制用户数据
    if (source.metadata) {
      target.metadata = JSON.parse(JSON.stringify(source.metadata))
    }
    
    // 复制标签
    if ((source as any).tags) {
      (target as any).tags = (source as any).tags
    }
    
    // 复制自定义属性
    const customProps = ['userData', 'customData', 'gameObject']
    customProps.forEach(prop => {
      if ((source as any)[prop]) {
        (target as any)[prop] = (source as any)[prop]
      }
    })
  }

  // 计算内存减少估算
  private _calculateMemoryReduction(originalCount: number, optimizedCount: number): string {
    const reduction = originalCount - optimizedCount
    const percentage = ((reduction / originalCount) * 100).toFixed(1)
    return `减少 ${reduction} 个网格 (${percentage}%)`
  }

  // 获取优化建议
  public getOptimizationSuggestions(): string[] {
    const meshGroups = this._analyzeMeshes()
    const suggestions: string[] = []
    
    const totalMeshes = this._scene.meshes.filter(m => 
      m instanceof BABYLON.Mesh && 
      !(m instanceof BABYLON.InstancedMesh) && 
      m.geometry
    ).length
    
    suggestions.push(`📊 发现 ${totalMeshes} 个可分析的网格`)
    
    if (meshGroups.length === 0) {
      suggestions.push(`✅ 未发现可实例化的网格组`)
      suggestions.push(`💡 建议：相同几何体和材质的网格数量少于 ${this._config.minInstanceCount} 个`)
    } else {
      let totalInstances = 0
      meshGroups.forEach((group, index) => {
        suggestions.push(`🔗 组 ${index + 1}: ${group.meshes.length} 个相同网格`)
        totalInstances += group.meshes.length - 1 // 主网格不算实例
      })
      
      suggestions.push(`💡 预计可创建 ${totalInstances} 个实例`)
      suggestions.push(`🎯 预计减少 ${totalInstances} 个网格对象`)
    }
    
    return suggestions
  }

  // 打印优化建议
  public printOptimizationSuggestions(): void {
    const suggestions = this.getOptimizationSuggestions()
    console.group('🔧 网格实例化建议')
    suggestions.forEach(suggestion => console.log(suggestion))
    console.groupEnd()
  }

  // 反向操作：将实例转回独立网格
  public revertInstancing(): void {
    console.log('🔄 开始还原实例化网格...')
    
    const instances = this._scene.meshes.filter(mesh => 
      mesh instanceof BABYLON.InstancedMesh
    ) as BABYLON.InstancedMesh[]
    
    let revertedCount = 0
    
    instances.forEach(instance => {
      const sourceMesh = instance.sourceMesh
      
      if (sourceMesh) {
        // 创建新的独立网格
        const newMesh = sourceMesh.clone(`${instance.name}_reverted`, instance.parent)
        
        if (newMesh instanceof BABYLON.Mesh) {
          // 复制变换
          newMesh.position = instance.position.clone()
          newMesh.rotation = instance.rotation.clone()
          newMesh.scaling = instance.scaling.clone()
          
          // 复制属性
          newMesh.isVisible = instance.isVisible
          newMesh.isPickable = instance.isPickable
          newMesh.checkCollisions = instance.checkCollisions
          
          // 复制自定义属性
          if (instance.metadata) {
            newMesh.metadata = JSON.parse(JSON.stringify(instance.metadata))
          }
          
          revertedCount++
        }
      }
      
      // 删除实例
      instance.dispose()
    })
    
    console.log(`✅ 还原完成: 创建了 ${revertedCount} 个独立网格`)
  }
} 