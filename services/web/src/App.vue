<template>
  <main class="h-full flex flex-col relative w-full overflow-hidden">
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
  },
  beforeDestroy() {
    this.$store.dispatch('location/stopGeolocation');
  },
};
</script>