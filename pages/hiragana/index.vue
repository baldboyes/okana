<template>
  <div class="max-w-4xl mx-auto">
    <!-- Estadísticas -->
    
    
    <!-- Carácter actual -->
    <div class="flex flex-col items-center gap-8 py-12">
      <CharacterDisplay
        :character="currentCharacter"
        :is-shaking="isShaking"
        :game-mode="gameMode"
        @toggle="toggleGameMode"
      />
      <div class="text-center">
        <p class="text-2xl">{{ showAnswer ? currentCharacter.reading : '&nbsp;' }}</p>
      </div>
    </div>
    
    <!-- Opciones múltiples -->
    <MultipleChoiceOptions
      v-if="gameMode === 'multiple-choice'"
      :options="options"
      :current-character="currentCharacter"
      :show-answer="showAnswer"
      :num-options="numOptions"
      :selected-answer="selectedAnswer"
      @select="checkAnswer"
    />
    
    <!-- Modo escritura -->
    <WritingMode
      v-else
      :show-answer="showAnswer"
      :is-correct="isCorrect"
      @check="checkWriting"
    />

    <div class="absolute bottom-28 left-0 px-4 w-full">
      <GameStats :stats="stats" class="w-full max-w-4xl mx-auto" />
    </div>

  </div>
</template>

<script setup lang="ts">
  import { hiraganaData } from '~/data/characters';
  import { useGameState } from '~/composables/useGameState';
  import CharacterDisplay from '~/components/CharacterDisplay.vue';
  import GameStats from '~/components/GameStats.vue';
  import MultipleChoiceOptions from '~/components/MultipleChoiceOptions.vue';
  import WritingMode from '~/components/WritingMode.vue';

  const {
    currentCharacter,
    isCorrect,
    showAnswer,
    gameMode,
    stats,
    options,
    isShaking,
    numOptions,
    checkAnswer,
    checkWriting,
    toggleGameMode,
    selectedAnswer
  } = useGameState(hiraganaData);

  definePageMeta({
    title: 'Práctica de Hiragana'
  });
</script> 