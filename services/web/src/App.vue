<template>
  <div class="h-full flex flex-col" v-if="user.token">
    <router-view/>
    <Navbar />
  </div>
  <div v-else>
    <Signin />
  </div>
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
