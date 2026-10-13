<template>
  <nav class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 pb-6">
    <div class="max-w-4xl mx-auto flex justify-around items-center">
      <NuxtLink 
        to="/hiragana" 
        class="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-500"
        :class="{ 'text-gray-900 font-semibold': $route.path === '/hiragana' }"
      >
        <span class="text-2xl">あ</span>
        <span class="text-xs">Hiragana</span>
      </NuxtLink>

      <NuxtLink 
        to="/katakana" 
        class="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-500"
        :class="{ 'text-gray-900 font-semibold': $route.path === '/katakana' }"
      >
        <span class="text-2xl">ア</span>
        <span class="text-xs">Katakana</span>
      </NuxtLink>

      <NuxtLink
        to="/kanji"
        class="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-500"
        :class="{ 'text-gray-900 font-semibold': $route.path === '/kanji' }"
      >
        <span class="text-2xl" lang="ja">漢</span>
        <span class="text-xs">Kanji</span>
      </NuxtLink>

      <NuxtLink 
        to="/table" 
        class="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-500"
        :class="{ 'text-gray-900 font-semibold': $route.path === '/table' }"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        <span class="text-xs">Tabla</span>
      </NuxtLink>

      <NuxtLink 
        to="/options" 
        class="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-500"
        :class="{ 'text-gray-900 font-semibold': $route.path === '/options' }"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span class="text-xs">Opciones</span>
      </NuxtLink>
    </div>
  </nav>
</template>

<script setup lang="ts">
defineOptions({
  name: 'NavigationButtons'
});
</script> 