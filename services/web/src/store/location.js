import { getDistanceFromLatLonInM } from './storeUtils';

const state = {
  pizzaCoords: {
    latitude: 40.86233731197237,
    longitude: -74.07808261920567,
  },
  depotCoords: {
    latitude: 40.868516031424704,
    longitude: -74.04757385194837,
  },
  bankCoords: {
    latitude: 40.86083,
    longitude: -74.079745,
  },
  player: {
    latitude: 0.0,
    longitude: 0.0,
  },
  lastVisited: null,
  locationAvailable: false,
  watcher: null,
  thresholdDistance: 100, // 50 meters as an example threshold
  intervalID: null,
};

const mutations = {
  setLatLong(state, { latitude, longitude }) {
    state.player.latitude = latitude;
    state.player.longitude = longitude;
  },
  setLocationAvailable(state, available) {
    state.locationAvailable = available;
  },
  setWatcher(state, watcher) {
    state.watcher = watcher;
  },
  setLastVisited(state, lastVisited) {
    state.lastVisited = lastVisited;
  },
  setIntervalID(state, intervalID) {
    state.intervalID = intervalID;
  },
};

const actions = {
  startGeolocation({ commit, dispatch }) {
    if ("geolocation" in navigator) {
      const watcher = navigator.geolocation.watchPosition(
        position => {
          commit('setLatLong', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          commit('setLocationAvailable', true);
        },
        error => {
          console.error(error.message);
          commit('setLocationAvailable', false);
        },
        {
          enableHighAccuracy: true,
          timeout: 1000,
        }
      );
      commit('setWatcher', watcher);
    } else {
      commit('setLocationAvailable', false);
    }
  },
  stopGeolocation({ state, commit }) {
    if (state.watcher) {
      navigator.geolocation.clearWatch(state.watcher);
      commit('setWatcher', null);
    }
  },
  startInterval({ commit, dispatch }) {
    const intervalID = setInterval(() => {
      dispatch('orders/checkAndUpdateOrderStatus', null, { root: true });
    }, 1000);
    commit('setIntervalID', intervalID);
  },
  stopInterval({ state, commit }) {
    if (state.intervalID) {
      clearInterval(state.intervalID);
      commit('setIntervalID', null);
    }
  },
};

const getters = {
  player(state) {
    return state.player;
  },
  isNearPizzeria(state) {
    if (state.player.latitude && state.player.longitude) {
      const distance = getDistanceFromLatLonInM(
        state.player.latitude,
        state.player.longitude,
        state.pizzaCoords.latitude,
        state.pizzaCoords.longitude,
      );
      return distance <= state.thresholdDistance;
    }
    return false;
  },
  isNearRestaurantDepot(state) {
    if (state.player.latitude && state.player.longitude) {
      const distance = getDistanceFromLatLonInM(
        state.player.latitude,
        state.player.longitude,
        state.depotCoords.latitude,
        state.depotCoords.longitude
      );
      return distance <= state.thresholdDistance;
    }
    return false;
  },
  isNearBank(state) {
    if (state.player.latitude && state.player.longitude) {
      const distance = getDistanceFromLatLonInM(
        state.player.latitude,
        state.player.longitude,
        state.bankCoords.latitude,
        state.bankCoords.longitude
      );
      return distance <= state.thresholdDistance;
    }
    return false;
  },
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
};