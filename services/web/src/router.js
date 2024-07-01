import { createRouter, createWebHistory } from 'vue-router'
import Signin from './views/Signin.vue'
import Home from './views/Home.vue'
import Deliveries from './views/Deliveries.vue'
import Bank from './views/Bank.vue'
import Info from './views/Info.vue'
import PastDeliveries from './views/PastDeliveries.vue'

import store from './store/store.js'

const routes = [
  { path: '/signin', component: Signin },
  {
    path: '/',
    component: Home,
    meta: { requiresAuth: true },
  },
  {
    path: '/deliveries',
    component: Deliveries,
    meta: { requiresAuth: true },
  },
  {
    path: '/bank',
    component: Bank,
    meta: { requiresAuth: true },
  },
  { 
    path: '/info', 
    component: Info,
    meta: { requiresAuth: true },
  },
  {
    path: '/info/past-deliveries',
    component: PastDeliveries,
    meta: { requiresAuth: true },
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  if (to.matched.some(record => record.meta.requiresAuth)) {
    if (!store.getters.isAuthenticated) {
      next('/signin'); // Redirect to home or login page
    } else {
      next(); // Proceed to route
    }
  } else {
    next(); // Does not require auth, make sure to always call next() dumb-dumb!
  }
})

export default router
