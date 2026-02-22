<template>
  <li :class="['min-h-[100px] p-4 flex items-center gap-4 relative rounded-2xl border', color.border, color.bg]">
    <div class="h-14 w-14 min-w-[56px] flex items-center justify-center rounded-full" :class="color.iconBg">
      <img v-if="date" src="../assets/achievement-checked.svg" alt="" class="w-8 h-8 opacity-90" />
      <img v-else src="../assets/achievement-empty.svg" alt="" class="w-8 h-8 opacity-50" />
    </div>

    <div class="space-y-1">
      <h3 v-if="date" class="text-lg font-bold text-white tracking-tight leading-tight">{{ title }}</h3>
      <h3 v-else class="text-lg font-bold text-gray-500 tracking-tight leading-tight">???</h3>
      
      <p v-if="date" class="text-sm text-gray-400 leading-snug">{{ description }}</p>

      <div v-if="date" class="mt-2 text-xs font-semibold tracking-wide" :class="color.text">Unlocked on {{ date }}</div>
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
      // Sophisticated dark mode palette mapped as objects
      colors: [
        { bg: 'bg-blue-900/20', border: 'border-blue-900/40', text: 'text-blue-400', iconBg: 'bg-blue-500/20' },
        { bg: 'bg-green-900/20', border: 'border-green-900/40', text: 'text-green-400', iconBg: 'bg-green-500/20' },
        { bg: 'bg-yellow-900/20', border: 'border-yellow-900/40', text: 'text-yellow-500', iconBg: 'bg-yellow-500/20' },
        { bg: 'bg-purple-900/20', border: 'border-purple-900/40', text: 'text-purple-400', iconBg: 'bg-purple-500/20' },
        { bg: 'bg-pink-900/20', border: 'border-pink-900/40', text: 'text-pink-400', iconBg: 'bg-pink-500/20' },
      ]
    }
  },
  computed: {
    color() {
      if (!this.date) {
        return { bg: 'bg-gray-800/40', border: 'border-gray-800', text: 'text-gray-500', iconBg: 'bg-gray-800' }
      }
      return this.colors[Math.floor(Math.random() * this.colors.length)]
    }
  }
}
</script>

<style scoped>
/* Removed old achievement-card custom CSS in favor of Tailwind classes */
</style>