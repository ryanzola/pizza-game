<template>
  <section>
    <div class="flex items-center gap-8">
      <span class="relative flex shrink-0 overflow-hidden rounded-full h-24 w-24">
        <img class="absolute h-full w-full object-cover" :src="$store.getters.user?.picture || '../assets/pizza.svg'" alt="ME">
      </span>
      <div class="grid gap-0.5 text-sm">
        <h1 class="font-bold text-2xl text-white">{{ $store.getters.user?.name }}</h1>
        <div class="text-white">{{ $store.getters.user?.email }}</div>
      </div>
    </div>

    <button class="w-full text-white bg-[#d0021b] px-3 py-2 rounded" @click="logOut">Log Out</button>
  </section>

  <section>
    <h2 class="text-2xl font-bold text-white">Achievements</h2>

    <ul class="grid grid-cols-1 gap-2">
      <Achievement 
        v-for="achievement in sortedAchievements"
        :title="achievement.title"
        :description="achievement.description"
        :date="achievement.date"
      />

    </ul>
  </section>

  <section>
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold text-white">Developer Mode</h2>
        <p class="text-white text-sm">Test features from the couch.</p>
      </div>
      <div class="relative pr-4">
        <label for="debug" class="cursor-pointer">
          <input 
            class="scale-150"
            type="checkbox" 
            id="debug" 
            name="debug"
            :checked="$store.state.debug_mode"
            @change="toggleDebugMode"
          />
        </label>
      </div>
    </div>
  </section>
</template>

<style scoped>
section {
  @apply p-4 space-y-4;
}
</style>

<script>
import Achievement from '../components/Achievement.vue'
import axios from 'axios'

export default {
  name: 'Info',
  components: {
    Achievement
  },
  data() {
    return {
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
      const { data } = await axios.get('order/past_orders/')
      this.orders = data
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