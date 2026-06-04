<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useCharacters } from '../composables/useCharacters'

const abilityFields = [
  { key: 'str', label: '力量' },
  { key: 'dex', label: '敏捷' },
  { key: 'con', label: '体质' },
  { key: 'int', label: '智力' },
  { key: 'wis', label: '感知' },
  { key: 'cha', label: '魅力' },
] as const

const {
  selectedCharacter,
  form,
  syncForm,
  saveForm,
  deleteCharacter,
  exportSelectedCharacter,
  getCharacterClassSummary,
  createCreatureEntry,
  modifier,
  signed,
} = useCharacters()

const selectedCreatureId = ref('')
const editingCreatureId = ref('')
const isCreatureDialogOpen = ref(false)
const isHpDialogOpen = ref(false)
const hpAmount = ref(0)
const hpTemporaryDraft = ref(0)
const creatureDraft = reactive({
  name: '',
  species: '',
  size: '',
  alignment: '',
  ac: 10,
  hpCurrent: 1,
  hpMax: 1,
  hpTemporary: 0,
  speed: '',
  abilities: {
    str: 10,
    dex: 10,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10,
  },
  resistances: '',
  immunities: '',
  description: '',
})

const classSummary = computed(() => getCharacterClassSummary(selectedCharacter.value))
const creatures = computed(() => selectedCharacter.value?.creatures ?? [])
const selectedCreature = computed(() => {
  return creatures.value.find((creature) => creature.id === selectedCreatureId.value) ?? creatures.value[0] ?? null
})
const creatureDialogTitle = computed(() => `${editingCreatureId.value ? '编辑' : '添加'}生物`)

const deleteCurrentCharacter = () => {
  if (!selectedCharacter.value) return
  if (!window.confirm(`确定删除角色「${selectedCharacter.value.name}」吗？`)) return
  deleteCharacter()
}

const selectCreature = (creatureId: string) => {
  selectedCreatureId.value = creatureId
}

const resetCreatureDraft = () => {
  creatureDraft.name = ''
  creatureDraft.species = ''
  creatureDraft.size = ''
  creatureDraft.alignment = ''
  creatureDraft.ac = 10
  creatureDraft.hpCurrent = 1
  creatureDraft.hpMax = 1
  creatureDraft.hpTemporary = 0
  creatureDraft.speed = ''
  Object.assign(creatureDraft.abilities, { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 })
  creatureDraft.resistances = ''
  creatureDraft.immunities = ''
  creatureDraft.description = ''
}

const openCreatureDialog = (creatureId = '') => {
  syncForm()
  const creature = creatureId ? form.creatures.find((entry) => entry.id === creatureId) : undefined
  editingCreatureId.value = creatureId
  creatureDraft.name = creature?.name ?? ''
  creatureDraft.species = creature?.species ?? ''
  creatureDraft.size = creature?.size ?? ''
  creatureDraft.alignment = creature?.alignment ?? ''
  creatureDraft.ac = creature?.ac ?? 10
  creatureDraft.hpCurrent = creature?.hp.current ?? 1
  creatureDraft.hpMax = creature?.hp.max ?? 1
  creatureDraft.hpTemporary = creature?.hp.temporary ?? 0
  creatureDraft.speed = creature?.speed ?? ''
  Object.assign(creatureDraft.abilities, creature?.abilities ?? { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 })
  creatureDraft.resistances = creature?.resistances ?? ''
  creatureDraft.immunities = creature?.immunities ?? ''
  creatureDraft.description = creature?.description ?? ''
  isCreatureDialogOpen.value = true
}

const closeCreatureDialog = () => {
  editingCreatureId.value = ''
  resetCreatureDraft()
  isCreatureDialogOpen.value = false
}

const saveCreature = () => {
  syncForm()
  const nextCreature = createCreatureEntry(
    creatureDraft.name.trim() || '未命名生物',
    creatureDraft.species.trim() || '未填写',
    creatureDraft.size.trim() || '未填写',
    creatureDraft.alignment.trim() || '未填写',
    creatureDraft.ac,
    creatureDraft.hpCurrent,
    creatureDraft.hpMax,
    creatureDraft.hpTemporary,
    creatureDraft.speed.trim() || '未填写',
    creatureDraft.abilities,
    creatureDraft.resistances.trim(),
    creatureDraft.immunities.trim(),
    creatureDraft.description.trim(),
  )

  if (editingCreatureId.value) {
    const index = form.creatures.findIndex((entry) => entry.id === editingCreatureId.value)
    if (index !== -1) {
      form.creatures[index] = {
        ...nextCreature,
        id: editingCreatureId.value,
      }
    }
  } else {
    form.creatures.push(nextCreature)
  }

  saveForm()
  selectedCreatureId.value = editingCreatureId.value || nextCreature.id
  closeCreatureDialog()
}

