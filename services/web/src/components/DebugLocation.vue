<template>
  <div v-if="debug_mode" class="bg-yellow-900/40 text-yellow-500 px-3 py-2 rounded-xl flex gap-4 justify-between items-center mb-4 border border-yellow-900/50 shadow-inner font-mono text-sm max-w-sm mx-auto w-full">
    <p>
      <strong>Lat:</strong> {{ player.latitude.toFixed(4) }}
    </p>
    <p>
      <strong>Lng:</strong> {{ player.longitude.toFixed(4) }}
    </p>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useStore } from 'vuex';

const store = useStore();

const debug_mode = computed(() => store.state.debug_mode);
const player = computed(() => store.getters['location/player']);
</script>