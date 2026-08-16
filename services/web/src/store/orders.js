import { getDistanceFromLatLonInM, toMillis } from './storeUtils';
import { isWithin, BASE_RADIUS_M } from './location';
import { db, functions } from '../firebase/init';
import { collection, doc, query, where, getDocs, updateDoc, writeBatch, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

const baseWaitTime = 30 * 60 * 1000; // 30 minutes in milliseconds

// Client-side pre-check: only decides whether to *ask* the server, which
// applies the authoritative check. Uses the same radius/padding as the
// location module (which mirrors functions/index.js) so we never call for a
// fix that can't succeed.

let queuedOrdersUnsubscribe = null;
const deliverOrderFn = httpsCallable(functions, 'deliverOrder');
// Order ids with an in-flight status update, so a burst of GPS ticks doesn't
// fire duplicate requests for the same order.
const inFlight = new Set();

const state = {
  orders: [],
  selected_orders: [],
  waitTime: baseWaitTime,
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
  checkAndUpdateOrderStatus({ state, commit, dispatch, rootState, rootGetters }) {
    // only orders with status of 'pending' or 'en_route' are checked
    const filteredOrders = state.selected_orders.filter(order => ['pending', 'en_route'].includes(order.status));
    const multiplier = 1.1;

    const additionalWaitTime = filteredOrders.length > 6
      ? baseWaitTime * (filteredOrders.length - 6) * multiplier
      : 0;

    const totalWaitTime = baseWaitTime + additionalWaitTime;
    const cancellationTime = totalWaitTime + baseWaitTime;

    state.waitTime = totalWaitTime;

    const { latitude, longitude, accuracy } = rootState.location.player;
    // Fresh and accurate enough to be worth sending to the server.
    const hasFix = rootGetters['location/hasUsableFix'];

    filteredOrders.forEach(async order => {
      if (inFlight.has(order.id)) return;

      const expired = Date.now() - toMillis(order.date_placed) > cancellationTime;

      let nearOrder = false;
      if (hasFix && order.latitude && order.longitude) {
        const distanceToOrder = getDistanceFromLatLonInM(latitude, longitude, order.latitude, order.longitude);
        nearOrder = isWithin(distanceToOrder, BASE_RADIUS_M, accuracy);
      }

      if (!nearOrder && !expired) return;

      inFlight.add(order.id);
      try {
        let delivered = false;
        if (nearOrder) {
          // The server verifies position and marks the order delivered.
          const { data } = await deliverOrderFn({ orderId: order.id, latitude, longitude, accuracy });
          delivered = Boolean(data?.success);
          if (delivered) {
            commit('UPDATE_ORDER_STATUS', { orderId: order.id, status: 'delivered' });
          } else if (data?.reason && data.reason !== 'too_far') {
            // too_far is routine at the edge of the pre-check radius; log the rest.
            console.warn(`Delivery for ${order.id} not accepted: ${data.reason}`, data);
          }
        }
        // An expired order the server wouldn't accept still gets cancelled.
        if (!delivered && expired) {
          await updateDoc(doc(db, 'orders', order.id), { status: 'cancelled' });
          commit('UPDATE_ORDER_STATUS', { orderId: order.id, status: 'cancelled' });
        }
      } catch (error) {
        console.error('Failed to update order status:', error);
        // The server says this order isn't ours / isn't deliverable any more:
        // our local copy is stale, so resync instead of retrying every GPS tick.
        if (['functions/failed-precondition', 'functions/not-found', 'functions/permission-denied'].includes(error?.code)) {
          dispatch('fetchSelectedOrders');
        }
      } finally {
        inFlight.delete(order.id);
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

      // Optimistically populate selected_orders with full order data
      // so the Deliveries page has data immediately on navigation
      const selectedOrderData = orderIds.map(id => {
        const order = state.orders.find(o => o.id === id);
        return order ? { ...order, status: 'en_route', user_id: uid } : null;
      }).filter(Boolean);

      commit('SET_SELECTED_ORDERS', selectedOrderData);
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
  },
  async clearUnselectedOrders({ state }) {
    try {
      // Find all queued orders still in the local store (not selected by the user)
      const q = query(
        collection(db, 'orders'),
        where('status', '==', 'queued'),
        where('user_id', '==', null)
      );

      const snapshot = await getDocs(q);
      if (snapshot.empty) return;

      const batch = writeBatch(db);
      snapshot.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
    } catch (error) {
      console.error('Failed to clear unselected orders:', error);
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
