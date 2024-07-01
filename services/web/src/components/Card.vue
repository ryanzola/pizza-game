<template>
  <div class="@container">
    <div class="mx-auto max-w-2xl overflow-hidden rounded-xl bg-white shadow-md">
      <div class="@xl:flex h-full">
        <div class="@xl:shrink-0">
          <img class="h-40 w-full object-cover @xl:h-full @xl:w-40"
            src="https://sb.ecobnb.net/app/uploads/sites/3/2020/09/jerry-zhang-ePpaQC2c1xA-unsplash.jpg.webp"
            alt="some mountains">
        </div>

        <div class="p-8 text-black">
          <div class="text-sm font-semibold uppercase tracking-wide text-sky-500">
            Container Queries
          </div>
          <a class="mt-1 block text-lg font-medium leading-tight text-black hover:underline" href="#">
            Testing container queries
          </a>

          <p class="mt-2 text-gray-700">
            Container queries are coming! Browser support is getting better and better. Start experimenting!
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "Card",
};
</script>