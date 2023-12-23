<template>
  <div class="p-4">
    <h1 class="text-2xl mb-4 font-bold">Past Deliveries</h1>
  
    <ul>
      <Order v-for="order in orders" :key="order.id" :order="order" />
    </ul>
  </div>
</template>

<script>
import Order from "../components/Order.vue";

export default {
  name: 'PastDeliveries',
  components: {
    Order
  },
  data() {
    return {
      orders: []
    };
  },
  async mounted() {
    const { data } = await this.$axios.get('/past_orders/')
    this.orders = data
  },
}
</script>

<style lang="postcss" scoped>
ul {
  @apply 
    flex flex-col gap-4 
    transition-all duration-200 ease-in-out;
}
</style>