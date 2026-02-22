<template>
  <li>
    <input :id="`order-${order.id}`" type="checkbox" class="peer hidden" :disabled="isDisabled" v-model="isChecked" />
    <label :for="`order-${order.id}`" 
      class="relative flex flex-col gap-3 p-4 bg-[#1c1c1e] border-2 border-gray-800 shadow-sm rounded-2xl cursor-pointer transition-all duration-200 hover:border-gray-700 peer-checked:border-blue-500 peer-checked:bg-blue-900/20 peer-checked:ring-4 peer-checked:ring-blue-900/30">
      
      <!-- Selection Indicator -->
      <div class="absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors" 
           :class="isChecked ? 'bg-blue-500 border-blue-500' : 'border-gray-600'">
        <svg v-if="isChecked" class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
      </div>

      <div v-if="debug_mode" class="bg-yellow-900/40 text-yellow-500 text-xs px-3 py-2 rounded-xl flex gap-4 font-mono mb-1 mr-8">
        <p><strong>Lat:</strong> {{ order.latitude.toFixed(4) }}</p>
        <p><strong>Lng:</strong> {{ order.longitude.toFixed(4) }}</p>
      </div>

      <div class="flex flex-col pr-8">
        <div class="flex justify-between items-start mb-1">
          <p class="font-bold text-lg text-white leading-tight">{{ order.address_name }}</p>
        </div>
        <p class="text-sm text-gray-400 capitalize">{{ order.town }}</p>
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
  </li>
</template>

<script>
import { mapState } from 'vuex';
import VueMarkdown from 'vue-markdown-render'

export default {
  name: 'Order',
  components: {
    VueMarkdown
  },
  emits: ['change'],
  props: {
    order: {
      type: Object,
      required: true,
    },
    selected: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    ...mapState(['debug_mode']),
    isChecked: {
      get() {
        return this.selected;
      },
      set() {
        this.$emit('change', this.order.id);
      }
    },
    isDisabled() {
      return false;
    },
    formattedDate() {
      const date = new Date(this.order.date_placed);
      let hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      
      hours = hours % 12;
      hours = hours ? hours : 12;
      
      return `${hours}:${minutes} ${ampm}`;
    },
    formattedStatus() {
      return this.order.status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    },
    statusBadgeClasses() {
      switch (this.order.status) {
        case 'queued':
          return 'bg-yellow-900/30 text-yellow-500';
        case 'en_route':
          return 'bg-blue-900/30 text-blue-400';
        case 'delivered':
          return 'bg-green-900/30 text-green-400';
        case 'cancelled':
          return 'bg-red-900/30 text-red-400';
        default:
          return 'bg-gray-800 text-gray-300';
      }
    }
  }
};
</script>

<style lang="postcss" scoped>
</style>