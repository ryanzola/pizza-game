<template>
  <div v-if="$store.state.debug_mode" class="bg-yellow-500 text-black p-2 flex gap-4">
    <p>
      <strong>Latitude:</strong> {{ player.latitude.toFixed(4) }}
    </p>
    <p>
      <strong>Longitude:</strong> {{ player.longitude.toFixed(4) }}
    </p>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'

export default {
  computed: {
    ...mapGetters('location', ['player']),
  },
}
</script>