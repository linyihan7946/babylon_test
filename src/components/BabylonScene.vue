<template>
  <div class="babylon-container">
    <canvas ref="canvas"></canvas>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref } from 'vue'
import { Engine, Scene, Vector3, HemisphericLight, MeshBuilder, ArcRotateCamera } from '@babylonjs/core'

export default defineComponent({
  name: 'BabylonScene',
  setup() {
    const canvas = ref<HTMLCanvasElement | null>(null)

    onMounted(() => {
      if (!canvas.value) return

      // 创建引擎和场景
      const engine = new Engine(canvas.value, true)
      const scene = new Scene(engine)

      // 创建相机
      const camera = new ArcRotateCamera(
        'camera',
        0,
        Math.PI / 3,
        10,
        Vector3.Zero(),
        scene
      )
      camera.attachControl(canvas.value, true)

      // 创建光源
      const light = new HemisphericLight('light', new Vector3(0, 1, 0), scene)

      // 创建一个球体
      const sphere = MeshBuilder.CreateSphere('sphere', { diameter: 2 }, scene)

      // 渲染循环
      engine.runRenderLoop(() => {
        scene.render()
      })

      // 处理窗口大小变化
      window.addEventListener('resize', () => {
        engine.resize()
      })
    })

    return {
      canvas
    }
  }
})
</script>

<style scoped>
.babylon-container {
  width: 100%;
  height: 500px;
  margin: 0 auto;
}

canvas {
  width: 100%;
  height: 100%;
  outline: none;
}
</style> 