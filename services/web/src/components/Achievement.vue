<template>
  <div :class="`achievement-card bg-${color}`" data-v0-t="card">
    <div class="p-5 text-center">
      <h3 v-if="date" class="text-lg font-semibold">{{ title }}</h3>
      <h3 v-else class="text-lg font-semibold">???</h3>
      
      <p v-if="date" class="text-xs">{{ description }}</p>
      <p v-else class="text-xs">???</p>

      <img v-if="date" src="../assets/achievement-checked.svg" alt="" class="w-16 h-16 mx-auto my-2" />
      <img v-else="date" src="../assets/achievement-empty.svg" alt="" class="w-16 h-16 mx-auto my-2" />

      <div v-if="date" class="text-indigo-500 text-sm">Unlocked on {{ date }}</div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Achievement',
  props: {
    color: {
      type: String,
      default: 'gray-300'
    },
    title: {
      type: String,
      default: 'Title'
    },
    description: {
      type: String,
      default: 'Describe your achievement'
    },
    date: {
      type: String,
      default: null
    }
  }
}
</script>

<style scoped>
.achievement-card {
  @apply relative overflow-hidden rounded-lg text-gray-900 shadow;
}
</style>