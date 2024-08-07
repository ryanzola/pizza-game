<template>
  <li>
    <input :id="`order-${order.id}`" type="checkbox" class="hidden" :disabled="isDisabled" v-model="isChecked" @change="onChange" />
    <label :for="`order-${order.id}`" :class="debug_mode ? 'pt-0' : 'pt-2'">
      <div v-if="debug_mode" class="bg-yellow-500 text-black p-2 flex gap-4">
        <p>
          <strong>Latitude:</strong> {{ order.latitude.toFixed(4) }}
        </p>
        <p>
          <strong>Longitude:</strong> {{ order.longitude.toFixed(4) }}
        </p>
      </div>

      <div class="address-info px-2 grid grid-cols-2">
        <p class="address">{{ order.address_name }}</p>
        <p class="town">{{ order.town }}</p>
        <p class="time">{{ formattedDate }}</p>
        <p :class="['status', order.status]">{{ formattedStatus }}</p>
      </div>

      <vue-markdown 
        v-if="typeof order.items === 'string'"
        :source="order.items"
        oprions="{ html: true }"
        class="items"
      >
      </vue-markdown>

      <ul v-else class="items">
        <li v-for="item, index in order.order_items" :key="index">
          <p>{{ item }}</p>
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
  emits: ['change', 'input'],
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
    ...mapState(['debug_mode']),
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
    },
    formattedStatus() {
      // remove underscores and capitalize
      return this.order.status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  },
  methods: {
    onChange() {
      this.$emit('change', this.order.id);
    }
  }
};
</script>

<style lang="postcss" scoped>
li label {
  @apply 
    relative
    flex flex-col gap-2
    border border-white 
    rounded
    overflow-hidden;
}

li input[type="checkbox"]:checked + label {
  @apply bg-white bg-opacity-20;
}

.address {
  @apply 
    font-bold col-start-1;
}

.town {
  @apply
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
    px-2 pb-2
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

.status.queued {
  @apply bg-yellow-500;
}

.status.en_route {
  @apply bg-blue-500;
}

.status.delivered {
  @apply bg-green-500;
}

.status.cancelled {
  @apply bg-red-500;
}
</style>