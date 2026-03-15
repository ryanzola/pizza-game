<template>
  <nav aria-label="main navigation">
    <router-link to="/deliveries">
      <Square3Stack3DIcon />
    </router-link>

    <router-link to="/pizzeria" class="relative">
      <BuildingStorefrontIcon />
      <span 
        v-if="stockStatus !== 'ok'" 
        :class="['stock-badge', stockStatus === 'out' ? 'badge-red' : 'badge-yellow']"
      >!</span>
    </router-link>

    <router-link to="/">
      <HomeIcon class="home" />
    </router-link>

    <router-link to="/bank">
      <CurrencyDollarIcon />
    </router-link>

    <router-link to="/profile">
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
import { mapState, mapGetters } from 'vuex'

export default {
  components: {
    CurrencyDollarIcon,
    HomeIcon,
    InformationCircleIcon,
    Square3Stack3DIcon,
    BuildingStorefrontIcon,
  },
  computed: {
    ...mapState(['user']),
    ...mapGetters('inventory', ['stockStatus']),
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

.stock-badge {
  @apply 
    absolute -top-1 -right-2
    w-4 h-4 
    rounded-full 
    flex items-center justify-center
    text-[9px] font-black leading-none
    animate-pulse;
}

.badge-yellow {
  @apply bg-yellow-500 text-black;
}

.badge-red {
  @apply bg-red-500 text-white;
}
</style>