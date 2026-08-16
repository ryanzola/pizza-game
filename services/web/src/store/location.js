import { getDistanceFromLatLonInM } from './storeUtils';

// --- Tuning -----------------------------------------------------------------
// This is a driving game: the player passes POIs and houses in a car, so we
// want fresh fixes (a 10 s old fix is ~135 m stale at 30 mph) and we lean on
// the reported accuracy rather than a bare distance threshold.

// Fixes with accuracy worse than this are ignored for proximity decisions
// (the delivery server rejects them too). Below it, the radius is padded by
// the accuracy, capped, so a good fix is strict and a mediocre one is lenient.
export const MAX_USABLE_ACCURACY_M = 150;
export const MAX_ACCURACY_PAD_M = 50;
// Reported accuracy at or below this is shown to the player as "good".
export const GOOD_ACCURACY_M = 50;
// A fix older than this is treated as stale: proximity holds its last state
// and deliveries are not attempted until a fresh fix arrives.
export const FIX_STALE_MS = 15 * 1000;

const WATCH_OPTIONS = {
  enableHighAccuracy: true,
  // How long the browser may take to produce a fix before reporting TIMEOUT.
  // Generous: a timeout is not fatal (see onError), it just means "no fix yet".
  timeout: 20 * 1000,
  // Never accept a cached fix older than this.
  maximumAge: 2 * 1000,
};

const POIS = {
  pizzeria: { latitude: 40.86233731197237, longitude: -74.07808261920567 },
  depot: { latitude: 40.868516031424704, longitude: -74.04757385194837 },
  bank: { latitude: 40.86082582150665, longitude: -74.07959384969016 },
  bakery: { latitude: 40.87485155936898, longitude: -74.10014034710848 },
};

// Radius within which the player counts as "at" a POI, before accuracy padding.
const POI_RADIUS_M = 100;

const state = {
  // Kept for existing consumers; POIS above is the source of truth.
  pizzaCoords: POIS.pizzeria,
  depotCoords: POIS.depot,
  bankCoords: POIS.bank,
  bakeryCoords: POIS.bakery,
  player: {
    latitude: 0.0,
    longitude: 0.0,
    accuracy: null, // metres, from the last GPS fix
    speed: null,    // m/s, or null when the platform doesn't report it
    fixedAt: null,  // epoch ms of the last fix
  },
  // Which POIs the player is currently at. Only recomputed on usable fixes,
  // so a burst of poor-accuracy readings can't flip the Home screen around.
  nearby: { pizzeria: false, depot: false, bank: false, bakery: false },
  lastVisited: null,
  // true once we've received at least one fix and permission isn't denied.
  locationAvailable: false,
  permissionDenied: false,
  lastError: null, // { code, message, at }
  watcher: null,
  // Heartbeat so freshness getters re-evaluate even when no fix arrives
  // (Vuex getters only recompute on state changes, not wall-clock time).
  now: Date.now(),
  thresholdDistance: POI_RADIUS_M,
};

const HEARTBEAT_MS = 5 * 1000;
let heartbeat = null;

const mutations = {
  setFix(state, { latitude, longitude, accuracy = null, speed = null, fixedAt }) {
    state.player.latitude = latitude;
    state.player.longitude = longitude;
    state.player.accuracy = accuracy;
    state.player.speed = speed;
    state.player.fixedAt = fixedAt;
    state.now = fixedAt;
  },
  // Backwards-compatible alias used by older code/tests.
  setLatLong(state, payload) {
    mutations.setFix(state, { ...payload, fixedAt: Date.now() });
  },
  setNearby(state, nearby) {
    state.nearby = nearby;
  },
  setLocationAvailable(state, available) {
    state.locationAvailable = available;
  },
  setPermissionDenied(state, denied) {
    state.permissionDenied = denied;
  },
  setLastError(state, error) {
    state.lastError = error;
  },
  setWatcher(state, watcher) {
    state.watcher = watcher;
  },
  tick(state) {
    state.now = Date.now();
  },
  setLastVisited(state, lastVisited) {
    state.lastVisited = lastVisited;
  },
};

// Accuracy-padded proximity: a good fix must be genuinely close, a mediocre
// one gets the benefit of the doubt up to MAX_ACCURACY_PAD_M.
export const isWithin = (distance, radius, accuracy) =>
  distance <= radius + Math.min(accuracy ?? 0, MAX_ACCURACY_PAD_M);

