<template>
  <div class="h-full bg-gray-900 text-white overflow-y-auto pb-24 font-sans">
    <!-- Header -->
    <header class="bg-gradient-to-br from-red-600 to-orange-500 pt-12 pb-8 px-6 shadow-xl relative overflow-hidden">
      <!-- Decorative background elements -->
       <div class="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none" style="background-image: radial-gradient(circle at 20% 150%, white 0%, transparent 50%); mix-blend-mode: overlay;"></div>
      
      <div class="relative z-10 flex flex-col items-center">
        <div class="h-24 w-24 bg-gray-800 rounded-full border-4 border-orange-300 shadow-2xl flex items-center justify-center text-5xl mb-3">
          🧑‍🍳
        </div>
        <h1 class="text-3xl font-black text-white tracking-tight text-center">{{ userName || 'Driver' }}</h1>
        <p class="text-orange-100 font-medium text-sm mt-1">Level {{ Math.max(1, Math.floor(lifetimeStats.total_deliveries / 10)) }} Pro</p>
      </div>
    </header>

    <div class="p-4 sm:p-6 max-w-4xl mx-auto space-y-8 mt-4">
      
      <!-- Stats Section -->
      <section>
        <h2 class="text-xl font-bold mb-4 text-gray-100 flex items-center"><span class="mr-2">📊</span> Lifetime Stats</h2>
        <div class="grid grid-cols-2 gap-4">
          
          <div class="bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-700/50 shadow-lg relative overflow-hidden group">
             <div class="absolute -right-4 -bottom-4 text-6xl opacity-10 group-hover:scale-110 transition-transform duration-300">📦</div>
             <p class="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Total Deliveries</p>
             <p class="text-3xl font-black text-orange-400">{{ lifetimeStats.total_deliveries || 0 }}</p>
          </div>

          <div class="bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-700/50 shadow-lg relative overflow-hidden group">
             <div class="absolute -right-4 -bottom-4 text-6xl opacity-10 group-hover:scale-110 transition-transform duration-300">🛣️</div>
             <p class="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Distance Covered</p>
             <p class="text-3xl font-black text-orange-400">{{ Math.round(lifetimeStats.total_distance_km || 0) }} <span class="text-lg text-gray-500 font-bold">km</span></p>
          </div>

          <div class="bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-700/50 shadow-lg relative overflow-hidden group">
             <div class="absolute -right-4 -bottom-4 text-6xl opacity-10 group-hover:scale-110 transition-transform duration-300">🗺️</div>
             <p class="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Unique Streets</p>
             <p class="text-3xl font-black text-orange-400">{{ (lifetimeStats.unique_streets || []).length }}</p>
          </div>

          <div class="bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-700/50 shadow-lg relative overflow-hidden group">
             <div class="absolute -right-4 -bottom-4 text-6xl opacity-10 group-hover:scale-110 transition-transform duration-300">💰</div>
             <p class="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Total Tips</p>
             <p class="text-3xl font-black text-orange-400"><span class="text-lg text-gray-500 font-bold">$</span>{{ (lifetimeStats.total_tips || 0).toFixed(2) }}</p>
          </div>

        </div>
      </section>

      <!-- Achievements Section -->
      <section>
        <div class="flex justify-between items-end mb-4">
          <h2 class="text-xl font-bold text-gray-100 flex items-center"><span class="mr-2">🏆</span> Achievements</h2>
          <span class="text-sm font-semibold text-gray-400 bg-gray-800 px-3 py-1 rounded-full">
            {{ unlockedCount }} / {{ ACHIEVEMENT_CATALOG.length }}
          </span>
        </div>
        
        <div class="space-y-3">
          <div 
            v-for="ach in mappedAchievements" 
            :key="ach.id"
            :class="[
              'rounded-2xl p-4 border transition-all duration-300 flex items-center space-x-4 relative overflow-hidden',
              ach.unlocked 
                ? 'bg-gray-800/90 border-orange-500/30 shadow-lg shadow-orange-900/20' 
                : 'bg-gray-800/30 border-gray-700/30 opacity-60 grayscale'
            ]"
          >
            <!-- Fancy background glow for unlocked -->
            <div v-if="ach.unlocked" class="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-red-500/5 pointer-events-none"></div>

            <div :class="[
              'flex-shrink-0 h-14 w-14 rounded-full flex items-center justify-center text-3xl shadow-inner border-2 z-10',
              ach.unlocked ? 'bg-gradient-to-br from-yellow-400 to-orange-500 border-orange-300/50' : 'bg-gray-700 border-gray-600'
            ]">
              {{ ach.icon }}
            </div>
            
            <div class="flex-1 z-10">
              <h3 :class="['text-lg font-bold leading-tight', ach.unlocked ? 'text-white' : 'text-gray-300']">
                {{ ach.title }}
              </h3>
              <p :class="['text-sm mt-1 leading-snug', ach.unlocked ? 'text-gray-300' : 'text-gray-500']">
                {{ ach.description }}
              </p>
              <p v-if="ach.unlocked && ach.unlocked_at" class="text-[10px] uppercase tracking-wider text-orange-400 mt-2 font-bold opacity-80">
                Unlocked {{ formatDate(ach.unlocked_at) }}
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- Settings Card -->
      <section class="bg-gray-800/80 backdrop-blur-sm rounded-3xl p-5 border border-gray-700/50 shadow-sm mt-8">
        <div class="flex items-center justify-between mb-6">
          <div class="flex flex-col">
            <h2 class="text-xl font-bold text-white tracking-tight leading-tight">Developer Mode</h2>
            <p class="text-gray-400 text-sm mt-1">Test features from the couch.</p>
          </div>
          <div class="relative">
            <label for="debug" class="cursor-pointer relative inline-flex items-center">
              <input 
                class="sr-only peer"
                type="checkbox" 
                id="debug" 
                name="debug"
                :checked="$store.state.debug_mode"
                @change="toggleDebugMode"
              >
              <div class="w-14 h-7 bg-gray-600 rounded-full peer peer-checked:bg-orange-500 transition-colors duration-300"></div>
              <div class="absolute left-1 top-1 w-5 h-5 bg-white rounded-full transition-all duration-300 peer-checked:translate-x-7 shadow-sm"></div>
            </label>
          </div>
        </div>

        <button class="w-full font-bold text-lg text-red-500 bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/30 border border-red-500/20 py-3 rounded-2xl transition-colors" @click="logOut">
          Log Out
        </button>
      </section>

    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useStore } from 'vuex';

