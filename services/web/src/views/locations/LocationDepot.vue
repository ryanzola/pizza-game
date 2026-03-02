<template>
  <div class="depot-container h-full w-full flex flex-col pt-6 pb-6 px-4">
    <div class="flex justify-between items-end mb-8 border-b-2 border-[#ff3b30] pb-2">
      <h1 class="font-mono text-3xl font-black tracking-tighter uppercase text-white">Rest. Depot</h1>
      <p class="text-xs font-black text-[#ff3b30] font-mono uppercase bg-[#3a0a08] px-2 py-0.5 rounded-sm tracking-widest border border-[#ff3b30]/30">Bulk Supply</p>
    </div>

    <!-- Depot Content -->
    <div class="flex-1 flex flex-col gap-4">
      
      <!-- Inventory Block 1 -->
      <div class="bg-[#1a1a1c] p-5 border-l-4 border-l-[#ff3b30] border border-gray-800 flex justify-between items-center group hover:bg-[#222225] transition-colors relative overflow-hidden">
        <div class="absolute -right-4 -top-4 text-7xl font-black text-white/[0.02] uppercase italic pointer-events-none group-hover:text-white/[0.04] transition-colors">Pizza Boxes</div>
        <div class="relative z-10 w-full">
          <div class="flex justify-between items-start mb-1">
            <h3 class="font-mono text-xl font-bold text-gray-100 uppercase tracking-tight">Corrugated Boxes</h3>
            <span class="font-mono text-sm text-[#ff3b30] font-bold">-$45.00</span>
          </div>
          <div class="flex justify-between items-end mt-4">
            <p class="text-gray-500 text-xs font-mono uppercase tracking-wider">Qty: 500 Pcs</p>
            <div class="bg-gray-800 text-gray-300 px-3 py-1 font-mono text-xs font-bold uppercase cursor-pointer hover:bg-gray-700 hover:text-white transition-colors">Select</div>
          </div>
        </div>
      </div>

       <!-- Inventory Block 2 -->
      <div class="bg-[#1a1a1c] p-5 border-l-4 border-l-[#ffaa00] border border-gray-800 flex justify-between items-center group hover:bg-[#222225] transition-colors relative overflow-hidden opacity-60">
        <div class="absolute -right-4 -top-4 text-7xl font-black text-white/[0.02] uppercase italic pointer-events-none group-hover:text-white/[0.04] transition-colors">Flour Sacks</div>
        <div class="relative z-10 w-full">
          <div class="flex justify-between items-start mb-1">
            <h3 class="font-mono text-xl font-bold text-gray-100 uppercase tracking-tight flex items-center gap-2">
                00 Flour
                <span class="text-[9px] bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-1 py-0.5 ml-1">LVL 3</span>
            </h3>
            <span class="font-mono text-sm text-[#ffaa00] font-bold">-$120.00</span>
          </div>
          <div class="flex justify-between items-end mt-4">
            <p class="text-gray-500 text-xs font-mono uppercase tracking-wider">Qty: 50 Lbs</p>
            <div class="bg-gray-800/50 text-gray-500 px-3 py-1 font-mono text-xs font-bold uppercase">Locked</div>
          </div>
        </div>
      </div>

    </div>

    <!-- Bottom Action Bar -->
    <div class="sticky mt-auto bottom-0 left-0 right-0 z-40 bg-[#0a0a0a]/95 backdrop-blur-xl border-t-2 border-[#ff3b30] pb-safe pt-6 px-4 rounded-t-none -mx-4">
      <div class="max-w-md mx-auto pb-4">
        <!-- Progress bar visual element -->
        <div class="w-full h-1 bg-gray-800 mb-4 overflow-hidden">
            <div class="h-full bg-repeating-linear-gradient w-1/3"></div>
        </div>

        <button class="depot-btn w-full flex items-center justify-between px-6">
          <span class="font-mono font-black text-lg tracking-widest uppercase text-black">Purchase Supply</span>
          <svg class="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="square" stroke-linejoin="miter" stroke-width="3" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
// Placeholder for future depot logic
</script>

<style lang="postcss" scoped>
.depot-container {
  /* Stark, brutalist background */
  background-color: #0a0a0a;
  background-image: radial-gradient(#222 1px, transparent 1px);
  background-size: 20px 20px;
}

.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

.depot-btn {
  @apply 
    h-[64px]
    bg-[#ff3b30]
    transition-all duration-100
    active:translate-y-1
    active:shadow-none
    focus:outline-none
    select-none;
    
  /* Brutalist border and shadow */
  border: 4px solid #fff;
  box-shadow: 4px 4px 0px #fff;
}

.depot-btn:active {
    box-shadow: 0px 0px 0px #fff;
}

.bg-repeating-linear-gradient {
    background-image: repeating-linear-gradient(
        45deg,
        #ff3b30,
        #ff3b30 10px,
        #2a0a0a 10px,
        #2a0a0a 20px
    );
}

.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 1rem);
}
</style>
