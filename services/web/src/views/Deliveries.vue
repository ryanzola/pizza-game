<template>
  <div class="space-y-4 p-4">
    <div class="grid gap-4 md:grid-cols-3">
      <Card />
      <Card />
      <Card />
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <Card />
      <Card />
    </div>

    <div class="grid gap-4 md:grid-cols-1">
      <Card />
    </div>
  </div>
</template>

<script>
import Card from "../components/Card.vue";

export default {
  name: "Deliveries",
  components: {
    Card,
  },
};
</script>

<style scoped></style>
