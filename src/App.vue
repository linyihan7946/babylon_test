<template>
  <div id="app">
    <h1>Vue 3 + TypeScript + Babylon.js</h1>
    <BabylonScene />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import BabylonScene from './components/BabylonScene.vue'

export default defineComponent({
  name: 'App',
  components: {
    BabylonScene
  }
})
</script>

<style>
#app {
  font-family: Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style> 