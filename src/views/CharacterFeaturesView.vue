<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useCharacters } from '../composables/useCharacters'

type TraitKind = 'feats' | 'features'

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
const traitDraft = reactive({
  title: '',
  source: '',
  description: '',
})

const classSummary = computed(() => getCharacterClassSummary(selectedCharacter.value))
const traitDialogTitle = computed(() => `${editingTraitId.value ? '编辑' : '添加'}${activeKind.value === 'feats' ? '专长' : '特性'}`)

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
  traitDraft.source = currentTrait?.source ?? ''
  traitDraft.description = currentTrait?.description ?? ''
  isTraitDialogOpen.value = true
}

const closeTraitDialog = () => {
  syncForm()
  isTraitDialogOpen.value = false
  editingTraitId.value = ''
}

const saveTrait = () => {
  const nextTrait = createTraitEntry(traitDraft.title.trim() || '未命名', traitDraft.source.trim() || '未填写', traitDraft.description.trim())
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
      <RouterLink :to="{ name: 'character-items' }" class="character-page-tab" active-class="active">物品</RouterLink>
      <RouterLink :to="{ name: 'character-adventure-logs' }" class="character-page-tab" active-class="active">冒险日志</RouterLink>
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
          <p class="trait-description">{{ trait.description || '暂无描述。' }}</p>
        </article>
      </div>
      <div v-else class="trait-empty">暂无特性，点击右上角添加。</div>
    </section>

    <Teleport to="body">
      <div v-if="isTraitDialogOpen" class="trait-dialog-backdrop" @click.self="closeTraitDialog">
        <form class="trait-dialog" @submit.prevent="saveTrait">
          <header>
            <div>
              <p class="eyebrow">{{ activeKind === 'feats' ? '专长' : '特性' }}</p>
              <h2>{{ traitDialogTitle }}</h2>
            </div>
            <button class="icon-button" type="button" aria-label="关闭编辑弹窗" @click="closeTraitDialog">×</button>
          </header>

          <div class="trait-dialog-form">
            <label>
              名称
              <el-input v-model="traitDraft.title" placeholder="例如：神射手" />
            </label>
            <label>
              来源
              <el-input v-model="traitDraft.source" placeholder="例如：起源专长" />
            </label>
            <label class="wide-field">
              描述
              <el-input v-model="traitDraft.description" type="textarea" :rows="6" placeholder="填写规则效果、触发条件或使用说明" />
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
