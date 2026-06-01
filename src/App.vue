<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import characterCreationConfig from './config/characterCreation.json'

type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'
type AbilityMode = 'manual' | 'random'

interface Skill {
  name: string
  value: number
  proficient?: boolean
}

interface Ability {
  key: AbilityKey
  label: string
  short: string
  score: number
  save: number
  proficient?: boolean
  skills: Skill[]
}

interface Character {
  id: string
  name: string
  race: string
  className: string
  level: number
  background: string
  alignment: string
  size: string
  hp: {
    current: number
    max: number
  }
  ac: number
  initiative: number
  speed: number
  proficiency: number
  passivePerception: number
  attackBonus: number
  spellSaveDc: number
  story: string
  abilities: Ability[]
  proficiencies: {
    weapons: string
    armor: string
    tools: string
    other: string
  }
  notes: string
  updatedAt: string
}

interface CharacterDraft {
  name: string
  species: string
  customSpecies: string
  className: string
  customClassName: string
  level: number
  alignment: string
  background: string
  customBackground: string
  size: string
  customSize: string
  story: string
  abilityMode: AbilityMode
  abilityScores: Record<AbilityKey, number>
  abilityAssignments: Record<AbilityKey, string>
}

interface AbilityRoll {
  id: string
  dice: number[]
  dropped: number
  droppedIndex: number
  total: number
}

const STORAGE_KEY = 'dnd-tools.character-board.v1'
const CUSTOM_OPTION = characterCreationConfig.customOption
const abilityDefinitions: Array<{ key: AbilityKey; label: string; short: string }> = [
  { key: 'str', label: '力量', short: 'STR' },
  { key: 'dex', label: '敏捷', short: 'DEX' },
  { key: 'con', label: '体质', short: 'CON' },
  { key: 'int', label: '智力', short: 'INT' },
  { key: 'wis', label: '感知', short: 'WIS' },
  { key: 'cha', label: '魅力', short: 'CHA' },
]

const createDefaultAbilityScores = (): Record<AbilityKey, number> => ({
  str: 10,
  dex: 10,
  con: 10,
  int: 10,
  wis: 10,
  cha: 10,
})

const createDefaultAbilityAssignments = (): Record<AbilityKey, string> => ({
  str: '',
  dex: '',
  con: '',
  int: '',
  wis: '',
  cha: '',
})

const createCharacter = (overrides: Partial<Character> = {}): Character => ({
  id: crypto.randomUUID(),
  name: '艾瑞克·晨星',
  race: '半精灵',
  className: '游侠',
  level: 5,
  background: '流浪者',
  alignment: '中立善良',
  size: '中型',
  hp: { current: 38, max: 38 },
  ac: 17,
  initiative: 4,
  speed: 30,
  proficiency: 3,
  passivePerception: 15,
  attackBonus: 7,
  spellSaveDc: 14,
  story:
    '艾瑞克自幼在边境的薄雾林地长大，那里静谧而危机四伏。他跟随森林中的猎手学习追踪与生存，学会了在无声中观察、在阴影中等待。随着年岁增长，他开始独自踏入更远的荒野，追踪威胁商路与村落的怪物，保护来往的商队与无辜的旅人。',
  abilities: [
    {
      key: 'str',
      label: '力量',
      short: 'STR',
      score: 14,
      save: 2,
      skills: [{ name: '运动', value: 2 }],
    },
    {
      key: 'dex',
      label: '敏捷',
      short: 'DEX',
      score: 18,
      save: 7,
      proficient: true,
      skills: [
        { name: '杂技', value: 4 },
        { name: '巧手', value: 4 },
        { name: '潜行', value: 7, proficient: true },
      ],
    },
    {
      key: 'con',
      label: '体质',
      short: 'CON',
      score: 15,
      save: 2,
      skills: [],
    },
    {
      key: 'int',
      label: '智力',
      short: 'INT',
      score: 12,
      save: 1,
      skills: [
        { name: '奥秘', value: 1 },
        { name: '历史', value: 1 },
        { name: '调查', value: 1 },
        { name: '自然', value: 1 },
        { name: '宗教', value: 1 },
      ],
    },
    {
      key: 'wis',
      label: '感知',
      short: 'WIS',
      score: 16,
      save: 6,
      proficient: true,
      skills: [
        { name: '驯兽', value: 3 },
        { name: '洞悉', value: 3 },
        { name: '医药', value: 3 },
        { name: '察觉', value: 6, proficient: true },
        { name: '求生', value: 6, proficient: true },
      ],
    },
    {
      key: 'cha',
      label: '魅力',
      short: 'CHA',
      score: 10,
      save: 0,
      skills: [
        { name: '欺瞒', value: 0 },
        { name: '威吓', value: 0 },
        { name: '表演', value: 0 },
        { name: '说服', value: 0 },
      ],
    },
  ],
  proficiencies: {
    weapons: '简单武器，军用武器，长弓，短弓，长剑，短剑，短弯刀',
    armor: '轻甲，中甲，盾牌',
    tools: '盗贼工具，乐器任选一种，导航工具，伪装工具',
    other: '语言：通用语，精灵语，德鲁伊语，地底通用语',
  },
  notes: '下一次长休后检查箭矢、口粮与治疗药水。',
  updatedAt: new Date().toISOString(),
  ...overrides,
})

