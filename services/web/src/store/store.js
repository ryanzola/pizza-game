import { createStore } from 'vuex'
import { signOut } from "firebase/auth";
import { auth, db, functions } from '../firebase/init'
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { initMessaging } from '../firebase/init';
import { getToken, onMessage } from "firebase/messaging";
import { httpsCallable } from "firebase/functions";

const depositBankFn = httpsCallable(functions, 'depositBank');

import location from './location';
import orders from './orders';
import achievements from './achievements';
import inventory from './inventory';

import createPersistedState from "vuex-persistedstate";

let wakeLockSentinel = null;

const store = createStore({
  modules: {
    location,
    orders,
    achievements,
    inventory,
  },
  state() {
    return {
      user: null,
      debug_mode: false,
      session: {
        session_id: null,
        status: null,
        started_at: null,
        ended_at: null
      },
      version: '1.26.08.17'
    }
  },
  getters: {
    hasActiveSession(state) {
      return state.session?.status === 'active' && !state.session?.ended_at;
    },
    isAuthenticated(state) {
      return !!state.user
    },
    user(state) {
      return state.user
    },
    bank_amount(state) {
      return state.user.bank_amount
    },
    savings_amount(state) {
      return state.user.savings_amount
    },
    selected_orders(state) {
      return state.selected_orders
    }
  },
  mutations: {
    TOGGLE_DEBUG_MODE(state) {
      state.debug_mode = !state.debug_mode
    },
    SET_USER(state, data) {
      state.user = data
    },
    SET_BANK(state, bank_amount) {
      state.user.bank_amount = bank_amount
    },
    SET_SAVINGS(state, savings_amount) {
      state.user.savings_amount = savings_amount
    },
    SET_SESSION(state, sessionData = {}) {
      state.session = {
        session_id: sessionData.session_id ?? null,
        status: sessionData.status ?? null,
        started_at: sessionData.started_at ?? null,
        ended_at: sessionData.ended_at ?? null,
      }
    }
  },
  actions: {
    async acquireWakeLock() {
      if ('wakeLock' in navigator) {
        try {
          wakeLockSentinel = await navigator.wakeLock.request('screen');
          console.log('Screen Wake Lock acquired.');

          wakeLockSentinel.addEventListener('release', () => {
            console.log('Screen Wake Lock released manually or automatically.');
          });
        } catch (err) {
          console.error(`Wake Lock error: ${err.name}, ${err.message}`);
        }
      } else {
        console.warn('Screen Wake Lock API not supported.');
      }
    },
    async releaseWakeLock() {
      if (wakeLockSentinel !== null) {
        await wakeLockSentinel.release();
        wakeLockSentinel = null;
      }
    },
    async logOut({ commit, dispatch }) {
      try {
        console.log("Signing out...");
        await signOut(auth);
        console.log("Signed out successfully.");
        commit('SET_USER', null);
        dispatch('achievements/stopAchievementListeners');

        localStorage.removeItem('vuex');
      }
      catch (error) {
        console.error("Error during sign out:", error);
        throw error;
      }
    },
    async fetchUser({ commit, dispatch }, user) {
      if (user) {
        commit("SET_USER", user);
        dispatch('achievements/initAchievementListeners');
        dispatch('initializeMessaging', user.uid);
      } else {
        commit("SET_USER", null);
      }
    },
    async initializeMessaging({ state }, uid) {
      if (!('Notification' in window)) return;

      try {
        const messaging = await initMessaging();
        if (!messaging) return;

        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          try {
            // For testing/production this requires a valid VAPID key in the .env file
            const token = await getToken(messaging, { vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY });
            if (token) {
              console.log('FCM Token acquired');
              const tokenRef = doc(db, 'users', uid, 'tokens', token);
              await setDoc(tokenRef, {
                token: token,
                updated_at: new Date().toISOString()
              });
            }
          } catch (e) {
            console.log('FCM getToken error (likely missing VAPID key):', e.message);
          }

          onMessage(messaging, (payload) => {
            console.log('Message received. ', payload);
            alert(`🚨 ${payload.notification.title}\n${payload.notification.body}`);
          });
        }
      } catch (e) { console.error('Error initializing FCM:', e) }
    },
    async fetchSavings({ commit, state }) {
      try {
        if (!state.user?.uid) return;
        const userRef = doc(db, 'users', state.user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          commit('SET_SAVINGS', userSnap.data().savings_amount || 0);
        }
      } catch (error) {
        console.error('Failed to fetch savings:', error)
        throw error
      }
    },
    // Move carried cash into savings. The server verifies we're at the bank
    // and is the only thing allowed to change balances. Resolves to
    // { success, reason?, deposited? }; throws on hard errors.
    async update_savings({ commit, state, rootState }) {
      if (!state.user?.uid) return { success: false, reason: 'not_signed_in' };
      const { latitude, longitude, accuracy } = rootState.location.player;
      try {
        const { data } = await depositBankFn({ latitude, longitude, accuracy });
        if (data?.success) {
          commit('SET_SAVINGS', data.savings_amount);
          commit('SET_BANK', data.bank_amount);
        } else if (data?.reason === 'nothing_to_deposit') {
          // Local state was stale; sync to what the server has.
          commit('SET_SAVINGS', data.savings_amount ?? state.user.savings_amount);
          commit('SET_BANK', data.bank_amount ?? 0);
        }
        return data;
      } catch (error) {
        console.error('Failed to deposit:', error)
        throw error
      }
    },
    async fetchBank({ commit, state }) {
      try {
        if (!state.user?.uid) return;
        const userRef = doc(db, 'users', state.user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          commit('SET_BANK', userSnap.data().bank_amount || 0);
        }
      } catch (error) {
        console.error('Failed to fetch bank:', error)
        throw error
      }
    },
    async start_session({ commit, state }) {
      try {
        const uid = state.user?.uid;
        if (!uid) throw new Error("User not authenticated");

        const sessionData = {
          user_id: uid,
          status: 'active',
          started_at: serverTimestamp(),
          ended_at: null
        };

        const sessionsRef = collection(db, 'sessions');
        const docRef = await addDoc(sessionsRef, sessionData);

        commit('SET_SESSION', {
          session_id: docRef.id,
          status: 'active',
          started_at: new Date().toISOString(),
          ended_at: null
        });

        await dispatch('acquireWakeLock');
      } catch (error) {
        console.error('Failed to start session:', error)
        throw error
      }
    },
    async end_session({ commit, state }) {
      try {
        const sessionId = state.session?.session_id;
        if (!sessionId) throw new Error("No active session");

        const sessionRef = doc(db, 'sessions', sessionId);
        await updateDoc(sessionRef, {
          status: 'ended',
          ended_at: serverTimestamp()
        });

        commit('SET_SESSION', {
          ...state.session,
          status: 'ended',
          ended_at: new Date().toISOString()
        });

        await dispatch('releaseWakeLock');
      } catch (error) {
        console.error('Failed to end session:', error)
        throw error
      }
    }
  },
  plugins: [createPersistedState({
    paths: ['user', 'debug_mode', 'session'], // Specify only the state you want to persist
    // The plugin re-serialises on *every* mutation; skip the high-frequency
    // geolocation ones (several per second) since none of that is persisted.
    filter: (mutation) => !mutation.type.startsWith('location/'),
  })],
})

export default store
