import { computed, reactive, ref, watch } from 'vue'
import characterCreationConfig from '../config/characterCreation.json'

type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'
type AbilityMode = 'manual' | 'random'
type AbilityBonusKey = AbilityKey | ''

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
  abilityBonuses: {
    plus2: AbilityBonusKey
    plus1: AbilityBonusKey
  }
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

const createDefaultAbilityBonuses = (): CharacterDraft['abilityBonuses'] => ({
  plus2: '',
  plus1: '',
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
  abilityBonuses: createDefaultAbilityBonuses(),
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
}

const addCharacter = () => {
  resetCreationDraft()
  creationStep.value = 0
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
  ['种族', resolveCustomValue(creationDraft.species, creationDraft.customSpecies) || '待填写'],
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

const getAbilityBonus = (key: AbilityKey) => {
  if (creationDraft.abilityBonuses.plus2 === key) return 2
  if (creationDraft.abilityBonuses.plus1 === key) return 1
  return 0
}

const getFinalAbilityScore = (key: AbilityKey) => {
  return Math.min(30, creationDraft.abilityScores[key] + getAbilityBonus(key))
}

const abilityPreview = computed(() => {
  return abilityDefinitions.map((ability) => {
    const score = getFinalAbilityScore(ability.key)
    return {
      ...ability,
      score,
      bonus: getAbilityBonus(ability.key),
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
  Object.assign(creationDraft.abilityBonuses, createDefaultAbilityBonuses())
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

const setAbilityBonus = (bonusType: 'plus2' | 'plus1', key: AbilityKey, checked: boolean) => {
  const otherBonusType = bonusType === 'plus2' ? 'plus1' : 'plus2'

  creationDraft.abilityBonuses[bonusType] = checked ? key : ''
  if (checked && creationDraft.abilityBonuses[otherBonusType] === key) {
    creationDraft.abilityBonuses[otherBonusType] = ''
  }
}

const createAbilitiesFromDraft = (): Ability[] => {
  return abilityDefinitions.map((ability) => {
    const score = getFinalAbilityScore(ability.key)
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
  Object.assign(creationDraft.abilityBonuses, createDefaultAbilityBonuses())
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
  creationStep.value = 0
}

const finishCreation = () => {
  if (!isBasicStepValid.value) {
    creationStep.value = 0
    return
  }

  const finalAbilityScores = abilityDefinitions.reduce(
    (scores, ability) => {
      scores[ability.key] = getFinalAbilityScore(ability.key)
      return scores
    },
    {} as Record<AbilityKey, number>,
  )

  const character = createCharacter({
    name: creationDraft.name.trim(),
    race: resolveCustomValue(creationDraft.species, creationDraft.customSpecies),
    className: resolveCustomValue(creationDraft.className, creationDraft.customClassName),
    level: creationDraft.level,
    alignment: creationDraft.alignment,
    background: resolveCustomValue(creationDraft.background, creationDraft.customBackground),
    size: resolveCustomValue(creationDraft.size, creationDraft.customSize),
    story: creationDraft.story.trim() || '这个角色的背景故事还在旅途中慢慢成形。',
    hp: { current: Math.max(1, 8 + modifier(finalAbilityScores.con)), max: Math.max(1, 8 + modifier(finalAbilityScores.con)) },
    ac: 10 + modifier(finalAbilityScores.dex),
    initiative: modifier(finalAbilityScores.dex),
    speed: 30,
    proficiency: 2,
    passivePerception: 10 + modifier(finalAbilityScores.wis),
    attackBonus: 2 + Math.max(modifier(finalAbilityScores.str), modifier(finalAbilityScores.dex)),
    spellSaveDc: 10 + 2 + Math.max(modifier(finalAbilityScores.int), modifier(finalAbilityScores.wis), modifier(finalAbilityScores.cha)),
    abilities: createAbilitiesFromDraft(),
    notes: '角色创建流程已记录基本信息，后续步骤可继续完善。',
  })
  characters.value = [character, ...characters.value]
  selectedId.value = character.id
  creationStep.value = 0
}


export const useCharacters = () => ({
  CUSTOM_OPTION,
  abilityDefinitions,
  characterCreationConfig,
  characters,
  selectedId,
  selectedCharacter,
  form,
  isEditing,
  creationStep,
  importInput,
  creationDraft,
  abilityRolls,
  hpPercent,
  metricCards,
  proficiencyRows,
  currentCreationStep,
  storyLength,
  previewRows,
  sortedRollTotals,
  sortedRolls,
  usedRollIds,
  abilityPreview,
  assignedRollCount,
  isAbilityStepValid,
  isBasicStepValid,
  syncForm,
  modifier,
  signed,
  selectCharacter,
  addCharacter,
  saveForm,
  deleteCharacter,
  exportJson,
  importJson,
  resolveCustomValue,
  rollAbilityScores,
  resetAbilityScores,
  isRollOptionUsed,
  assignRollToAbility,
  setAbilityBonus,
  getAbilityBonus,
  getFinalAbilityScore,
  resetCreationDraft,
  goNextCreationStep,
  goPreviousCreationStep,
  cancelCreation,
  finishCreation,
})
