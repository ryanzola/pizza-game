<template>
  <div class="hero">
    <p class="absolute top-0 right-0 bg-black bg-opacity-40 text-xs p-1 rounded-bl z-10">v{{ version }}</p>
    <img v-if="isNearRestaurantDepot" src="../assets/depot.png" alt="the pizzeria storefront">
    <img v-else src="../assets/pizzeria.jpg" alt="the pizzeria storefront">

    <div class="locator store" v-if="isNearPizzeria">
      You are at the store
    </div>

    <div class="locator not-store" v-if="!isNearPizzeria && !isNearRestaurantDepot">
      You are not at the store
    </div>

    <div class="wait-time" v-if="!isNearRestaurantDepot">
      Current Wait Time: {{ Math.floor(waitTime / 1000 / 60) }} minutes
    </div>
  </div>

  <div>
    <DebugLocation />
    <div class="p-4">
      <h1 class="text-2xl font-bold">Orders</h1>
      <p :class="{ 'opacity-0': isNearPizzeria }" :aria-hidden="isNearPizzeria">Return to the pizzeria to get more orders</p>
    </div>
  </div>

  <ul :class="['orders', { 'transform opacity-50': !isNearPizzeria }]">
    <Order v-for="order in pendingOrders" :key="order.id" :order="order" @change="toggleOrderSelection" />
  </ul>

  <button v-if="isNearRestaurantDepot" class="order-btn" @click="() => {}">Restock Pizzeria</button>
  <button v-else-if="selected.length === 0 && $store.state.debug_mode" class="order-btn" @click="getNewOrder">Get New Order</button>
  <button v-else-if="selected.length > 0" class="order-btn" @click="setDeliveries">
    Take Deliveries
    <ChevronDoubleRightIcon class="absolute right-4 top-1/2 transform translate-y-[-50%] w-6 h-6" />
  </button>

  <p class="text-center font-bold bg-red-500" v-show="!locationAvailable">Geolocation is not available or not permitted.</p>

  <div class="h-screen w-screen fixed inset-0 grid place-items-center bg-black bg-opacity-30" v-if="loading">
    <svg class="animate-spin h-12 w-12" viewBox="0 0 50 50">
      <circle cx="25" cy="25" r="20" fill="none" stroke="white" stroke-width="5" stroke-linecap="round"
              stroke-dasharray="100, 100" transform="rotate(-90, 25, 25)"></circle>
    </svg>
  </div>
</template>

<script>
import DebugLocation from "../components/DebugLocation.vue";
import Order from "../components/Order.vue";
import { mapState, mapGetters, mapActions } from 'vuex'
import { ChevronDoubleRightIcon } from '@heroicons/vue/24/solid'

export default {
  name: "Home",
  components: {
    ChevronDoubleRightIcon,
    DebugLocation,
    Order,
  },
  data() {
    return {
      currentWaitTime: 0,
      selected: [],
      loading: true,
    };
  },
  computed: {
    ...mapState(['version']),
    ...mapState('orders', ['waitTime', 'selected_orders']),
    ...mapState('location', ['locationAvailable']),
    ...mapGetters('location', ['isNearPizzeria', 'isNearRestaurantDepot']),
    ...mapGetters('orders', ['orders']),
    pendingOrders() {
      // make sure order user_id is null and order.status is not delivered
      return this.orders.filter(order => !order.user_id && order.status !== 'delivered');
    }
  },
  async mounted() {
    console.log(this.selected_orders)

    try {
      await this.fetchOrders();
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      this.loading = false;
    }
  },
  methods: {
    ...mapActions('orders', ['fetchNewOrder', 'fetchOrders', 'attachUserToOrders']),
    toggleOrderSelection(id) {
      const index = this.selected.findIndex(selectedId => selectedId === id);
      if (index > -1) {
        this.selected.splice(index, 1);
      } else {
        this.selected.push(id);
      }
    },
    async setDeliveries() {
      if (this.selected.length === 0) return;

      try {
        this.loading = true;
        const response = await this.attachUserToOrders(this.selected);
        console.log('User attached to orders successfully:', response);
        this.$router.push('/deliveries');
      } catch (error) {
        console.error('Error attaching user to orders:', error);
      } finally {
        this.loading = false;
      }
    },
    getNewOrder() {
      this.loading = true;

      this.fetchNewOrder().then(() => {
        this.loading = false;
      })
      .finally(() => {
        this.loading = false;
      });
    }
  }
};
</script>

<style lang="postcss" scoped>
.hero {
  @apply 
  relative 
  h-56 md:h-80
  overflow-hidden;
}

.hero img {
  @apply 
    absolute -top-4 
    w-full;
}

h2 {
  @apply 
    mb-2
    font-bold 
    text-lg;
}

.orders {
  @apply 
    p-4 flex-1 overflow-scroll flex flex-col gap-2 transition-all ease-in-out duration-200;
}

.order-btn {
  @apply
    relative 
    py-4
    w-full 
    rounded-none
    border-none
    bg-slate-900;
}

.wait-time {
  @apply 
    absolute bottom-0 right-0 left-0
    p-2
    font-bold
    text-xs text-right
    text-white
    bg-gradient-to-r from-transparent from-40% to-blue-600 to-70%;
}
</style>