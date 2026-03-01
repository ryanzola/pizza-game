import { db } from '../firebase/init';
import { collection, doc, onSnapshot } from 'firebase/firestore';

let achievementsUnsubscribe = null;
let statsUnsubscribe = null;

const state = {
  unlocked_achievements: [],
  lifetime_stats: {
    total_deliveries: 0,
    total_distance_km: 0,
    unique_streets: [],
    total_tips: 0
  },
  recent_achievement: null, // For displaying the overlay
  showOverlay: false
};

const mutations = {
  SET_ACHIEVEMENTS(state, achievements) {
    state.unlocked_achievements = achievements;
  },
  SET_LIFETIME_STATS(state, stats) {
    state.lifetime_stats = stats;
  },
  SHOW_ACHIEVEMENT_OVERLAY(state, achievement) {
    state.recent_achievement = achievement;
    state.showOverlay = true;
  },
  HIDE_ACHIEVEMENT_OVERLAY(state) {
    state.showOverlay = false;
    state.recent_achievement = null;
  }
};

const actions = {
  initAchievementListeners({ commit, rootState }) {
    const userId = rootState.user?.uid;
    if (!userId) return;

    // Listen to achievements
    const achievementsRef = collection(db, 'users', userId, 'achievements');
    achievementsUnsubscribe = onSnapshot(achievementsRef, (snapshot) => {
      const currentIds = state.unlocked_achievements.map(a => a.id);
      const achievements = [];

      snapshot.docChanges().forEach((change) => {
        const data = { id: change.doc.id, ...change.doc.data() };
        if (change.type === "added") {
          // If it's a new achievement that we didn't already have in state, it might be newly unlocked!
          // We can show the overlay if it was unlocked recently, but simple approach is to show overlay for newly emitted "added" events where it wasn't in list before.
          // To avoid showing overlay on initial load, we can check if it's the first snapshot.
          // For now, simpler: we compare to current IDs. But on initial load, currentIds is empty.
          // A robust way to check initial load is to inspect if state.unlocked_achievements has length > 0, 
          // or just rely on a separate flag. Let's set a flag.
        }
        achievements.push(data);
      });

      // Update full list
      const fullList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Look for new achievements to show overlay
      if (currentIds.length > 0) { // Not initial load
        const newAchievements = fullList.filter(a => !currentIds.includes(a.id));
        if (newAchievements.length > 0) {
          commit('SHOW_ACHIEVEMENT_OVERLAY', newAchievements[0]); // Show the first new one
        }
      }

      commit('SET_ACHIEVEMENTS', fullList);
    });

    // Listen to lifetime stats
    const statsRef = doc(db, 'users', userId, 'stats', 'lifetime');
    statsUnsubscribe = onSnapshot(statsRef, (docSnap) => {
      if (docSnap.exists()) {
        commit('SET_LIFETIME_STATS', docSnap.data());
      }
    });
  },

  stopAchievementListeners() {
    if (achievementsUnsubscribe) {
      achievementsUnsubscribe();
      achievementsUnsubscribe = null;
    }
    if (statsUnsubscribe) {
      statsUnsubscribe();
      statsUnsubscribe = null;
    }
  },

  dismissAchievementOverlay({ commit }) {
    commit('HIDE_ACHIEVEMENT_OVERLAY');
  }
};

const getters = {
  unlocked_achievements: state => state.unlocked_achievements,
  lifetime_stats: state => state.lifetime_stats,
  recent_achievement: state => state.recent_achievement,
  showOverlay: state => state.showOverlay
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
};
