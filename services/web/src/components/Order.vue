<template>
  <li>
    <input :id="`order-${order.id}`" type="checkbox" class="hidden" :disabled="isDisabled" v-model="isChecked" @change="onChange" />
    <label :for="`order-${order.id}`">
      <p class="address">{{ order.refData.address_name }}</p>
      <p class="town">{{ order.refData.town || '' }}</p>
      <p class="time">{{ formattedDate }}</p>
      <p :class="['status', order.status]">{{ order.status }}</p>

      <div v-if="$store.state.debug_mode">
        <!-- display lat and lon -->
        <p class="flex justify-between">
          <span>Latitude:</span> 
          <span>{{ order.refData.latitude.toFixed(4) }}</span>
        </p>
        <p class="flex justify-between gap-2">
          <span>Longitude:</span> 
          <span>{{ order.refData.longitude.toFixed(4) }}</span>
        </p>
      </div>

      <vue-markdown 
        :source="order.items"
        oprions="{ html: true }"
        class="items"
      >
      </vue-markdown>
    </label>
  </li>
</template>

<script>
import VueMarkdown from 'vue-markdown-render'

export default {
  name: 'Order',
  components: {
    VueMarkdown
  },
  props: {
    order: {
      type: Object,
      required: true,
    },
    value: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    isChecked: {
      get() {
        return this.value;
      },
      set(newValue) {
        this.$emit('input', newValue);
      }
    },
    isDisabled() {
      return false
      // return this.order.status === 'delivered' || this.order.status === 'pending';
    },
    formattedDate() {
      const date = new Date(this.order.date_placed);
      let hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      
      hours = hours % 12;
      hours = hours ? hours : 12; // the hour '0' should be '12'
      
      return `${hours}:${minutes} ${ampm}`;
    }
  },
  mounted() {
    console.log(this.order)
  },
  methods: {
    onChange() {
      this.$emit('change', this.order);
    }
  }
};
</script>

<style lang="postcss" scoped>
li label {
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: repeat(3, auto);
  @apply 
    relative
    border border-white 
    rounded
    p-4
    pr-3
    overflow-hidden;;
}

li input[type="checkbox"]:checked + label {
  @apply bg-white bg-opacity-20;
}

.address {
  @apply 
    font-bold;
}

.town {
  @apply 
    mb-2
    row-start-2 
    text-xs 
    capitalize;
}

.time {
  @apply 
    col-start-2 row-start-1 
    text-xs text-right
    text-gray-500;
}

.items {
  @apply 
    col-start-1 col-span-2
    text-xs
    text-gray-500;
}

.status {
  @apply
    absolute
    min-w-[72.06px]
    right-0 bottom-0
    text-white
    text-center
    rounded-tl
    font-bold
    text-xs
    p-2;
}

.status.ready {
  @apply bg-blue-500;
}

.status.delivered {
  @apply bg-green-500;
}

.status.pending {
  @apply bg-yellow-500;
}

.status.cancelled {
  @apply bg-red-500;
}
</style>