import { createStore } from 'vuex'
import { signOut } from "firebase/auth";
import auth from '../firebase/init'
import axios from 'axios'
import location from './location';
import orders from './orders';

import createPersistedState from "vuex-persistedstate";

const store = createStore({
  modules: {
    location,
    orders,
  },
  state () {
    return {
      user: null,
      debug_mode: true,
      version: '1.07.07.16.40'
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
    SET_BANK (state, bank_amount) {
      state.user.bank_amount = bank_amount
    },
    SET_SAVINGS(state, savings_amount) {
      state.user.savings_amount = savings_amount
    }
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
    async fetchSavings({ commit}) {
      try {
        const { data } = await axios.get('/auth/get_savings/')

        commit('SET_SAVINGS', data)
      } catch (error) {
        console.error('Failed to fetch savings:', error)
        throw error
      }
    },
    async update_savings({ commit }) {
      try {
        const { data } = await axios.post('/auth/update_savings/')

        commit('SET_SAVINGS', data)
        commit('SET_BANK', 0)
      } catch (error) {
        console.error('Failed to deposit:', error)
        throw error // or handle it differently if needed
      }
    },
    async fetchBank({ commit }) {
      try {
        const { data } = await axios.get('/auth/get_bank/')

        commit('SET_BANK', data)
      } catch (error) {
        console.error('Failed to fetch bank:', error)
        throw error
      }
    },
    async update_bank({ commit }, tip) {
      try {
        const { data } = await axios.post('/auth/update_bank/', {
          amount: tip
        }) 

        commit('SET_BANK', data)
      } catch (error) {
        console.error('Failed to withdraw:', error)
        throw error // or handle it differently if needed
      }
    }
  },
  plugins: [createPersistedState({
    paths: ['user', 'debug_mode'] // Specify only the state you want to persist
  })],
})

export default store