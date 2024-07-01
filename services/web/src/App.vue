<template>
  <main class="h-full flex flex-col overflow-scroll">
    <router-view/>
  </main>
  <Navbar v-if="$store.getters.isAuthenticated" />
</template>

<script>
import Navbar from "./components/Navbar.vue";
import Signin from "./views/Signin.vue";
import { mapState } from 'vuex'

export default {
  components: {
    Navbar,
    Signin
  },
  computed: {
    ...mapState(['user'])
  },
  async mounted() {
    this.$store.dispatch('location/startGeolocation');
    this.$store.dispatch('location/startInterval');
  },
  beforeDestroy() {
    this.$store.dispatch('location/stopGeolocation');
    this.$store.dispatch('location/stopInterval');
  },
};
</script>