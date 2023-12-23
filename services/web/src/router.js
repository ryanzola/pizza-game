import { createRouter, createWebHistory } from 'vue-router'
import Home from './views/Home.vue'
import Deliveries from './views/Deliveries.vue'
import Bank from './views/Bank.vue'
import Info from './views/Info.vue'
import PastDeliveries from './views/PastDeliveries.vue'

const routes = [
  { path: '/', component: Home },
  { path: '/deliveries', component: Deliveries },
  { path: '/bank', component: Bank },
  { path: '/info', component: Info },
  { path: '/info/past-deliveries', component: PastDeliveries }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
