<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useCharacters } from '../composables/useCharacters'

const {
  selectedCharacter,
  form,
  syncForm,
  saveForm,
  deleteCharacter,
  exportSelectedCharacter,
  getCharacterClassSummary,
  createAdventureLogEntry,
} = useCharacters()

const logDraft = reactive({
  id: '',
  title: '',
  description: '',
})
const isLogDialogOpen = ref(false)
const draggedLogId = ref('')

const classSummary = computed(() => getCharacterClassSummary(selectedCharacter.value))
const logDialogTitle = computed(() => `${logDraft.id ? '编辑' : '添加'}日志`)

const deleteCurrentCharacter = () => {
  if (!selectedCharacter.value) return
  if (!window.confirm(`确定删除角色「${selectedCharacter.value.name}」吗？`)) return
  deleteCharacter()
}

const resetLogDraft = () => {
  logDraft.id = ''
  logDraft.title = ''
  logDraft.description = ''
}

const openLogDialog = (logId = '') => {
  syncForm()
  const log = logId ? form.adventureLogs.find((entry) => entry.id === logId) : undefined
  logDraft.id = log?.id ?? ''
  logDraft.title = log?.title ?? ''
  logDraft.description = log?.description ?? ''
  isLogDialogOpen.value = true
}

const closeLogDialog = () => {
  resetLogDraft()
  isLogDialogOpen.value = false
}

const saveLog = () => {
  syncForm()
  const nextLog = createAdventureLogEntry(logDraft.title.trim() || '未命名日志', logDraft.description.trim())

  if (logDraft.id) {
    const index = form.adventureLogs.findIndex((entry) => entry.id === logDraft.id)
    if (index !== -1) {
      form.adventureLogs[index] = {
        ...nextLog,
        id: logDraft.id,
      }
    }
  } else {
    form.adventureLogs.push(nextLog)
  }

  saveForm()
  closeLogDialog()
}

const removeLog = (logId: string) => {
  syncForm()
  const log = form.adventureLogs.find((entry) => entry.id === logId)
  if (!log) return
  if (!window.confirm(`确定删除「${log.title}」吗？`)) return
  form.adventureLogs = form.adventureLogs.filter((entry) => entry.id !== logId)
  saveForm()
}

const startDraggingLog = (logId: string) => {
  draggedLogId.value = logId
}

const reorderLog = (targetLogId: string) => {
  if (!draggedLogId.value || draggedLogId.value === targetLogId) return
  syncForm()
  const fromIndex = form.adventureLogs.findIndex((entry) => entry.id === draggedLogId.value)
  const toIndex = form.adventureLogs.findIndex((entry) => entry.id === targetLogId)
  if (fromIndex === -1 || toIndex === -1) return
  const [movedLog] = form.adventureLogs.splice(fromIndex, 1)
  if (!movedLog) return
  form.adventureLogs.splice(toIndex, 0, movedLog)
  draggedLogId.value = ''
  saveForm()
}

const stopDraggingLog = () => {
  draggedLogId.value = ''
}
</script>