const computeNearby = ({ latitude, longitude, accuracy }) => {
  const nearby = {};
  for (const [key, poi] of Object.entries(POIS)) {
    const distance = getDistanceFromLatLonInM(latitude, longitude, poi.latitude, poi.longitude);
    nearby[key] = isWithin(distance, POI_RADIUS_M, accuracy);
  }
  return nearby;
};

const actions = {
  startGeolocation({ state, commit, dispatch }) {
    if (!("geolocation" in navigator)) {
      commit('setLocationAvailable', false);
      commit('setLastError', { code: 'unsupported', message: 'Geolocation not supported', at: Date.now() });
      return;
    }
    if (state.watcher !== null) return; // already watching

    const onFix = (position) => {
      const { latitude, longitude, accuracy, speed } = position.coords;
      const fix = {
        latitude,
        longitude,
        accuracy: Number.isFinite(accuracy) ? accuracy : null,
        speed: Number.isFinite(speed) ? speed : null,
        fixedAt: Date.now(),
      };
      commit('setFix', fix);
      commit('setLocationAvailable', true);
      commit('setPermissionDenied', false);
      commit('setLastError', null);

      // Only let usable fixes change where we think the player is.
      if (fix.accuracy === null || fix.accuracy <= MAX_USABLE_ACCURACY_M) {
        commit('setNearby', computeNearby(fix));
      }

      // Trigger the distance check directly when geolocation changes
      dispatch('orders/checkAndUpdateOrderStatus', null, { root: true });
    };

    const onError = (error) => {
      console.warn(`Geolocation error ${error.code}: ${error.message}`);
      commit('setLastError', { code: error.code, message: error.message, at: Date.now() });
      if (error.code === error.PERMISSION_DENIED) {
        commit('setPermissionDenied', true);
        commit('setLocationAvailable', false);
        return;
      }
      // TIMEOUT / POSITION_UNAVAILABLE are transient (tunnels, indoors, cold
      // start). Keep the last fix and let the freshness getters reflect it
      // instead of flapping the "unavailable" state on every gap.
      if (!state.player.fixedAt) {
        commit('setLocationAvailable', false);
      }
    };

    const watcher = navigator.geolocation.watchPosition(onFix, onError, WATCH_OPTIONS);
    commit('setWatcher', watcher);
    if (heartbeat === null) {
      heartbeat = setInterval(() => commit('tick'), HEARTBEAT_MS);
    }
  },
  stopGeolocation({ state, commit }) {
    if (state.watcher !== null) {
      navigator.geolocation.clearWatch(state.watcher);
      commit('setWatcher', null);
    }
    if (heartbeat !== null) {
      clearInterval(heartbeat);
      heartbeat = null;
    }
  },
  // Restart the watch after the app comes back from the background: iOS
  // (especially in a home-screen PWA) often silently stops delivering fixes.
  restartGeolocation({ dispatch }) {
    dispatch('stopGeolocation');
    dispatch('startGeolocation');
  },
};

const getters = {
  player(state) {
    return state.player;
  },
  // Age of the last fix in ms; Infinity if we've never had one.
  fixAge(state) {
    return state.player.fixedAt ? state.now - state.player.fixedAt : Infinity;
  },
  hasFreshFix(state, getters) {
    return getters.fixAge <= FIX_STALE_MS;
  },
  // Can the current fix be used for proximity/delivery decisions?
  hasUsableFix(state, getters) {
    const acc = state.player.accuracy;
    return getters.hasFreshFix && (acc === null || acc <= MAX_USABLE_ACCURACY_M);
  },
  // Coarse signal state for the UI: 'denied' | 'unavailable' | 'stale' | 'poor' | 'weak' | 'good'
  signalQuality(state, getters) {
    if (state.permissionDenied) return 'denied';
    if (!state.player.fixedAt) return 'unavailable';
    if (!getters.hasFreshFix) return 'stale';
    const acc = state.player.accuracy;
    if (acc === null || acc <= GOOD_ACCURACY_M) return 'good';
    if (acc <= MAX_USABLE_ACCURACY_M) return 'weak';
    return 'poor';
  },
  isNearPizzeria: (state) => state.nearby.pizzeria,
  isNearRestaurantDepot: (state) => state.nearby.depot,
  isNearBank: (state) => state.nearby.bank,
  isNearBakery: (state) => state.nearby.bakery,
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
};
