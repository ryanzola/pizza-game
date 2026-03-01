<template>
  <main class="h-full flex flex-col relative w-full overflow-hidden">
    <router-view/>
  </main>
  <Navbar v-if="$store.getters.isAuthenticated" />
  <AchievementOverlay />
  <InstallPrompt />
</template>

<script>
import Navbar from "./components/Navbar.vue";
import Signin from "./views/Signin.vue";
import AchievementOverlay from "./components/AchievementOverlay.vue";
import InstallPrompt from "./components/InstallPrompt.vue";
import { mapState } from 'vuex'

export default {
  components: {
    Navbar,
    Signin,
    AchievementOverlay,
    InstallPrompt
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
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  },
  beforeDestroy() {
    this.$store.dispatch('location/stopGeolocation');
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  },
  methods: {
    handleVisibilityChange() {
      if (document.visibilityState === 'visible' && this.$store.getters.hasActiveSession) {
        this.$store.dispatch('acquireWakeLock');
      }
    }
  }
};
</script>