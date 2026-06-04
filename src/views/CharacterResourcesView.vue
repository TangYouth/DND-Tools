<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useCharacters } from '../composables/useCharacters'
import hitDieIcon from '../components/icons/shengmingtou.png'

const hitDieOptions = ['D6', 'D8', 'D10', 'D12']

const {
  selectedCharacter,
  form,
  syncForm,
  saveForm,
  deleteCharacter,
  exportSelectedCharacter,
  getCharacterClassSummary,
  createCustomResource,
} = useCharacters()

const editingHitDieId = ref('')
const editingResourceId = ref('')
const isHitDieDialogOpen = ref(false)
const isResourceDialogOpen = ref(false)
const hitDieDraft = reactive({
  die: 'D8',
})
const resourceDraft = reactive({
  name: '',
  current: 0,
  max: 0,
})

const classSummary = computed(() => getCharacterClassSummary(selectedCharacter.value))
const resourceDialogTitle = computed(() => `${editingResourceId.value ? '编辑' : '添加'}资源`)

const deleteCurrentCharacter = () => {
  if (!selectedCharacter.value) return
  if (!window.confirm(`确定删除角色「${selectedCharacter.value.name}」吗？`)) return
  deleteCharacter()
}

const restoreAllResources = () => {
  syncForm()
  form.hitDice.forEach((item) => {
    item.current = item.max
  })
  form.resources.forEach((item) => {
    item.current = item.max
  })
  saveForm()
}

const adjustHitDie = (resourceId: string, delta: number) => {
  syncForm()
  const resource = form.hitDice.find((item) => item.id === resourceId)
  if (!resource) return
  resource.current = Math.min(resource.max, Math.max(0, resource.current + delta))
  saveForm()
}

const openHitDieDialog = (resourceId: string) => {
  syncForm()
  const resource = form.hitDice.find((item) => item.id === resourceId)
  if (!resource) return
  editingHitDieId.value = resourceId
  hitDieDraft.die = resource.die
  isHitDieDialogOpen.value = true
}

const closeHitDieDialog = () => {
  syncForm()
  editingHitDieId.value = ''
  isHitDieDialogOpen.value = false
}

const saveHitDie = () => {
  const resource = form.hitDice.find((item) => item.id === editingHitDieId.value)
  if (!resource) return
  resource.die = hitDieDraft.die
  saveForm()
  editingHitDieId.value = ''
  isHitDieDialogOpen.value = false
}

const adjustCustomResource = (resourceId: string, delta: number) => {
  syncForm()
  const resource = form.resources.find((item) => item.id === resourceId)
  if (!resource) return
  resource.current = Math.min(resource.max, Math.max(0, resource.current + delta))
  saveForm()
}

const openResourceDialog = (resourceId = '') => {
  syncForm()
  editingResourceId.value = resourceId
  const resource = resourceId ? form.resources.find((item) => item.id === resourceId) : undefined
  resourceDraft.name = resource?.name ?? ''
  resourceDraft.current = resource?.current ?? 0
  resourceDraft.max = resource?.max ?? 1
  isResourceDialogOpen.value = true
}

const closeResourceDialog = () => {
  syncForm()
  editingResourceId.value = ''
  isResourceDialogOpen.value = false
}

const saveResource = () => {
  const max = Math.max(0, Number(resourceDraft.max) || 0)
  const current = Math.min(max, Math.max(0, Number(resourceDraft.current) || 0))
  const nextResource = createCustomResource(resourceDraft.name.trim() || '未命名资源', current, max)

  if (editingResourceId.value) {
    const index = form.resources.findIndex((item) => item.id === editingResourceId.value)
    if (index !== -1) {
      form.resources[index] = {
        ...nextResource,
        id: editingResourceId.value,
      }
    }
  } else {
    form.resources.push(nextResource)
  }

  saveForm()
  editingResourceId.value = ''
  isResourceDialogOpen.value = false
}

