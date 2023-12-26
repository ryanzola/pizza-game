import { createStore } from 'vuex'
import { signOut } from "firebase/auth";
import auth from '../firebase/init'
import axios from 'axios'

import createPersistedState from "vuex-persistedstate";

const store = createStore({
  state () {
    return {
      user: null,
      orders: [],
      selected_orders: [],
      past_orders: [],
      debug_mode: true,
    }
  },
  getters: {
    isAuthenticated (state) {
      return !!state.user
    },
    user (state) {
      return state.user
    },
    bank_amount (state) {
      return state.user.bank_amount
    },
    savings_amount (state) {
      return state.user.savings_amount
    },
    selected_orders (state) {
      return state.selected_orders
    }
  },
  mutations: {
    TOGGLE_DEBUG_MODE(state) {
      state.debug_mode = !state.debug_mode
    },
    SET_USER (state, data) {
      state.user = data
    },
    SET_USER_TOKEN (state, token) {
      axios.defaults.headers.common['Authorization'] = `Token ${token}`;
      state.user_token = token
    },
    SET_BANK (state, { bank_amount, savings_amount }) {
      state.user.bank_amount = bank_amount
      state.user.savings_amount = savings_amount
    },
    SET_ORDERS (state, orders) {
      state.orders = [...state.orders, ...orders];
    },
    SET_SELECTED_ORDERS (state, orders) {
      state.selected_orders = orders;
    },
    UPDATE_ORDER_STATUS(state, orderUpdate) {
      const order = state.orders.find(o => o.id === orderUpdate.orderId);
      if (order) {
          order.status = orderUpdate.status;
      }
    },
  },
  actions: {
    async logOut({ commit }){
      try {
        console.log("Signing out...");
        await signOut(auth);
        console.log("Signed out successfully.");
        commit('SET_USER', null);
        commit('SET_USER_TOKEN', null);

        localStorage.removeItem('vuex');
        localStorage.removeItem('userToken');
      }
      catch (error) {
        console.error("Error during sign out:", error);
        throw error;
      }
    },
    async fetchUser({ commit }, user) {
      if (user) {
        commit("SET_USER", user);
      } else {
        commit("SET_USER", null);
      }
    },
    async fetchNewOrder({ commit }) {
      try {
        const { data } = await axios.get('order/get_order/')

        console.log(data)

        const newOrder = {
          id: Math.floor(Math.random() * 1000000),
          date_placed: new Date(),
          status: 'pending',
          items: data.items,
          total: data.total_cost,
          tip: data.tip,
          refData: {
            address_name: `${data.address} ${data.street}`,
            town: `${data.town.replace('_', ' ')}`,
            latitude: data.latitude,
            longitude: data.longitude,
          }
        }

        commit('SET_ORDERS', [newOrder])
      } catch (error) {
        console.error('Failed to fetch new order:', error)
        throw error // or handle it differently if needed
      }
    },
    async set_savings({ commit }) {
      try {
        const { data } = await axios.post('/auth/set_savings/')

        commit('SET_BANK', data)
      } catch (error) {
        console.error('Failed to deposit:', error)
        throw error // or handle it differently if needed
      }
    },
  },
  plugins: [createPersistedState({
    paths: ['user', 'debug_mode'] // Specify only the state you want to persist
  })],
})

export default store