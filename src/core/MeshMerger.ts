import * as BABYLON from '@babylonjs/core'

// 网格合并配置接口
export interface MergerConfig {
  preserveOriginalMeshes: boolean  // 是否保留原始网格
  mergeLimitPerGroup: number       // 每组最大合并数量
  respectHierarchy: boolean        // 是否考虑层级结构
  mergeCollisionMeshes: boolean    // 是否合并碰撞网格
  createBoundingBoxes: boolean     // 是否为合并后的网格创建边界框
}

// 材质组信息接口
export interface MaterialGroup {
  materialId: string
  material: BABYLON.Material | null
  meshes: BABYLON.Mesh[]
  mergedMesh?: BABYLON.Mesh
  originalVertexCount: number
  mergedVertexCount: number
}

// 合并结果接口
export interface MergeResult {
  originalMeshCount: number
  mergedMeshCount: number
  materialGroups: MaterialGroup[]
  totalVertexReduction: number
  memoryReduction: string
  performanceGain: string
}

// 网格合并器类
export class MeshMerger {
  private _scene: BABYLON.Scene
  private _config: MergerConfig

  constructor(scene: BABYLON.Scene, config?: Partial<MergerConfig>) {
    this._scene = scene
    this._config = {
      preserveOriginalMeshes: false,   // 默认删除原始网格
      mergeLimitPerGroup: 1000,        // 每组最多合并1000个网格
      respectHierarchy: true,          // 考虑层级结构
      mergeCollisionMeshes: false,     // 默认不合并碰撞网格
      createBoundingBoxes: true,       // 创建边界框
      ...config
    }
  }

  // 执行网格合并优化
  public mergeMeshes(): MergeResult {
    console.log('🔧 开始网格合并优化...')
    
    const materialGroups = this._analyzeMeshesByMaterial()
    const originalMeshCount = this._getMergeableMeshCount()
    
    console.log(`📊 发现 ${originalMeshCount} 个可合并网格`)
    console.log(`🎨 按材质分为 ${materialGroups.length} 组`)
    
    const mergedGroups = this._mergeMaterialGroups(materialGroups)
    const mergedMeshCount = mergedGroups.filter(g => g.mergedMesh).length
    
    const totalVertexReduction = this._calculateVertexReduction(mergedGroups)
    const memoryReduction = this._calculateMemoryReduction(originalMeshCount, mergedMeshCount)
    const performanceGain = this._estimatePerformanceGain(originalMeshCount, mergedMeshCount)
    
    console.log(`✅ 网格合并完成: ${originalMeshCount} → ${mergedMeshCount} 个网格`)
    console.log(`🎯 顶点减少: ${totalVertexReduction.toLocaleString()}`)
    
    return {
      originalMeshCount,
      mergedMeshCount,
      materialGroups: mergedGroups,
      totalVertexReduction,
      memoryReduction,
      performanceGain
    }
  }

  // 按材质分析网格
  private _analyzeMeshesByMaterial(): MaterialGroup[] {
    const materialMap = new Map<string, MaterialGroup>()
    
    // 遍历所有可合并的网格
    this._scene.meshes.forEach(mesh => {
      if (!this._isMeshMergeable(mesh)) {
        return
      }
      
      const materialId = mesh.material?.id || 'no-material'
      
      if (!materialMap.has(materialId)) {
        materialMap.set(materialId, {
          materialId,
          material: mesh.material,
          meshes: [],
          originalVertexCount: 0,
          mergedVertexCount: 0
        })
      }
      
      const group = materialMap.get(materialId)!
      group.meshes.push(mesh as BABYLON.Mesh)
      group.originalVertexCount += (mesh as BABYLON.Mesh).getTotalVertices()
    })
    
    // 过滤掉只有一个网格的组，并检查顶点属性兼容性
    return Array.from(materialMap.values()).filter(group => {
      if (group.meshes.length <= 1) {
        return false
      }
      
      // 检查是否所有网格都有有效的几何体
      const validMeshes = group.meshes.filter(mesh => 
        mesh.geometry && mesh.getTotalVertices() > 0
      )
      
      if (validMeshes.length !== group.meshes.length) {
        console.warn(`⚠️ 材质组 ${group.materialId} 中有网格缺少有效几何体`)
        group.meshes = validMeshes
      }
      
      return group.meshes.length > 1
    })
  }

