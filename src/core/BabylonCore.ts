import { Engine, Scene, Vector3, HemisphericLight, MeshBuilder, UniversalCamera, ArcRotateCamera, WebGPUEngine, Mesh, StandardMaterial, Color3 } from '@babylonjs/core'
import { SPZLoader } from './SPZLoader'
import { PLYLoader } from './PLYLoader'
import { GltfLoader } from './GltfLoader'
import { Geometry } from './Geometry'

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
  


  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ready = this.init()
  }

  private async init() {
    await this.initEngine()
    this.scene = new Scene(this.engine)
    this.spzLoader = new SPZLoader(this.scene)
    this.plyLoader = new PLYLoader(this.scene)
    this.initScene()
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
        // this.universalCamera.radius = maxDimension * 5
        // this.universalCamera.lowerRadiusLimit = 10
        // this.universalCamera.upperRadiusLimit = maxDimension * 1.5;
      }

      console.log('gltf加载完成')
    });
  }

  public startRenderLoop(): void {
    this.engine.runRenderLoop(() => {
      this.scene.render()
    })
  }

  public resize(): void {
    this.engine.resize()
  }

  public dispose(): void {
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
        // this.universalCamera.radius = maxDimension * 5
        // this.universalCamera.lowerRadiusLimit = 10
        // this.universalCamera.upperRadiusLimit = maxDimension * 1.5;
      }
      // 设置点大小
      this.setPointSize(1)

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
    // this.spzLoader.setPointSize(size)
    this.plyLoader.setPointSize(size)
  }
} 