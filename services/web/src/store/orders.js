import { getDistanceFromLatLonInM } from './storeUtils';
import { db } from '../firebase/init';
import { collection, doc, query, where, getDocs, updateDoc, writeBatch, onSnapshot, serverTimestamp } from 'firebase/firestore';

const baseWaitTime = 30 * 60 * 1000; // 30 minutes in milliseconds

let queuedOrdersUnsubscribe = null;

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
    const selectedOrder = state.selected_orders.find(o => o.id === orderId);
    if (selectedOrder) {
      selectedOrder.status = status;
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
    state.orders = orders; // Overwrite for snapshot listener
  },
  SET_SELECTED_ORDERS(state, orders) {
    state.selected_orders = orders;
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
      // Ensure date_placed is correctly parsed
      let orderTimeMs;
      if (order.date_placed && typeof order.date_placed.toMillis === 'function') {
        orderTimeMs = order.date_placed.toMillis();
      } else if (order.date_placed && order.date_placed.seconds) {
        orderTimeMs = order.date_placed.seconds * 1000;
      } else {
        orderTimeMs = new Date(order.date_placed).getTime() || Date.now();
      }
      const timeSinceOrderPlaced = Date.now() - orderTimeMs;

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
          const orderRef = doc(db, 'orders', order.id);

          const updateData = { status: newStatus };
          if (newStatus === 'delivered') updateData.date_delivered = serverTimestamp();

          await updateDoc(orderRef, updateData);

          commit('UPDATE_ORDER_STATUS', { orderId: order.id, status: newStatus });

        } catch (error) {
          console.error('Failed to update order status:', error);
          throw error;
        } finally {
          state.isUpdating = false
        }
      }
    });
  },
  listenToQueuedOrders({ commit }) {
    if (queuedOrdersUnsubscribe) return; // Already listening

    const q = query(collection(db, 'orders'), where('status', '==', 'queued'), where('user_id', '==', null));

    queuedOrdersUnsubscribe = onSnapshot(q, (snapshot) => {
      const newOrders = [];
      snapshot.forEach((doc) => {
        newOrders.push({ id: doc.id, ...doc.data() });
      });
      commit('SET_ORDERS', newOrders);
    }, (error) => {
      console.error("Error listening to queued orders:", error);
    });
  },
  stopListeningToQueuedOrders() {
    if (queuedOrdersUnsubscribe) {
      queuedOrdersUnsubscribe();
      queuedOrdersUnsubscribe = null;
    }
  },
  async attachUserToOrders({ commit, rootState }, orderIds) {
    try {
      const uid = rootState.user?.uid;
      if (!uid) throw new Error("User not authenticated");

      const batch = writeBatch(db);

      orderIds.forEach(id => {
        const orderRef = doc(db, 'orders', id);
        batch.update(orderRef, {
          status: 'en_route',
          user_id: uid
        });
      });

      await batch.commit();

      commit('UPDATE_ORDERS', orderIds);
      return { updated_orders: orderIds };
    } catch (error) {
      console.error('Error attaching user to orders:', error);
      throw error;
    }
  },
  async fetchSelectedOrders({ commit, rootState }) {
    try {
      const uid = rootState.user?.uid;
      if (!uid) return;

      const q = query(
        collection(db, 'orders'),
        where('user_id', '==', uid),
        where('status', 'in', ['pending', 'en_route'])
      );

      const snapshot = await getDocs(q);
      const orders = [];
      snapshot.forEach(doc => {
        orders.push({ id: doc.id, ...doc.data() });
      });

      commit('SET_SELECTED_ORDERS', orders);
    } catch (error) {
      console.error('Failed to fetch selected orders:', error)
      throw error
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