const fallbackCharacters = [
  createCharacter(),
  createCharacter({
    id: crypto.randomUUID(),
    name: '莉亚娜',
    className: '法师',
    race: '人类',
    level: 3,
    hp: { current: 18, max: 22 },
    ac: 12,
    initiative: 2,
    attackBonus: 5,
    spellSaveDc: 13,
    background: '贤者',
    story: '莉亚娜把每一次冒险都当作一段需要被校订的传说。她记录星象、遗迹铭文与队友不愿承认的英勇瞬间。',
  }),
  createCharacter({
    id: crypto.randomUUID(),
    name: '布鲁诺',
    className: '战士',
    race: '矮人',
    level: 4,
    hp: { current: 42, max: 42 },
    ac: 18,
    initiative: 1,
    speed: 25,
    attackBonus: 6,
    spellSaveDc: 0,
    background: '士兵',
    story: '布鲁诺记得每一处战场的泥土味，也记得每一个需要他站在前面的朋友。',
  }),
]

const loadCharacters = (): Character[] => {
  const saved = window.localStorage.getItem(STORAGE_KEY)
  if (!saved) return fallbackCharacters

  try {
    const parsed = JSON.parse(saved) as Character[]
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : fallbackCharacters
  } catch {
    return fallbackCharacters
  }
}

const cloneCharacter = (character: Character): Character => JSON.parse(JSON.stringify(character)) as Character

const characters = ref<Character[]>(loadCharacters())
const selectedId = ref(characters.value[0]?.id ?? '')
const isEditing = ref(false)
const isCreating = ref(false)
const creationStep = ref(0)
const importInput = ref<HTMLInputElement | null>(null)
const creationDraft = reactive<CharacterDraft>({
  name: characterCreationConfig.defaults.name,
  species: characterCreationConfig.defaults.species,
  customSpecies: '',
  className: characterCreationConfig.defaults.className,
  customClassName: '',
  level: characterCreationConfig.defaults.level,
  alignment: characterCreationConfig.defaults.alignment,
  background: characterCreationConfig.defaults.background,
  customBackground: '',
  size: characterCreationConfig.defaults.size,
  customSize: '',
  story: characterCreationConfig.defaults.story,
  abilityMode: 'random',
  abilityScores: createDefaultAbilityScores(),
  abilityAssignments: createDefaultAbilityAssignments(),
})
const abilityRolls = ref<AbilityRoll[]>([])

const selectedCharacter = computed<Character>(() => {
  const character = characters.value.find((item) => item.id === selectedId.value) ?? characters.value[0]
  if (character) return character

  const fallback = createCharacter()
  characters.value = [fallback]
  selectedId.value = fallback.id
  return fallback
})

const form = reactive<Character>(cloneCharacter(selectedCharacter.value))

const hpPercent = computed(() => {
  if (!selectedCharacter.value.hp.max) return 0
  return Math.min(100, Math.max(0, (selectedCharacter.value.hp.current / selectedCharacter.value.hp.max) * 100))
})

const syncForm = () => {
  Object.assign(form, cloneCharacter(selectedCharacter.value))
}

watch(selectedCharacter, syncForm)

watch(
  characters,
  (next) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next, null, 2))
  },
  { deep: true },
)

const modifier = (score: number) => Math.floor((score - 10) / 2)
const signed = (value: number) => `${value >= 0 ? '+' : ''}${value}`

const selectCharacter = (id: string) => {
  selectedId.value = id
  isEditing.value = false
  isCreating.value = false
}

const addCharacter = () => {
  resetCreationDraft()
  creationStep.value = 0
  isCreating.value = true
  isEditing.value = false
}

const saveForm = () => {
  const index = characters.value.findIndex((character) => character.id === form.id)
  if (index === -1) return
  form.updatedAt = new Date().toISOString()
  characters.value[index] = cloneCharacter(form)
  isEditing.value = false
}

const deleteCharacter = () => {
  if (characters.value.length <= 1 || !selectedCharacter.value) return
  characters.value = characters.value.filter((character) => character.id !== selectedCharacter.value.id)
  selectedId.value = characters.value[0]?.id ?? ''
  isEditing.value = false
}

