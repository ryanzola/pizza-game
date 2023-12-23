<template>
  <h1>Info Page</h1>

  <router-link to="/info/past-deliveries">Past Deliveries</router-link>

  <button @click="logOut">Sign Out</button>

  <form id="settings">
    <label for="debug">
      Debug Mode

      <input 
        type="checkbox" 
        id="debug" 
        name="debug"
        :checked="$store.state.debug_mode"
        @change="toggleDebugMode"
      />
    </label>
  </form>
</template>

<script>
import axios from 'axios'

export default {
  name: 'Info',
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