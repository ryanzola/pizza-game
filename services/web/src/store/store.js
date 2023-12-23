import { createStore } from 'vuex'
import { signOut } from "firebase/auth";
import auth from '../firebase/init'
import axios from 'axios'

const store = createStore({
  state () {
    return {
      user: null,
      user_token: null,
      bank: 50.00,
      orders: [],
      selected_orders: [],
      past_orders: [],
      debug_mode: true,
    }
  },
  getters: {
    user (state) {
      return state.user
    },
    bank (state) {
      return state.bank
    },
  },
  mutations: {
    TOGGLE_DEBUG_MODE(state) {
      state.debug_mode = !state.debug_mode
    },
    SET_USER (state, data) {
      state.user = data
    },
    SET_USER_TOKEN (state, token) {
      state.user_token = token
    },
    SET_BANK (state, bank) {
      state.bank = bank
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
    }
  }
})

export default store