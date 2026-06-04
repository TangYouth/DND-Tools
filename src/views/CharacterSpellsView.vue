<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useCharacters } from '../composables/useCharacters'

const spellLevels = Array.from({ length: 10 }, (_, level) => level)
const spellSlotLevels = Array.from({ length: 9 }, (_, index) => index + 1)
const spellSchools = ['防护学派', '咒法学派', '预言学派', '惑控学派', '塑能学派', '幻术学派', '死灵学派', '变化学派', '其他']

const {
  selectedCharacter,
  form,
  syncForm,
  saveForm,
  deleteCharacter,
  exportSelectedCharacter,
  getCharacterClassSummary,
  createSpellEntry,
} = useCharacters()

const activeSpellLevel = ref(-1)
const isCompactSpellView = ref(false)
const editingSpellId = ref('')
const isSpellDialogOpen = ref(false)
const isSlotEditorOpen = ref(false)
const spellDraft = reactive({
  name: '',
  level: 0,
  school: '',
  castingTime: '',
  range: '',
  components: '',
  duration: '',
  description: '',
  prepared: false,
})

const classSummary = computed(() => getCharacterClassSummary(selectedCharacter.value))
const spellDialogTitle = computed(() => `${editingSpellId.value ? '编辑' : '添加'}法术`)
const preparedSpellCount = computed(() => selectedCharacter.value?.spells.filter((spell) => spell.level > 0 && spell.prepared).length ?? 0)
const displaySlotLevels = computed(() => {
  if (!selectedCharacter.value) return []
  return spellSlotLevels.filter((level) => {
    const slot = selectedCharacter.value?.spellSlots[String(level)]
    return (slot?.max ?? 0) > 0 || selectedCharacter.value?.spells.some((spell) => spell.level === level)
  })
})
const filteredSpells = computed(() => {
  if (!selectedCharacter.value) return []
  if (activeSpellLevel.value === -1) return selectedCharacter.value.spells
  if (activeSpellLevel.value === -2) {
    return selectedCharacter.value.spells.filter((spell) => spell.level > 0 && spell.prepared)
  }
  return selectedCharacter.value.spells.filter((spell) => spell.level === activeSpellLevel.value)
})

const getSpellLevelLabel = (level: number) => (level === 0 ? '戏法' : `${level}环`)
const getPreparedLabel = (prepared: boolean) => (prepared ? '已准备' : '准备')
const getSpellPreparedStatus = (level: number, prepared: boolean) => {
  if (level === 0) return '无需准备'
  return prepared ? '已准备' : '未准备'
}
const ensureSpellSlot = (level: number) => {
  const key = String(level)
  const slot = form.spellSlots[key] ?? { current: 0, max: 0 }
  form.spellSlots[key] = slot
  return slot
}

const getSelectedSpellSlot = (level: number) => {
  return selectedCharacter.value?.spellSlots[String(level)] ?? { current: 0, max: 0 }
}

const deleteCurrentCharacter = () => {
  if (!selectedCharacter.value) return
  if (!window.confirm(`确定删除角色「${selectedCharacter.value.name}」吗？`)) return
  deleteCharacter()
}

const openSpellDialog = (spellId = '') => {
  syncForm()
  editingSpellId.value = spellId
  const spell = spellId ? form.spells.find((item) => item.id === spellId) : undefined
  spellDraft.name = spell?.name ?? ''
  spellDraft.level = spell?.level ?? 0
  spellDraft.school = spell?.school ?? ''
  spellDraft.castingTime = spell?.castingTime ?? ''
  spellDraft.range = spell?.range ?? ''
  spellDraft.components = spell?.components ?? ''
  spellDraft.duration = spell?.duration ?? ''
  spellDraft.description = spell?.description ?? ''
  spellDraft.prepared = spell?.prepared ?? false
  isSpellDialogOpen.value = true
}

const closeSpellDialog = () => {
  syncForm()
  isSpellDialogOpen.value = false
  editingSpellId.value = ''
}

const saveSpell = () => {
  const nextSpell = createSpellEntry(
    spellDraft.name.trim() || '未命名法术',
    spellDraft.level,
    spellDraft.school.trim() || '未填写',
    spellDraft.castingTime.trim() || '未填写',
    spellDraft.range.trim() || '未填写',
    spellDraft.components.trim() || '未填写',
    spellDraft.duration.trim() || '未填写',
    spellDraft.description.trim(),
    spellDraft.level > 0 && spellDraft.prepared,
  )

  if (editingSpellId.value) {
    const index = form.spells.findIndex((spell) => spell.id === editingSpellId.value)
    if (index !== -1) {
      form.spells[index] = {
        ...nextSpell,
        id: editingSpellId.value,
      }
    }
  } else {
    form.spells.push(nextSpell)
  }

  saveForm()
  isSpellDialogOpen.value = false
  editingSpellId.value = ''
}

