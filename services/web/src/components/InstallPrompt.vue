<template>
  <transition name="slide-up">
    <div 
      v-if="showPrompt" 
      class="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50"
    >
      <div class="bg-gray-800/90 backdrop-blur-md border border-gray-700 rounded-2xl p-4 shadow-2xl flex items-center space-x-4">
        <div class="flex-shrink-0 h-12 w-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center text-2xl shadow-inner border border-red-400/30">
          🍕
        </div>
        <div class="flex-1">
          <h3 class="text-white font-bold text-sm leading-tight">Install Pizza App</h3>
          <p v-if="isIosPrompt" class="text-gray-400 text-xs mt-0.5 leading-snug">
            Tap <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline text-blue-400 -mt-1 mx-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> Share then "Add to Home Screen"
          </p>
          <p v-else class="text-gray-400 text-xs mt-0.5 leading-snug">
            Add to your home screen for a better experience.
          </p>
        </div>
        <div class="flex flex-col space-y-2">
          <button 
            v-if="!isIosPrompt"
            @click="installApp" 
            class="bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg transition-colors shadow-sm"
          >
            Install
          </button>
          <button 
            @click="dismissPrompt" 
            class="text-gray-400 hover:text-white text-xs font-semibold py-1 px-3 transition-colors"
          >
            {{ isIosPrompt ? 'Got it' : 'Not now' }}
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const showPrompt = ref(false);
const isIosPrompt = ref(false);
let deferredPrompt = null;

const isIos = () => {
  const userAgent = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent);
};

const isInStandaloneMode = () => {
  return ('standalone' in window.navigator && window.navigator.standalone) || window.matchMedia('(display-mode: standalone)').matches;
};

const handleBeforeInstallPrompt = (e) => {
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  // Stash the event so it can be triggered later.
  deferredPrompt = e;
  // Update UI notify the user they can install the PWA
  showPrompt.value = true;
};

const handleAppInstalled = () => {
  // Hide the app-provided install promotion
  showPrompt.value = false;
  // Clear the deferredPrompt so it can be garbage collected
  deferredPrompt = null;
  console.log('PWA was installed');
};

onMounted(() => {
  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  window.addEventListener('appinstalled', handleAppInstalled);

  // iOS does not support beforeinstallprompt, we manually show instructions if not standalone
  if (isIos() && !isInStandaloneMode()) {
    isIosPrompt.value = true;
    showPrompt.value = true;
  }
});

onUnmounted(() => {
  window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  window.removeEventListener('appinstalled', handleAppInstalled);
});

const installApp = async () => {
  // Hide the app provided install promotion
  showPrompt.value = false;
  // Show the install prompt
  if (deferredPrompt) {
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    // We've used the prompt, and can't use it again, throw it away
    deferredPrompt = null;
  }
};

const dismissPrompt = () => {
  showPrompt.value = false;
};
</script>

<style scoped>
.slide-up-enter-active {
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.slide-up-leave-active {
  transition: all 0.3s cubic-bezier(0.6, -0.28, 0.735, 0.045);
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
.slide-up-enter-to,
.slide-up-leave-from {
  transform: translateY(0);
  opacity: 1;
}
</style>
