<template>
  <div class="bg-[#000000] h-full flex flex-col text-white">
    <!-- Header -->
    <div class="px-4 pt-6 pb-2 shrink-0">
      <h1 class="text-2xl font-bold tracking-tight">Profile</h1>
    </div>

    <!-- Scrollable content -->
    <div class="flex-1 overflow-y-auto px-4 pb-6 pt-2 space-y-4">

      <!-- Identity card -->
      <section class="bg-[#1c1c1e] rounded-3xl p-5 border border-gray-800 shadow-sm">
        <div class="flex items-center gap-4">
          <div class="h-16 w-16 rounded-full bg-[#2c2c2e] border border-gray-700 shrink-0 overflow-hidden flex items-center justify-center text-3xl">
            <img v-if="userPhoto" :src="userPhoto" alt="Profile avatar" class="h-full w-full object-cover">
            <span v-else>🧑‍🍳</span>
          </div>
          <div class="flex flex-col min-w-0">
            <h2 class="text-xl font-bold tracking-tight text-white truncate">{{ userName || 'Driver' }}</h2>
            <p class="text-sm text-gray-400 truncate">{{ userEmail }}</p>
            <span class="mt-2 self-start inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-blue-500/90 text-white backdrop-blur-md">
              Level {{ level }}
            </span>
          </div>
        </div>
      </section>

      <!-- Lifetime stats -->
      <section>
        <h2 class="text-base font-bold text-gray-300 uppercase tracking-wider mb-3">Lifetime Stats</h2>
        <div class="grid grid-cols-2 gap-3">
          <div v-for="stat in stats" :key="stat.label" class="bg-[#1c1c1e] rounded-2xl p-4 border border-gray-800 shadow-sm">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{{ stat.label }}</p>
            <p class="text-2xl font-extrabold tracking-tight" :class="stat.color">
              <span v-if="stat.prefix" class="text-base text-gray-500 font-bold">{{ stat.prefix }}</span>{{ stat.value }}<span v-if="stat.suffix" class="text-base text-gray-500 font-bold ml-1">{{ stat.suffix }}</span>
            </p>
          </div>
        </div>
      </section>

      <!-- Achievements -->
      <section>
        <div class="flex justify-between items-end mb-3">
          <h2 class="text-base font-bold text-gray-300 uppercase tracking-wider">Achievements</h2>
          <span class="text-xs font-bold text-gray-400 bg-gray-800 px-2.5 py-1 rounded-full">
            {{ unlockedCount }} / {{ ACHIEVEMENT_CATALOG.length }}
          </span>
        </div>
        <ul class="flex flex-col gap-3">
          <li
            v-for="ach in mappedAchievements"
            :key="ach.id"
            class="bg-[#1c1c1e] rounded-2xl p-4 border shadow-sm flex items-center gap-4 transition-colors"
            :class="ach.unlocked ? 'border-blue-500/40' : 'border-gray-800 opacity-60'"
          >
            <div
              class="shrink-0 h-12 w-12 rounded-xl flex items-center justify-center text-2xl border"
              :class="ach.unlocked ? 'bg-blue-500/20 border-blue-500/30' : 'bg-[#2c2c2e] border-gray-700 grayscale'"
            >
              {{ ach.icon }}
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="font-bold leading-tight" :class="ach.unlocked ? 'text-white' : 'text-gray-300'">{{ ach.title }}</h3>
              <p class="text-sm mt-0.5 leading-snug" :class="ach.unlocked ? 'text-gray-400' : 'text-gray-500'">{{ ach.description }}</p>
              <p v-if="ach.unlocked && ach.unlocked_at" class="text-[10px] uppercase tracking-wider text-blue-400 mt-1.5 font-bold">
                Unlocked {{ formatDate(ach.unlocked_at) }}
              </p>
            </div>
            <svg v-if="ach.unlocked" class="w-5 h-5 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>
          </li>
        </ul>
      </section>

      <!-- Settings -->
      <section class="bg-[#1c1c1e] rounded-3xl p-5 border border-gray-800 shadow-sm flex flex-col gap-5">
        <div class="flex items-center justify-between">
          <div class="flex flex-col">
            <h2 class="text-lg font-bold text-white tracking-tight leading-tight">Developer Mode</h2>
            <p class="text-gray-400 text-sm mt-1">Test features from the couch.</p>
          </div>
          <label for="debug" class="cursor-pointer relative inline-flex items-center shrink-0">
            <input
              class="sr-only peer"
              type="checkbox"
              id="debug"
              name="debug"
              :checked="$store.state.debug_mode"
              @change="toggleDebugMode"
            >
            <div class="w-14 h-8 bg-gray-700 border border-gray-600 rounded-full peer transition-colors peer-checked:bg-blue-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-7 after:w-7 after:transition-all peer-checked:after:translate-x-6"></div>
          </label>
        </div>

        <div class="w-full h-[1px] bg-gray-800"></div>

        <button class="w-full font-semibold text-lg text-red-500 bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/30 border border-red-500/20 py-3 rounded-2xl transition-colors" @click="logOut">
          Log Out
        </button>
        <p class="text-center text-xs text-gray-600">v{{ version }}</p>
      </section>

    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';

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

const userPhoto = computed(() => {
  const user = store.getters.user;
  return user?.picture || user?.photoURL || null;
});

const userEmail = computed(() => store.getters.user?.email || '');
const version = computed(() => store.state.version);

const lifetimeStats = computed(() => store.getters['achievements/lifetime_stats'] || {});
const level = computed(() => Math.max(1, Math.floor((lifetimeStats.value.total_deliveries || 0) / 10)));

const stats = computed(() => [
  { label: 'Total Deliveries', value: lifetimeStats.value.total_deliveries || 0, color: 'text-white' },
  { label: 'Distance Covered', value: Math.round(lifetimeStats.value.total_distance_km || 0), suffix: 'km', color: 'text-white' },
  { label: 'Unique Streets', value: (lifetimeStats.value.unique_streets || []).length, color: 'text-white' },
  { label: 'Total Tips', value: (lifetimeStats.value.total_tips || 0).toFixed(2), prefix: '$', color: 'text-green-400' },
]);
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
