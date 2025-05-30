import { Engine, Scene, Vector3, HemisphericLight, MeshBuilder, ArcRotateCamera, WebGPUEngine } from '@babylonjs/core'

export class BabylonCore {
  private engine!: Engine | WebGPUEngine
  private scene!: Scene
  private canvas: HTMLCanvasElement
  public ready: Promise<void>

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ready = this.init()
  }

  private async init() {
    await this.initEngine()
    this.scene = new Scene(this.engine)
    this.initScene()
  }

  private async initEngine() {
    try {
      // 尝试创建WebGPU引擎
      const webgpuEngine = await WebGPUEngine.CreateAsync(this.canvas, {
        antialias: true,
        adaptToDeviceRatio: true
      })
      this.engine = webgpuEngine
      console.log('WebGPU引擎初始化成功')
    } catch (error) {
      // 如果WebGPU不可用，回退到WebGL
      console.log('WebGPU不可用，使用WebGL引擎')
      this.engine = new Engine(this.canvas, true)
    }
  }

  private initScene(): void {
    // 创建相机
    const camera = new ArcRotateCamera(
      'camera',
      0,
      Math.PI / 3,
      10,
      Vector3.Zero(),
      this.scene
    )
    camera.attachControl(this.canvas, true)

    // 创建光源
    const light = new HemisphericLight('light', new Vector3(0, 1, 0), this.scene)

    // 创建一个球体
    const sphere = MeshBuilder.CreateSphere('sphere', { diameter: 2 }, this.scene)
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
} 