  // 判断网格是否可以合并
  private _isMeshMergeable(mesh: BABYLON.AbstractMesh): boolean {
    // 必须是Mesh类型
    if (!(mesh instanceof BABYLON.Mesh)) {
      return false
    }
    
    // 必须有几何体
    if (!mesh.geometry) {
      return false
    }
    
    // 跳过实例网格
    if (mesh instanceof BABYLON.InstancedMesh) {
      return false
    }
    
    // 如果不合并碰撞网格，跳过带碰撞的网格
    if (!this._config.mergeCollisionMeshes && mesh.checkCollisions) {
      return false
    }
    
    // 跳过不可见的网格
    if (!mesh.isVisible) {
      return false
    }
    
    // 跳过有动画的网格
    if (mesh.animations && mesh.animations.length > 0) {
      return false
    }
    
    return true
  }

  // 合并材质组
  private _mergeMaterialGroups(materialGroups: MaterialGroup[]): MaterialGroup[] {
    const mergedGroups: MaterialGroup[] = []
    
    materialGroups.forEach((group, index) => {
      console.log(`🔗 合并材质组 ${index + 1}: ${group.meshes.length} 个网格`)
      
      try {
        // 如果网格数量超过限制，分批合并
        if (group.meshes.length > this._config.mergeLimitPerGroup) {
          const batches = this._splitIntoBatches(group.meshes, this._config.mergeLimitPerGroup)
          
          batches.forEach((batch, batchIndex) => {
            const batchGroup: MaterialGroup = {
              materialId: `${group.materialId}_batch_${batchIndex}`,
              material: group.material,
              meshes: batch,
              originalVertexCount: batch.reduce((sum, m) => sum + m.getTotalVertices(), 0),
              mergedVertexCount: 0
            }
            
            const mergedMesh = this._mergeMeshGroup(batchGroup, batchIndex)
            if (mergedMesh) {
              batchGroup.mergedMesh = mergedMesh
              batchGroup.mergedVertexCount = mergedMesh.getTotalVertices()
            }
            
            mergedGroups.push(batchGroup)
          })
        } else {
          const mergedMesh = this._mergeMeshGroup(group, index)
          if (mergedMesh) {
            group.mergedMesh = mergedMesh
            group.mergedVertexCount = mergedMesh.getTotalVertices()
          }
          mergedGroups.push(group)
        }
      } catch (error) {
        console.warn(`⚠️ 合并材质组 ${index + 1} 失败:`, error)
        mergedGroups.push(group) // 保留原始组
      }
    })
    
    return mergedGroups
  }

  // 合并单个材质组
  private _mergeMeshGroup(group: MaterialGroup, groupIndex: number): BABYLON.Mesh | null {
    try {
      // 标准化网格顶点属性
      const normalizedMeshes = this._normalizeVertexAttributes(group.meshes)
      
      // 使用Babylon.js的MergeMeshes方法
      const mergedMesh = BABYLON.Mesh.MergeMeshes(
        normalizedMeshes,
        true,  // disposeSource - 是否删除源网格
        true,  // allow32BitsIndices - 允许32位索引
        undefined, // meshSubclass
        false, // subdivideWithSubMeshes - 不使用子网格细分
        true   // multiMultiMaterials - 支持多材质
      )
      
      if (!mergedMesh) {
        console.warn(`⚠️ 材质组 ${groupIndex + 1} 合并失败`)
        return null
      }
      
      // 设置合并后的网格名称和材质
      mergedMesh.name = `Merged_Material_${groupIndex + 1}`
      mergedMesh.id = `merged_${group.materialId}_${groupIndex}`
      
      if (group.material) {
        mergedMesh.material = group.material
      }
      
      // 如果不保留原始网格，删除它们
      if (!this._config.preserveOriginalMeshes) {
        group.meshes.forEach(mesh => {
          if (!mesh.isDisposed()) {
            mesh.dispose()
          }
        })
      }
      
      // 创建边界框
      if (this._config.createBoundingBoxes) {
        mergedMesh.refreshBoundingInfo()
      }
      
      // 复制第一个网格的一些属性
      if (group.meshes.length > 0) {
        const firstMesh = group.meshes[0]
        mergedMesh.isPickable = firstMesh.isPickable
        mergedMesh.checkCollisions = firstMesh.checkCollisions
        
        // 复制层级关系（如果需要）
        if (this._config.respectHierarchy && firstMesh.parent) {
          mergedMesh.parent = firstMesh.parent
        }
      }
      
      console.log(`✅ 成功合并 ${group.meshes.length} 个网格 → 1 个网格`)
      
      return mergedMesh
      
    } catch (error) {
      console.error(`❌ 合并网格组失败:`, error)
      return null
    }
  }