const removeCreature = (creatureId: string) => {
  syncForm()
  const creature = form.creatures.find((entry) => entry.id === creatureId)
  if (!creature) return
  if (!window.confirm(`确定删除「${creature.name}」吗？`)) return
  form.creatures = form.creatures.filter((entry) => entry.id !== creatureId)
  saveForm()
  selectedCreatureId.value = form.creatures[0]?.id ?? ''
}

const openHpDialog = () => {
  if (!selectedCreature.value) return
  hpAmount.value = 0
  hpTemporaryDraft.value = selectedCreature.value.hp.temporary
  isHpDialogOpen.value = true
}

const closeHpDialog = () => {
  isHpDialogOpen.value = false
  hpAmount.value = 0
}

const applyDamage = () => {
  if (!selectedCreature.value) return
  syncForm()
  const creature = form.creatures.find((entry) => entry.id === selectedCreature.value?.id)
  if (!creature) return
  let damage = Math.max(0, Number(hpAmount.value) || 0)
  const temporaryDamage = Math.min(creature.hp.temporary, damage)
  creature.hp.temporary -= temporaryDamage
  damage -= temporaryDamage
  creature.hp.current = Math.max(0, creature.hp.current - damage)
  saveForm()
  closeHpDialog()
}

const applyHealing = () => {
  if (!selectedCreature.value) return
  syncForm()
  const creature = form.creatures.find((entry) => entry.id === selectedCreature.value?.id)
  if (!creature) return
  creature.hp.current = Math.min(creature.hp.max, creature.hp.current + Math.max(0, Number(hpAmount.value) || 0))
  saveForm()
  closeHpDialog()
}

