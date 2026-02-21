import axios from 'axios';
import { getDistanceFromLatLonInM } from './storeUtils';

const baseWaitTime = 30 * 60 * 1000; // 30 minutes in milliseconds

const state = {
  orders: [],
  selected_orders: [],
  waitTime: baseWaitTime,
  isUpdating: false,
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
  SET_ORDERS(state, orders = []) {
    state.orders = state.orders.concat(orders);
  },
  SET_SELECTED_ORDERS(state, orders) {
    state.selected_orders = state.selected_orders.concat(orders);
  },
  UPDATE_ORDERS(state, updatedOrders) {
    updatedOrders.forEach(orderId => {
      const order = state.orders.find(order => order.id === orderId);

      if (order) order.user = state.user;
    });
  },
  REMOVE_QUEUED_ORDERS(state) {
    state.orders = state.orders.filter(order => order.status !== 'queued');
  },
}

const actions = {
  checkAndUpdateOrderStatus({ state, commit, rootState }) {
    // only orders with status of 'pending' or 'en_route' are checked
    const filteredOrders = state.selected_orders.filter(order => ['pending', 'en_route'].includes(order.status));
    const multiplier = 1.1;

    const additionalWaitTime = filteredOrders.length > 6
      ? baseWaitTime * (filteredOrders.length - 6) * multiplier
      : 0;

    const totalWaitTime = baseWaitTime + additionalWaitTime;
    const cancellationTime = totalWaitTime + baseWaitTime;

    state.waitTime = totalWaitTime;

    const playerLatitude = rootState.location.player.latitude;
    const playerLongitude = rootState.location.player.longitude;


    filteredOrders.forEach(async order => {
      let newStatus = null;
      const timeSinceOrderPlaced = Date.now() - new Date(order.date_placed).getTime();

      if (order.latitude && order.longitude) {
        const distanceToOrder = getDistanceFromLatLonInM(
          playerLatitude,
          playerLongitude,
          order.latitude,
          order.longitude
        );

        if (distanceToOrder <= rootState.location.thresholdDistance) {
          newStatus = 'delivered';
        }
      }

      if (!newStatus && timeSinceOrderPlaced > cancellationTime) {
        newStatus = 'cancelled';
      }

      if (newStatus && !state.isUpdating) {
        state.isUpdating = true;

        try {
          await axios.post(`order/update_order_status/${order.id}/`, {
            status: newStatus
          });

          commit('UPDATE_ORDER_STATUS', { orderId: order.id, status: newStatus });

        } catch (error) {
          console.error('Failed to update order status:', error);
          throw error; // or handle it differently if needed
        } finally {
          state.isUpdating = false
        }
      }
    });
  },
  async fetchNewOrder({ commit }) {
    try {
      const { data } = await axios.get('order/get_order/')

      console.log('New order:', data)

      commit('SET_ORDERS', [data])
    } catch (error) {
      console.error('Failed to fetch new order:', error)
      throw error
    }
  },
  async fetchOrders({ commit, state }, { since } = {}) {
    try {
      const params = {}
      if (since) params.since = since
      const { data } = await axios.get('order/get_orders/', { params })

      // check for duplicate orders by id
      const newOrders = data.orders.filter(o => !state.orders.some(so => so.id === o.id))

      commit('SET_ORDERS', newOrders)
    } catch (error) {
      console.error('Failed to fetch orders:', error)
      throw error // or handle it differently if needed
    }
  },
  async attachUserToOrders({ commit }, orderIds) {
    try {
      const response = await axios.post('order/attach_user_to_orders/', {
        order_ids: orderIds
      });
      commit('UPDATE_ORDERS', response.data.updated_orders);
      return response.data;
    } catch (error) {
      console.error('Error attaching user to orders:', error);
      throw error;
    }
  },
  async fetchSelectedOrders({ commit }) {
    try {
      const { data } = await axios.get('order/get_user_orders/')

      // check for duplicate orders by id
      const newOrders = data.orders.filter(o => !state.selected_orders.some(so => so.id === o.id))

      commit('SET_SELECTED_ORDERS', newOrders)
    } catch (error) {
      console.error('Failed to fetch selected orders:', error)
      throw error
    }
  },
  async clearQueuedOrders({ commit }) {
    try {
      await axios.post('order/clear_queued_orders/');
      commit('REMOVE_QUEUED_ORDERS');
    } catch (error) {
      console.error('Error clearing queued orders:', error);
      throw error;
    }
  }
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