  // 标准化顶点属性
  private _normalizeVertexAttributes(meshes: BABYLON.Mesh[]): BABYLON.Mesh[] {
    if (meshes.length === 0) return meshes
    
    // 收集所有网格的顶点属性
    const allAttributes = new Set<string>()
    const meshAttributes: Map<BABYLON.Mesh, string[]> = new Map()
    
    meshes.forEach(mesh => {
      if (!mesh.geometry) return
      
      const attributes: string[] = []
      const vertexData = mesh.geometry.getVerticesData(BABYLON.VertexBuffer.PositionKind)
      if (vertexData) {
        attributes.push(BABYLON.VertexBuffer.PositionKind)
        allAttributes.add(BABYLON.VertexBuffer.PositionKind)
      }
      
      // 检查其他常见属性
      const commonAttributes = [
        BABYLON.VertexBuffer.NormalKind,
        BABYLON.VertexBuffer.UVKind,
        BABYLON.VertexBuffer.UV2Kind,
        BABYLON.VertexBuffer.ColorKind,
        BABYLON.VertexBuffer.TangentKind
      ]
      
      commonAttributes.forEach(attr => {
        const data = mesh.geometry!.getVerticesData(attr)
        if (data) {
          attributes.push(attr)
          allAttributes.add(attr)
        }
      })
      
      meshAttributes.set(mesh, attributes)
    })
    
    console.log(`🔍 发现顶点属性: ${Array.from(allAttributes).join(', ')}`)
    
    // 为每个网格补齐缺失的属性
    meshes.forEach(mesh => {
      if (!mesh.geometry) return
      
      const existingAttributes = meshAttributes.get(mesh) || []
      const missingAttributes = Array.from(allAttributes).filter(attr => 
        !existingAttributes.includes(attr)
      )
      
      if (missingAttributes.length > 0) {
        console.log(`📝 为网格 ${mesh.name} 补齐属性: ${missingAttributes.join(', ')}`)
        
        missingAttributes.forEach(attr => {
          this._addMissingVertexAttribute(mesh, attr)
        })
      }
    })
    
    return meshes
  }

  // 为网格添加缺失的顶点属性
  private _addMissingVertexAttribute(mesh: BABYLON.Mesh, attributeKind: string): void {
    if (!mesh.geometry) return
    
    const vertexCount = mesh.getTotalVertices()
    if (vertexCount === 0) return
    
    let defaultData: Float32Array | null = null
    
    switch (attributeKind) {
      case BABYLON.VertexBuffer.NormalKind:
        // 创建默认法线（向上）
        defaultData = new Float32Array(vertexCount * 3)
        for (let i = 0; i < vertexCount; i++) {
          defaultData[i * 3] = 0      // x
          defaultData[i * 3 + 1] = 1  // y (向上)
          defaultData[i * 3 + 2] = 0  // z
        }
        break
        
      case BABYLON.VertexBuffer.UVKind:
        // 创建默认UV坐标
        defaultData = new Float32Array(vertexCount * 2)
        for (let i = 0; i < vertexCount; i++) {
          defaultData[i * 2] = 0      // u
          defaultData[i * 2 + 1] = 0  // v
        }
        break
        
      case BABYLON.VertexBuffer.UV2Kind:
        // 创建默认第二套UV坐标
        defaultData = new Float32Array(vertexCount * 2)
        for (let i = 0; i < vertexCount; i++) {
          defaultData[i * 2] = 0      // u
          defaultData[i * 2 + 1] = 0  // v
        }
        break
        
      case BABYLON.VertexBuffer.ColorKind:
        // 创建默认颜色（白色）
        defaultData = new Float32Array(vertexCount * 4)
        for (let i = 0; i < vertexCount; i++) {
          defaultData[i * 4] = 1      // r
          defaultData[i * 4 + 1] = 1  // g
          defaultData[i * 4 + 2] = 1  // b
          defaultData[i * 4 + 3] = 1  // a
        }
        break
        
      case BABYLON.VertexBuffer.TangentKind:
        // 创建默认切线
        defaultData = new Float32Array(vertexCount * 4)
        for (let i = 0; i < vertexCount; i++) {
          defaultData[i * 4] = 1      // x
          defaultData[i * 4 + 1] = 0  // y
          defaultData[i * 4 + 2] = 0  // z
          defaultData[i * 4 + 3] = 1  // w
        }
        break
        
      default:
        console.warn(`⚠️ 不支持的顶点属性类型: ${attributeKind}`)
        return
    }
    
    if (defaultData) {
      mesh.geometry.setVerticesData(attributeKind, defaultData, false)
    }
  }

