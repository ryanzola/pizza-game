<template>
  <div class="bakery-container h-full w-full flex flex-col pt-6 pb-6 px-4">
    <div class="flex justify-between items-end mb-6">
      <h1 class="font-serif text-3xl font-medium tracking-wide text-[#4A3B32]">The Bakery</h1>
      <p class="text-sm font-medium text-[#AA8E76] font-sans tracking-widest uppercase">Fresh Prep</p>
    </div>

    <!-- Bakery Content -->
    <div class="flex-1 flex flex-col gap-5">
      
      <!-- Feature Card 1 -->
      <div class="bg-white/80 backdrop-blur-md rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#F5E6DA] flex gap-4 items-center">
        <div class="w-16 h-16 rounded-2xl bg-[#FFF5EA] flex items-center justify-center shrink-0 border border-[#FFE8D6]">
          <span class="text-3xl">🥐</span>
        </div>
        <div>
          <h3 class="font-serif text-xl text-[#5C4535] mb-1">Morning Pastries</h3>
          <p class="text-[#8C7A6B] text-sm leading-relaxed font-sans">Restock your inventory with fresh croissants and breakfast items.</p>
        </div>
      </div>

      <!-- Feature Card 2 -->
      <div class="bg-white/80 backdrop-blur-md rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#F5E6DA] flex gap-4 items-center opacity-70">
        <div class="w-16 h-16 rounded-2xl bg-[#FFF5EA] flex items-center justify-center shrink-0 border border-[#FFE8D6]">
          <span class="text-3xl grayscale opacity-50">🎂</span>
        </div>
        <div>
          <h3 class="font-serif text-xl text-[#5C4535] mb-1 flex items-center gap-2">
            Custom Cakes
            <span class="bg-[#F5E6DA] text-[#8C7A6B] text-[10px] uppercase font-bold px-2 py-0.5 rounded-full tracking-wider">Locked</span>
          </h3>
          <p class="text-[#8C7A6B] text-sm leading-relaxed font-sans mt-0.5">High-margin dessert orders. Available at level 5.</p>
        </div>
      </div>

    </div>

    <!-- Bottom Action Bar -->
    <div class="sticky mt-auto bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-[#FAEDDF] via-[#FAEDDF]/95 to-transparent pb-safe pt-8 px-4 rounded-t-3xl -mx-4">
      <div class="max-w-md mx-auto pb-4">
        <button class="bakery-btn w-full shadow-[0_10px_40px_rgba(212,163,115,0.4)]">
          <span class="font-sans font-bold text-lg tracking-wide">Pickup Daily Supply</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
// Placeholder for future bakery logic
</script>

<style lang="postcss" scoped>
.bakery-container {
  /* Soft, warm, pastoral background */
  background: linear-gradient(135deg, #FFFAF5 0%, #FAEDDF 100%);
  color: #4A3B32;
}

.font-serif {
  font-family: 'Playfair Display', Georgia, serif;
}

.bakery-btn {
  @apply 
    relative 
    flex items-center justify-center
    h-[60px]
    rounded-2xl
    bg-gradient-to-r from-[#D4A373] to-[#C9915A]
    text-white
    transition-all duration-300
    active:scale-[0.98]
    active:opacity-90
    focus:outline-none
    select-none
    border-b-4 border-[#B07B46];
}

.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 1rem);
}
</style>
