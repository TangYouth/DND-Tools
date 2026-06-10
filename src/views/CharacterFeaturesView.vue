<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useCharacters } from '../composables/useCharacters'
import featConfig from '../config/featConfig.json'

type TraitKind = 'feats' | 'features'
interface FeatConfigEntry {
  name: string
  form: string
  prerequisites: string
  description: string
}

interface FeatOption {
  id: string
  name: string
  source: string
  prerequisites: string
  description: string
}

const {
  selectedCharacter,
  form,
  syncForm,
  saveForm,
  deleteCharacter,
  exportSelectedCharacter,
  getCharacterClassSummary,
  createTraitEntry,
} = useCharacters()

const activeKind = ref<TraitKind>('feats')
const editingTraitId = ref('')
const isTraitDialogOpen = ref(false)
const selectedFeatId = ref('')
const traitDraft = reactive({
  title: '',
  source: '通用专长',
  prerequisites: '',
  description: '',
  useCustom: false,
})

const featOptions = computed<FeatOption[]>(() => {
  return Object.entries(featConfig as Record<string, FeatConfigEntry[]>).flatMap(([groupKey, entries]) =>
    entries.map((entry, index) => ({
      id: `${groupKey}-${index}-${entry.name}`,
      name: entry.name,
      source: entry.form || '通用专长',
      prerequisites: entry.prerequisites || '',
      description: entry.description || '',
    })),
  )
})
const classSummary = computed(() => getCharacterClassSummary(selectedCharacter.value))
const traitDialogTitle = computed(() => `${editingTraitId.value ? '编辑' : '添加'}${activeKind.value === 'feats' ? '专长' : '特性'}`)
const isFeatConfigMode = computed(() => activeKind.value === 'feats' && !traitDraft.useCustom)

const findMatchingFeatOption = (trait: { title: string; source: string; prerequisites?: string; description: string }) => {
  return featOptions.value.find(
    (option) =>
      option.name === trait.title &&
      option.source === trait.source &&
      option.prerequisites === (trait.prerequisites ?? '') &&
      option.description === trait.description,
  )
}

const applyFeatOption = (optionId: string) => {
  const option = featOptions.value.find((item) => item.id === optionId)
  if (!option) {
    traitDraft.title = ''
    traitDraft.source = '通用专长'
    traitDraft.prerequisites = ''
    traitDraft.description = ''
    return
  }
  traitDraft.title = option.name
  traitDraft.source = option.source
  traitDraft.prerequisites = option.prerequisites
  traitDraft.description = option.description
}

const deleteCurrentCharacter = () => {
  if (!selectedCharacter.value) return
  if (!window.confirm(`确定删除角色「${selectedCharacter.value.name}」吗？`)) return
  deleteCharacter()
}

const openTraitDialog = (kind: TraitKind, traitId = '') => {
  syncForm()
  activeKind.value = kind
  editingTraitId.value = traitId
  const currentTrait = traitId ? form[kind].find((item) => item.id === traitId) : undefined
  traitDraft.title = currentTrait?.title ?? ''
  traitDraft.source = currentTrait?.source ?? (kind === 'feats' ? '通用专长' : '')
  traitDraft.prerequisites = currentTrait?.prerequisites ?? ''
  traitDraft.description = currentTrait?.description ?? ''
  selectedFeatId.value = ''
  traitDraft.useCustom = kind !== 'feats'
  if (kind === 'feats' && currentTrait) {
    const matchedOption = findMatchingFeatOption(currentTrait)
    selectedFeatId.value = matchedOption?.id ?? ''
    traitDraft.useCustom = !matchedOption
  }
  isTraitDialogOpen.value = true
}

const closeTraitDialog = () => {
  syncForm()
  isTraitDialogOpen.value = false
  editingTraitId.value = ''
}

const saveTrait = () => {
  if (isFeatConfigMode.value && selectedFeatId.value) {
    applyFeatOption(selectedFeatId.value)
  }

  const nextTrait = createTraitEntry(
    traitDraft.title.trim() || '未命名',
    traitDraft.source.trim() || '未填写',
    traitDraft.description.trim(),
    traitDraft.prerequisites.trim(),
  )
  const list = form[activeKind.value]

  if (editingTraitId.value) {
    const index = list.findIndex((item) => item.id === editingTraitId.value)
    if (index !== -1) {
      list[index] = {
        ...nextTrait,
        id: editingTraitId.value,
      }
    }
  } else {
    list.push(nextTrait)
  }

  saveForm()
  isTraitDialogOpen.value = false
  editingTraitId.value = ''
}

const removeTrait = (kind: TraitKind, traitId: string) => {
  syncForm()
  const trait = form[kind].find((item) => item.id === traitId)
  if (!trait) return
  if (!window.confirm(`确定删除「${trait.title}」吗？`)) return
  form[kind] = form[kind].filter((item) => item.id !== traitId)
  saveForm()
}

