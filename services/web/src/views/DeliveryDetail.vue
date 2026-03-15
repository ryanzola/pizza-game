<template>
  <div class="bg-[#000000] h-full flex flex-col text-white">

    <!-- Header with back button -->
    <div class="px-4 pt-6 pb-3 shrink-0 flex items-center gap-3">
      <button @click="goBack" class="w-10 h-10 bg-[#1c1c1e] border border-gray-800 rounded-xl grid place-content-center">
        <ChevronLeftIcon class="w-5 h-5 text-white" />
      </button>
      <h1 class="text-xl font-bold tracking-tight">Delivery Details</h1>
    </div>

    <!-- Scrollable content -->
    <div class="flex-1 overflow-y-auto px-4 pb-6 space-y-4">

      <!-- Map Container -->
      <div class="rounded-2xl overflow-hidden border border-gray-800 shadow-lg bg-[#1c1c1e] relative">
        <img
          v-if="order"
          :src="mapUrl"
          alt="Delivery location map"
          class="w-full h-52 object-cover"
          loading="eager"
        />
        <div v-else class="w-full h-52 bg-[#2c2c2e] animate-pulse"></div>

        <!-- Status pill overlay -->
        <span v-if="order" class="absolute top-3 right-3 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold leading-none tracking-wide backdrop-blur-md" :class="statusBadgeClasses">
          {{ formattedStatus }}
        </span>
      </div>

      <!-- Address Card -->
      <div v-if="order" class="bg-[#1c1c1e] rounded-2xl p-5 border border-gray-800 shadow-sm">
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
            <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          </div>
          <div class="flex flex-col">
            <p class="font-bold text-lg text-white capitalize">{{ order.address?.number }} {{ order.address?.street }}</p>
            <p class="text-sm text-gray-400 capitalize">{{ order.address?.town }}, NJ</p>
          </div>
        </div>
      </div>

      <!-- Order Info Card -->
      <div v-if="order" class="bg-[#1c1c1e] rounded-2xl p-5 border border-gray-800 shadow-sm space-y-4">
        <h2 class="text-base font-bold text-gray-300 uppercase tracking-wider">Order Info</h2>

        <div class="space-y-3">
          <!-- Items -->
          <div>
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Items</p>
            <ul class="flex flex-wrap gap-2">
              <li v-for="(item, i) in order.items" :key="i" class="bg-[#2c2c2e] text-gray-300 text-sm px-3 py-1.5 rounded-lg font-medium">
                {{ item }}
              </li>
            </ul>
          </div>

          <div class="w-full h-[1px] bg-gray-800"></div>

          <!-- Financial row -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Order Total</p>
              <p class="text-xl font-bold text-white">${{ Number(order.total_cost || 0).toFixed(2) }}</p>
            </div>
            <div>
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Your Tip</p>
              <p class="text-xl font-bold text-green-400">${{ Number(order.tip || 0).toFixed(2) }}</p>
            </div>
          </div>

          <div class="w-full h-[1px] bg-gray-800"></div>

          <!-- Timing row -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Placed</p>
              <p class="text-sm font-medium text-gray-300">{{ formatTimestamp(order.date_placed) }}</p>
            </div>
            <div v-if="order.date_delivered">
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Delivered</p>
              <p class="text-sm font-medium text-gray-300">{{ formatTimestamp(order.date_delivered) }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- VIP Badge -->
      <div v-if="order?.is_vip" class="bg-gradient-to-r from-amber-900/30 to-yellow-900/20 rounded-2xl p-4 border border-amber-700/40 flex items-center gap-3">
        <span class="text-3xl">💎</span>
        <div>
          <p class="font-bold text-amber-400">VIP Order</p>
          <p class="text-sm text-amber-500/80">This order has a boosted tip — 3x the standard rate!</p>
        </div>
      </div>

    </div>

    <!-- Sticky Bottom Action -->
    <div v-if="order" class="sticky mt-auto bottom-0 left-0 right-0 z-40 bg-[#121212]/90 backdrop-blur-xl border-t border-gray-800 pb-safe pt-3 px-4 rounded-t-3xl">
      <div class="max-w-md mx-auto flex flex-col gap-2 pb-4">
        <button @click="openInMaps" class="action-btn bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white shadow-lg shadow-blue-500/30">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path></svg>
          <span class="font-bold text-lg">Open in Maps</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useStore } from 'vuex';
