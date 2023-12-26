<template>
  <div class="hero">
    <p class="absolute top-0 right-0 bg-black bg-opacity-40 text-xs p-1 rounded-bl z-10">v0.12.26.14.41</p>
    <img src="../assets/pizzeria.jpg" alt="the pizzeria storefront">
    <div class="locator store" v-if="isNearPizzeria">
      You are at the store
    </div>

    <div class="locator not-store" v-else>
      You are not at the store
    </div>

    <div class="wait-time">
      Current Wait Time: {{ Math.floor(currentWaitTime / 1000 / 60) }} minutes
    </div>

    <div v-if="$store.state.debug_mode" class="bg-yellow-500 text-black absolute top-0 left-0 rounded-br p-2">
      <!-- show users lat and lon -->
      <p>Latitude: {{ latitude }}</p>
      <p>Longitude: {{ longitude }}</p>
    </div>
  </div>

  <div class="p-4 pb-0">
    <h1 class="text-2xl font-bold">Orders</h1>
    <p :class="{ 'opacity-0': isNearPizzeria }" :aria-hidden="isNearPizzeria">Return to the pizzeria to get more orders</p>
  </div>

  <ul :class="['orders', { 'transform opacity-50': !isNearPizzeria }]">
    <Order v-for="order in orders" :key="order.id" :order="order" @change="toggleOrderSelection" />
  </ul>

  <button v-if="selected.length === 0" class="order-btn" @click="getNewOrder">Get New Order</button>
  <button v-else class="order-btn" @click="setDeliveries">
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
import Order from "../components/Order.vue";
import { mapState } from 'vuex'
import { ChevronDoubleRightIcon } from '@heroicons/vue/24/solid'

export default {
  name: "Home",
  components: {
    ChevronDoubleRightIcon,
    Order,
  },
  data() {
    return {
      latitude: null,
      longitude: null,
      locationAvailable: false,
      watcher: null,
      pizzeriaLat: 40.86233731197237,
      pizzeriaLon: -74.07808261920567,
      thresholdDistance: 50, // 50 meters as an example threshold
      intervalID: null,
      currentWaitTime: 0,
      selected: [],
      loading: false,
    };
  },
  computed: {
    ...mapState(['orders']),
    isNearPizzeria() {
      if (this.latitude && this.longitude) {
        const distance = this.getDistanceFromLatLonInM(
          this.latitude,
          this.longitude,
          this.pizzeriaLat,
          this.pizzeriaLon
        );
        return distance <= this.thresholdDistance;
      }
      return false;
    },
    orderSelected: {
      get() {
        return order => this.selected.includes(order.id);
      },
      set() {
        // This setter is required for v-model but we handle the change with the @change event so we leave this empty
      }
    },
  },
  async mounted() {
    this.getGeolocation();

    this.intervalID = setInterval(() => {
      this.checkAndUpdateOrderStatus();
    }, 500);
  },
  beforeDestroy() {
    // Clear the watcher when component is destroyed.
    if (this.watcher) {
      navigator.geolocation.clearWatch(this.watcher);
    }

    if (this.intervalID) {
      clearInterval(this.intervalID);
    }
  },
  methods: {
    getGeolocation() {
      if ("geolocation" in navigator) {
        // Watch position to keep updating the coordinates.
        this.watcher = navigator.geolocation.watchPosition(
          position => {
            this.latitude = position.coords.latitude;
            this.longitude = position.coords.longitude;
            this.locationAvailable = true;
          },
          error => {
            console.error(error.message);
            this.locationAvailable = false;
          },
          {
            enableHighAccuracy: true,
            timeout: 1000,
          }
        );
      } else {
        this.locationAvailable = false;
      }
    },
    getDistanceFromLatLonInM(lat1, lon1, lat2, lon2) {
      const R = 6371e3; // Radius of the Earth in meters
      const dLat = this.deg2rad(lat2 - lat1);
      const dLon = this.deg2rad(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(this.deg2rad(lat1)) *
          Math.cos(this.deg2rad(lat2)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c; // Distance in meters
    },
    deg2rad(deg) {
      return deg * (Math.PI / 180);
    },
    checkAndUpdateOrderStatus() {
      const baseWaitTime = 30 * 60 * 1000; // 30 minutes in milliseconds
      const multiplier = 1.1;

      // Calculate the additional wait time based on the number of orders
      const additionalWaitTime = this.orders.length > 6 
        ? baseWaitTime * (this.orders.length - 6) * multiplier 
        : 0;

      const totalWaitTime = baseWaitTime + additionalWaitTime;
      const cancellationTime = totalWaitTime + baseWaitTime;

      // keep track of the most recent wait time
      this.currentWaitTime = totalWaitTime;

      this.orders.forEach(order => {
        let newStatus = null;
        
        const timeSinceOrderPlaced = Date.now() - new Date(order.date_placed).getTime();

        if (order.refData.latitude && order.refData.longitude) {
          const distanceToOrder = this.getDistanceFromLatLonInM(
            this.latitude,
            this.longitude,
            order.refData.latitude,
            order.refData.longitude
          );

          if (distanceToOrder <= this.thresholdDistance) {
            newStatus = 'delivered';
          }
        }

        if (!newStatus && timeSinceOrderPlaced > cancellationTime) {
          newStatus = 'cancelled';
        } else if (timeSinceOrderPlaced > this.currentWaitTime) {
          newStatus = 'ready';
        }

        if (newStatus) {
          console.log(newStatus)
          this.$store.commit('UPDATE_ORDER_STATUS', {
            orderId: order.id,
            status: newStatus
          });
        }
      });
    },
    toggleOrderSelection(order) {
      const index = this.selected.findIndex(o => o.id === order.id);
      if (index > -1) {
        this.selected.splice(index, 1);
      } else {
        this.selected.push(order);
      }
    },
    setDeliveries() {
      this.$store.commit('SET_SELECTED_ORDERS', this.selected);

      this.$router.push('/deliveries');
    },
    getNewOrder() {
      this.loading = true;

      this.$store.dispatch('fetchNewOrder').then(() => {
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
    absolute bottom-0 left-0
    p-2
    rounded-tr
    font-bold
    text-xs
    text-white text-center
    bg-blue-700;
}

.locator {
  @apply 
    absolute bottom-0 right-0
    p-2
    rounded-tl
    font-bold
    text-xs
    text-white text-center;
}

.locator.store {
  @apply bg-green-500;
}

.locator.not-store {
  @apply bg-red-500;
}
</style>