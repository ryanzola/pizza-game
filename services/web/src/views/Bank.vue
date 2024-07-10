<template>
  <div class="hero">
    <p class="absolute top-0 right-0 bg-black bg-opacity-40 text-xs p-1 rounded-bl z-10">v{{ version }}</p>

    <div class="locator store" v-if="isNearBank">
      You are at the bank
    </div>

    <div class="locator not-store" v-if="!isNearBank">
      You are not at the bank
    </div>
  </div>
  <div class="flex-1">
    <DebugLocation />
    <div class="p-4">
      <p class="mb-4">Savings: ${{ savings_amount }}</p>
      <p class="mb-4">Current: ${{ bank_amount }}</p>
      <div class="progress-bar">
        <div class="progress" :style="{ width: (bank_amount / 200) * 100 + '%', backgroundColor: bank_amount >= 180 ? 'red' : 'green' }"></div>
      </div>
    </div>
  </div>

  <button v-if="debug_mode || isNearBank" class="w-full bg-green-700 py-4" @click="deposit">Deposit</button>
  <p v-else class="w-full bg-gray-700 py-4 text-center">Head to the bank to deposit</p>
</template>



<script>
import DebugLocation from "../components/DebugLocation.vue";
import Order from "../components/Order.vue";
import { mapActions, mapGetters, mapState } from 'vuex'

export default {
  name: 'Bank',
  components: {
    DebugLocation,
    Order
  },
  computed: {
    ...mapState(['debug_mode']),
    ...mapGetters(['bank_amount', 'savings_amount']),
    ...mapGetters('location', ['isNearBank']),
    ...mapState(['version'])
  },
  async mounted() {
    console.log("mounted")
    await this.fetchSavings()
    await this.fetchBank()
  },
  methods: {
    ...mapActions(['update_savings', 'fetchSavings', 'fetchBank']),
    deposit() {
      if(this.bank_amount > 0) {
        this.update_savings()
      } else {
        console.warn('ya broke!')
      }
    }
  }
}
</script>

<style lang="postcss" scoped>
.hero {
  @apply 
  relative 
  h-56 md:h-80
  overflow-hidden;

  background-image: url('../assets/wf.jpeg');
  background-size: cover;
  background-position: center;
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
