import { Engine, Scene, Vector3, HemisphericLight, MeshBuilder, ArcRotateCamera, WebGPUEngine, Mesh, StandardMaterial, Color3 } from '@babylonjs/core'
import { SPZLoader } from './SPZLoader'
import { PLYLoader } from './PLYLoader'

export class BabylonCore {
  private engine!: Engine | WebGPUEngine
  private scene!: Scene
  private canvas: HTMLCanvasElement
  public ready: Promise<void>
  private spzLoader!: SPZLoader
  private plyLoader!: PLYLoader
  private camera!: ArcRotateCamera

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
    this.camera = new ArcRotateCamera(
      'camera',
      0,
      Math.PI / 2,  // 调整俯仰角
      50,          // 调整相机距离
      Vector3.Zero(),
      this.scene
    )
    this.camera.attachControl(this.canvas, true)
    this.camera.lowerRadiusLimit = 10
    this.camera.upperRadiusLimit = 200
    this.camera.wheelDeltaPercentage = 0.01
    this.camera.panningSensibility = 0  // 禁用平移
    this.camera.allowUpsideDown = false // 禁止相机翻转

    // 创建光源
    new HemisphericLight('light', new Vector3(0, 1, 0), this.scene)

    // // 创建一个球体
    // const sphere = MeshBuilder.CreateSphere('sphere', { diameter: 10 }, this.scene)
    // const sphereMaterial = new StandardMaterial('sphereMaterial', this.scene)
    // sphereMaterial.diffuseColor = new Color3(1, 0, 0)
    // sphereMaterial.alpha = 0.5
    // sphere.material = sphereMaterial

    // 加载点云文件
    // const url = "https://assets.babylonjs.com/splats/gs_Skull.splat";
    // const url = 'https://raw.githubusercontent.com/CedricGuillemet/dump/master/Halo_Believe.splat';
    const url = "https://raw.githubusercontent.com/CedricGuillemet/dump/master/racoonfamily.spz";
    // const url = './dolphins_colored（二进制）.spz';
    this.loadPointCloud(url).catch(error => {
      console.error('初始化点云加载失败:', error)
    })
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
      this.camera.target = center
      this.camera.radius = maxDimension * 5
      this.camera.upperRadiusLimit = maxDimension / 2 - maxDimension / 10
      this.camera.alpha = 0
      this.camera.beta = Math.PI / 3

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