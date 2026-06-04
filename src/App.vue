<script setup lang="ts">
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useCharacters } from './composables/useCharacters'

const router = useRouter()
const {
  characters,
  selectedCharacter,
  storageLocationLabel,
  selectCharacter,
  resetCreationDraft,
  chooseStorageFile,
  importCharactersFromFile,
  getCharacterClassSummary,
} = useCharacters()

const openCharacter = (id: string) => {
  selectCharacter(id)
  router.push({ name: 'characters' })
}

const createCharacter = () => {
  resetCreationDraft()
  router.push({ name: 'character-create' })
}
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand-mark">
        <span>DND</span>
      </div>

      <div class="side-heading">
        <span>角色列表</span>
        <button class="ghost-button" type="button" @click="createCharacter">+ 新建角色</button>
      </div>

      <div class="character-list">
        <button v-for="character in characters" :key="character.id" class="character-row"
          :class="{ active: character.id === selectedCharacter?.id }" type="button"
          @click="openCharacter(character.id)">
          <span class="portrait">{{ character.name.slice(0, 1) }}</span>
          <span class="character-meta">
            <strong>{{ character.name }}</strong>
            <small>{{ getCharacterClassSummary(character) }}</small>
          </span>
          <span class="chevron">›</span>
        </button>
      </div>

      <div class="sidebar-footer">
        <button type="button" @click="importCharactersFromFile">导入角色</button>
        <button type="button" :title="storageLocationLabel" @click="chooseStorageFile">存储路径</button>
      </div>
    </aside>

    <main class="workspace">
      <RouterView />
    </main>
  </div>
</template>