const handleFeatSelectionChange = (optionId: string) => {
  selectedFeatId.value = optionId
  applyFeatOption(optionId)
}

const handleCustomModeChange = (useCustom: string | number | boolean) => {
  traitDraft.useCustom = Boolean(useCustom)
  if (!traitDraft.useCustom) {
    traitDraft.source = '通用专长'
    if (selectedFeatId.value) applyFeatOption(selectedFeatId.value)
  }
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
        <button class="plain-button" type="button" @click="exportSelectedCharacter">导出</button>
        <button class="danger-button" type="button" @click="deleteCurrentCharacter">删除</button>
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

    <section class="trait-panel">
      <header>
        <h2>专长</h2>
        <button class="plain-button" type="button" @click="openTraitDialog('feats')">添加专长</button>
      </header>

      <div v-if="selectedCharacter.feats.length > 0" class="trait-grid">
        <article v-for="trait in selectedCharacter.feats" :key="trait.id" class="trait-card">
          <div class="trait-card-actions">
            <button class="plain-button" type="button" @click="openTraitDialog('feats', trait.id)">编辑</button>
            <button class="danger-button" type="button" @click="removeTrait('feats', trait.id)">删除</button>
          </div>
          <h3>{{ trait.title }}</h3>
          <p class="trait-source">来源：{{ trait.source }}</p>
          <p v-if="trait.prerequisites" class="trait-source">先决条件：{{ trait.prerequisites }}</p>
          <p class="trait-description">{{ trait.description || '暂无描述。' }}</p>
        </article>
      </div>
      <div v-else class="trait-empty">暂无专长，点击右上角添加。</div>
    </section>

    <section class="trait-panel">
      <header>
        <h2>特性</h2>
        <button class="plain-button" type="button" @click="openTraitDialog('features')">添加特性</button>
      </header>

      <div v-if="selectedCharacter.features.length > 0" class="trait-grid">
        <article v-for="trait in selectedCharacter.features" :key="trait.id" class="trait-card">
          <div class="trait-card-actions">
            <button class="plain-button" type="button" @click="openTraitDialog('features', trait.id)">编辑</button>
            <button class="danger-button" type="button" @click="removeTrait('features', trait.id)">删除</button>
          </div>
          <h3>{{ trait.title }}</h3>
          <p class="trait-source">来源：{{ trait.source }}</p>
          <p v-if="trait.prerequisites" class="trait-source">先决条件：{{ trait.prerequisites }}</p>
          <p class="trait-description">{{ trait.description || '暂无描述。' }}</p>
        </article>
      </div>
      <div v-else class="trait-empty">暂无特性，点击右上角添加。</div>
    </section>

    <Teleport to="body">
      <div v-if="isTraitDialogOpen" class="trait-dialog-backdrop">
        <form class="trait-dialog" @submit.prevent="saveTrait">
          <header>
            <div>
              <p class="eyebrow">{{ activeKind === 'feats' ? '专长' : '特性' }}</p>
              <h2>{{ traitDialogTitle }}</h2>
            </div>
            <button class="icon-button" type="button" aria-label="关闭编辑弹窗" @click="closeTraitDialog">×</button>
          </header>

          <div class="trait-dialog-form">
            <label v-if="activeKind === 'feats'" class="wide-field">
              从配置选择专长
              <el-select
                v-model="selectedFeatId"
                filterable
                clearable
                :disabled="traitDraft.useCustom"
                placeholder="输入名称或来源快速查找"
                @change="handleFeatSelectionChange"
              >
                <el-option
                  v-for="feat in featOptions"
                  :key="feat.id"
                  :label="`${feat.name} · ${feat.source}`"
                  :value="feat.id"
                >
                  <span>{{ feat.name }}</span>
                  <small>{{ feat.source }}</small>
                </el-option>
              </el-select>
            </label>
            <label v-if="activeKind === 'feats'" class="checkbox-field wide-field">
              <el-checkbox v-model="traitDraft.useCustom" @change="handleCustomModeChange" />
              使用自定义专长
            </label>
            <label>
              名称
              <el-input v-model="traitDraft.title" :disabled="isFeatConfigMode" placeholder="例如：神射手" />
            </label>
            <label>
              来源
              <el-input v-model="traitDraft.source" :disabled="isFeatConfigMode" placeholder="例如：通用专长" />
            </label>
            <label class="wide-field">
              先决条件
              <el-input v-model="traitDraft.prerequisites" :disabled="isFeatConfigMode" placeholder="例如：等级 4+，敏捷 13+" />
            </label>
            <label class="wide-field">
              描述
              <el-input
                v-model="traitDraft.description"
                type="textarea"
                :rows="6"
                :disabled="isFeatConfigMode"
                placeholder="填写规则效果、触发条件或使用说明"
              />
            </label>
          </div>

          <footer>
            <button class="plain-button" type="button" @click="closeTraitDialog">取消</button>
            <button class="primary-button" type="submit">保存</button>
          </footer>
        </form>
      </div>
    </Teleport>
  </template>
</template>
