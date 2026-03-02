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
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';

export default {
  name: 'PastDeliveries',
  components: {
    Order
  },
  data() {
    return {
      orders: [],
      unsubscribe: null
    };
  },
  watch: {
    '$store.state.user': {
      immediate: true,
      handler(user) {
        if (user && user.uid) {
          this.fetchOrders(user.uid);
        } else {
          this.orders = [];
          if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
          }
        }
      }
    }
  },
  methods: {
    fetchOrders(uid) {
      if (this.unsubscribe) {
        this.unsubscribe();
      }
      
      const q = query(
        collection(db, 'orders'),
        where('user_id', '==', uid),
        where('status', '==', 'delivered'),
        orderBy('date_delivered', 'desc')
      );
      
      this.unsubscribe = onSnapshot(q, (snapshot) => {
        const pastOrders = [];
        snapshot.forEach((doc) => {
          pastOrders.push({ id: doc.id, ...doc.data() });
        });
        this.orders = pastOrders;
      }, (error) => {
        console.error("Error fetching past deliveries:", error);
      });
    }
  },
  unmounted() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}
</script>

<style lang="postcss" scoped>
ul {
  @apply 
    flex flex-col gap-4 
    transition-all duration-200 ease-in-out;
}
</style>