  // 将网格数组分批
  private _splitIntoBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = []
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize))
    }
    return batches
  }

  // 获取可合并网格数量
  private _getMergeableMeshCount(): number {
    return this._scene.meshes.filter(mesh => this._isMeshMergeable(mesh)).length
  }

  // 计算顶点减少量
  private _calculateVertexReduction(groups: MaterialGroup[]): number {
    return groups.reduce((total, group) => {
      return total + (group.originalVertexCount - group.mergedVertexCount)
    }, 0)
  }

  // 计算内存减少估算
  private _calculateMemoryReduction(originalCount: number, mergedCount: number): string {
    const reduction = originalCount - mergedCount
    const percentage = originalCount > 0 ? ((reduction / originalCount) * 100).toFixed(1) : '0'
    return `减少 ${reduction} 个网格对象 (${percentage}%)`
  }

  // 估算性能提升
  private _estimatePerformanceGain(originalCount: number, mergedCount: number): string {
    const drawCallReduction = originalCount - mergedCount
    const performanceGain = originalCount > 0 ? ((drawCallReduction / originalCount) * 100).toFixed(1) : '0'
    return `减少 ${drawCallReduction} 个绘制调用 (${performanceGain}% 性能提升)`
  }

  // 获取优化建议
  public getOptimizationSuggestions(): string[] {
    const materialGroups = this._analyzeMeshesByMaterial()
    const suggestions: string[] = []
    
    const totalMeshes = this._getMergeableMeshCount()
    suggestions.push(`📊 发现 ${totalMeshes} 个可合并网格`)
    
    if (materialGroups.length === 0) {
      suggestions.push(`✅ 未发现可合并的网格组`)
      suggestions.push(`💡 建议：确保有多个网格使用相同材质`)
    } else {
      suggestions.push(`🎨 可合并的材质组: ${materialGroups.length} 个`)
      
      let totalMergeableMeshes = 0
      materialGroups.forEach((group, index) => {
        suggestions.push(`  组 ${index + 1}: ${group.meshes.length} 个网格 (材质: ${group.material?.name || '无名称'})`)
        totalMergeableMeshes += group.meshes.length
      })
      
      const estimatedReduction = totalMergeableMeshes - materialGroups.length
      suggestions.push(`💡 预计减少 ${estimatedReduction} 个网格对象`)
      suggestions.push(`🚀 预计减少 ${estimatedReduction} 个绘制调用`)
    }
    
    return suggestions
  }

  // 打印优化建议
  public printOptimizationSuggestions(): void {
    const suggestions = this.getOptimizationSuggestions()
    console.group('🔧 网格合并建议')
    suggestions.forEach(suggestion => console.log(suggestion))
    console.groupEnd()
  }

  // 还原合并：将合并的网格重新分离（如果可能）
  public revertMerging(): void {
    console.log('🔄 开始还原网格合并...')
    
    // 查找所有合并的网格
    const mergedMeshes = this._scene.meshes.filter(mesh => 
      mesh.name.startsWith('Merged_Material_') && mesh instanceof BABYLON.Mesh
    ) as BABYLON.Mesh[]
    
    if (mergedMeshes.length === 0) {
      console.log('ℹ️ 未找到需要还原的合并网格')
      return
    }
    
    console.log(`⚠️ 注意：网格合并是不可逆操作`)
    console.log(`💡 如需还原，请重新加载原始场景`)
    console.log(`🗑️ 找到 ${mergedMeshes.length} 个合并网格，可以删除它们`)
    
    // 可选：删除所有合并的网格
    // mergedMeshes.forEach(mesh => mesh.dispose())
  }

  // 获取合并统计信息
  public getMergeStatistics(): any {
    const materialGroups = this._analyzeMeshesByMaterial()
    const mergedMeshes = this._scene.meshes.filter(mesh => 
      mesh.name.startsWith('Merged_Material_')
    )
    
    return {
      totalMaterials: this._scene.materials.length,
      mergeableGroups: materialGroups.length,
      currentMergedMeshes: mergedMeshes.length,
      potentialMeshReduction: materialGroups.reduce((sum, group) => 
        sum + (group.meshes.length - 1), 0
      )
    }
  }

  // 按材质分组显示网格信息
  public printMaterialGroupInfo(): void {
    const materialGroups = this._analyzeMeshesByMaterial()
    
    console.group('🎨 材质分组信息')
    materialGroups.forEach((group, index) => {
      console.group(`组 ${index + 1}: ${group.material?.name || '无名称材质'}`)
      console.log(`材质ID: ${group.materialId}`)
      console.log(`网格数量: ${group.meshes.length}`)
      console.log(`总顶点数: ${group.originalVertexCount.toLocaleString()}`)
      console.log('网格列表:')
      group.meshes.forEach((mesh, meshIndex) => {
        console.log(`  ${meshIndex + 1}. ${mesh.name} (${mesh.getTotalVertices()} 顶点)`)
      })
      console.groupEnd()
    })
    console.groupEnd()
  }
} 