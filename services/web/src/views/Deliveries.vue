<template>
  <div class="deliveries-container">
    <div class="order-toggle">
      <button @click="showActive = true" :class="{ 'active': showActive }">Active</button>
      <button @click="showActive = false" :class="{ 'active': !showActive }">Completed</button>
    </div>
    <ul v-if="showActive" class="orders-list flex flex-col gap-4">
      <Order v-for="order in activeOrders" :key="order.id" :order="order" />
    </ul>
    <ul v-else class="orders-list flex flex-col-reverse gap-4">
      <Order v-for="order in completedOrders" :key="order.id" :order="order" />
    </ul>
  </div>
</template>

<script>
import Order from "../components/Order.vue";
import { mapState, mapActions } from 'vuex'

export default {
  name: "Deliveries",
  components: {
    Order,
  },
  data() {
    return {
      showActive: true,
    }
  },
  computed: {
    ...mapState('orders', ['selected_orders']),
    activeOrders() {
      return this.selected_orders.filter(order => order.status !== 'delivered' && order.status !== 'cancelled');
    },
    completedOrders() {
      return this.selected_orders.filter(order => order.status === 'delivered' || order.status === 'cancelled');
    },
  },
  async mounted() {
    await this.fetchSelectedOrders();
  },
  methods: {
    ...mapActions('orders', ['fetchSelectedOrders']),
  },
};
</script>

<style scoped>
.deliveries-container {
  @apply flex flex-col h-full;
}

.order-toggle {
  @apply w-full grid grid-cols-2 gap-4 p-4 bg-black bg-opacity-20 mb-4;
}

.orders-list {
  @apply flex flex-col gap-4 flex-1 overflow-y-scroll p-4 pt-0;
}
</style>
