import { Engine, Scene, Vector3, HemisphericLight, MeshBuilder, ArcRotateCamera } from '@babylonjs/core'

export class BabylonCore {
  private engine: Engine
  private scene: Scene
  private canvas: HTMLCanvasElement

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.engine = new Engine(canvas, true)
    this.scene = new Scene(this.engine)
    this.initScene()
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