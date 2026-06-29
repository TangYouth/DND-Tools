<script setup lang="ts">
import { computed, onUnmounted, reactive, ref } from 'vue'
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
  modifier,
} = useCharacters()

const editingHitDieId = ref('')
const editingResourceId = ref('')
const usingHitDieId = ref('')
const isHitDieDialogOpen = ref(false)
const isHitDieUseDialogOpen = ref(false)
const isResourceDialogOpen = ref(false)
const isRollingHitDice = ref(false)
const hitDieRollResults = ref<number[]>([])
const displayedHitDieRollResults = ref<number[]>([])
const hitDieDraft = reactive({
  die: 'D8',
})
const hitDieUseDraft = reactive({
  count: 1,
})
const resourceDraft = reactive({
  name: '',
  current: 0,
  max: 0,
})
let hitDieRollInterval: ReturnType<typeof window.setInterval> | undefined
let hitDieRollTimeout: ReturnType<typeof window.setTimeout> | undefined

const classSummary = computed(() => getCharacterClassSummary(selectedCharacter.value))
const resourceDialogTitle = computed(() => `${editingResourceId.value ? '编辑' : '添加'}资源`)
const usingHitDieResource = computed(() => form.hitDice.find((item) => item.id === usingHitDieId.value))
const constitutionModifier = computed(() => {
  const constitution = form.abilities.find((ability) => ability.key === 'con')
  return modifier(constitution?.score ?? 10)
})
const hitDieRecoveryTotal = computed(() => {
  return hitDieRollResults.value.reduce((total, roll) => total + Math.max(0, roll + constitutionModifier.value), 0)
})
const canConfirmHitDieUse = computed(() => !isRollingHitDice.value && hitDieRollResults.value.length > 0)

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

const getHitDieSides = (die: string) => Math.max(1, Number.parseInt(die.replace(/\D/g, ''), 10) || 8)

const clearHitDieRollAnimation = () => {
  if (hitDieRollInterval) window.clearInterval(hitDieRollInterval)
  if (hitDieRollTimeout) window.clearTimeout(hitDieRollTimeout)
  hitDieRollInterval = undefined
  hitDieRollTimeout = undefined
  isRollingHitDice.value = false
}

const rollHitDieResults = (count: number, sides: number) => {
  return Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1)
}

const openHitDieUseDialog = (resourceId: string) => {
  syncForm()
  const resource = form.hitDice.find((item) => item.id === resourceId)
  if (!resource) return
  clearHitDieRollAnimation()
  usingHitDieId.value = resourceId
  hitDieUseDraft.count = Math.min(1, Math.max(0, resource.current))
  hitDieRollResults.value = []
  displayedHitDieRollResults.value = []
  isHitDieUseDialogOpen.value = true
}

const closeHitDieUseDialog = () => {
  syncForm()
  clearHitDieRollAnimation()
  usingHitDieId.value = ''
  hitDieRollResults.value = []
  displayedHitDieRollResults.value = []
  isHitDieUseDialogOpen.value = false
}

const startHitDieRoll = () => {
  const resource = usingHitDieResource.value
  if (!resource || resource.current <= 0) return

  const count = Math.min(resource.current, Math.max(1, Number(hitDieUseDraft.count) || 1))
  const sides = getHitDieSides(resource.die)
  hitDieUseDraft.count = count
  hitDieRollResults.value = []
  displayedHitDieRollResults.value = rollHitDieResults(count, sides)
  clearHitDieRollAnimation()
  isRollingHitDice.value = true

  hitDieRollInterval = window.setInterval(() => {
    displayedHitDieRollResults.value = rollHitDieResults(count, sides)
  }, 90)

  hitDieRollTimeout = window.setTimeout(() => {
    clearHitDieRollAnimation()
    const finalResults = rollHitDieResults(count, sides)
    hitDieRollResults.value = finalResults
    displayedHitDieRollResults.value = finalResults
  }, 1000)
}

const confirmHitDieUse = () => {
  const resource = usingHitDieResource.value
  if (!resource || !canConfirmHitDieUse.value) return
  const usedCount = Math.min(resource.current, hitDieRollResults.value.length)
  const healing = Math.max(0, hitDieRecoveryTotal.value)

  resource.current = Math.max(0, resource.current - usedCount)
  form.hp.current = Math.min(form.hp.max, form.hp.current + healing)
  saveForm()
  usingHitDieId.value = ''
  hitDieRollResults.value = []
  displayedHitDieRollResults.value = []
  isHitDieUseDialogOpen.value = false
}

onUnmounted(clearHitDieRollAnimation)

const adjustCustomResource = (resourceId: string, delta: number) => {
  syncForm()
  const resource = form.resources.find((item) => item.id === resourceId)
  if (!resource) return
  resource.current = Math.min(resource.max, Math.max(0, resource.current + delta))
  saveForm()
}

