<template>
  <div class="hero">
    <!-- <img src="../assets/pizzeria.jpg" alt="the pizzeria storefront"> -->
    <h1>Bank</h1>
    <p class="mb-4">Balance: ${{ user.profile.bank_amount.toFixed(2) }}</p>
  </div>

  <ul class="space-y-2">
    <Order v-for="order in selected_orders" :key="order.id" :order="order" @change="toggleOrderSelection" />
  </ul>
</template>

<script>
import Order from "../components/Order.vue";
import { mapState } from 'vuex'

export default {
  name: 'Bank',
  components: {
    Order
  },
  computed: {
    ...mapState(['user', 'selected_orders'])
  },
  mounted() {
    // get bank from the vuex store
    // if the bank is null, redirect to the home page
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