const removeResource = (resourceId: string) => {
  syncForm()
  const resource = form.resources.find((item) => item.id === resourceId)
  if (!resource) return
  if (!window.confirm(`确定删除「${resource.name}」吗？`)) return
  form.resources = form.resources.filter((item) => item.id !== resourceId)
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

    <section class="resource-management-panel">
      <header>
        <h2>资源管理</h2>
        <div class="spell-panel-actions">
          <button class="primary-button" type="button" @click="restoreAllResources">恢复全部资源</button>
        </div>
      </header>

      <div class="resource-section-heading">
        <h3>职业资源</h3>
        <span title="生命骰最大值随对应职业等级变化，当前值可在休息后恢复。"></span>
      </div>

      <div v-if="selectedCharacter.hitDice.length > 0" class="hit-dice-list">
        <article v-for="resource in selectedCharacter.hitDice" :key="resource.id" class="hit-die-card">
          <div class="hit-die-icon">
            <img :src="hitDieIcon" alt="" />
          </div>
          <div>
            <h3>生命骰 <small>职业资源</small></h3>
            <p>{{ resource.className }} · {{ resource.die }}</p>
          </div>
          <div class="resource-count-block">
            <span>当前 / 最大</span>
            <strong>{{ resource.current }} / {{ resource.max }}</strong>
            <div class="resource-stepper">
              <button type="button" @click="adjustHitDie(resource.id, -1)">−</button>
              <b>{{ resource.current }}</b>
              <button type="button" @click="adjustHitDie(resource.id, 1)">＋</button>
            </div>
          </div>
          <button class="plain-button" type="button" @click="openHitDieDialog(resource.id)">编辑</button>
        </article>
      </div>
      <div v-else class="trait-empty">当前角色暂无职业生命骰。</div>

      <div class="resource-section-heading">
        <h3>自定义资源</h3>
        <button class="plain-button" type="button" @click="openResourceDialog()">添加资源</button>
      </div>

      <div v-if="selectedCharacter.resources.length > 0" class="custom-resource-grid">
        <article v-for="resource in selectedCharacter.resources" :key="resource.id" class="custom-resource-card">
          <div class="custom-resource-icon">✦</div>
          <h3>{{ resource.name }}</h3>
          <strong>{{ resource.current }} / {{ resource.max }}</strong>
          <div class="resource-stepper">
            <button type="button" @click="adjustCustomResource(resource.id, -1)">−</button>
            <b>{{ resource.current }}</b>
            <button type="button" @click="adjustCustomResource(resource.id, 1)">＋</button>
          </div>
          <footer>
            <button class="plain-button" type="button" @click="openResourceDialog(resource.id)">编辑</button>
            <button class="danger-button" type="button" @click="removeResource(resource.id)">删除</button>
          </footer>
        </article>
      </div>
      <div v-else class="trait-empty">当前角色暂无自定义资源。</div>
    </section>

    <Teleport to="body">
      <div v-if="isHitDieDialogOpen" class="trait-dialog-backdrop" @click.self="closeHitDieDialog">
        <form class="trait-dialog resource-dialog" @submit.prevent="saveHitDie">
          <header>
            <div>
              <p class="eyebrow">生命骰</p>
              <h2>编辑生命骰</h2>
            </div>
            <button class="icon-button" type="button" aria-label="关闭生命骰编辑" @click="closeHitDieDialog">×</button>
          </header>

          <label>
            骰子
            <el-select v-model="hitDieDraft.die" placeholder="选择骰子">
              <el-option v-for="die in hitDieOptions" :key="die" :label="die" :value="die" />
            </el-select>
          </label>

          <footer>
            <button class="plain-button" type="button" @click="closeHitDieDialog">取消</button>
            <button class="primary-button" type="submit">保存生命骰</button>
          </footer>
        </form>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="isResourceDialogOpen" class="trait-dialog-backdrop" @click.self="closeResourceDialog">
        <form class="trait-dialog resource-dialog" @submit.prevent="saveResource">
          <header>
            <div>
              <p class="eyebrow">自定义资源</p>
              <h2>{{ resourceDialogTitle }}</h2>
            </div>
            <button class="icon-button" type="button" aria-label="关闭资源编辑" @click="closeResourceDialog">×</button>
          </header>

          <div class="resource-dialog-grid">
            <label>
              名称
              <el-input v-model="resourceDraft.name" placeholder="例如：奥术恢复" />
            </label>
            <label>
              最大值
              <el-input-number v-model="resourceDraft.max" :min="0" controls-position="right" />
            </label>
            <label>
              当前值
              <el-input-number v-model="resourceDraft.current" :min="0" controls-position="right" />
            </label>
          </div>

          <footer>
            <button class="plain-button" type="button" @click="closeResourceDialog">取消</button>
            <button class="primary-button" type="submit">保存资源</button>
          </footer>
        </form>
      </div>
    </Teleport>
  </template>
</template>
