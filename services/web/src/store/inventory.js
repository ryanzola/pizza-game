import { db } from '../firebase/init';
import { doc, onSnapshot } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase/init';

const functions = getFunctions(app, 'us-central1');

let inventoryUnsubscribe = null;

const RESOURCE_KEYS = [
  'dough', 'cheese', 'proteins', 'produce',
  'pasta', 'fry_oil', 'beverages', 'desserts', 'bread'
];

const state = {
  inventory: null,
  loading: true,
  isRestocking: false,
};

const mutations = {
  SET_INVENTORY(state, inventory) {
    state.inventory = inventory;
    state.loading = false;
  },
  SET_LOADING(state, loading) {
    state.loading = loading;
  },
  SET_RESTOCKING(state, isRestocking) {
    state.isRestocking = isRestocking;
  },
};

const actions = {
  listenToInventory({ commit }) {
    if (inventoryUnsubscribe) return;

    const inventoryRef = doc(db, 'pizzeria', 'inventory');

    inventoryUnsubscribe = onSnapshot(inventoryRef, (docSnap) => {
      if (docSnap.exists()) {
        commit('SET_INVENTORY', docSnap.data());
      } else {
        commit('SET_INVENTORY', null);
      }
    }, (error) => {
      console.error('Error listening to inventory:', error);
      commit('SET_LOADING', false);
    });
  },

  stopListeningToInventory() {
    if (inventoryUnsubscribe) {
      inventoryUnsubscribe();
      inventoryUnsubscribe = null;
    }
  },

  async restockItems({ commit }, { items, source }) {
    commit('SET_RESTOCKING', true);
    try {
      const restockInventory = httpsCallable(functions, 'restockInventory');
      const result = await restockInventory({ items, source });
      return result.data;
    } catch (error) {
      console.error('Error restocking:', error);
      throw error;
    } finally {
      commit('SET_RESTOCKING', false);
    }
  },
};

const getters = {
  inventory: (state) => state.inventory,
  loading: (state) => state.loading,
  isRestocking: (state) => state.isRestocking,

  // Returns 'ok', 'low', or 'out'
  stockStatus: (state) => {
    if (!state.inventory) return 'ok';
    for (const key of RESOURCE_KEYS) {
      const res = state.inventory[key];
      if (res && res.current <= 0) return 'out';
    }
    for (const key of RESOURCE_KEYS) {
      const res = state.inventory[key];
      if (res && res.max > 0 && (res.current / res.max) <= 0.2) return 'low';
    }
    return 'ok';
  },

  isOutOfStock: (state, getters) => getters.stockStatus === 'out',
  isLowStock: (state, getters) => getters.stockStatus === 'low' || getters.stockStatus === 'out',

  depletedResources: (state) => {
    if (!state.inventory) return [];
    return RESOURCE_KEYS.filter((key) => {
      const res = state.inventory[key];
      return res && res.current <= 0;
    });
  },

  lowStockResources: (state) => {
    if (!state.inventory) return [];
    return RESOURCE_KEYS.filter((key) => {
      const res = state.inventory[key];
      return res && res.max > 0 && (res.current / res.max) <= 0.2;
    });
  },
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters,
};
