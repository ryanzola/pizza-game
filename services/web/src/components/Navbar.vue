<template>
  <nav aria-label="main navigation">
    <router-link to="/deliveries">
      <Square3Stack3DIcon />
    </router-link>

    <router-link to="/pizzeria">
      <BuildingStorefrontIcon />
    </router-link>

    <router-link to="/">
      <HomeIcon class="home" />
    </router-link>

    <router-link to="/bank">
      <CurrencyDollarIcon />
    </router-link>

    <router-link to="/info">
      <div v-if="user" class="h-6 w-6 rounded-full overflow-hidden">
        <img class="h-full w-full" :src="user.picture" alt="user.displayName" referrerpolicy="no-referrer">
      </div>
      <InformationCircleIcon v-else />
    </router-link>
  </nav>
</template>

<script>
import { 
  CurrencyDollarIcon, 
  HomeIcon, 
  InformationCircleIcon,
  Square3Stack3DIcon,
  BuildingStorefrontIcon,
} from '@heroicons/vue/24/outline'
import { mapState } from 'vuex'

export default {
  components: {
    CurrencyDollarIcon,
    HomeIcon,
    InformationCircleIcon,
    Square3Stack3DIcon,
    BuildingStorefrontIcon,
  },
  computed: {
    ...mapState(['user'])
  },
}
</script>

<style lang="postcss" scoped>
nav {
  @apply 
    fixed 
    left-0 right-0 bottom-0 
    pt-6 px-8 pb-10
    flex 
    justify-between
    bg-black;
}

a svg {
  @apply 
    w-6 h-6 
    text-white;
}

.home {
  @apply scale-150;
}
</style>