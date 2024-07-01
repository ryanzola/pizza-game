import axios from 'axios';
import { getDistanceFromLatLonInM } from './storeUtils';

const state = {
  orders: [],
}

const mutations = {
  UPDATE_ORDER_STATUS(state, { orderId, status }) {
    const order = state.orders.find(o => o.id === orderId);
    if (order) {
      order.status = status;
    }
  },
  ADD_ORDER(state, order) {
    state.orders.push(order);
  },
  REMOVE_ORDER(state, orderId) {
    state.orders = state.orders.filter(o => o.id !== orderId);
  },
  SELECT_ORDER(state, orderId) {
    state.selected_orders.push(orderId);
  },
  SET_ORDERS(state, orders) {
    state.orders = orders;
  },
  SET_SELECTED_ORDERS(state, orders) {
    state.selected_orders = orders;
  }
}

const actions = {
  checkAndUpdateOrderStatus({ state, getters, commit, rootState }) {
    const baseWaitTime = 30 * 60 * 1000; // 30 minutes in milliseconds
    const multiplier = 1.1;

    const additionalWaitTime = state.orders.length > 6 
      ? baseWaitTime * (state.orders.length - 6) * multiplier 
      : 0;

    const totalWaitTime = baseWaitTime + additionalWaitTime;
    const cancellationTime = totalWaitTime + baseWaitTime;

    const playerLatitude = rootState.location.player.latitude;
    const playerLongitude = rootState.location.player.longitude;

    state.orders.forEach(order => {
      let newStatus = null;
      const timeSinceOrderPlaced = Date.now() - new Date(order.date_placed).getTime();

      if (order.refData.latitude && order.refData.longitude) {
        const distanceToOrder = getDistanceFromLatLonInM(
          playerLatitude,
          playerLongitude,
          order.refData.latitude,
          order.refData.longitude
        );

        if (distanceToOrder <= state.thresholdDistance) {
          newStatus = 'delivered';
        }
      }

      if (!newStatus && timeSinceOrderPlaced > cancellationTime) {
        newStatus = 'cancelled';
      } else if (timeSinceOrderPlaced > totalWaitTime) {
        newStatus = 'ready';
      }

      if (newStatus) {
        commit('UPDATE_ORDER_STATUS', {
          orderId: order.id,
          status: newStatus
        });
      }
    });
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
}

const getters = {
  orders: state => state.orders,
  selectedOrders: state => state.selected_orders,
  orderById: state => id => state.orders.find(o => o.id === id),
}

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters,
}