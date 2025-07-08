<template>
  <div id="app">
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
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

#app {
  font-family: Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}
</style> 