const removeSpell = (spellId: string) => {
  syncForm()
  const spell = form.spells.find((item) => item.id === spellId)
  if (!spell) return
  if (!window.confirm(`确定删除「${spell.name}」吗？`)) return
  form.spells = form.spells.filter((item) => item.id !== spellId)
  saveForm()
}

const togglePrepared = (spellId: string) => {
  syncForm()
  const spell = form.spells.find((item) => item.id === spellId)
  if (!spell || spell.level === 0) return
  spell.prepared = !spell.prepared
  saveForm()
}

const openSlotEditor = () => {
  syncForm()
  isSlotEditorOpen.value = true
}

const closeSlotEditor = () => {
  syncForm()
  isSlotEditorOpen.value = false
}

const saveSlots = () => {
  spellSlotLevels.forEach((level) => {
    const slot = ensureSpellSlot(level)
    slot.max = Math.max(0, Number(slot.max) || 0)
    slot.current = Math.min(slot.max, Math.max(0, Number(slot.current) || 0))
  })
  saveForm()
  isSlotEditorOpen.value = false
}

const restoreAllSlots = () => {
  syncForm()
  spellSlotLevels.forEach((level) => {
    const slot = ensureSpellSlot(level)
    slot.current = slot.max
  })
  saveForm()
}

const adjustSlot = (level: number, delta: number) => {
  syncForm()
  const slot = ensureSpellSlot(level)
  slot.current = Math.min(slot.max, Math.max(0, slot.current + delta))
  saveForm()
}
</script>