const store = useStore();

const ACHIEVEMENT_CATALOG = [
  { id: 'first_slice', title: 'First Slice', description: 'Complete your very first delivery.', icon: '🍕' },
  { id: 'pizza_tycoon', title: 'Pizza Tycoon', description: 'Complete 100 total deliveries.', icon: '👑' },
  { id: 'speed_demon', title: 'Speed Demon', description: 'Complete a delivery within 5 minutes of picking it up.', icon: '⚡' },
  { id: 'the_flash', title: 'The Flash', description: 'Record a speed of 40 mph or greater while on a delivery. (Car only)', icon: '🏎️' },
  { id: 'tipsy', title: 'Tipsy', description: 'Earn $100 in total tips.', icon: '💰' },
  { id: 'night_owl', title: 'Night Owl', description: 'Complete 10 deliveries between midnight and 4 AM.', icon: '🦉' },
  { id: 'heavy_load', title: 'Heavy Load', description: 'Have 5 or more active orders in your queue simultaneously.', icon: '🏋️' },
  { id: 'globetrotter', title: 'Globetrotter', description: 'Deliver to 50 unique streets.', icon: '🌍' },
];

const userName = computed(() => {
  const user = store.getters.user;
  return user?.displayName || user?.email?.split('@')[0] || 'Driver';
});

const lifetimeStats = computed(() => store.getters['achievements/lifetime_stats'] || {});
const unlockedAchievements = computed(() => store.getters['achievements/unlocked_achievements'] || []);

const unlockedCount = computed(() => unlockedAchievements.value.length);

const mappedAchievements = computed(() => {
  return ACHIEVEMENT_CATALOG.map(catItem => {
    const unlockedData = unlockedAchievements.value.find(u => u.id === catItem.id);
    return {
      ...catItem,
      unlocked: !!unlockedData,
      unlocked_at: unlockedData ? unlockedData.unlocked_at : null
    };
  });
});

const formatDate = (timestamp) => {
  if (!timestamp) return '';
  // Handle Firestore timestamp
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

import { useRouter } from 'vue-router';
const router = useRouter();

const toggleDebugMode = () => {
  store.commit('TOGGLE_DEBUG_MODE');
};

const logOut = async () => {
  try {
    await store.dispatch('logOut');
    router.push('/signin');
  } catch (error) {
    console.error('Logout failed', error);
  }
};

</script>
