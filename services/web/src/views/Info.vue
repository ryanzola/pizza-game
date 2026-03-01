<template>
  <div class="bg-[#000000] flex-1 overflow-y-auto w-full flex flex-col items-center">
    <div class="w-full max-w-md p-4 pb-32 space-y-6">
      
      <!-- Profile Card -->
      <section class="bg-[#1c1c1e] p-5 rounded-3xl shadow-sm border border-gray-800 flex flex-col gap-5">
        <div class="flex items-center gap-5">
          <span class="relative flex shrink-0 overflow-hidden rounded-full h-20 w-20 border-2 border-gray-700">
            <img class="absolute h-full w-full object-cover" :src="$store.getters.user?.picture || '../assets/pizza.svg'" alt="ME">
          </span>
          <div class="flex flex-col gap-1">
            <h1 class="font-bold text-2xl tracking-tight text-white">{{ $store.getters.user?.name }}</h1>
            <div class="text-gray-400 text-sm">{{ $store.getters.user?.email }}</div>
          </div>
        </div>

        <button class="w-full font-semibold text-lg text-red-500 bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/30 border border-red-500/20 py-3 rounded-2xl transition-colors" @click="logOut">
          Log Out
        </button>
      </section>

      <!-- Achievements Section -->
      <section class="bg-[#1c1c1e] p-5 rounded-3xl shadow-sm border border-gray-800">
        <h2 class="text-xl font-bold text-white mb-4 tracking-tight">Achievements</h2>
        <ul class="flex flex-col gap-3">
          <Achievement 
            v-for="achievement in sortedAchievements"
            :key="achievement.title"
            :title="achievement.title"
            :description="achievement.description"
            :date="achievement.date"
          />
        </ul>
      </section>

      <!-- Settings Card -->
      <section class="bg-[#1c1c1e] p-5 rounded-3xl shadow-sm border border-gray-800">
        <div class="flex items-center justify-between">
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
              />
              <div class="w-14 h-8 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-7 after:w-7 after:transition-all peer-checked:bg-blue-500 border border-gray-600"></div>
            </label>
          </div>
        </div>
      </section>
      
    </div>
  </div>
</template>

<style scoped>
/* Scoped styles removed in favor of direct Tailwind utility classes */
</style>

<script>
import Achievement from '../components/Achievement.vue'
import { db } from '../firebase/init';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default {
  name: 'Info',
  components: {
    Achievement
  },
  data() {
    return {
      orders: [],
      achievements: [
        {
          title: 'Rookie',
          description: 'Your journey begins with a single delivery. Welcome to the world of pizza!',
          date: '12 Dec 2023'
        },
        {
          title: 'Centurion',
          description: 'A hundred deliveries mastered. You\'re a true warrior of the pizza delivery world!',
          date: null,
        },
        {
          title: 'Elite',
          description: 'Five hundred deliveries! You\'re at the top, an elite deliverer with unmatched dedication.',
          date: null,
        },
        {
          title: 'Nestegg',
          description: 'You\'ve planted the seed of your financial future. Watch it grow as you continue your journey!',
          date: '08 Dec 2023'
        },
        {
          title: 'Supersaver',
          description: 'Twenty bank trips show your dedication to saving. You\'re a true supersaver, wisely securing your future one deposit at a time.',
          date: null,
        }
      ],
    }
  },
  computed: {
    sortedAchievements() {
      // sort achievements by if date is null or not
      return this.achievements.sort((a, b) => {
        if (a.date === null) return 1
        if (b.date === null) return -1
        return 0
      })
    }
  },
  async mounted() {
    try {
      const uid = this.$store.state.user?.uid;
      if (!uid) return;

      const q = query(
        collection(db, 'orders'),
        where('user_id', '==', uid),
        where('status', '==', 'delivered')
      );
      
      const querySnapshot = await getDocs(q);
      const pastOrders = [];
      querySnapshot.forEach((doc) => {
        pastOrders.push({ id: doc.id, ...doc.data() });
      });
      
      this.orders = pastOrders;
    } catch (error) {
      console.error(error)
    }
  },
  methods: {
    async logOut() {
      try {
        await this.$store.dispatch('logOut');
        this.$router.push('/');
      } catch (error) {
        console.error(error);
      }
    },
    toggleDebugMode() {
      this.$store.commit('TOGGLE_DEBUG_MODE');
    }
  }
}
</script>