<template>
  <section v-if="!selectedCharacter" class="panel empty-board-panel">
    <p class="eyebrow">人物看板</p>
    <h1>暂无角色</h1>
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
        <button class="plain-button" type="button" @click="exportSelectedCharacter">导出</button>
        <button class="danger-button" type="button" @click="deleteCurrentCharacter">删除</button>
      </div>
    </header>

    <nav class="character-page-tabs" aria-label="角色页面">
      <RouterLink :to="{ name: 'characters' }" class="character-page-tab" active-class="active">属性</RouterLink>
      <RouterLink :to="{ name: 'character-features' }" class="character-page-tab" active-class="active">专长 / 特性</RouterLink>
      <RouterLink :to="{ name: 'character-spells' }" class="character-page-tab" active-class="active">法术</RouterLink>
      <RouterLink :to="{ name: 'character-resources' }" class="character-page-tab" active-class="active">资源</RouterLink>
    </nav>

    <section class="spell-slot-panel">
      <header>
        <div>
          <h2>法术位管理</h2>
        </div>
        <div class="spell-panel-actions">
          <button class="primary-button" type="button" @click="restoreAllSlots">恢复全部法术位</button>
          <button class="plain-button" type="button" @click="openSlotEditor">编辑法术位</button>
        </div>
      </header>

      <div v-if="displaySlotLevels.length > 0" class="spell-slot-grid">
        <article v-for="level in displaySlotLevels" :key="level" class="spell-slot-card">
          <strong>{{ level }}环</strong>
          <span>{{ getSelectedSpellSlot(level).current }} / {{ getSelectedSpellSlot(level).max }}</span>
          <div>
            <button type="button" @click="adjustSlot(level, -1)">−</button>
            <b>{{ getSelectedSpellSlot(level).current }}</b>
            <button type="button" @click="adjustSlot(level, 1)">＋</button>
          </div>
        </article>
      </div>
      <div v-else class="trait-empty">尚未设置法术位。点击“编辑法术位”配置 1-9 环法术位。</div>
    </section>

    <section class="spell-list-panel">
      <header>
        <h2>法术列表</h2>
        <div class="spell-panel-actions">
          <div class="spell-view-toggle" aria-label="法术看板模式">
            <button type="button" :class="{ active: !isCompactSpellView }" @click="isCompactSpellView = false">正常</button>
            <button type="button" :class="{ active: isCompactSpellView }" @click="isCompactSpellView = true">简约</button>
          </div>
          <button class="primary-button" type="button" @click="openSpellDialog()">添加法术</button>
        </div>
      </header>

      <div class="spell-filter-row">
        <button type="button" :class="{ active: activeSpellLevel === -1 }" @click="activeSpellLevel = -1">全部</button>
        <button type="button" :class="{ active: activeSpellLevel === -2 }" @click="activeSpellLevel = -2">
          已准备法术
          <span>{{ preparedSpellCount }}</span>
        </button>
        <button
          v-for="level in spellLevels"
          :key="level"
          type="button"
          :class="{ active: activeSpellLevel === level }"
          @click="activeSpellLevel = level"
        >
          {{ getSpellLevelLabel(level) }}
        </button>
      </div>

      <div v-if="filteredSpells.length > 0 && isCompactSpellView" class="spell-compact-grid">
        <article
          v-for="spell in filteredSpells"
          :key="spell.id"
          class="spell-compact-card"
          :class="{ prepared: spell.level > 0 && spell.prepared }"
        >
          <button class="spell-compact-name" type="button" @click="openSpellDialog(spell.id)">
            {{ spell.name }}
          </button>
          <button v-if="spell.level > 0" class="spell-compact-status" type="button" @click="togglePrepared(spell.id)">
            {{ getSpellPreparedStatus(spell.level, spell.prepared) }}
          </button>
          <span v-else class="spell-compact-status static">{{ getSpellPreparedStatus(spell.level, spell.prepared) }}</span>
        </article>
      </div>

      <div v-else-if="filteredSpells.length > 0" class="spell-card-grid">
        <article v-for="spell in filteredSpells" :key="spell.id" class="spell-card" :class="{ prepared: spell.level > 0 && spell.prepared }">
          <header>
            <div>
              <h3>{{ spell.name }}</h3>
              <p>{{ getSpellLevelLabel(spell.level) }} · {{ spell.school }}</p>
            </div>
            <button v-if="spell.level > 0" class="plain-button" type="button" @click="togglePrepared(spell.id)">
              {{ getPreparedLabel(spell.prepared) }}
            </button>
          </header>

          <dl class="spell-meta-grid">
            <div>
              <dt>施法时间</dt>
              <dd>{{ spell.castingTime }}</dd>
            </div>
            <div>
              <dt>施法距离</dt>
              <dd>{{ spell.range }}</dd>
            </div>
            <div>
              <dt>法术成分</dt>
              <dd>{{ spell.components }}</dd>
            </div>
            <div>
              <dt>持续时间</dt>
              <dd>{{ spell.duration }}</dd>
            </div>
          </dl>

          <p class="spell-description" :title="spell.description || '暂无描述。'">{{ spell.description || '暂无描述。' }}</p>
          <footer>
            <button class="plain-button" type="button" @click="openSpellDialog(spell.id)">编辑</button>
            <button class="danger-button" type="button" @click="removeSpell(spell.id)">删除</button>
          </footer>
        </article>
      </div>
      <div v-else class="trait-empty">当前筛选下没有法术，点击右上角添加。</div>
    </section>

    <Teleport to="body">
      <div v-if="isSlotEditorOpen" class="trait-dialog-backdrop" @click.self="closeSlotEditor">
        <form class="trait-dialog spell-slot-dialog" @submit.prevent="saveSlots">
          <header>
            <div>
              <p class="eyebrow">法术位</p>
              <h2>编辑法术位</h2>
            </div>
            <button class="icon-button" type="button" aria-label="关闭法术位编辑" @click="closeSlotEditor">×</button>
          </header>

          <div class="slot-editor-grid">
            <label v-for="level in spellSlotLevels" :key="level">
              {{ level }}环最大法术位
              <el-input-number v-model="ensureSpellSlot(level).max" :min="0" controls-position="right" />
            </label>
          </div>

          <footer>
            <button class="plain-button" type="button" @click="closeSlotEditor">取消</button>
            <button class="primary-button" type="submit">保存法术位</button>
          </footer>
        </form>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="isSpellDialogOpen" class="trait-dialog-backdrop" @click.self="closeSpellDialog">
        <form class="trait-dialog spell-dialog" @submit.prevent="saveSpell">
          <header>
            <div>
              <p class="eyebrow">法术</p>
              <h2>{{ spellDialogTitle }}</h2>
            </div>
            <button class="icon-button" type="button" aria-label="关闭法术编辑" @click="closeSpellDialog">×</button>
          </header>

          <div class="spell-dialog-form">
            <label>
              名称
              <el-input v-model="spellDraft.name" placeholder="例如：火焰箭" />
            </label>
            <label>
              环阶
              <el-select v-model="spellDraft.level" placeholder="选择环阶">
                <el-option v-for="level in spellLevels" :key="level" :label="getSpellLevelLabel(level)" :value="level" />
              </el-select>
            </label>
            <label>
              学派
              <el-select v-model="spellDraft.school" placeholder="选择学派">
                <el-option v-for="school in spellSchools" :key="school" :label="school" :value="school" />
              </el-select>
            </label>
            <label>
              施法时间
              <el-input v-model="spellDraft.castingTime" placeholder="例如：1 动作" />
            </label>
            <label>
              施法距离
              <el-input v-model="spellDraft.range" placeholder="例如：120 尺" />
            </label>
            <label>
              法术成分
              <el-input v-model="spellDraft.components" placeholder="例如：V / S / M" />
            </label>
            <label>
              持续时间
              <el-input v-model="spellDraft.duration" placeholder="例如：瞬时" />
            </label>
            <label v-if="spellDraft.level > 0" class="checkbox-field spell-prepared-field">
              <el-checkbox v-model="spellDraft.prepared" />
              已准备
            </label>
            <label class="wide-field">
              描述
              <el-input v-model="spellDraft.description" type="textarea" :rows="6" placeholder="填写法术效果、伤害、豁免或特殊说明" />
            </label>
          </div>

          <footer>
            <button class="plain-button" type="button" @click="closeSpellDialog">取消</button>
            <button class="primary-button" type="submit">保存法术</button>
          </footer>
        </form>
      </div>
    </Teleport>
  </template>
</template>