const updateCustomResourceCurrent = (resourceId: string, value: string | number) => {
  syncForm()
  const resource = form.resources.find((item) => item.id === resourceId)
  if (!resource) return
  resource.current = Math.min(resource.max, Math.max(0, Number(value) || 0))
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

    <section class="resource-management-panel">
      <header>
        <h2>资源管理</h2>
        <div class="spell-panel-actions">
          <button class="primary-button" type="button" @click="restoreAllResources">恢复全部资源</button>
        </div>
      </header>

      <div class="resource-section-heading">
        <h3>职业资源</h3>
        <el-tooltip content="生命骰最大值随对应职业等级变化，当前值可在休息后恢复。" placement="top" effect="light" popper-class="dnd-tooltip">
          <span></span>
        </el-tooltip>
      </div>

      <div v-if="selectedCharacter.hitDice.length > 0" class="hit-dice-list">
        <article v-for="resource in selectedCharacter.hitDice" :key="resource.id" class="hit-die-card">
          <div class="hit-die-icon">
            <img :src="hitDieIcon" alt="" />
          </div>
          <div class="hit-die-info">
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
          <div class="hit-die-actions">
            <button class="primary-button" type="button" :disabled="resource.current <= 0" @click="openHitDieUseDialog(resource.id)">使用</button>
            <button class="plain-button" type="button" @click="openHitDieDialog(resource.id)">编辑</button>
          </div>
        </article>
      </div>
      <div v-else class="trait-empty">当前角色暂无职业生命骰。</div>

      <div class="resource-section-heading">
        <h3>自定义资源</h3>
        <button class="plain-button resource-section-action" type="button" @click="openResourceDialog()">添加资源</button>
      </div>

      <div v-if="selectedCharacter.resources.length > 0" class="custom-resource-grid">
        <article v-for="resource in selectedCharacter.resources" :key="resource.id" class="custom-resource-card">
          <div class="custom-resource-icon">✦</div>
          <div class="custom-resource-card-header">
            <h3>{{ resource.name }}</h3>
            <div class="trait-card-actions custom-resource-actions">
              <button class="plain-button" type="button" @click="openResourceDialog(resource.id)">编辑</button>
              <button class="danger-button" type="button" @click="removeResource(resource.id)">删除</button>
            </div>
          </div>
          <strong>{{ resource.current }} / {{ resource.max }}</strong>
          <div class="resource-stepper">
            <button type="button" @click="adjustCustomResource(resource.id, -1)">−</button>
            <input
              :value="resource.current"
              type="number"
              min="0"
              :max="resource.max"
              aria-label="当前资源数量"
              @change="updateCustomResourceCurrent(resource.id, ($event.target as HTMLInputElement).value)"
              @blur="updateCustomResourceCurrent(resource.id, ($event.target as HTMLInputElement).value)"
            />
            <button type="button" @click="adjustCustomResource(resource.id, 1)">＋</button>
          </div>
        </article>
      </div>
      <div v-else class="trait-empty">当前角色暂无自定义资源。</div>
    </section>

    <Teleport to="body">
      <div v-if="isHitDieDialogOpen" class="trait-dialog-backdrop">
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
      <div v-if="isHitDieUseDialogOpen" class="trait-dialog-backdrop">
        <form class="trait-dialog hit-die-use-dialog" @submit.prevent>
          <header>
            <div>
              <p class="eyebrow">生命骰</p>
              <h2>使用生命骰</h2>
            </div>
            <button class="icon-button" type="button" aria-label="关闭生命骰使用" @click="closeHitDieUseDialog">×</button>
          </header>

          <div class="trait-dialog-scroll hit-die-use-scroll">
            <div class="hit-die-use-summary">
              <div>
                <span>当前血量</span>
                <strong>{{ form.hp.current }} / {{ form.hp.max }}</strong>
              </div>
              <div>
                <span>生命骰</span>
                <strong>{{ usingHitDieResource?.current ?? 0 }} / {{ usingHitDieResource?.max ?? 0 }}</strong>
              </div>
              <div>
                <span>体质调整值</span>
                <strong>{{ constitutionModifier >= 0 ? `+${constitutionModifier}` : constitutionModifier }}</strong>
              </div>
            </div>

            <div class="hit-die-use-controls">
              <label>
                使用数量
                <el-input-number
                  v-model="hitDieUseDraft.count"
                  :min="1"
                  :max="Math.max(1, usingHitDieResource?.current ?? 1)"
                  controls-position="right"
                  :disabled="isRollingHitDice"
                />
              </label>
              <button class="primary-button" type="button" :disabled="isRollingHitDice || !usingHitDieResource?.current" @click="startHitDieRoll">
                开始投掷
              </button>
            </div>

            <div class="hit-die-roll-panel" :class="{ rolling: isRollingHitDice }">
              <span v-if="displayedHitDieRollResults.length === 0">选择数量后开始投掷。</span>
              <div v-else class="hit-die-roll-list">
                <b v-for="(roll, index) in displayedHitDieRollResults" :key="index">{{ roll }}</b>
              </div>
              <strong v-if="hitDieRollResults.length > 0">本次恢复 {{ hitDieRecoveryTotal }}</strong>
            </div>
          </div>

          <footer>
            <button class="plain-button" type="button" @click="closeHitDieUseDialog">取消</button>
            <button class="primary-button" type="button" :disabled="!canConfirmHitDieUse" @click="confirmHitDieUse">确认恢复</button>
          </footer>
        </form>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="isResourceDialogOpen" class="trait-dialog-backdrop">
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
