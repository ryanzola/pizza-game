<template>
  <section>
    <div class="flex items-center gap-8">
      <span class="relative flex shrink-0 overflow-hidden rounded-full h-24 w-24">
        <img class="absolute h-full w-full object-cover" :src="$store.getters.user.picture || '../assets/pizza.svg'" alt="ME">
      </span>
      <div class="grid gap-0.5 text-sm">
        <h1 class="font-bold text-2xl text-white">{{ $store.getters.user.name }}</h1>
        <div class="text-white">{{ $store.getters.user.email }}</div>
      </div>
    </div>

    <button class="w-full text-white bg-[#d0021b] px-3 py-2 rounded" @click="logOut">Log Out</button>
  </section>

  <section>
    <h2 class="text-2xl font-bold text-white">Achievements</h2>

    <div class="grid grid-cols-1 gap-2">
      <Achievement 
        color="blue-200"
        title="Rookie"
        description="Your journey begins with a single delivery. Welcome to the world of pizza!"
        date="12 Dec 2023"
      />

      <Achievement
        title="Centurion"
        description="A hundred deliveries mastered. You're a true warrior of the pizza delivery world!"
      />

      <Achievement
        title="Elite"
        description="Five hundred deliveries! You're at the top, an elite deliverer with unmatched dedication."
      />
      
      <Achievement
        color="green-200"
        title="Nestegg"
        description="You've planted the seed of your financial future. Watch it grow as you continue your journey!"
        date="08 Dec 2023"
      />

      <Achievement
        title="Supersaver"
        description="Twenty bank trips show your dedication to saving. You're a true supersaver, wisely securing your future one deposit at a time."
      />
    </div>
  </section>

  <section>
    <div class="flex items-center justify-between">
      <h2 class="text-2xl font-bold text-white">Developer Mode</h2>
      <div class="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
        <input class="toggle-checkbox hidden" id="toggle" type="checkbox" name="toggle" />
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

  <section>
    <router-link to="/info/past-deliveries">Past Deliveries</router-link>
  </section>
</template>

<style scoped>
section {
  @apply p-2 last:pb-24 space-y-4;
}
.achievement-card {
  @apply 
    relative
    overflow-hidden
    rounded-lg
    text-gray-900
    shadow;
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
      orders: []
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
      console.log('Debug Mode:', this.$store.state.debug_mode);
    }
  }
}
</script>