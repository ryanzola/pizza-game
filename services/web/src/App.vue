<template>
  <main class="h-full flex flex-col relative w-full overflow-hidden">
    <router-view/>
  </main>
  <Navbar v-if="$store.getters.isAuthenticated" />
  <DeliveryCelebration />
  <AchievementOverlay />
  <InstallPrompt />
</template>

<script>
import Navbar from "./components/Navbar.vue";
import Signin from "./views/Signin.vue";
import AchievementOverlay from "./components/AchievementOverlay.vue";
import DeliveryCelebration from "./components/DeliveryCelebration.vue";
import InstallPrompt from "./components/InstallPrompt.vue";
import { mapState } from 'vuex'

export default {
  components: {
    Navbar,
    Signin,
    AchievementOverlay,
    DeliveryCelebration,
    InstallPrompt
  },
  computed: {
    ...mapState(['user']),
    hasActiveSession() {
      return this.$store.getters.hasActiveSession;
    },
    // Signed out: no GPS. Signed in but idle: cheap coarse watch (enough to
    // notice a POI). Active session: high-accuracy tracking for deliveries.
    geolocationMode() {
      if (!this.user) return 'off';
      return this.hasActiveSession ? 'active' : 'idle';
    }
  },
  watch: {
    user(newUser) {
      if (!newUser && this.$route.meta.requiresAuth) {
        this.$router.push('/signin');
      }
    },
    geolocationMode: {
      immediate: true,
      handler(mode) {
        this.$store.dispatch('location/setMode', mode);
      }
    }
  },
  async mounted() {
    this.$store.dispatch('orders/startExpiryTimer');
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  },
  beforeUnmount() {
    this.$store.dispatch('location/stopGeolocation');
    this.$store.dispatch('orders/stopExpiryTimer');
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  },
  methods: {
    handleVisibilityChange() {
      if (document.visibilityState !== 'visible') return;
      // iOS often stops delivering fixes to a backgrounded PWA; revive the
      // watch if it looks dead (a healthy one is left alone).
      this.$store.dispatch('location/resumeGeolocation');
      // The scheduled sweep may have expired orders while we were asleep;
      // resync our copy, then run our own expiry check.
      if (this.$store.state.user?.uid) {
        this.$store.dispatch('orders/fetchSelectedOrders').then(() => this.$store.dispatch('orders/expireOrders'));
      }
      if (this.$store.getters.hasActiveSession) {
        this.$store.dispatch('acquireWakeLock');
      }
    }
  }
};
</script>