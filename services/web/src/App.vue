<template>
  <main class="h-full flex flex-col">
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
};
</script>

<style scoped>

</style>
