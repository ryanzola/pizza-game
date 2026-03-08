<template>
  <li>
    <component :is="clickable ? 'div' : 'div'">
      <input v-if="!clickable" :id="`order-${order.id}`" type="checkbox" class="peer hidden" :disabled="isDisabled" v-model="isChecked" />
      <label 
        :for="clickable ? undefined : `order-${order.id}`" 
        @click="clickable ? navigateToDetail() : null"
        class="relative flex flex-col gap-3 p-4 bg-[#1c1c1e] border-2 shadow-sm rounded-2xl cursor-pointer transition-all duration-200"
        :class="[
          clickable 
            ? 'border-gray-800 hover:border-gray-700 active:scale-[0.98] active:bg-[#252528]' 
            : 'border-gray-800 hover:border-gray-700 peer-checked:border-blue-500 peer-checked:bg-blue-900/20 peer-checked:ring-4 peer-checked:ring-blue-900/30'
        ]">
      
        <!-- Selection Indicator (only in selection mode) -->
        <div v-if="!clickable" class="absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors" 
             :class="isChecked ? 'bg-blue-500 border-blue-500' : 'border-gray-600'">
          <svg v-if="isChecked" class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
        </div>

        <!-- Chevron (only in clickable mode) -->
        <div v-if="clickable" class="absolute top-4 right-4 w-6 h-6 flex items-center justify-center">
          <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
        </div>

        <div v-if="debug_mode && !clickable" class="bg-yellow-900/40 text-yellow-500 text-xs px-3 py-2 rounded-xl flex gap-4 font-mono mb-1 mr-8">
          <p><strong>Lat:</strong> {{ order.latitude.toFixed(4) }}</p>
          <p><strong>Lng:</strong> {{ order.longitude.toFixed(4) }}</p>
        </div>

        <div class="flex flex-col pr-8">
          <div class="flex justify-between items-start mb-1">
            <p class="font-bold text-lg text-white leading-tight capitalize">
              {{ order.address ? `${order.address.number} ${order.address.street}` : order.address_name }}
            </p>
          </div>
          <p class="text-sm text-gray-400 capitalize">{{ order.address ? order.address.town : order.town }}</p>
        </div>
        
        <div class="border-t border-gray-800 pt-3 flex justify-between items-center mt-1">
          <div class="flex items-center gap-2">
             <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
             <p class="text-sm font-medium text-gray-400">{{ formattedDate }}</p>
          </div>
          <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold leading-none tracking-wide" :class="statusBadgeClasses">
            {{ formattedStatus }}
          </span>
        </div>

        <ul class="flex flex-wrap gap-2 mt-2">
          <li v-for="(item, index) in order.items" :key="index" class="bg-gray-800 text-gray-300 text-xs px-2.5 py-1 rounded-md font-medium">
            {{ item }}
          </li>
        </ul>

      </label>
    </component>
  </li>
</template>

<script setup>
import { computed } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';

const store = useStore();
const router = useRouter();

const props = defineProps({
  order: {
    type: Object,
    required: true,
  },
  selected: {
    type: Boolean,
    default: false
  },
  clickable: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['change']);

const debug_mode = computed(() => store.state.debug_mode);

const isChecked = computed({
  get() { return props.selected; },
  set() { emit('change', props.order.id); }
});

const isDisabled = computed(() => false);

const formattedDate = computed(() => {
  let date;
  const dp = props.order.date_placed;
  if (dp && typeof dp.toDate === 'function') {
    date = dp.toDate();
  } else if (dp && dp.seconds) {
    date = new Date(dp.seconds * 1000);
  } else {
    date = new Date(dp || Date.now());
  }
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
});

const formattedStatus = computed(() => {
  return props.order.status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
});

const statusBadgeClasses = computed(() => {
  switch (props.order.status) {
    case 'queued': return 'bg-yellow-900/30 text-yellow-500';
    case 'en_route': return 'bg-blue-900/30 text-blue-400';
    case 'delivered': return 'bg-green-900/30 text-green-400';
    case 'cancelled': return 'bg-red-900/30 text-red-400';
    default: return 'bg-gray-800 text-gray-300';
  }
});

const navigateToDetail = () => {
  router.push(`/deliveries/${props.order.id}`);
};
</script>

<style lang="postcss" scoped>
</style>