const saveTemporaryHp = () => {
  if (!selectedCreature.value) return
  syncForm()
  const creature = form.creatures.find((entry) => entry.id === selectedCreature.value?.id)
  if (!creature) return
  creature.hp.temporary = Math.max(0, Number(hpTemporaryDraft.value) || 0)
  saveForm()
  closeHpDialog()
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
      <RouterLink :to="{ name: 'character-creatures' }" class="character-page-tab" active-class="active">生物数据</RouterLink>
    </nav>

    <section class="creature-panel">
      <header>
        <h2>生物数据</h2>
      </header>

      <div class="creature-workspace">
        <aside class="creature-list-panel">
          <button
            v-for="creature in creatures"
            :key="creature.id"
            class="creature-list-row"
            :class="{ active: selectedCreature?.id === creature.id }"
            type="button"
            @click="selectCreature(creature.id)"
          >
            <span>{{ creature.name.slice(0, 1) }}</span>
            <strong>{{ creature.name }}</strong>
            <small>{{ creature.size }} {{ creature.species }}，{{ creature.alignment }}</small>
          </button>
          <button class="add-creature-card" type="button" @click="openCreatureDialog()">
            <span>＋</span>
            <strong>添加生物数据</strong>
            <small>手动添加新的生物数据卡</small>
          </button>
        </aside>

        <article v-if="selectedCreature" class="creature-detail-card">
          <header>
            <div class="creature-portrait">{{ selectedCreature.name.slice(0, 1) }}</div>
            <div>
              <h3>{{ selectedCreature.name }}</h3>
              <p>{{ selectedCreature.size }} {{ selectedCreature.species }}，{{ selectedCreature.alignment }}</p>
              <dl class="creature-basic-stats">
                <div>
                  <dt>AC</dt>
                  <dd>{{ selectedCreature.ac }}</dd>
                </div>
                <div>
                  <dt>HP</dt>
                  <dd>
                    {{ selectedCreature.hp.current }} / {{ selectedCreature.hp.max }}
                    <small v-if="selectedCreature.hp.temporary">+{{ selectedCreature.hp.temporary }} 临时</small>
                  </dd>
                </div>
                <div>
                  <dt>速度</dt>
                  <dd>{{ selectedCreature.speed }}</dd>
                </div>
              </dl>
            </div>
            <div class="creature-detail-actions">
              <button class="plain-button" type="button" @click="openHpDialog">编辑血量</button>
              <button class="icon-button" type="button" aria-label="编辑生物" @click="openCreatureDialog(selectedCreature.id)">✎</button>
              <button class="icon-button danger-icon-button" type="button" aria-label="删除生物" @click="removeCreature(selectedCreature.id)">×</button>
            </div>
          </header>

          <div class="creature-ability-grid">
            <div v-for="ability in abilityFields" :key="ability.key">
              <span>{{ ability.label }}</span>
              <strong>{{ selectedCreature.abilities[ability.key] }}</strong>
              <small>调整 {{ signed(modifier(selectedCreature.abilities[ability.key])) }}</small>
              <small>豁免 {{ signed(modifier(selectedCreature.abilities[ability.key])) }}</small>
            </div>
          </div>

          <dl class="creature-defense-list">
            <div>
              <dt>抗性</dt>
              <dd>{{ selectedCreature.resistances || '无' }}</dd>
            </div>
            <div>
              <dt>免疫</dt>
              <dd>{{ selectedCreature.immunities || '无' }}</dd>
            </div>
          </dl>

          <section class="creature-description-block">
            <h4>描述</h4>
            <p>{{ selectedCreature.description || '暂无描述。' }}</p>
          </section>
        </article>
        <div v-else class="trait-empty">暂无生物数据。点击“添加生物”创建第一张生物数据卡。</div>
      </div>
    </section>

    <Teleport to="body">
      <div v-if="isCreatureDialogOpen" class="trait-dialog-backdrop" @click.self="closeCreatureDialog">
        <form class="trait-dialog creature-dialog" @submit.prevent="saveCreature">
          <header>
            <div>
              <p class="eyebrow">生物数据</p>
              <h2>{{ creatureDialogTitle }}</h2>
            </div>
            <button class="icon-button" type="button" aria-label="关闭生物编辑" @click="closeCreatureDialog">×</button>
          </header>

          <div class="creature-dialog-form">
            <label>
              名称
              <el-input v-model="creatureDraft.name" placeholder="例如：天界灵魄" />
            </label>
            <label>
              种族
              <el-input v-model="creatureDraft.species" placeholder="例如：天族" />
            </label>
            <label>
              体型
              <el-input v-model="creatureDraft.size" placeholder="例如：大型" />
            </label>
            <label>
              阵营
              <el-input v-model="creatureDraft.alignment" placeholder="例如：中立" />
            </label>
            <label>
              AC
              <el-input-number v-model="creatureDraft.ac" :min="0" controls-position="right" />
            </label>
            <label>
              当前 HP
              <el-input-number v-model="creatureDraft.hpCurrent" :min="0" controls-position="right" />
            </label>
            <label>
              最大 HP
              <el-input-number v-model="creatureDraft.hpMax" :min="1" controls-position="right" />
            </label>
            <label>
              临时 HP
              <el-input-number v-model="creatureDraft.hpTemporary" :min="0" controls-position="right" />
            </label>
            <label>
              速度
              <el-input v-model="creatureDraft.speed" placeholder="例如：30 尺，飞行 40 尺" />
            </label>
            <label v-for="ability in abilityFields" :key="ability.key">
              {{ ability.label }}
              <el-input-number v-model="creatureDraft.abilities[ability.key]" :min="1" controls-position="right" />
            </label>
            <label>
              抗性
              <el-input v-model="creatureDraft.resistances" placeholder="例如：光耀" />
            </label>
            <label>
              免疫
              <el-input v-model="creatureDraft.immunities" placeholder="例如：魅惑，恐慌" />
            </label>
            <label class="wide-field">
              描述
              <el-input v-model="creatureDraft.description" type="textarea" :rows="7" placeholder="填写动作、特性、攻击方式或备注" />
            </label>
          </div>

          <footer>
            <button class="plain-button" type="button" @click="closeCreatureDialog">取消</button>
            <button class="primary-button" type="submit">保存生物</button>
          </footer>
        </form>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="isHpDialogOpen" class="trait-dialog-backdrop" @click.self="closeHpDialog">
        <form class="trait-dialog creature-hp-dialog" @submit.prevent>
          <header>
            <div>
              <p class="eyebrow">生物血量</p>
              <h2>{{ selectedCreature?.name }}</h2>
            </div>
            <button class="icon-button" type="button" aria-label="关闭血量编辑" @click="closeHpDialog">×</button>
          </header>

          <div class="creature-hp-summary">
            <div>
              <span>当前 / 最大</span>
              <strong>{{ selectedCreature?.hp.current ?? 0 }} / {{ selectedCreature?.hp.max ?? 0 }}</strong>
            </div>
            <div>
              <span>临时生命值</span>
              <strong>{{ selectedCreature?.hp.temporary ?? 0 }}</strong>
            </div>
          </div>

          <label>
            伤害 / 治疗数值
            <el-input-number v-model="hpAmount" :min="0" controls-position="right" />
          </label>
          <div class="creature-hp-actions">
            <button class="danger-button" type="button" @click="applyDamage">造成伤害</button>
            <button class="primary-button" type="button" @click="applyHealing">恢复生命</button>
          </div>
          <label>
            临时生命值
            <el-input-number v-model="hpTemporaryDraft" :min="0" controls-position="right" />
          </label>
          <footer>
            <button class="plain-button" type="button" @click="closeHpDialog">取消</button>
            <button class="primary-button" type="button" @click="saveTemporaryHp">保存临时生命值</button>
          </footer>
        </form>
      </div>
    </Teleport>
  </template>
</template>
