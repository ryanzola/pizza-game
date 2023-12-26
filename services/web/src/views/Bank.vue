<template>
  <div class="hero flex-1">
    <!-- <img src="../assets/pizzeria.jpg" alt="the pizzeria storefront"> -->
    <h1>Bank</h1>
    <p class="mb-4">Savings: ${{ savings_amount }}</p>
    <p class="mb-4">Current: ${{ bank_amount }}</p>
    <div class="progress-bar">
      <div class="progress" :style="{ width: (bank_amount / 200) * 100 + '%', backgroundColor: bank_amount >= 180 ? 'red' : 'green' }"></div>
    </div>

  </div>
  <div class="p-2">
    <button class="w-full bg-green-700" @click="deposit">Deposit</button>
  </div>
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
    ...mapGetters(['bank_amount', 'savings_amount'])
  },
  methods: {
    deposit() {
      this.$store.dispatch('set_savings')
    }
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

.progress-bar {
  @apply w-full h-5 bg-gray-200 rounded-full overflow-hidden;
}

.progress {
  @apply h-full rounded-full;
}
</style>
