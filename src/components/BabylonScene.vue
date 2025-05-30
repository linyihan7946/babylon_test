<template>
  <div class="babylon-container">
    <canvas ref="canvas"></canvas>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, onBeforeUnmount, ref } from 'vue'
import { BabylonCore } from '../core/BabylonCore'

export default defineComponent({
  name: 'BabylonScene',
  setup() {
    const canvas = ref<HTMLCanvasElement | null>(null)
    let babylonCore: BabylonCore | null = null

    onMounted(() => {
      if (!canvas.value) return

      // 初始化Babylon场景
      babylonCore = new BabylonCore(canvas.value)
      babylonCore.startRenderLoop()

      // 处理窗口大小变化
      window.addEventListener('resize', handleResize)
    })

    onBeforeUnmount(() => {
      // 清理事件监听
      window.removeEventListener('resize', handleResize)
      // 清理Babylon资源
      if (babylonCore) {
        babylonCore.dispose()
      }
    })

    const handleResize = () => {
      if (babylonCore) {
        babylonCore.resize()
      }
    }

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