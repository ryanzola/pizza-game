<template>
  <transition name="slide-fade">
    <div 
      v-if="showOverlay && achievement" 
      class="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none"
    >
      <div class="bg-gradient-to-r from-red-600 to-orange-500 rounded-2xl shadow-2xl p-[2px] backdrop-blur-md bg-opacity-90 max-w-sm w-full font-sans">
        <div class="bg-gray-900 rounded-[14px] p-4 flex items-center space-x-4 border border-white/10">
          <div class="flex-shrink-0 h-16 w-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-3xl shadow-lg ring-2 ring-orange-300">
            {{ achievement.icon || '🏆' }}
          </div>
          <div class="flex-1">
            <p class="text-xs uppercase tracking-wider text-orange-400 font-bold mb-1">Achievement Unlocked!</p>
            <h3 class="text-white text-lg font-black leading-tight">{{ achievement.title }}</h3>
            <p class="text-gray-300 text-sm mt-1 leading-snug">{{ achievement.description }}</p>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { computed, watch } from 'vue';
import { useStore } from 'vuex';

const store = useStore();

const showOverlay = computed(() => store.getters['achievements/showOverlay']);
const achievement = computed(() => store.getters['achievements/recent_achievement']);

watch(showOverlay, (newVal) => {
  if (newVal === true) {
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      store.dispatch('achievements/dismissAchievementOverlay');
    }, 5000);
  }
});
</script>

<style scoped>
.slide-fade-enter-active {
  transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); /* Bouncy enter */
}
.slide-fade-leave-active {
  transition: all 0.4s cubic-bezier(0.6, -0.28, 0.735, 0.045);
}
.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translate(-50%, -20px);
  opacity: 0;
}
.slide-fade-enter-to,
.slide-fade-leave-from {
  transform: translate(-50%, 0);
  opacity: 1;
}
</style>