const exportJson = () => {
  const data = JSON.stringify(characters.value, null, 2)
  const blob = new Blob([data], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `dnd-characters-${new Date().toISOString().slice(0, 10)}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

const importJson = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const text = await file.text()
  let parsed: Character[]
  try {
    parsed = JSON.parse(text) as Character[]
  } catch {
    return
  }
  if (!Array.isArray(parsed) || parsed.length === 0) return

  const firstCharacter = parsed[0]
  if (!firstCharacter?.id) return

  characters.value = parsed
  selectedId.value = firstCharacter.id
  isEditing.value = false
  target.value = ''
}

const metricCards = computed(() => [
  { label: 'HP', value: `${selectedCharacter.value.hp.current} / ${selectedCharacter.value.hp.max}`, tone: 'green' },
  { label: 'AC', value: selectedCharacter.value.ac, tone: 'steel' },
  { label: '先攻', value: signed(selectedCharacter.value.initiative), tone: 'violet' },
  { label: '速度', value: `${selectedCharacter.value.speed} 尺`, tone: 'amber' },
  { label: '熟练加值', value: signed(selectedCharacter.value.proficiency), tone: 'amber' },
  { label: '被动察觉', value: selectedCharacter.value.passivePerception, tone: 'blue' },
  { label: '攻击加值', value: signed(selectedCharacter.value.attackBonus), tone: 'bronze' },
  { label: '法术豁免', value: selectedCharacter.value.spellSaveDc || '-', tone: 'violet' },
])

const proficiencyRows = computed(() => [
  ['武器熟练项', selectedCharacter.value.proficiencies.weapons],
  ['护甲熟练项', selectedCharacter.value.proficiencies.armor],
  ['工具熟练项', selectedCharacter.value.proficiencies.tools],
  ['其他熟练项', selectedCharacter.value.proficiencies.other],
])

const currentCreationStep = computed(() => characterCreationConfig.steps[creationStep.value])
const storyLength = computed(() => creationDraft.story.length)

const resolveCustomValue = (value: string, customValue: string) => {
  return value === CUSTOM_OPTION ? customValue.trim() : value
}

const previewRows = computed(() => [
  ['姓名', creationDraft.name.trim() || '未命名角色'],
  ['种族 / 物种', resolveCustomValue(creationDraft.species, creationDraft.customSpecies) || '待填写'],
  ['职业', resolveCustomValue(creationDraft.className, creationDraft.customClassName) || '待填写'],
  ['等级', String(creationDraft.level || 1)],
  ['阵营', creationDraft.alignment || '待选择'],
  ['背景', resolveCustomValue(creationDraft.background, creationDraft.customBackground) || '待填写'],
  ['体型', resolveCustomValue(creationDraft.size, creationDraft.customSize) || '待选择'],
  ['背景故事', creationDraft.story.trim() || '可先简单填写，后续可在角色卡中继续完善'],
])

const sortedRollTotals = computed(() => {
  return abilityRolls.value.map((roll) => roll.total).sort((first, second) => second - first)
})

const sortedRolls = computed(() => {
  return [...abilityRolls.value].sort((first, second) => second.total - first.total)
})

const usedRollIds = computed(() => Object.values(creationDraft.abilityAssignments).filter(Boolean))

const abilityPreview = computed(() => {
  return abilityDefinitions.map((ability) => {
    const score = creationDraft.abilityScores[ability.key]
    return {
      ...ability,
      score,
      modifier: signed(modifier(score)),
    }
  })
})

const assignedRollCount = computed(() => {
  if (creationDraft.abilityMode !== 'random') return 6
  return usedRollIds.value.length
})

const isAbilityStepValid = computed(() => {
  if (creationDraft.abilityMode === 'manual') {
    return abilityDefinitions.every((ability) => {
      const score = creationDraft.abilityScores[ability.key]
      return Number.isInteger(score) && score >= 1 && score <= 30
    })
  }

  if (abilityRolls.value.length !== 6) return false
  const assignedIds = abilityDefinitions.map((ability) => creationDraft.abilityAssignments[ability.key])
  return new Set(assignedIds).size === 6 && assignedIds.every((id) => abilityRolls.value.some((roll) => roll.id === id))
})

const rollD6 = () => Math.floor(Math.random() * 6) + 1

const rollAbilityScores = () => {
  const rolls = Array.from({ length: 6 }, (_, groupIndex) => {
    const dice = Array.from({ length: 4 }, rollD6)
    const dropped = Math.min(...dice)
    const droppedIndex = dice.indexOf(dropped)
    const total = dice.reduce((sum, die) => sum + die, 0) - dropped

    return {
      id: `${Date.now()}-${groupIndex}`,
      dice,
      dropped,
      droppedIndex,
      total,
    }
  })

  abilityRolls.value = rolls
  abilityDefinitions.forEach((ability) => {
    creationDraft.abilityAssignments[ability.key] = ''
    creationDraft.abilityScores[ability.key] = 10
  })
}

const resetAbilityScores = () => {
  Object.assign(creationDraft.abilityScores, createDefaultAbilityScores())
  Object.assign(creationDraft.abilityAssignments, createDefaultAbilityAssignments())
  abilityRolls.value = []
}

const isRollOptionUsed = (rollId: string, currentKey: AbilityKey) => {
  return abilityDefinitions.some((ability) => {
    return ability.key !== currentKey && creationDraft.abilityAssignments[ability.key] === rollId
  })
}

const assignRollToAbility = (key: AbilityKey, rollId: string) => {
  const roll = abilityRolls.value.find((item) => item.id === rollId)
  creationDraft.abilityAssignments[key] = rollId
  creationDraft.abilityScores[key] = roll?.total ?? 10
}

const getEventValue = (event: Event) => (event.target as HTMLSelectElement).value

const createAbilitiesFromDraft = (): Ability[] => {
  return abilityDefinitions.map((ability) => {
    const score = creationDraft.abilityScores[ability.key]
    const baseModifier = modifier(score)

    return {
      ...ability,
      score,
      save: baseModifier,
      skills: [],
    }
  })
}

const resetCreationDraft = () => {
  Object.assign(creationDraft, {
    name: characterCreationConfig.defaults.name,
    species: characterCreationConfig.defaults.species,
    customSpecies: '',
    className: characterCreationConfig.defaults.className,
    customClassName: '',
    level: characterCreationConfig.defaults.level,
    alignment: characterCreationConfig.defaults.alignment,
    background: characterCreationConfig.defaults.background,
    customBackground: '',
    size: characterCreationConfig.defaults.size,
    customSize: '',
    story: characterCreationConfig.defaults.story,
    abilityMode: 'random',
  })
  Object.assign(creationDraft.abilityScores, createDefaultAbilityScores())
  Object.assign(creationDraft.abilityAssignments, createDefaultAbilityAssignments())
  abilityRolls.value = []
}

const isBasicStepValid = computed(() => {
  return Boolean(
    creationDraft.name.trim() &&
      resolveCustomValue(creationDraft.species, creationDraft.customSpecies) &&
      resolveCustomValue(creationDraft.className, creationDraft.customClassName) &&
      creationDraft.level >= 1 &&
      creationDraft.alignment &&
      resolveCustomValue(creationDraft.background, creationDraft.customBackground) &&
      resolveCustomValue(creationDraft.size, creationDraft.customSize),
  )
})

const goNextCreationStep = () => {
  if (creationStep.value === 0 && !isBasicStepValid.value) return
  if (creationStep.value === 1 && !isAbilityStepValid.value) return
  if (creationStep.value < characterCreationConfig.steps.length - 1) {
    creationStep.value += 1
  }
}

const goPreviousCreationStep = () => {
  if (creationStep.value > 0) creationStep.value -= 1
}

const cancelCreation = () => {
  isCreating.value = false
  creationStep.value = 0
}

const finishCreation = () => {
  if (!isBasicStepValid.value) {
    creationStep.value = 0
    return
  }

  const character = createCharacter({
    name: creationDraft.name.trim(),
    race: resolveCustomValue(creationDraft.species, creationDraft.customSpecies),
    className: resolveCustomValue(creationDraft.className, creationDraft.customClassName),
    level: creationDraft.level,
    alignment: creationDraft.alignment,
    background: resolveCustomValue(creationDraft.background, creationDraft.customBackground),
    size: resolveCustomValue(creationDraft.size, creationDraft.customSize),
    story: creationDraft.story.trim() || '这个角色的背景故事还在旅途中慢慢成形。',
    hp: { current: Math.max(1, 8 + modifier(creationDraft.abilityScores.con)), max: Math.max(1, 8 + modifier(creationDraft.abilityScores.con)) },
    ac: 10 + modifier(creationDraft.abilityScores.dex),
    initiative: modifier(creationDraft.abilityScores.dex),
    speed: 30,
    proficiency: 2,
    passivePerception: 10 + modifier(creationDraft.abilityScores.wis),
    attackBonus: 2 + Math.max(modifier(creationDraft.abilityScores.str), modifier(creationDraft.abilityScores.dex)),
    spellSaveDc: 10 + 2 + Math.max(modifier(creationDraft.abilityScores.int), modifier(creationDraft.abilityScores.wis), modifier(creationDraft.abilityScores.cha)),
    abilities: createAbilitiesFromDraft(),
    notes: '角色创建流程已记录基本信息，后续步骤可继续完善。',
  })
  characters.value = [character, ...characters.value]
  selectedId.value = character.id
  isCreating.value = false
  creationStep.value = 0
}
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand-mark">
        <span>D20</span>
      </div>

      <nav class="module-tabs" aria-label="模块">
        <button class="tab active" type="button">角色卡</button>
        <button class="tab" type="button">工具模块</button>
      </nav>

      <div class="side-heading">
        <span>角色列表</span>
        <button class="ghost-button" type="button" @click="addCharacter">+ 新建角色</button>
      </div>

      <div class="character-list">
        <button
          v-for="character in characters"
          :key="character.id"
          class="character-row"
          :class="{ active: character.id === selectedCharacter.id }"
          type="button"
          @click="selectCharacter(character.id)"
        >
          <span class="portrait">{{ character.name.slice(0, 1) }}</span>
          <span class="character-meta">
            <strong>{{ character.name }}</strong>
            <small>Lv.{{ character.level }} {{ character.className }}</small>
          </span>
          <span class="chevron">›</span>
        </button>
      </div>

      <div class="sidebar-footer">
        <button type="button">战役</button>
        <button type="button">笔记</button>
        <button type="button">设置</button>
      </div>
    </aside>

    <main class="workspace">
      <section v-if="isCreating" class="creation-workspace">
        <header class="creation-header">
          <div>
            <p class="eyebrow">创建角色</p>
            <h1>创建角色</h1>
          </div>
          <button class="plain-button" type="button" @click="cancelCreation">返回看板</button>
        </header>

        <nav class="creation-steps" aria-label="创建步骤">
          <button
            v-for="(step, index) in characterCreationConfig.steps"
            :key="step.id"
            class="step-item"
            :class="{ active: index === creationStep, completed: index < creationStep }"
            type="button"
            @click="creationStep = index"
          >
            <span>{{ step.index }}</span>
            <strong>{{ step.label }}</strong>
          </button>
        </nav>

        <form v-if="currentCreationStep?.id === 'basic'" class="creation-panel" @submit.prevent="goNextCreationStep">
          <div class="creation-basic-layout">
            <section class="creation-form-column">
              <div class="creation-section-title">
                <span>✎</span>
                <h2>基本信息</h2>
              </div>

              <div class="creation-form">
                <label class="required-field">
                  <span class="field-label">姓名 <em>*</em></span>
                  <input v-model="creationDraft.name" maxlength="40" placeholder="输入角色姓名" required />
                </label>

                <label class="required-field">
                  <span class="field-label">种族 / 物种 <em>*</em></span>
                  <select v-model="creationDraft.species" required>
                    <option v-for="species in characterCreationConfig.species" :key="species" :value="species">
                      {{ species }}
                    </option>
                    <option :value="CUSTOM_OPTION">自定义</option>
                  </select>
                </label>
                <label v-if="creationDraft.species === CUSTOM_OPTION" class="custom-field">
                  自定义种族 / 物种
                  <input v-model="creationDraft.customSpecies" placeholder="例如：半精灵" required />
                </label>

                <label class="required-field">
                  <span class="field-label">职业 <em>*</em></span>
                  <select v-model="creationDraft.className" required>
                    <option v-for="className in characterCreationConfig.classes" :key="className" :value="className">
                      {{ className }}
                    </option>
                    <option :value="CUSTOM_OPTION">自定义</option>
                  </select>
                </label>
                <label v-if="creationDraft.className === CUSTOM_OPTION" class="custom-field">
                  自定义职业
                  <input v-model="creationDraft.customClassName" placeholder="输入职业名称" required />
                </label>

                <label class="compact-field required-field">
                  <span class="field-label">等级 <em>*</em></span>
                  <input v-model.number="creationDraft.level" type="number" min="1" max="20" required />
                </label>

                <fieldset class="alignment-field">
                  <legend>阵营 <span>*</span></legend>
                  <div class="alignment-grid">
                    <template v-for="row in characterCreationConfig.alignments" :key="row.join('-')">
                      <button
                        v-for="alignment in row"
                        :key="alignment"
                        type="button"
                        :class="{ selected: creationDraft.alignment === alignment }"
                        @click="creationDraft.alignment = alignment"
                      >
                        {{ alignment }}
                        <span v-if="creationDraft.alignment === alignment">✓</span>
                      </button>
                    </template>
                  </div>
                </fieldset>

                <label class="required-field">
                  <span class="field-label">背景 <em>*</em></span>
                  <select v-model="creationDraft.background" required>
                    <option
                      v-for="background in characterCreationConfig.backgrounds"
                      :key="background"
                      :value="background"
                    >
                      {{ background }}
                    </option>
                    <option :value="CUSTOM_OPTION">自定义</option>
                  </select>
                </label>
                <label v-if="creationDraft.background === CUSTOM_OPTION" class="custom-field">
                  自定义背景
                  <input v-model="creationDraft.customBackground" placeholder="输入背景名称" required />
                </label>

                <fieldset class="size-field">
                  <legend>体型 <span>*</span></legend>
                  <div class="size-grid">
                    <button
                      v-for="size in characterCreationConfig.sizes"
                      :key="size"
                      type="button"
                      :class="{ selected: creationDraft.size === size }"
                      @click="creationDraft.size = size"
                    >
                      {{ size }}
                      <span v-if="creationDraft.size === size">✓</span>
                    </button>
                  <button
                    type="button"
                    :class="{ selected: creationDraft.size === CUSTOM_OPTION }"
                    @click="creationDraft.size = CUSTOM_OPTION"
                  >
                    自定义
                    <span v-if="creationDraft.size === CUSTOM_OPTION">✓</span>
                  </button>
                  </div>
                </fieldset>
                <label v-if="creationDraft.size === CUSTOM_OPTION" class="custom-field">
                  自定义体型
                  <input v-model="creationDraft.customSize" placeholder="输入体型" required />
                </label>

                <label class="story-field">
                  背景故事
                  <textarea
                    v-model="creationDraft.story"
                    maxlength="1000"
                    rows="7"
                    placeholder="可先简单填写，后续可在角色卡中继续完善"
                  ></textarea>
                  <span>{{ storyLength }} / 1000</span>
                </label>
              </div>
            </section>

            <aside class="preview-card">
              <div class="creation-section-title">
                <span>◎</span>
                <h2>角色预览</h2>
              </div>

              <div class="preview-list">
                <div v-for="[label, value] in previewRows" :key="label" class="preview-row">
                  <strong>{{ label }}</strong>
                  <span>{{ value }}</span>
                </div>
              </div>
            </aside>
          </div>

          <footer class="creation-footer">
            <button class="plain-button" type="button" @click="cancelCreation">取消</button>
            <button class="primary-button large-action" type="submit" :disabled="!isBasicStepValid">
              下一步：确定属性值 ›
            </button>
          </footer>
        </form>

        <section v-else-if="currentCreationStep?.id === 'abilities'" class="creation-panel ability-step-panel">
          <div class="ability-step-layout">
            <section class="ability-builder">
              <div class="creation-section-title">
                <span>⚂</span>
                <h2>属性生成方式</h2>
              </div>

              <div class="mode-toggle" role="group" aria-label="属性生成方式">
                <button
                  type="button"
                  :class="{ active: creationDraft.abilityMode === 'manual' }"
                  @click="creationDraft.abilityMode = 'manual'"
                >
                  手动填写
                </button>
                <button
                  type="button"
                  :class="{ active: creationDraft.abilityMode === 'random' }"
                  @click="creationDraft.abilityMode = 'random'"
                >
                  随机生成
                </button>
              </div>

              <div v-if="creationDraft.abilityMode === 'random'" class="roll-workbench">
                <p class="hint-box">投掷 4 个 d6，去掉最低点数，记录 3 个最高点数的总和。重复 6 次后，将结果分配给六项属性。</p>

                <div class="roll-actions">
                  <button class="primary-button" type="button" @click="rollAbilityScores">⚄ 开始投掷</button>
                </div>

                <div class="roll-table">
                  <div class="roll-table-head">
                    <span>组别</span>
                    <span>四个 d6 投掷结果</span>
                    <span>去掉最低</span>
                    <span>结果</span>
                  </div>
                  <div v-if="abilityRolls.length === 0" class="roll-empty">点击“开始投掷”生成 6 组属性数值。</div>
                  <div v-for="(roll, index) in abilityRolls" :key="roll.id" class="roll-table-row">
                    <span>第 {{ index + 1 }} 组</span>
                    <span class="dice-list">
                      <b
                        v-for="(die, dieIndex) in roll.dice"
                        :key="`${roll.id}-${dieIndex}`"
                        :class="{ dropped: dieIndex === roll.droppedIndex }"
                      >
                        {{ die }}
                      </b>
                    </span>
                    <span>去掉 {{ roll.dropped }}</span>
                    <strong>{{ roll.total }}</strong>
                  </div>
                </div>

                <div class="roll-pool">
                  <h3>待分配数值</h3>
                  <div>
                    <span v-for="roll in sortedRolls" :key="roll.id" :class="{ used: usedRollIds.includes(roll.id) }">
                      {{ roll.total }}
                    </span>
                  </div>
                  <small>共 {{ assignedRollCount }} / 6 个数值已分配，每个投掷结果只能使用一次。</small>
                </div>
              </div>

              <div class="ability-assignment">
                <h3>属性分配</h3>
                <div class="ability-assignment-table">
                  <div class="ability-assignment-head">
                    <span>属性</span>
                    <span>分配数值</span>
                    <span>调整值</span>
                  </div>
                  <div v-for="ability in abilityDefinitions" :key="ability.key" class="ability-assignment-row">
                    <strong>{{ ability.label }}</strong>
                    <input
                      v-if="creationDraft.abilityMode === 'manual'"
                      v-model.number="creationDraft.abilityScores[ability.key]"
                      type="number"
                      min="1"
                      max="30"
                    />
                    <select
                      v-else
                      :value="creationDraft.abilityAssignments[ability.key]"
                      :disabled="abilityRolls.length === 0"
                      @change="assignRollToAbility(ability.key, getEventValue($event))"
                    >
                      <option value="">选择数值</option>
                      <option
                        v-for="roll in sortedRolls"
                        :key="roll.id"
                        :value="roll.id"
                        :disabled="isRollOptionUsed(roll.id, ability.key)"
                      >
                        {{ roll.total }}
                      </option>
                    </select>
                    <span>{{ signed(modifier(creationDraft.abilityScores[ability.key])) }}</span>
                  </div>
                </div>
              </div>
            </section>

            <aside class="ability-preview-card">
              <div class="preview-card compact-preview">
                <div class="creation-section-title">
                  <span>◎</span>
                  <h2>属性预览</h2>
                </div>
                <div class="ability-preview-list">
                  <div v-for="ability in abilityPreview" :key="ability.key">
                    <strong>{{ ability.label }}</strong>
                    <span>{{ ability.score }}</span>
                    <em>{{ ability.modifier }}</em>
                  </div>
                </div>
              </div>
            </aside>
          </div>

          <footer class="creation-footer">
            <button class="plain-button large-action" type="button" @click="goPreviousCreationStep">‹ 上一步：基本信息</button>
            <button class="primary-button large-action" type="button" :disabled="!isAbilityStepValid" @click="goNextCreationStep">
              下一步：技能与熟练 ›
            </button>
          </footer>
        </section>

        <section v-else class="creation-panel placeholder-step">
          <div class="creation-section-title">
            <span>{{ currentCreationStep?.index }}</span>
            <h2>{{ currentCreationStep?.label }}</h2>
          </div>
          <p>
            这一部分已经在流程中预留。当前版本会先保存基本信息，后续可以继续接入属性生成、技能熟练项选择和最终确认。
          </p>
          <footer class="creation-footer">
            <button class="plain-button" type="button" @click="goPreviousCreationStep">上一步</button>
            <button
              v-if="currentCreationStep?.id !== 'finish'"
              class="primary-button large-action"
              type="button"
              @click="goNextCreationStep"
            >
              下一步 ›
            </button>
            <button v-else class="primary-button large-action" type="button" @click="finishCreation">
              完成并创建角色
            </button>
          </footer>
        </section>
      </section>

      <template v-else>
      <header class="topbar">
        <div>
          <p class="eyebrow">人物看板</p>
          <h1>{{ selectedCharacter.name }}</h1>
        </div>
        <div class="topbar-actions">
          <button class="plain-button" type="button" @click="importInput?.click()">导入 JSON</button>
          <button class="plain-button" type="button" @click="exportJson">导出 JSON</button>
          <button class="primary-button" type="button" @click="isEditing = true">编辑</button>
          <input ref="importInput" class="hidden-input" type="file" accept="application/json" @change="importJson" />
        </div>
      </header>

      <section class="board-grid">
        <article class="panel profile-panel">
          <div class="section-title">
            <h2>基本信息</h2>
            <button class="icon-button" type="button" aria-label="编辑基本信息" @click="isEditing = true">✎</button>
          </div>

          <div class="name-block">
            <h3>{{ selectedCharacter.name }}</h3>
            <p>{{ selectedCharacter.race }} / {{ selectedCharacter.className }} / Lv.{{ selectedCharacter.level }}</p>
          </div>

          <dl class="info-grid">
            <div>
              <dt>种族</dt>
              <dd>{{ selectedCharacter.race }}</dd>
            </div>
            <div>
              <dt>职业</dt>
              <dd>{{ selectedCharacter.className }}</dd>
            </div>
            <div>
              <dt>背景</dt>
              <dd>{{ selectedCharacter.background }}</dd>
            </div>
            <div>
              <dt>体型</dt>
              <dd>{{ selectedCharacter.size }}</dd>
            </div>
            <div>
              <dt>阵营</dt>
              <dd>{{ selectedCharacter.alignment }}</dd>
            </div>
          </dl>

          <div class="story">
            <h4>背景故事</h4>
            <p>{{ selectedCharacter.story }}</p>
          </div>
        </article>

        <article class="panel">
          <div class="section-title">
            <h2>核心数据</h2>
            <button class="icon-button" type="button" aria-label="编辑核心数据" @click="isEditing = true">✎</button>
          </div>

          <div class="metric-grid">
            <div v-for="metric in metricCards" :key="metric.label" class="metric-card" :class="metric.tone">
              <span>{{ metric.label }}</span>
              <strong>{{ metric.value }}</strong>
              <i v-if="metric.label === 'HP'" :style="{ width: `${hpPercent}%` }"></i>
            </div>
          </div>
        </article>
      </section>

      <section class="panel">
        <div class="section-title">
          <h2>属性 · 技能 · 豁免</h2>
          <button class="icon-button" type="button" aria-label="编辑属性" @click="isEditing = true">✎</button>
        </div>

        <div class="ability-grid">
          <article v-for="ability in selectedCharacter.abilities" :key="ability.key" class="ability-card" :class="ability.key">
            <header>
              <span>{{ ability.label }}</span>
              <small>{{ ability.short }}</small>
            </header>
            <div class="ability-score">
              <strong>{{ ability.score }}</strong>
              <em>{{ signed(modifier(ability.score)) }}</em>
            </div>
            <div class="save-row">
              <span>豁免</span>
              <b>{{ signed(ability.save) }}</b>
              <i v-if="ability.proficient">熟练</i>
            </div>
            <div class="skill-list">
              <p>技能</p>
              <span v-if="ability.skills.length === 0" class="empty">无</span>
              <span v-for="skill in ability.skills" :key="skill.name">
                {{ skill.name }}
                <b>{{ signed(skill.value) }}</b>
                <i v-if="skill.proficient">熟练</i>
              </span>
            </div>
          </article>
        </div>
      </section>

      <section class="panel proficiency-panel">
        <div class="section-title">
          <h2>熟练项</h2>
          <button class="icon-button" type="button" aria-label="编辑熟练项" @click="isEditing = true">✎</button>
        </div>

        <div class="proficiency-grid">
          <div v-for="[label, value] in proficiencyRows" :key="label">
            <h3>{{ label }}</h3>
            <p>{{ value }}</p>
          </div>
        </div>
      </section>

      <section class="panel notes-panel">
        <div>
          <h2>冒险备注</h2>
          <p>{{ selectedCharacter.notes }}</p>
        </div>
        <small>最后更新：{{ new Date(selectedCharacter.updatedAt).toLocaleString('zh-CN') }}</small>
      </section>
      </template>
    </main>

    <div v-if="isEditing" class="drawer-backdrop" @click.self="isEditing = false">
      <form class="edit-drawer" @submit.prevent="saveForm">
        <header>
          <div>
            <p class="eyebrow">编辑角色 JSON 数据</p>
            <h2>{{ form.name }}</h2>
          </div>
          <button class="icon-button" type="button" aria-label="关闭编辑" @click="isEditing = false">×</button>
        </header>

        <div class="form-grid">
          <label>
            名称
            <input v-model="form.name" required />
          </label>
          <label>
            种族
            <input v-model="form.race" />
          </label>
          <label>
            职业
            <input v-model="form.className" />
          </label>
          <label>
            等级
            <input v-model.number="form.level" type="number" min="1" />
          </label>
          <label>
            背景
            <input v-model="form.background" />
          </label>
          <label>
            阵营
            <input v-model="form.alignment" />
          </label>
          <label>
            HP 当前
            <input v-model.number="form.hp.current" type="number" min="0" />
          </label>
          <label>
            HP 最大
            <input v-model.number="form.hp.max" type="number" min="1" />
          </label>
          <label>
            AC
            <input v-model.number="form.ac" type="number" />
          </label>
          <label>
            先攻
            <input v-model.number="form.initiative" type="number" />
          </label>
          <label>
            速度
            <input v-model.number="form.speed" type="number" />
          </label>
          <label>
            熟练加值
            <input v-model.number="form.proficiency" type="number" />
          </label>
          <label>
            被动察觉
            <input v-model.number="form.passivePerception" type="number" />
          </label>
          <label>
            攻击加值
            <input v-model.number="form.attackBonus" type="number" />
          </label>
          <label>
            法术豁免 DC
            <input v-model.number="form.spellSaveDc" type="number" />
          </label>
        </div>

        <label class="wide-field">
          背景故事
          <textarea v-model="form.story" rows="5"></textarea>
        </label>

        <div class="ability-editor">
          <div v-for="ability in form.abilities" :key="ability.key" class="ability-edit-row">
            <strong>{{ ability.label }}</strong>
            <label>
              属性
              <input v-model.number="ability.score" type="number" />
            </label>
            <label>
              豁免
              <input v-model.number="ability.save" type="number" />
            </label>
            <label class="checkbox-field">
              <input v-model="ability.proficient" type="checkbox" />
              豁免熟练
            </label>
          </div>
        </div>

        <label class="wide-field">
          冒险备注
          <textarea v-model="form.notes" rows="3"></textarea>
        </label>

        <footer>
          <button class="danger-button" type="button" :disabled="characters.length <= 1" @click="deleteCharacter">
            删除角色
          </button>
          <span></span>
          <button class="plain-button" type="button" @click="syncForm">重置</button>
          <button class="primary-button" type="submit">保存到本机 JSON</button>
        </footer>
      </form>
    </div>
  </div>
</template>
