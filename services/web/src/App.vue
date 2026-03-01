<template>
  <main class="h-full flex flex-col relative w-full overflow-hidden">
    <router-view/>
  </main>
  <Navbar v-if="$store.getters.isAuthenticated" />
  <AchievementOverlay />
</template>

<script>
import Navbar from "./components/Navbar.vue";
import Signin from "./views/Signin.vue";
import AchievementOverlay from "./components/AchievementOverlay.vue";
import { mapState } from 'vuex'

export default {
  components: {
    Navbar,
    Signin,
    AchievementOverlay
  },
  computed: {
    ...mapState(['user'])
  },
  watch: {
    user(newUser) {
      if (!newUser && this.$route.meta.requiresAuth) {
        this.$router.push('/signin');
      }
    }
  },
  async mounted() {
    this.$store.dispatch('location/startGeolocation');
  },
  beforeDestroy() {
    this.$store.dispatch('location/stopGeolocation');
  },
};
</script>