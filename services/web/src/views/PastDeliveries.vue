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
import { db } from '../firebase/init';
import { collection, query, where, getDocs } from 'firebase/firestore';

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
    try {
      const uid = this.$store.state.user?.uid;
      if (!uid) return;

      const q = query(
        collection(db, 'orders'),
        where('user_id', '==', uid),
        where('status', '==', 'delivered')
      );
      
      const querySnapshot = await getDocs(q);
      const pastOrders = [];
      querySnapshot.forEach((doc) => {
        pastOrders.push({ id: doc.id, ...doc.data() });
      });
      
      this.orders = pastOrders;
    } catch (error) {
      console.error(error)
    }
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