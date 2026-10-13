<template>
  <div class="max-w-4xl mx-auto">
    
    <!-- Carácter actual -->
    <div class="flex flex-col items-center gap-8 py-12">
      <div class="text-center">
        <CharacterDisplay
          :character="currentCharacter"
          :is-shaking="isShaking"
          :game-mode="gameMode"
          @toggle="toggleGameMode"
        />
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
import { katakanaData } from '~/data/characters';
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
} = useGameState(katakanaData);

definePageMeta({
  title: 'Práctica de Katakana'
});
</script> 