import { getDistanceFromLatLonInM } from './storeUtils';
import sharedPois from '../../../../functions/data/pois.json';

// --- Tuning -----------------------------------------------------------------
// This is a driving game: the player passes POIs and houses in a car, so we
// want fresh fixes (a 10 s old fix is ~135 m stale at 30 mph) and we lean on
// the reported accuracy rather than a bare distance threshold.
//
// The proximity numbers mirror the server's authoritative delivery check in
// functions/index.js (DELIVERY_BASE_RADIUS_M / DELIVERY_MAX_ACCURACY_PAD_M /
// DELIVERY_MAX_ACCURACY_M). Keep them in sync.

// Radius within which the player counts as "at" a place, before padding.
export const BASE_RADIUS_M = 100;
// The radius is padded by the fix's accuracy, capped, so a good fix is strict
// and a mediocre one is lenient.
export const MAX_ACCURACY_PAD_M = 50;
// Fixes with accuracy worse than this are ignored for proximity decisions
// (the delivery server rejects them too).
export const MAX_USABLE_ACCURACY_M = 150;
// Once "at" a place, the player must move this much further out before we
// say they've left — stops boundary jitter from flapping isNear*.
export const EXIT_HYSTERESIS_M = 30;
// Reported accuracy at or below this is shown to the player as "good".
export const GOOD_ACCURACY_M = 50;
// A fix older than this is treated as stale: proximity and deliveries are
// suspended until a fresh fix arrives.
export const FIX_STALE_MS = 15 * 1000;

const WATCH_OPTIONS = {
  enableHighAccuracy: true,
  // How long the browser may take to produce a fix before reporting TIMEOUT.
  // Generous: a timeout is not fatal (see onError), it just means "no fix yet".
  timeout: 20 * 1000,
  // Never accept a cached fix older than this.
  maximumAge: 2 * 1000,
};

// Fixed game locations, shared with Cloud Functions (single source of truth).
const POIS = {
  pizzeria: sharedPois.pizzeria,
  depot: sharedPois.depot,
  bank: sharedPois.bank,
  bakery: sharedPois.bakery,
};

const NOWHERE = { pizzeria: false, depot: false, bank: false, bakery: false };

const state = {
  player: {
    latitude: 0.0,
    longitude: 0.0,
    accuracy: null, // metres, from the last GPS fix
    speed: null,    // m/s, or null when the platform doesn't report it
    fixedAt: null,  // epoch ms of the last fix
  },
  // Which POIs the player is currently at. Only recomputed on usable fixes,
  // so a burst of poor-accuracy readings can't flip the Home screen around;
  // the isNear* getters additionally require a fresh, permitted fix.
  nearby: { ...NOWHERE },
  permissionDenied: false,
  lastError: null, // { code, message, at }
  watcher: null,
  // Heartbeat so freshness getters re-evaluate even when no fix arrives
  // (Vuex getters only recompute on state changes, not wall-clock time).
  now: Date.now(),
};

const HEARTBEAT_MS = 5 * 1000;
let heartbeat = null;

const mutations = {
  // A successful fix implies permission is granted and the last error is moot,
  // so this single mutation covers all of that (fewer commits per GPS tick).
  setFix(state, { latitude, longitude, accuracy = null, speed = null, fixedAt }) {
    state.player.latitude = latitude;
    state.player.longitude = longitude;
    state.player.accuracy = accuracy;
    state.player.speed = speed;
    state.player.fixedAt = fixedAt;
    state.now = fixedAt;
    state.permissionDenied = false;
    state.lastError = null;
  },
  setNearby(state, nearby) {
    state.nearby = nearby;
  },
  setPermissionDenied(state, denied) {
    state.permissionDenied = denied;
    if (denied) state.nearby = { ...NOWHERE };
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
};

// Accuracy-padded proximity: a good fix must be genuinely close, a mediocre
// one gets the benefit of the doubt up to MAX_ACCURACY_PAD_M.
export const isWithin = (distance, radius, accuracy) =>
  distance <= radius + Math.min(accuracy ?? 0, MAX_ACCURACY_PAD_M);

// Recompute the nearby map with hysteresis: entering needs the padded radius,
// leaving needs the padded radius + EXIT_HYSTERESIS_M.
const computeNearby = ({ latitude, longitude, accuracy }, previous) => {
  const nearby = {};
  for (const [key, poi] of Object.entries(POIS)) {
    const distance = getDistanceFromLatLonInM(latitude, longitude, poi.latitude, poi.longitude);
    const radius = previous[key] ? BASE_RADIUS_M + EXIT_HYSTERESIS_M : BASE_RADIUS_M;
    nearby[key] = isWithin(distance, radius, accuracy);
  }
  return nearby;
};

const actions = {
  startGeolocation({ state, commit, dispatch }) {
    if (!("geolocation" in navigator)) {
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

      // Only let usable fixes change where we think the player is.
      if (fix.accuracy === null || fix.accuracy <= MAX_USABLE_ACCURACY_M) {
        commit('setNearby', computeNearby(fix, state.nearby));
      }

      // Trigger the distance check directly when geolocation changes
      dispatch('orders/checkAndUpdateOrderStatus', null, { root: true });
    };

    const onError = (error) => {
      console.warn(`Geolocation error ${error.code}: ${error.message}`);
      commit('setLastError', { code: error.code, message: error.message, at: Date.now() });
      if (error.code === error.PERMISSION_DENIED) {
        commit('setPermissionDenied', true);
      }
      // TIMEOUT / POSITION_UNAVAILABLE are transient (tunnels, indoors, cold
      // start). Keep the last fix; the freshness getters will report it as
      // stale if it stays that way, without flapping on every gap.
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
  // Called when the app returns to the foreground. iOS (especially a
  // home-screen PWA) often silently stops delivering fixes after
  // backgrounding, so if the watch looks dead we recreate it. A healthy watch
  // is left alone — tearing it down would force a GPS re-acquisition.
  resumeGeolocation({ state, getters, dispatch }) {
    if (state.permissionDenied) return;
    if (state.watcher !== null && getters.hasFreshFix) return;
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
  // Coarse signal state for the UI:
  // 'unsupported' | 'denied' | 'unavailable' | 'stale' | 'poor' | 'weak' | 'good'
  signalQuality(state, getters) {
    if (state.lastError?.code === 'unsupported') return 'unsupported';
    if (state.permissionDenied) return 'denied';
    if (!state.player.fixedAt) return 'unavailable';
    if (!getters.hasFreshFix) return 'stale';
    const acc = state.player.accuracy;
    if (acc === null || acc <= GOOD_ACCURACY_M) return 'good';
    if (acc <= MAX_USABLE_ACCURACY_M) return 'weak';
    return 'poor';
  },
  // Proximity holds its last state through a brief poor-accuracy blip, but
  // not through a lost signal or revoked permission.
  isNearPizzeria: (state, getters) => getters.hasFreshFix && state.nearby.pizzeria,
  isNearRestaurantDepot: (state, getters) => getters.hasFreshFix && state.nearby.depot,
  isNearBank: (state, getters) => getters.hasFreshFix && state.nearby.bank,
  isNearBakery: (state, getters) => getters.hasFreshFix && state.nearby.bakery,
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
};
