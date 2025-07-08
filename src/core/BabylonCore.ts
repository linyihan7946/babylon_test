import { Engine, Scene, Vector3, HemisphericLight, MeshBuilder, UniversalCamera, ArcRotateCamera, WebGPUEngine, Mesh, StandardMaterial, Color3 } from '@babylonjs/core'
import { SPZLoader } from './SPZLoader'
import { PLYLoader } from './PLYLoader'
import { GltfLoader } from './GltfLoader'
import { Geometry } from './Geometry'
import { SceneStats } from './SceneStats'
import { MaterialOptimizer, MaterialCompareConfig, OptimizationResult } from './MaterialOptimizer'
import { MeshInstancer, InstancerConfig, InstancerResult } from './MeshInstancer'
import { MeshMerger, MergerConfig, MergeResult } from './MeshMerger'

export class BabylonCore {
  private engine!: Engine | WebGPUEngine
  private scene!: Scene
  private canvas: HTMLCanvasElement
  public ready: Promise<void>
  private spzLoader!: SPZLoader
  private plyLoader!: PLYLoader
  private arcRotateCamera!: ArcRotateCamera
  private universalCamera!: UniversalCamera
  private cameraType: 'arcRotate' | 'universal' = 'universal'
  private fpsElement!: HTMLDivElement
  private lastFrameTime: number = 0
  private frameCount: number = 0
  private sceneStats!: SceneStats
  private materialOptimizer!: MaterialOptimizer
  private meshInstancer!: MeshInstancer
  private meshMerger!: MeshMerger
  


  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ready = this.init()
  }

  private async init() {
    await this.initEngine()
    this.scene = new Scene(this.engine)
    this.spzLoader = new SPZLoader(this.scene)
    this.plyLoader = new PLYLoader(this.scene)
    this.sceneStats = new SceneStats(this.scene)
    this.materialOptimizer = new MaterialOptimizer(this.scene)
    this.meshInstancer = new MeshInstancer(this.scene)
    this.meshMerger = new MeshMerger(this.scene)
    this.initScene()
    this.createFPSDisplay()
  }

  private async initEngine() {
    try {
      // 直接使用WebGL2.0引擎
      this.engine = new Engine(this.canvas, true, {
        antialias: true,
        adaptToDeviceRatio: true,
        powerPreference: "high-performance"
      });
      console.log('WebGL2.0引擎初始化成功');
    } catch (error) {
      console.error('WebGL2.0引擎初始化失败:', error);
      throw error;
    }
  }

  private initScene(): void {
    // 创建相机
    if (this.cameraType === 'arcRotate') {
      this.arcRotateCamera = new ArcRotateCamera(
        'camera',
        0,
        Math.PI / 2,  // 调整俯仰角
        50,          // 调整相机距离
        Vector3.Zero(),
        this.scene
      )
      this.arcRotateCamera.attachControl(this.canvas, true)
      this.arcRotateCamera.lowerRadiusLimit = 10
      this.arcRotateCamera.upperRadiusLimit = 200
      this.arcRotateCamera.wheelDeltaPercentage = 0.01
      this.arcRotateCamera.panningSensibility = 0  // 禁用平移
      this.arcRotateCamera.allowUpsideDown = false // 禁止相机翻转
    } else {
      this.universalCamera = new UniversalCamera(
        'camera',
        new Vector3(0, 0, 0),
        this.scene
      )
      this.universalCamera.attachControl(this.canvas, true)
      this.universalCamera.inputs.addMouseWheel();
      const mouseWheelInput: any = this.universalCamera.inputs.attached.mousewheel;
      mouseWheelInput.wheelPrecisionX = 100;
      mouseWheelInput.wheelPrecisionY = 100;
      mouseWheelInput.wheelPrecisionZ = 100;
    }
    // 创建光源
    new HemisphericLight('light', new Vector3(0, 1, 0), this.scene)

    // // 创建一个球体
    // const sphere = MeshBuilder.CreateSphere('sphere', { diameter: 10 }, this.scene)
    // const sphereMaterial = new StandardMaterial('sphereMaterial', this.scene)
    // sphereMaterial.diffuseColor = new Color3(1, 0, 0)
    // sphereMaterial.alpha = 0.5
    // sphere.material = sphereMaterial
    this.initMesh();
  }

  public initMesh(): void {
    // 加载gltf文件
    const gltfUrl = "./场景2.gltf";
    GltfLoader.Instance.load(gltfUrl, this.scene).then((node) => {
      const meshes = node.getChildMeshes();
      const boundingBox = Geometry.Instance.getCombinedBoundingBox(meshes);

      const center = boundingBox.maximum.add(boundingBox.minimum).scale(0.5);
      const size = new Vector3(
        boundingBox.maximum.x - boundingBox.minimum.x,
        boundingBox.maximum.y - boundingBox.minimum.y,
        boundingBox.maximum.z - boundingBox.minimum.z
      );
      const maxDimension = Math.max(size.x, size.y, size.z)
      console.log(maxDimension)
      if (this.cameraType === 'arcRotate') {
        this.arcRotateCamera.target = center
        this.arcRotateCamera.radius = maxDimension * 5
        this.arcRotateCamera.lowerRadiusLimit = 10
        this.arcRotateCamera.upperRadiusLimit = maxDimension * 1.5;
        this.arcRotateCamera.minZ = 10
        this.arcRotateCamera.maxZ = maxDimension * 5
        this.arcRotateCamera.alpha = 0
        this.arcRotateCamera.beta = Math.PI / 3
        this.arcRotateCamera.speed = 2;
        this.arcRotateCamera.inertia = 0;
      } else {
        // this.universalCamera.target = new Vector3(-10694, -920, 7851);
        const position = new Vector3(-15000, 1200, 9729);
        this.universalCamera.position = position
        this.universalCamera.target = position.clone().add(new Vector3(1000, 0, 0));
        this.universalCamera.minZ = 10
        this.universalCamera.maxZ = maxDimension * 5
        this.universalCamera.speed = 5;
        this.universalCamera.inertia = 0;
      }

      console.log('gltf加载完成')
      
      // 显示场景统计信息
      this.printSceneStatistics()

      this.optimizeSceneMaterials()
      // this.createMeshInstances()
      this.mergeMeshes()
    });
  }

  public startRenderLoop(): void {
    this.engine.runRenderLoop(() => {
      this.scene.render()
      
      // 更新FPS显示
      this.updateFPS()
    })
  }

  public resize(): void {
    this.engine.resize()
  }

  public dispose(): void {
    // 清理FPS显示元素
    if (this.fpsElement && document.body.contains(this.fpsElement)) {
      document.body.removeChild(this.fpsElement)
    }
    
    this.scene.dispose()
    this.engine.dispose()
  }

  // 加载点云数据
  public async loadPointCloud(url: string): Promise<void> {
    try {
      // 根据文件扩展名选择加载器
      let mesh: Mesh;
      if (url.toLowerCase().endsWith('.spz') || url.toLowerCase().endsWith('.splat')) {
        const node = await this.spzLoader.load(url);
        mesh = node as Mesh;
      } else if (url.toLowerCase().endsWith('.ply')) {
        mesh = await this.plyLoader.load(url);
      } else {
        throw new Error('不支持的文件格式，仅支持 .spz 和 .ply 文件')
      }

      // 计算点云的边界框
      const boundingInfo = mesh.getBoundingInfo()
      const boundingBox = boundingInfo.boundingBox
      const center = boundingBox.centerWorld
      const size = boundingBox.maximumWorld.subtract(boundingBox.minimumWorld)
      const maxDimension = Math.max(size.x, size.y, size.z)
      console.log(maxDimension)

      // 调整相机位置
      if (this.cameraType === 'arcRotate') {
        this.arcRotateCamera.target = center
        this.arcRotateCamera.radius = maxDimension * 5
        this.arcRotateCamera.upperRadiusLimit = maxDimension / 2 - maxDimension / 10
        this.arcRotateCamera.alpha = 0
        this.arcRotateCamera.beta = Math.PI / 3
      } else {
        this.universalCamera.target = center
      }
      // 设置点大小
      this.setPointSize(1)

      console.log('点云加载完成')
      
      // 显示场景统计信息
      this.printSceneStatistics()

    } catch (error) {
      console.error('加载点云数据失败:', error)
      throw error
    }
  }

  // 清除点云数据
  public clearPointCloud(): void {
    this.spzLoader.clear()
    this.plyLoader.clear()
  }

  // 设置点大小
  public setPointSize(size: number): void {
    this.plyLoader.setPointSize(size)
  }

  // 打印场景统计信息到控制台
  public printSceneStatistics(): void {
    this.sceneStats.printStatistics()
  }

  private createFPSDisplay(): void {
    // 创建FPS显示元素
    this.fpsElement = document.createElement('div')
    this.fpsElement.style.position = 'fixed'
    this.fpsElement.style.top = '10px'
    this.fpsElement.style.left = '10px'
    this.fpsElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'
    this.fpsElement.style.color = '#00ff00'
    this.fpsElement.style.padding = '8px 12px'
    this.fpsElement.style.fontFamily = 'monospace'
    this.fpsElement.style.fontSize = '14px'
    this.fpsElement.style.borderRadius = '4px'
    this.fpsElement.style.zIndex = '1000'
    this.fpsElement.style.border = '1px solid #333'
    this.fpsElement.textContent = 'FPS: 0'
    
    // 添加到页面
    document.body.appendChild(this.fpsElement)
    
    // 初始化时间
    this.lastFrameTime = performance.now()
  }

  private updateFPS(): void {
    this.frameCount++
    const currentTime = performance.now()
    const deltaTime = currentTime - this.lastFrameTime
    
    // 每秒更新一次FPS显示
    if (deltaTime >= 1000) {
      const fps = Math.round((this.frameCount * 1000 / deltaTime) * 100) / 100
      this.fpsElement.textContent = `FPS: ${fps}`
      this.frameCount = 0
      this.lastFrameTime = currentTime
    }
  }

  // 优化场景材质
  public optimizeSceneMaterials(config?: Partial<MaterialCompareConfig>): OptimizationResult {
    if (config) {
      this.materialOptimizer = new MaterialOptimizer(this.scene, config)
    }
    return this.materialOptimizer.optimizeMaterials()
  }

  // 获取材质优化建议
  public getMaterialOptimizationSuggestions(): string[] {
    return this.materialOptimizer.getOptimizationSuggestions()
  }

  // 打印材质优化建议
  public printMaterialOptimizationSuggestions(): void {
    const suggestions = this.getMaterialOptimizationSuggestions()
    console.group('🔧 材质优化建议')
    suggestions.forEach(suggestion => console.log(suggestion))
    console.groupEnd()
  }

  // 创建网格实例
  public createMeshInstances(config?: Partial<InstancerConfig>): InstancerResult {
    if (config) {
      this.meshInstancer = new MeshInstancer(this.scene, config)
    }
    return this.meshInstancer.createInstances()
  }

  // 获取网格实例化建议
  public getMeshInstanceSuggestions(): string[] {
    return this.meshInstancer.getOptimizationSuggestions()
  }

  // 打印网格实例化建议
  public printMeshInstanceSuggestions(): void {
    const suggestions = this.getMeshInstanceSuggestions()
    console.group('🔧 网格实例化建议')
    suggestions.forEach(suggestion => console.log(suggestion))
    console.groupEnd()
  }

  // 合并相同材质的网格
  public mergeMeshes(config?: Partial<MergerConfig>): MergeResult {
    if (config) {
      this.meshMerger = new MeshMerger(this.scene, config)
    }
    return this.meshMerger.mergeMeshes()
  }

  // 获取网格合并建议
  public getMeshMergeeSuggestions(): string[] {
    return this.meshMerger.getOptimizationSuggestions()
  }

  // 打印网格合并建议
  public printMeshMergeSuggestions(): void {
    const suggestions = this.getMeshMergeeSuggestions()
    console.group('🔧 网格合并建议')
    suggestions.forEach(suggestion => console.log(suggestion))
    console.groupEnd()
  }

  // 还原网格合并
  public revertMeshMerging(): void {
    this.meshMerger.revertMerging()
  }

  // 获取合并统计信息
  public getMergeStatistics(): any {
    return this.meshMerger.getMergeStatistics()
  }

  // 显示材质分组信息
  public printMaterialGroupInfo(): void {
    this.meshMerger.printMaterialGroupInfo()
  }

  // 执行完整的场景优化
  public optimizeScene(config?: {
    materialConfig?: Partial<MaterialCompareConfig>,
    instanceConfig?: Partial<InstancerConfig>,
    mergeConfig?: Partial<MergerConfig>
  }): void {
    console.log('🚀 开始完整场景优化...')
    
    // 1. 材质优化
    console.log('\n1️⃣ 材质优化阶段')
    this.optimizeSceneMaterials(config?.materialConfig)
    
    // 2. 网格实例化
    console.log('\n2️⃣ 网格实例化阶段')
    this.createMeshInstances(config?.instanceConfig)
    
    // 3. 网格合并
    console.log('\n3️⃣ 网格合并阶段')
    this.mergeMeshes(config?.mergeConfig)
    
    // 4. 显示最终统计
    console.log('\n4️⃣ 优化完成，显示最终统计')
    this.printSceneStatistics()
    
    console.log('✅ 场景优化完成!')
  }
} 