<template>
  <section v-if="!selectedCharacter" class="panel empty-board-panel">
    <p class="eyebrow">人物看板</p>
    <h1>暂无角色</h1>
    <p style="color: red;">请务必确认左下角存储路径是否正确。Chrome/Edge 浏览器下可以自行选择存储路径。Firefox/Safari 浏览器下默认存储在浏览器本地存储中。</p>
    <p>可以从左侧新建角色，或导入一个角色 JSON 文件。</p>
  </section>

  <template v-else>
    <header class="topbar">
      <div>
        <p class="eyebrow">人物看板</p>
        <h1>{{ selectedCharacter.name }}</h1>
        <p class="character-subtitle">{{ selectedCharacter.race }} / {{ classSummary }}</p>
      </div>
      <div class="topbar-actions">
        <button class="plain-button compact-action-button export-action" type="button" aria-label="导出角色" @click="exportSelectedCharacter">
          <span class="action-icon" aria-hidden="true"></span>
          <span class="action-text">导出</span>
        </button>
        <button class="danger-button compact-action-button delete-action" type="button" aria-label="删除角色" @click="deleteCurrentCharacter">
          <span class="action-icon" aria-hidden="true"></span>
          <span class="action-text">删除</span>
        </button>
      </div>
    </header>

    <nav class="character-page-tabs" aria-label="角色页面">
      <RouterLink :to="{ name: 'characters' }" class="character-page-tab" active-class="active">属性</RouterLink>
      <RouterLink :to="{ name: 'character-features' }" class="character-page-tab" active-class="active">专长 / 特性</RouterLink>
      <RouterLink :to="{ name: 'character-spells' }" class="character-page-tab" active-class="active">法术</RouterLink>
      <RouterLink :to="{ name: 'character-resources' }" class="character-page-tab" active-class="active">资源</RouterLink>
      <RouterLink :to="{ name: 'character-items' }" class="character-page-tab" active-class="active">物品</RouterLink>
      <RouterLink :to="{ name: 'character-adventure-logs' }" class="character-page-tab" active-class="active">冒险日志</RouterLink>
      <RouterLink :to="{ name: 'character-creatures' }" class="character-page-tab" active-class="active">生物数据</RouterLink>
    </nav>

    <section class="adventure-log-panel">
      <header>
        <h2>冒险日志</h2>
        <button class="plain-button add-log-button" type="button" @click="openLogDialog()">
          <span>＋</span>
          添加日志
        </button>
      </header>

      <div v-if="selectedCharacter.adventureLogs.length > 0" class="adventure-log-list">
        <article
          v-for="log in selectedCharacter.adventureLogs"
          :key="log.id"
          class="adventure-log-card"
          :class="{ dragging: draggedLogId === log.id }"
          draggable="true"
          @dragstart="startDraggingLog(log.id)"
          @dragend="stopDraggingLog"
          @dragover.prevent
          @drop="reorderLog(log.id)"
        >
          <div class="adventure-log-icon">✦</div>
          <div class="adventure-log-content">
            <h3>{{ log.title }}</h3>
            <p>{{ log.description || '暂无描述。' }}</p>
          </div>
          <div class="adventure-log-actions">
            <span class="drag-handle" aria-hidden="true">↕</span>
            <button class="icon-button" type="button" aria-label="编辑日志" @click="openLogDialog(log.id)">✎</button>
            <button class="icon-button danger-icon-button" type="button" aria-label="删除日志" @click="removeLog(log.id)">×</button>
          </div>
        </article>
      </div>
      <div v-else class="trait-empty">暂无冒险日志。点击“添加日志”记录这段旅途。</div>
    </section>

    <Teleport to="body">
      <div v-if="isLogDialogOpen" class="trait-dialog-backdrop">
        <form class="trait-dialog adventure-log-dialog" @submit.prevent="saveLog">
          <header>
            <div>
              <p class="eyebrow">冒险日志</p>
              <h2>{{ logDialogTitle }}</h2>
            </div>
            <button class="icon-button" type="button" aria-label="关闭日志编辑" @click="closeLogDialog">×</button>
          </header>

          <div class="trait-dialog-scroll">
            <div class="adventure-log-dialog-form">
              <label>
                标题
                <el-input v-model="logDraft.title" placeholder="例如：哥布林洞穴探索" />
              </label>
              <label>
                描述
                <el-input v-model="logDraft.description" type="textarea" :rows="7" placeholder="记录获得的奖励、线索、遭遇或队伍决定" />
              </label>
            </div>
          </div>

          <footer>
            <button class="plain-button" type="button" @click="closeLogDialog">取消</button>
            <button class="primary-button" type="submit">保存日志</button>
          </footer>
        </form>
      </div>
    </Teleport>
  </template>
</template>
