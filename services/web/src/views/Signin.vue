<template>
    <div class="min-h-[100dvh] w-full flex flex-col items-center justify-center relative overflow-hidden">
      <!-- Ambient Glow Background Effect -->
      <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-96 bg-gradient-to-b from-blue-900/20 to-transparent blur-3xl opacity-50 pointer-events-none rounded-b-full"></div>

      <div class="relative z-10 w-full max-w-sm px-6 py-8 flex flex-col items-center space-y-12">
        <div class="text-center flex flex-col items-center space-y-4">
          <div class="bg-gradient-to-br from-gray-800 to-black p-5 rounded-3xl shadow-2xl border border-gray-700/50 mb-2">
            <h1 class="text-6xl select-none leading-none">🥭</h1>
          </div>
          <h1 class="text-4xl font-extrabold text-white tracking-tighter drop-shadow-md">Deliver Pizza</h1>
          <p class="text-gray-400 text-base font-medium tracking-tight">Sign in with your Google account<br>to start delivering.</p>
        </div>
        
        <div class="w-full flex flex-col gap-4">
          <button 
            @click="signInWithGoogle"
            class="w-full flex justify-center items-center gap-3 bg-[#1c1c1e] hover:bg-[#2c2c2e] active:bg-[#3a3a3c] active:scale-[0.98] transition-all duration-200 text-white font-semibold text-lg py-4 px-6 rounded-2xl border border-gray-800 shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <img class="w-6 h-6 shrink-0" src="../assets/google.svg" alt="Google">
            Continue with Google
          </button>
          
          <div v-if="error" class="text-red-400 text-sm text-center mt-2 bg-red-900/20 p-3 rounded-xl border border-red-900/50 backdrop-blur-sm animate-pulse">
            {{ error }}
          </div>
        </div>
      </div>
    </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { auth } from '../firebase/init';
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";

const store = useStore();
const router = useRouter();
const error = ref(null);

onMounted(() => {
  if (store.state.user) {
    router.push('/');
  }
});

watch(() => store.state.user, (newUser) => {
  if (newUser) {
    router.push('/');
  }
});

const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();

  try {
    error.value = null; // Clear previous errors
    await signInWithPopup(auth, provider);
  } catch (err) {
    console.error('Error during authentication:', err);
    error.value = err.message;
  }
};
</script>

<style scoped>
/* Scoped styles removed in favor of direct Tailwind utility classes */
</style>