import { ChevronLeftIcon } from '@heroicons/vue/24/solid';
import { db } from '../firebase/init';
import { doc, getDoc } from 'firebase/firestore';

const route = useRoute();
const router = useRouter();
const store = useStore();

const order = ref(null);
const orderId = computed(() => route.params.id);

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;

const mapUrl = computed(() => {
  if (!order.value) return '';
  const lat = order.value.latitude;
  const lon = order.value.longitude;
  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lon}&zoom=16&size=640x320&scale=2&maptype=roadmap&style=feature:all|element:geometry|color:0x242f3e&style=feature:all|element:labels.text.stroke|color:0x242f3e&style=feature:all|element:labels.text.fill|color:0x746855&style=feature:road|element:geometry|color:0x38414e&style=feature:road|element:geometry.stroke|color:0x212a37&style=feature:road.highway|element:geometry|color:0x746855&style=feature:road.highway|element:geometry.stroke|color:0x1f2835&style=feature:water|element:geometry|color:0x17263c&markers=color:red|${lat},${lon}&key=${apiKey}`;
});

const formattedStatus = computed(() => {
  return order.value?.status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
});

const statusBadgeClasses = computed(() => {
  switch (order.value?.status) {
    case 'queued': return 'bg-yellow-900/60 text-yellow-500';
    case 'en_route': return 'bg-blue-900/60 text-blue-400';
    case 'delivered': return 'bg-green-900/60 text-green-400';
    case 'cancelled': return 'bg-red-900/60 text-red-400';
    default: return 'bg-gray-800/80 text-gray-300';
  }
});

const formatTimestamp = (ts) => {
  let date;
  if (ts && typeof ts.toDate === 'function') {
    date = ts.toDate();
  } else if (ts && ts.seconds) {
    date = new Date(ts.seconds * 1000);
  } else {
    date = new Date(ts || Date.now());
  }
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const month = date.toLocaleString('en-US', { month: 'short' });
  const day = date.getDate();
  return `${month} ${day}, ${hours}:${minutes} ${ampm}`;
};

const goBack = () => {
  router.back();
};

const openInMaps = () => {
  if (!order.value) return;
  const lat = order.value.latitude;
  const lon = order.value.longitude;
  const address = order.value.address?.full_address || `${lat},${lon}`;

  // iOS detection
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  if (isIOS) {
    window.open(`maps://maps.apple.com/?daddr=${lat},${lon}&q=${encodeURIComponent(address)}`, '_blank');
  } else {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`, '_blank');
  }
};

onMounted(async () => {
  // First try to find the order in the Vuex store (already loaded)
  const storeOrder = store.state.orders.selected_orders?.find(o => o.id === orderId.value);
  
  if (storeOrder) {
    order.value = storeOrder;
  } else {
    // Fallback: fetch directly from Firestore
    try {
      const docSnap = await getDoc(doc(db, 'orders', orderId.value));
      if (docSnap.exists()) {
        order.value = { id: docSnap.id, ...docSnap.data() };
      }
    } catch (error) {
      console.error('Error fetching order:', error);
    }
  }
});
</script>

<style lang="postcss" scoped>
.action-btn {
  @apply 
    relative 
    flex items-center justify-center
    w-full 
    h-[56px]
    rounded-2xl
    transition-all duration-200
    active:scale-[0.97]
    active:opacity-80
    focus:outline-none
    select-none;
}

.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 1rem);
}
</style>
