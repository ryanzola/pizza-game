<template>
  <div class="hero">
    <!-- <img src="../assets/pizzeria.jpg" alt="the pizzeria storefront"> -->
    <h1>Bank</h1>
    <p class="mb-4">Balance: ${{ user.profile.bank_amount }}</p>
  </div>

  <ul v-if="selected_orders.lenght" class="space-y-2">
    <Order v-for="order in selected_orders" :key="order.id" :order="order" @change="toggleOrderSelection" />
  </ul>

  <p v-else>No orders selected</p>
</template>

<script>
import Order from "../components/Order.vue";
import { mapGetters } from 'vuex'

export default {
  name: 'Bank',
  components: {
    Order
  },
  computed: {
    ...mapGetters(['user', 'selected_orders'])
  },
  mounted() {
    console.log('user', this.user)
  },
  methods: {
    toggleOrderSelection(order) {
      console.log('toggleOrderSelection', order)
    },
  }
}
</script>

<style lang="postcss" scoped>
.hero {
  @apply p-4 pb-0
}

ul {
  @apply p-4 space-y-2
}
</style>