<template>
  <div class="max-w-4xl mx-auto ">
    <h1 class="text-3xl font-bold text-gray-800 mb-8">Opciones</h1>
    
    <div class="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 class="text-xl font-semibold text-gray-700 mb-4">Configuración de juego</h2>
      
      <div class="space-y-12">
        <!-- Modo de juego por defecto -->
        <div class="flex justify-between gap-4 flex-col md:flex-row w-full">
          <div>
            <h3 class="text-lg font-medium text-gray-700">Modo de juego por defecto</h3>
            <p class="text-sm text-gray-500">Selecciona el modo de juego que se cargará al iniciar</p>
          </div>
          <div class="flex items-center space-x-2">
            <button 
              @click="selectGameMode('multiple-choice')"
              class="px-4 py-2 rounded-md"
              :class="[
                defaultGameMode === 'multiple-choice' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              ]"
            >
              Opciones múltiples
            </button>
            <button 
              @click="selectGameMode('writing')"
              class="px-4 py-2 rounded-md"
              :class="[
                defaultGameMode === 'writing' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              ]"
            >
              Escritura
            </button>
          </div>
        </div>
        
        <!-- Número de opciones -->
        <div class="flex justify-between gap-4 flex-col md:flex-row w-full">
          <div>
            <h3 class="text-lg font-medium text-gray-700">Número de opciones</h3>
            <p class="text-sm text-gray-500">Cantidad de opciones en el modo de selección múltiple</p>
          </div>
          <div class="flex items-center space-x-2">
            <button 
              v-for="option in [4, 8, 16]"
              :key="option"
              @click="selectNumOptions(option)"
              class="px-4 py-2 rounded-md"
              :class="[
                numOptions === option 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              ]"
            >
              {{ option }}
            </button>
          </div>
        </div>
        
        <!-- Tiempo de espera -->
        <div class="flex justify-between gap-4 flex-col md:flex-row w-full">
          <div>
            <h3 class="text-lg font-medium text-gray-700">Tiempo de espera</h3>
            <p class="text-sm text-gray-500">Segundos antes de pasar al siguiente carácter</p>
          </div>
          <div class="flex items-center space-x-2">
            <button 
              v-for="time in [1, 2, 3, 5]"
              :key="time"
              @click="selectWaitTime(time)"
              class="px-4 py-2 rounded-md"
              :class="[
                waitTime === time 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              ]"
            >
              {{ time }}s
            </button>
          </div>
        </div>
        
        <!-- Sonido -->
        <div class="flex justify-between gap-4 flex-col md:flex-row w-full">
          <div>
            <h3 class="text-lg font-medium text-gray-700">Sonido</h3>
            <p class="text-sm text-gray-500">Reproducir sonido al mostrar la respuesta</p>
          </div>
          <div class="flex items-center space-x-2">
            <button 
              @click="toggleSound(true)"
              class="px-4 py-2 rounded-md"
              :class="[
                soundEnabled 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              ]"
            >
              Activado
            </button>
            <button 
              @click="toggleSound(false)"
              class="px-4 py-2 rounded-md"
              :class="[
                !soundEnabled 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              ]"
            >
              Desactivado
            </button>
          </div>
        </div>
        
        <!-- Confeti -->
        <div class="flex justify-between gap-4 flex-col md:flex-row w-full">
          <div>
            <h3 class="text-lg font-medium text-gray-700">Confeti</h3>
            <p class="text-sm text-gray-500">Mostrar confeti al superar la mejor racha</p>
          </div>
          <div class="flex items-center space-x-2">
            <button 
              @click="toggleConfetti(true)"
              class="px-4 py-2 rounded-md"
              :class="[
                confettiEnabled 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              ]"
            >
              Activado
            </button>
            <button 
              @click="toggleConfetti(false)"
              class="px-4 py-2 rounded-md"
              :class="[
                !confettiEnabled 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              ]"
            >
              Desactivado
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <div class="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 class="text-xl font-semibold text-gray-700 mb-4">Estadísticas</h2>
      
      <div class="space-y-4">
        <div class="flex justify-between items-center">
          <span class="text-gray-700">Total de intentos</span>
          <span class="font-medium">{{ totalAttempts }}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-gray-700">Precisión global</span>
          <span class="font-medium">{{ Math.round(globalAccuracy) }}%</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-gray-700">Mejor racha</span>
          <span class="font-medium">{{ bestStreak }}</span>
        </div>
        
        <div class="pt-4">
          <button 
            @click="resetStats"
            class="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
          >
            Reiniciar estadísticas
          </button>
        </div>
      </div>
    </div>

    <section aria-labelledby="source-credits-title" class="mt-10 mb-6 text-sm leading-relaxed text-gray-600">
      <h2 id="source-credits-title" class="text-lg font-semibold text-gray-700 mb-3">Fuentes y créditos</h2>
      <ul class="space-y-3">
        <li>Listas de niveles y significados de práctica:
          <a href="https://kanjikana.com/es/kanji/" target="_blank" rel="noopener noreferrer" class="text-blue-700 underline underline-offset-4">Kanjikana</a>
          (<a href="https://kanjikana.com/es/credits" target="_blank" rel="noopener noreferrer" class="text-blue-700 underline underline-offset-4">créditos</a>).
          Las palabras del detalle no se han copiado de sus páginas.</li>
        <li>Significados del detalle:
          <a href="https://www.edrdg.org/wiki/KANJIDIC_Project.html" target="_blank" rel="noopener noreferrer" class="text-blue-700 underline underline-offset-4">KANJIDIC2</a>,
          Jim Breen y EDRDG. Español: Francisco Gutierrez y Gabriel Sanroman.
          <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer" class="text-blue-700 underline underline-offset-4">CC BY-SA 4.0</a>.</li>
        <li>Palabras y lecturas:
          <a href="https://www.edrdg.org/wiki/JMdict-EDICT_Dictionary_Project.html" target="_blank" rel="noopener noreferrer" class="text-blue-700 underline underline-offset-4">JMdict</a>,
          Jim Breen, EDRDG y colaboradores
          (<a href="https://www.edrdg.org/edrdg/licence.html" target="_blank" rel="noopener noreferrer" class="text-blue-700 underline underline-offset-4">licencia de los componentes japoneses: CC BY-SA 4.0</a>).
          Traducciones españolas: HISPADIC y RUI, de Francisco Barberan;
          <a href="https://www.edrdg.org/wwwjdic/wwwjdicinf.html#copyr_tag" target="_blank" rel="noopener noreferrer" class="text-blue-700 underline underline-offset-4">fuentes y condiciones de publicación de subconjuntos de WWWJDIC</a>
          (<a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener noreferrer" class="text-blue-700 underline underline-offset-4">CC BY-SA 3.0 para el material mostrado</a>).
          Las traducciones conservan los derechos de sus compiladores.</li>
        <li>Gráficos de trazos de Kanji:
          <a href="https://github.com/parsimonhi/animCJK/tree/ec5e17cca76c87587790bcbce5ea0b4d4fb753d6" target="_blank" rel="noopener noreferrer" class="text-blue-700 underline underline-offset-4">AnimCJK</a>,
          © 2016–2026 FM-SH, derivados de MakeMeAHanzi y de las fuentes Arphic PL KaitiM GB y Big5.
          Los gráficos locales derivados se ofrecen bajo la Arphic Public License (APL):
          <a href="/kanji-strokes/COPYING.txt" target="_blank" rel="noopener noreferrer" class="text-blue-700 underline underline-offset-4">avisos originales</a> y
          <a href="/kanji-strokes/ARPHICPL.TXT" target="_blank" rel="noopener noreferrer" class="text-blue-700 underline underline-offset-4">licencia APL</a>.
          Se seleccionaron y convirtieron a archivos JSON el 1 de octubre de 2026, sin modificar la geometría.
          Esta licencia corresponde a los gráficos, no al conjunto de la aplicación.</li>
        <li>Gráficos de trazos de Hiragana y Katakana:
          <a href="https://github.com/parsimonhi/animCJK/tree/ec5e17cca76c87587790bcbce5ea0b4d4fb753d6/svgsJaKana" target="_blank" rel="noopener noreferrer" class="text-blue-700 underline underline-offset-4">AnimCJK, fuentes originales</a>,
          © 2016–2026 FM-SH. Los 142 gráficos seleccionados y convertidos a JSON conservan la geometría original y se ofrecen bajo LGPL-3.0-o-posterior, distinta de la APL de Kanji:
          <a href="/kana-strokes/COPYING.txt" target="_blank" rel="noopener noreferrer" class="text-blue-700 underline underline-offset-4">avisos originales</a>,
          <a href="/kana-strokes/LGPL.txt" target="_blank" rel="noopener noreferrer" class="text-blue-700 underline underline-offset-4">licencia LGPL v3</a> y
          <a href="/kana-strokes/GPL-3.0.txt" target="_blank" rel="noopener noreferrer" class="text-blue-700 underline underline-offset-4">texto GPL v3 incorporado</a>.
          Los SVG originales se conservan en <a href="/kana-strokes/source/12354.svg" target="_blank" rel="noopener noreferrer" class="text-blue-700 underline underline-offset-4">el corpus local (ejemplo: あ)</a>.
          Esta licencia corresponde a los gráficos de kana, no al conjunto de la aplicación.</li>
      </ul>
      <p class="mt-3">Los detalles locales seleccionan y ordenan hasta 20 palabras con marcas de prioridad de JMdict y sentidos en español.
        No son una clasificación de frecuencia ni la misma selección de Kanjikana. Los campos ausentes se indican sin inventar traducciones.</p>
    </section>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted } from 'vue';

  // Estado de las opciones
  const defaultGameMode = ref<'multiple-choice' | 'writing'>('multiple-choice');
  const numOptions = ref(8);
  const waitTime = ref(1);
  const soundEnabled = ref(true);
  const confettiEnabled = ref(true);

  // Estadísticas
  const totalAttempts = ref(0);
  const globalAccuracy = ref(0);
  const bestStreak = ref(0);

  // Cargar opciones guardadas
  onMounted(() => {
    const savedOptions = localStorage.getItem('gameOptions');
    if (savedOptions) {
      const options = JSON.parse(savedOptions);
      defaultGameMode.value = options.defaultGameMode || 'multiple-choice';
      numOptions.value = options.numOptions || 8;
      waitTime.value = options.waitTime || 1;
      soundEnabled.value = options.soundEnabled !== false;
      confettiEnabled.value = options.confettiEnabled !== false;
    }
    
    // Cargar estadísticas
    const savedStats = localStorage.getItem('gameStats');
    if (savedStats) {
      const stats = JSON.parse(savedStats);
      totalAttempts.value = stats.totalAttempts || 0;
      globalAccuracy.value = stats.accuracy || 0;
      bestStreak.value = stats.bestStreak || 0;
    }
  });

  // Funciones para seleccionar opciones y guardar automáticamente
  function selectGameMode(mode: 'multiple-choice' | 'writing') {
    defaultGameMode.value = mode;
    saveOptions();
  }

  function selectNumOptions(num: number) {
    numOptions.value = num;
    saveOptions();
  }

  function selectWaitTime(time: number) {
    waitTime.value = time;
    saveOptions();
  }

  function toggleSound(enabled: boolean) {
    soundEnabled.value = enabled;
    saveOptions();
  }

  function toggleConfetti(enabled: boolean) {
    confettiEnabled.value = enabled;
    saveOptions();
  }

  // Guardar opciones
  function saveOptions() {
    const options = {
      defaultGameMode: defaultGameMode.value,
      numOptions: numOptions.value,
      waitTime: waitTime.value,
      soundEnabled: soundEnabled.value,
      confettiEnabled: confettiEnabled.value
    };
    
    localStorage.setItem('gameOptions', JSON.stringify(options));
  }

  // Reiniciar estadísticas
  function resetStats() {
    if (confirm('¿Estás seguro de que quieres reiniciar todas las estadísticas? Esta acción no se puede deshacer.')) {
      localStorage.removeItem('gameStats');
      totalAttempts.value = 0;
      globalAccuracy.value = 0;
      bestStreak.value = 0;
      alert('Estadísticas reiniciadas correctamente');
    }
  }

  definePageMeta({
    title: 'Opciones'
  });
</script> 