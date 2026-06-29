<script setup lang="ts">
import { ref } from 'vue'
import { RouterView, useRouter } from 'vue-router'
import ComplexDiceDrawer from './components/ComplexDiceDrawer.vue'
import DiceDrawer from './components/DiceDrawer.vue'
import { useCharacters } from './composables/useCharacters'

const router = useRouter()
const {
  characters,
  selectedCharacter,
  storageLocationLabel,
  storageStatus,
  importInput,
  selectCharacter,
  resetCreationDraft,
  chooseStorageFile,
  importCharactersFromFile,
  importJson,
  getCharacterClassSummary,
} = useCharacters()

const diceDrawer = ref<InstanceType<typeof DiceDrawer> | null>(null)
const complexDiceDrawer = ref<InstanceType<typeof ComplexDiceDrawer> | null>(null)
const isMobileSidebarOpen = ref(false)
const touchStartX = ref(0)
const touchStartY = ref(0)

const openCharacter = (id: string) => {
  selectCharacter(id)
  isMobileSidebarOpen.value = false
  router.push({ name: 'characters' })
}

const createCharacter = () => {
  resetCreationDraft()
  isMobileSidebarOpen.value = false
  router.push({ name: 'character-create' })
}

const openDicePanel = () => {
  isMobileSidebarOpen.value = false
  diceDrawer.value?.open()
}

const openComplexDicePanel = () => {
  isMobileSidebarOpen.value = false
  complexDiceDrawer.value?.open()
}

const openMobileSidebar = () => {
  isMobileSidebarOpen.value = true
}

const closeMobileSidebar = () => {
  isMobileSidebarOpen.value = false
}

const handleTouchStart = (event: TouchEvent) => {
  const touch = event.touches[0]
  if (!touch) return
  touchStartX.value = touch.clientX
  touchStartY.value = touch.clientY
}

const handleTouchEnd = (event: TouchEvent) => {
  const touch = event.changedTouches[0]
  if (!touch) return
  const deltaX = touch.clientX - touchStartX.value
  const deltaY = Math.abs(touch.clientY - touchStartY.value)

  if (!isMobileSidebarOpen.value && touchStartX.value <= 28 && deltaX > 72 && deltaY < 60) {
    openMobileSidebar()
  }
}
</script>

<template>
  <div class="app-shell" :class="{ 'sidebar-open': isMobileSidebarOpen }" @touchstart.passive="handleTouchStart"
    @touchend.passive="handleTouchEnd">
    <button class="mobile-menu-button" type="button" aria-label="打开角色侧栏" @click="openMobileSidebar">
      <span></span>
      <span></span>
      <span></span>
    </button>

    <button v-if="isMobileSidebarOpen" class="mobile-sidebar-scrim" type="button" aria-label="关闭角色侧栏"
      @click="closeMobileSidebar"></button>

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
        <button type="button" @click="openComplexDicePanel">
          复杂骰子工具
        </button>
        <button type="button" @click="openDicePanel">
          简易骰子工具
        </button>
        <button type="button" @click="importCharactersFromFile">导入角色</button>
        <el-tooltip :content="storageLocationLabel" placement="top" effect="light" popper-class="dnd-tooltip">
          <button type="button" @click="chooseStorageFile">存储路径</button>
        </el-tooltip>
        <input ref="importInput" class="visually-hidden-input" type="file" accept="application/json,.json"
          @change="importJson" />
        <small>{{ storageStatus }}</small>
      </div>
    </aside>

    <main class="workspace">
      <RouterView />
    </main>

    <DiceDrawer ref="diceDrawer" />
    <ComplexDiceDrawer ref="complexDiceDrawer" />
  </div>
</template>
