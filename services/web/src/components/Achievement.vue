<template>
  <li :class="['achievement-card', color]">
    <div class="h-16 w-16 min-w-[64px]">
      <img v-if="date" src="../assets/achievement-checked.svg" alt="" class="w-full h-full" />
      <img v-else="date" src="../assets/achievement-empty.svg" alt="" class="w-full h-full" />
    </div>

    <div class="space-y-2">
      <h3 v-if="date" class="text-lg font-semibold">{{ title }}</h3>
      <h3 v-else class="text-lg font-semibold">???</h3>
      
      <p v-if="date" class="text-xs">{{ description }}</p>

      <div v-if="date" class="text-indigo-200 text-sm">Unlocked on {{ date }}</div>
    </div>
  </li>
</template>

<script>
export default {
  name: 'Achievement',
  props: {
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
  },
  data() {
    return {
      colors: [
        'bg-blue-200',
        'bg-green-200',
        'bg-yellow-200',
        'bg-red-200',
        'bg-pink-200',
        'bg-purple-200',
        'bg-indigo-200',
      ]
    }
  },
  computed: {
    color() {
      return this.date ? this.colors[Math.floor(Math.random() * this.colors.length)] : 'bg-gray-200'
    }
  }
}
</script>

<style scoped>
.achievement-card {
  @apply min-h-[128px] p-4 flex items-center gap-4 relative rounded bg-opacity-10 border border-white;
}
</style>