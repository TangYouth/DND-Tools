import { computed, reactive, ref, watch } from 'vue'
import characterCreationConfig from '../config/characterCreation.json'

declare global {
  interface Window {
    showDirectoryPicker?: (options?: { mode?: FileSystemPermissionMode }) => Promise<FileSystemDirectoryHandle>
    showOpenFilePicker?: (options?: {
      multiple?: boolean
      types?: Array<{
        description?: string
        accept: Record<string, string[]>
      }>
    }) => Promise<FileSystemFileHandle[]>
    showSaveFilePicker?: (options?: {
      suggestedName?: string
      types?: Array<{
        description?: string
        accept: Record<string, string[]>
      }>
    }) => Promise<FileSystemFileHandle>
  }
}

type FileSystemPermissionMode = 'read' | 'readwrite'

interface FileSystemHandle {
  kind: 'file' | 'directory'
  name: string
  queryPermission?: (descriptor?: { mode: FileSystemPermissionMode }) => Promise<PermissionState>
  requestPermission?: (descriptor?: { mode: FileSystemPermissionMode }) => Promise<PermissionState>
}

interface FileSystemFileHandle extends FileSystemHandle {
  kind: 'file'
  getFile: () => Promise<File>
  createWritable: () => Promise<{
    write: (data: string) => Promise<void>
    close: () => Promise<void>
  }>
}

interface FileSystemDirectoryHandle extends FileSystemHandle {
  kind: 'directory'
  values: () => AsyncIterable<FileSystemFileHandle | FileSystemDirectoryHandle>
  getFileHandle: (name: string, options?: { create?: boolean }) => Promise<FileSystemFileHandle>
  removeEntry: (name: string) => Promise<void>
}

type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'
type AbilityMode = 'manual' | 'random'
type AbilityBonusKey = AbilityKey | ''

interface Skill {
  name: string
  value: number
  proficient?: boolean
  expertise?: boolean
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

interface CharacterClassEntry {
  id: string
  className: string
  level: number
  subclass: string
}

interface CharacterTraitEntry {
  id: string
  title: string
  source: string
  prerequisites: string
  description: string
}

interface SpellSlot {
  current: number
  max: number
}

interface CharacterSpellEntry {
  id: string
  name: string
  level: number
  school: string
  castingTime: string
  range: string
  components: string
  duration: string
  description: string
  prepared: boolean
}

interface CharacterHitDieResource {
  id: string
  classId: string
  className: string
  die: string
  current: number
  max: number
}

interface CharacterCustomResource {
  id: string
  name: string
  current: number
  max: number
}

type InventoryItemLocation = 'equipment' | 'backpack'

interface CharacterInventoryItem {
  id: string
  name: string
  quantity: number
  value: number
  description: string
  requiresAttunement: boolean
  attuned: boolean
  location: InventoryItemLocation
}

interface CharacterAdventureLogEntry {
  id: string
  title: string
  description: string
}

interface CreatureAbilityScores {
  str: number
  dex: number
  con: number
  int: number
  wis: number
  cha: number
}

interface CharacterCreatureEntry {
  id: string
  name: string
  species: string
  size: string
  alignment: string
  ac: number
  hp: {
    current: number
    max: number
    temporary: number
  }
  speed: string
  abilities: CreatureAbilityScores
  resistances: string
  immunities: string
  description: string
}

interface Character {
  id: string
  name: string
  race: string
  gender: string
  className: string
  classes: CharacterClassEntry[]
  level: number
  background: string
  alignment: string
  size: string
  hp: {
    current: number
    max: number
    temporary: number
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
  feats: CharacterTraitEntry[]
  features: CharacterTraitEntry[]
  spells: CharacterSpellEntry[]
  spellSlots: Record<string, SpellSlot>
  hitDice: CharacterHitDieResource[]
  resources: CharacterCustomResource[]
  gold: number
  attunementMax: number
  inventoryItems: CharacterInventoryItem[]
  adventureLogs: CharacterAdventureLogEntry[]
  creatures: CharacterCreatureEntry[]
  proficiencies: {
    weapons: string
    armor: string
    tools: string
    languages: string
    other: string
  }
  notes: string
  updatedAt: string
}

interface CharacterDraft {
  name: string
  species: string
  customSpecies: string
  gender: string
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
  skillProficiencies: Record<string, boolean>
  skillExpertise: Record<string, boolean>
}

interface AbilityRoll {
  id: string
  dice: number[]
  dropped: number
  droppedIndex: number
  total: number
}

interface ClassHitDieRule {
  hitDie: string
  firstLevelHpBase: number
  levelUpHpBase: number
}

const STORAGE_KEY = 'dnd-tools.character-board.v1'
const STORAGE_DB_NAME = 'dnd-tools.storage'
const STORAGE_DB_STORE = 'settings'
const STORAGE_HANDLE_KEY = 'charactersDirectoryHandle'
const OPFS_STORAGE_LABEL = '浏览器私有存储'
const CUSTOM_OPTION = characterCreationConfig.customOption
const DEFAULT_CLASS_HIT_DIE_RULE: ClassHitDieRule = {
  hitDie: 'D8',
  firstLevelHpBase: 8,
  levelUpHpBase: 5,
}
const classHitDieRules = characterCreationConfig.classHitDice as Record<string, ClassHitDieRule>
const abilityDefinitions: Array<{ key: AbilityKey; label: string; short: string }> = [
  { key: 'str', label: '力量', short: 'STR' },
  { key: 'dex', label: '敏捷', short: 'DEX' },
  { key: 'con', label: '体质', short: 'CON' },
  { key: 'int', label: '智力', short: 'INT' },
  { key: 'wis', label: '感知', short: 'WIS' },
  { key: 'cha', label: '魅力', short: 'CHA' },
]

const skillDefinitions: Array<{ key: string; name: string; abilityKey: AbilityKey }> = [
  { key: 'athletics', name: '运动', abilityKey: 'str' },
  { key: 'acrobatics', name: '杂技', abilityKey: 'dex' },
  { key: 'sleight-of-hand', name: '巧手', abilityKey: 'dex' },
  { key: 'stealth', name: '隐匿', abilityKey: 'dex' },
  { key: 'arcana', name: '奥秘', abilityKey: 'int' },
  { key: 'history', name: '历史', abilityKey: 'int' },
  { key: 'investigation', name: '调查', abilityKey: 'int' },
  { key: 'nature', name: '自然', abilityKey: 'int' },
  { key: 'religion', name: '宗教', abilityKey: 'int' },
  { key: 'animal-handling', name: '驯兽', abilityKey: 'wis' },
  { key: 'insight', name: '洞悉', abilityKey: 'wis' },
  { key: 'medicine', name: '医药', abilityKey: 'wis' },
  { key: 'perception', name: '察觉', abilityKey: 'wis' },
  { key: 'survival', name: '求生', abilityKey: 'wis' },
  { key: 'deception', name: '欺瞒', abilityKey: 'cha' },
  { key: 'intimidation', name: '威吓', abilityKey: 'cha' },
  { key: 'performance', name: '表演', abilityKey: 'cha' },
  { key: 'persuasion', name: '说服', abilityKey: 'cha' },
]

const calculateProficiencyBonus = (level: number) => 2 + Math.floor((Math.max(1, level) - 1) / 4)
const modifier = (score: number) => Math.floor((score - 10) / 2)
const signed = (value: number) => `${value >= 0 ? '+' : ''}${value}`

const getClassHitDieRule = (className: string) => classHitDieRules[className] ?? DEFAULT_CLASS_HIT_DIE_RULE

const getAbilityModifier = (scores: Record<AbilityKey, number>, key: AbilityKey) => modifier(scores[key] ?? 10)

const calculateFixedHp = (classes: CharacterClassEntry[], abilityScores: Record<AbilityKey, number>) => {
  const constitutionModifier = getAbilityModifier(abilityScores, 'con')
  let hasFirstLevel = false

  const totalHp = classes.reduce((total, classEntry) => {
    const level = Math.max(1, Number(classEntry.level) || 1)
    const rule = getClassHitDieRule(classEntry.className)
    const firstLevelHp = hasFirstLevel ? 0 : rule.firstLevelHpBase + constitutionModifier
    const levelUpCount = hasFirstLevel ? level : level - 1

    hasFirstLevel = true
    return total + firstLevelHp + levelUpCount * (rule.levelUpHpBase + constitutionModifier)
  }, 0)

  return Math.max(1, totalHp)
}

const calculateInitialCoreStats = (
  classes: CharacterClassEntry[],
  abilityScores: Record<AbilityKey, number>,
  proficiency: number,
) => {
  const dexterityModifier = getAbilityModifier(abilityScores, 'dex')
  const wisdomModifier = getAbilityModifier(abilityScores, 'wis')
  const martialModifier = Math.max(getAbilityModifier(abilityScores, 'str'), dexterityModifier)
  const spellcastingModifier = Math.max(
    getAbilityModifier(abilityScores, 'int'),
    wisdomModifier,
    getAbilityModifier(abilityScores, 'cha'),
  )
  const hpMax = calculateFixedHp(classes, abilityScores)

  return {
    hp: {
      current: hpMax,
      max: hpMax,
      temporary: 0,
    },
    ac: 10 + dexterityModifier,
    initiative: dexterityModifier,
    speed: 30,
    passivePerception: 8 + proficiency + wisdomModifier,
    attackBonus: martialModifier + proficiency,
    spellSaveDc: 8 + spellcastingModifier + proficiency,
  }
}

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

const createClassEntry = (className = characterCreationConfig.defaults.className, level = 1, subclass = ''): CharacterClassEntry => ({
  id: crypto.randomUUID(),
  className,
  level: Math.min(20, Math.max(1, Number(level) || 1)),
  subclass,
})

const createTraitEntry = (title = '', source = '', description = '', prerequisites = ''): CharacterTraitEntry => ({
  id: crypto.randomUUID(),
  title,
  source,
  prerequisites,
  description,
})

const createSpellEntry = (
  name = '',
  level = 0,
  school = '',
  castingTime = '',
  range = '',
  components = '',
  duration = '',
  description = '',
  prepared = false,
): CharacterSpellEntry => ({
  id: crypto.randomUUID(),
  name,
  level: Math.min(9, Math.max(0, Number(level) || 0)),
  school,
  castingTime,
  range,
  components,
  duration,
  description,
  prepared,
})

const getDefaultHitDie = (className: string) => getClassHitDieRule(className).hitDie

const createCustomResource = (name = '', current = 0, max = 0): CharacterCustomResource => {
  const normalizedMax = Math.max(0, Number(max) || 0)
  return {
    id: crypto.randomUUID(),
    name,
    current: Math.min(normalizedMax, Math.max(0, Number(current) || 0)),
    max: normalizedMax,
  }
}

const createInventoryItem = (
  name = '',
  quantity = 1,
  value = 0,
  description = '',
  requiresAttunement = false,
  location: InventoryItemLocation = 'backpack',
  attuned = false,
): CharacterInventoryItem => ({
  id: crypto.randomUUID(),
  name,
  quantity: Math.max(1, Number(quantity) || 1),
  value: Math.max(0, Number(value) || 0),
  description,
  requiresAttunement,
  attuned: requiresAttunement && attuned,
  location,
})

const createAdventureLogEntry = (title = '', description = ''): CharacterAdventureLogEntry => ({
  id: crypto.randomUUID(),
  title,
  description,
})

const createCreatureEntry = (
  name = '',
  species = '',
  size = '',
  alignment = '',
  ac = 10,
  hpCurrent = 1,
  hpMax = 1,
  hpTemporary = 0,
  speed = '',
  abilities: Partial<CreatureAbilityScores> = {},
  resistances = '',
  immunities = '',
  description = '',
): CharacterCreatureEntry => {
  const max = Math.max(1, Number(hpMax) || 1)
  return {
    id: crypto.randomUUID(),
    name,
    species,
    size,
    alignment,
    ac: Math.max(0, Number(ac) || 0),
    hp: {
      current: Math.min(max, Math.max(0, Number(hpCurrent) || 0)),
      max,
      temporary: Math.max(0, Number(hpTemporary) || 0),
    },
    speed,
    abilities: {
      str: Math.max(1, Number(abilities.str) || 10),
      dex: Math.max(1, Number(abilities.dex) || 10),
      con: Math.max(1, Number(abilities.con) || 10),
      int: Math.max(1, Number(abilities.int) || 10),
      wis: Math.max(1, Number(abilities.wis) || 10),
      cha: Math.max(1, Number(abilities.cha) || 10),
    },
    resistances,
    immunities,
    description,
  }
}

const normalizeTraitEntries = (entries: CharacterTraitEntry[] | undefined) => {
  if (!Array.isArray(entries)) return []
  return entries.map((entry) => ({
    id: entry.id || crypto.randomUUID(),
    title: entry.title?.trim() || '未命名',
    source: entry.source?.trim() || '未填写',
    prerequisites: entry.prerequisites?.trim() || '',
    description: entry.description?.trim() || '',
  }))
}

const normalizeHitDice = (classes: CharacterClassEntry[], entries: CharacterHitDieResource[] | undefined) => {
  const existingByClassId = new Map((Array.isArray(entries) ? entries : []).map((entry) => [entry.classId, entry]))
  const existingByClassName = new Map((Array.isArray(entries) ? entries : []).map((entry) => [entry.className, entry]))

  return classes.map((classEntry) => {
    const existing = existingByClassId.get(classEntry.id) ?? existingByClassName.get(classEntry.className)
    const max = Math.max(1, Number(classEntry.level) || 1)
    const existingCurrent = Number(existing?.current)
    const current = Math.min(max, Math.max(0, Number.isFinite(existingCurrent) ? existingCurrent : max))

    return {
      id: existing?.id || crypto.randomUUID(),
      classId: classEntry.id,
      className: classEntry.className,
      die: existing?.die || getDefaultHitDie(classEntry.className),
      current,
      max,
    }
  })
}

const normalizeCustomResources = (entries: CharacterCustomResource[] | undefined) => {
  if (!Array.isArray(entries)) return []
  return entries.map((entry) => {
    const max = Math.max(0, Number(entry.max) || 0)
    return {
      id: entry.id || crypto.randomUUID(),
      name: entry.name?.trim() || '未命名资源',
      current: Math.min(max, Math.max(0, Number(entry.current) || 0)),
      max,
    }
  })
}

const normalizeInventoryItems = (entries: CharacterInventoryItem[] | undefined) => {
  if (!Array.isArray(entries)) return []
  return entries.map((entry) => {
    const requiresAttunement = Boolean(entry.requiresAttunement)
    return {
      id: entry.id || crypto.randomUUID(),
      name: entry.name?.trim() || '未命名物品',
      quantity: Math.max(1, Number(entry.quantity) || 1),
      value: Math.max(0, Number(entry.value) || 0),
      description: entry.description?.trim() || '',
      requiresAttunement,
      attuned: requiresAttunement && Boolean(entry.attuned),
      location: entry.location === 'equipment' ? 'equipment' : 'backpack',
    }
  })
}

const normalizeAdventureLogs = (entries: CharacterAdventureLogEntry[] | undefined) => {
  if (!Array.isArray(entries)) return []
  return entries.map((entry) => ({
    id: entry.id || crypto.randomUUID(),
    title: entry.title?.trim() || '未命名日志',
    description: entry.description?.trim() || '',
  }))
}

const normalizeCreatures = (entries: CharacterCreatureEntry[] | undefined) => {
  if (!Array.isArray(entries)) return []
  return entries.map((entry) =>
    createCreatureEntry(
      entry.name?.trim() || '未命名生物',
      entry.species?.trim() || '未填写',
      entry.size?.trim() || '未填写',
      entry.alignment?.trim() || '未填写',
      entry.ac,
      entry.hp?.current,
      entry.hp?.max,
      entry.hp?.temporary,
      entry.speed?.trim() || '未填写',
      entry.abilities,
      entry.resistances?.trim() || '',
      entry.immunities?.trim() || '',
      entry.description?.trim() || '',
    ),
  ).map((entry, index) => ({
    ...entry,
    id: entries[index]?.id || entry.id,
  }))
}

const createDefaultSpellSlots = (): Record<string, SpellSlot> => {
  return Array.from({ length: 9 }, (_, index) => String(index + 1)).reduce(
    (slots, level) => {
      slots[level] = { current: 0, max: 0 }
      return slots
    },
    {} as Record<string, SpellSlot>,
  )
}

const normalizeSpellEntries = (entries: CharacterSpellEntry[] | undefined) => {
  if (!Array.isArray(entries)) return []
  return entries.map((entry) => ({
    id: entry.id || crypto.randomUUID(),
    name: entry.name?.trim() || '未命名法术',
    level: Math.min(9, Math.max(0, Number(entry.level) || 0)),
    school: entry.school?.trim() || '未填写',
    castingTime: entry.castingTime?.trim() || '未填写',
    range: entry.range?.trim() || '未填写',
    components: entry.components?.trim() || '未填写',
    duration: entry.duration?.trim() || '未填写',
    description: entry.description?.trim() || '',
    prepared: Boolean(entry.prepared),
  }))
}

const normalizeSpellSlots = (slots: Record<string, SpellSlot> | undefined) => {
  const normalizedSlots = createDefaultSpellSlots()
  Object.keys(normalizedSlots).forEach((level) => {
    const slot = slots?.[level]
    const max = Math.max(0, Number(slot?.max) || 0)
    const current = Math.min(max, Math.max(0, Number(slot?.current) || 0))
    normalizedSlots[level] = { current, max }
  })
  return normalizedSlots
}

const createDefaultSkillSelection = () => {
  return skillDefinitions.reduce(
    (selection, skill) => {
      selection[skill.key] = false
      return selection
    },
    {} as Record<string, boolean>,
  )
}

const createCharacter = (overrides: Partial<Character> = {}): Character => {
  const defaultClass = createClassEntry(characterCreationConfig.defaults.className, characterCreationConfig.defaults.level)
  const defaultAbilityScores = createDefaultAbilityScores()
  const defaultProficiency = calculateProficiencyBonus(defaultClass.level)
  const defaultCoreStats = calculateInitialCoreStats([defaultClass], defaultAbilityScores, defaultProficiency)

  return {
    id: crypto.randomUUID(),
    name: '未命名角色',
    race: '人类',
    gender: characterCreationConfig.defaults.gender,
    className: characterCreationConfig.defaults.className,
    classes: [defaultClass],
    level: characterCreationConfig.defaults.level,
    background: '侍僧',
    alignment: '中立善良',
    size: '中型',
    ...defaultCoreStats,
    proficiency: defaultProficiency,
    story: '',
    abilities: [
      {
        key: 'str',
        label: '力量',
        short: 'STR',
        score: 10,
        save: 0,
        skills: [{ name: '运动', value: 0 }],
      },
      {
        key: 'dex',
        label: '敏捷',
        short: 'DEX',
        score: 10,
        save: 0,
        skills: [
          { name: '杂技', value: 0 },
          { name: '巧手', value: 0 },
          { name: '隐匿', value: 0 },
        ],
      },
      {
        key: 'con',
        label: '体质',
        short: 'CON',
        score: 10,
        save: 0,
        skills: [],
      },
      {
        key: 'int',
        label: '智力',
        short: 'INT',
        score: 10,
        save: 0,
        skills: [
          { name: '奥秘', value: 0 },
          { name: '历史', value: 0 },
          { name: '调查', value: 0 },
          { name: '自然', value: 0 },
          { name: '宗教', value: 0 },
        ],
      },
      {
        key: 'wis',
        label: '感知',
        short: 'WIS',
        score: 10,
        save: 0,
        skills: [
          { name: '驯兽', value: 0 },
          { name: '洞悉', value: 0 },
          { name: '医药', value: 0 },
          { name: '察觉', value: 0 },
          { name: '求生', value: 0 },
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
    feats: [],
    features: [],
    spells: [],
    spellSlots: createDefaultSpellSlots(),
    hitDice: normalizeHitDice([defaultClass], undefined),
    resources: [],
    gold: 0,
    attunementMax: 3,
    inventoryItems: [],
    adventureLogs: [],
    creatures: [],
    proficiencies: {
      weapons: '',
      armor: '',
      tools: '',
      languages: '',
      other: '',
    },
    notes: '',
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

const loadCachedCharacters = (): Character[] => []

const cloneCharacter = (character: Character): Character => JSON.parse(JSON.stringify(character)) as Character

const normalizeClassEntries = (character: Partial<Character>) => {
  const legacyClassName = character.className || characterCreationConfig.defaults.className
  const legacyLevel = Math.min(20, Math.max(1, Number(character.level) || characterCreationConfig.defaults.level))
  const entries = Array.isArray(character.classes) && character.classes.length > 0 ? character.classes : [createClassEntry(legacyClassName, legacyLevel)]

  return entries
    .map((entry) => ({
      id: entry.id || crypto.randomUUID(),
      className: entry.className?.trim() || legacyClassName,
      level: Math.min(20, Math.max(1, Number(entry.level) || 1)),
      subclass: entry.subclass?.trim() || '',
    }))
    .filter((entry) => entry.className)
}

const getClassTotalLevel = (classes: CharacterClassEntry[]) => {
  return Math.min(
    20,
    Math.max(
      1,
      classes.reduce((total, entry) => total + (Number(entry.level) || 0), 0),
    ),
  )
}

const getCharacterClassSummary = (character: Pick<Character, 'className' | 'classes' | 'level'> | null | undefined) => {
  if (!character) return ''
  const classes = normalizeClassEntries(character)
  return classes
    .map((entry) => `${entry.className} Lv.${entry.level}${entry.subclass ? ` · ${entry.subclass}` : ''}`)
    .join(' / ')
}

const normalizeCharacter = (character: Partial<Character>): Character => {
  const classes = normalizeClassEntries(character)
  const primaryClass = classes[0] ?? createClassEntry()
  const level = getClassTotalLevel(classes)
  const normalized = {
    ...createCharacter(),
    ...character,
    gender: character.gender || characterCreationConfig.defaults.gender,
    className: primaryClass.className,
    classes,
    level,
    feats: normalizeTraitEntries(character.feats),
    features: normalizeTraitEntries(character.features),
    spells: normalizeSpellEntries(character.spells),
    spellSlots: normalizeSpellSlots(character.spellSlots),
    hitDice: normalizeHitDice(classes, character.hitDice),
    resources: normalizeCustomResources(character.resources),
    gold: Math.max(0, Number(character.gold) || 0),
    attunementMax: Math.max(0, Number(character.attunementMax) || 3),
    inventoryItems: normalizeInventoryItems(character.inventoryItems),
    adventureLogs: normalizeAdventureLogs(character.adventureLogs),
    creatures: normalizeCreatures(character.creatures),
    hp: {
      current: Math.max(0, Number(character.hp?.current) || 0),
      max: Math.max(1, Number(character.hp?.max) || 1),
      temporary: Math.max(0, Number(character.hp?.temporary) || 0),
    },
    proficiency: calculateProficiencyBonus(level),
    proficiencies: {
      weapons: character.proficiencies?.weapons ?? '',
      armor: character.proficiencies?.armor ?? '',
      tools: character.proficiencies?.tools ?? '',
      languages: character.proficiencies?.languages ?? '',
      other: character.proficiencies?.other ?? '',
    },
    updatedAt: character.updatedAt || new Date().toISOString(),
  }

  normalized.hp.current = Math.min(normalized.hp.current, normalized.hp.max)
  return normalized as Character
}

const characters = ref<Character[]>(loadCachedCharacters())
const selectedId = ref(characters.value[0]?.id ?? '')
const isEditing = ref(false)
const creationStep = ref(0)
const importInput = ref<HTMLInputElement | null>(null)
const storageDirectoryHandle = ref<FileSystemDirectoryHandle | null>(null)
const storageMode = ref<'directory' | 'opfs' | 'none'>('none')
const storageLocationLabel = ref('未选择本机存储目录')
const storageStatus = ref(canUseLocalFileStorage() ? '可点击“存储路径”选择本机角色目录' : '正在准备浏览器私有存储')
const isStorageReady = ref(false)
const isWritingStorage = ref(false)
const creationDraft = reactive<CharacterDraft>({
  name: characterCreationConfig.defaults.name,
  species: characterCreationConfig.defaults.species,
  customSpecies: '',
  gender: characterCreationConfig.defaults.gender,
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
  skillProficiencies: createDefaultSkillSelection(),
  skillExpertise: createDefaultSkillSelection(),
})
const abilityRolls = ref<AbilityRoll[]>([])

const selectedCharacter = computed<Character | null>(() => {
  return characters.value.find((item) => item.id === selectedId.value) ?? characters.value[0] ?? null
})

const form = reactive<Character>(cloneCharacter(selectedCharacter.value ?? createCharacter()))

const hpPercent = computed(() => {
  if (!selectedCharacter.value?.hp.max) return 0
  return Math.min(100, Math.max(0, (selectedCharacter.value.hp.current / selectedCharacter.value.hp.max) * 100))
})

const syncForm = () => {
  if (!selectedCharacter.value) return
  Object.assign(form, cloneCharacter(normalizeCharacter(selectedCharacter.value)))
}

watch(selectedCharacter, syncForm)

const openStorageDb = () => {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(STORAGE_DB_NAME, 1)

    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORAGE_DB_STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

const readStorageSetting = async <T>(key: string): Promise<T | undefined> => {
  const db = await openStorageDb()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORAGE_DB_STORE, 'readonly')
    const request = transaction.objectStore(STORAGE_DB_STORE).get(key)

    request.onsuccess = () => resolve(request.result as T | undefined)
    request.onerror = () => reject(request.error)
    transaction.oncomplete = () => db.close()
  })
}

const writeStorageSetting = async (key: string, value: unknown) => {
  const db = await openStorageDb()
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORAGE_DB_STORE, 'readwrite')
    const request = transaction.objectStore(STORAGE_DB_STORE).put(value, key)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    transaction.oncomplete = () => db.close()
  })
}

function canUseLocalFileStorage() {
  return Boolean(window.showOpenFilePicker && window.showDirectoryPicker)
}

const requestFilePermission = async (handle: FileSystemHandle, mode: FileSystemPermissionMode) => {
  if (!handle.queryPermission || !handle.requestPermission) return true
  const currentPermission = await handle.queryPermission({ mode })
  if (currentPermission === 'granted') return true
  const requestedPermission = await handle.requestPermission({ mode })
  return requestedPermission === 'granted'
}

const parseCharactersJson = (text: string): Character[] => {
  const parsed = JSON.parse(text) as Character[] | Character
  const importedCharacters = Array.isArray(parsed) ? parsed : [parsed]

  return importedCharacters
    .filter((character): character is Character => Boolean(character && typeof character === 'object' && character.name))
    .map((character) =>
      normalizeCharacter({
        ...character,
        id: character.id || crypto.randomUUID(),
      }),
    )
}

const getCharacterFileName = (character: Pick<Character, 'id'>) => `${character.id}.json`

const writeCharacterFile = async (character: Character) => {
  if (!storageDirectoryHandle.value) return
  const handle = await storageDirectoryHandle.value.getFileHandle(getCharacterFileName(character), { create: true })
  const writable = await handle.createWritable()
  await writable.write(JSON.stringify(character, null, 2))
  await writable.close()
}

const persistCharacters = async () => {
  window.localStorage.removeItem(STORAGE_KEY)

  if (!storageDirectoryHandle.value || isWritingStorage.value) return

  try {
    isWritingStorage.value = true
    if (storageMode.value === 'directory') {
      const canWrite = await requestFilePermission(storageDirectoryHandle.value, 'readwrite')
      if (!canWrite) {
        storageStatus.value = '没有本机目录写入权限'
        return
      }
    }

    await Promise.all(characters.value.map((character) => writeCharacterFile(character)))
    storageStatus.value =
      storageMode.value === 'opfs' ? `已保存到${OPFS_STORAGE_LABEL}` : `已保存到 ${storageDirectoryHandle.value.name}`
  } catch {
    storageStatus.value = storageMode.value === 'opfs' ? `保存到${OPFS_STORAGE_LABEL}失败` : '保存到本机目录失败'
  } finally {
    isWritingStorage.value = false
  }
}

const loadCharactersFromDirectory = async (handle: FileSystemDirectoryHandle, mode: 'directory' | 'opfs') => {
  if (mode === 'directory') {
    const canRead = await requestFilePermission(handle, 'read')
    if (!canRead) return false
  }

  const parsedCharacters: Character[] = []
  for await (const entry of handle.values()) {
    if (entry.kind !== 'file' || !entry.name.endsWith('.json')) continue
    const file = await entry.getFile()
    const text = await file.text()
    if (!text.trim()) continue
    parsedCharacters.push(...parseCharactersJson(text))
  }

  const uniqueCharacters = Array.from(new Map(parsedCharacters.map((character) => [character.id, character])).values())

  storageDirectoryHandle.value = handle
  storageMode.value = mode
  storageLocationLabel.value = mode === 'opfs' ? OPFS_STORAGE_LABEL : handle.name
  storageStatus.value =
    uniqueCharacters.length > 0
      ? `已从 ${mode === 'opfs' ? OPFS_STORAGE_LABEL : handle.name} 读取 ${uniqueCharacters.length} 个角色`
      : `已连接${mode === 'opfs' ? OPFS_STORAGE_LABEL : ` ${handle.name}`}，当前没有角色`
  characters.value = uniqueCharacters
  selectedId.value = uniqueCharacters[0]?.id ?? ''
  return true
}

const initializeOpfsStorage = async () => {
  if (!navigator.storage.getDirectory) {
    storageMode.value = 'none'
    storageStatus.value = '当前浏览器不支持本机目录或 OPFS 存储'
    return false
  }

  const handle = await navigator.storage.getDirectory()
  await loadCharactersFromDirectory(handle, 'opfs')
  return true
}

const initializeCharacterStorage = async () => {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
    if (canUseLocalFileStorage()) {
      const savedHandle = await readStorageSetting<FileSystemDirectoryHandle>(STORAGE_HANDLE_KEY)
      if (savedHandle) {
        await loadCharactersFromDirectory(savedHandle, 'directory')
      }
    } else {
      await initializeOpfsStorage()
    }
  } catch {
    storageStatus.value = canUseLocalFileStorage() ? '读取本机存储设置失败' : `读取${OPFS_STORAGE_LABEL}失败`
  } finally {
    isStorageReady.value = true
  }
}

void initializeCharacterStorage()

watch(
  characters,
  () => {
    if (!isStorageReady.value) return
    void persistCharacters()
  },
  { deep: true },
)

const getSkillDefinitionByName = (name: string) => skillDefinitions.find((skill) => skill.name === name)

const applyDerivedCharacterValues = (character: Character) => {
  character.abilities.forEach((ability) => {
    const abilityModifier = modifier(ability.score)
    ability.save = abilityModifier + (ability.proficient ? character.proficiency : 0)
    ability.skills.forEach((skill) => {
      const skillDefinition = getSkillDefinitionByName(skill.name)
      const sourceAbility = skillDefinition ? character.abilities.find((item) => item.key === skillDefinition.abilityKey) : ability
      const sourceModifier = modifier(sourceAbility?.score ?? ability.score)
      const proficiencyMultiplier = skill.expertise ? 2 : skill.proficient ? 1 : 0
      skill.value = sourceModifier + character.proficiency * proficiencyMultiplier
    })
  })
}

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
  const normalizedForm = normalizeCharacter({
    ...form,
    updatedAt: new Date().toISOString(),
  })
  applyDerivedCharacterValues(normalizedForm)
  characters.value[index] = cloneCharacter(normalizedForm)
  Object.assign(form, cloneCharacter(normalizedForm))
  isEditing.value = false
}

const deleteCharacter = () => {
  if (!selectedCharacter.value) return
  const deletedCharacterId = selectedCharacter.value.id
  characters.value = characters.value.filter((character) => character.id !== deletedCharacterId)
  selectedId.value = characters.value[0]?.id ?? ''
  isEditing.value = false
  if (storageDirectoryHandle.value) {
    void storageDirectoryHandle.value.removeEntry(`${deletedCharacterId}.json`).catch(() => undefined)
  }
}

const mergeImportedCharacters = (importedCharacters: Character[]) => {
  if (importedCharacters.length === 0) return []

  const existingIds = new Set(characters.value.map((character) => character.id))
  const normalizedCharacters = importedCharacters.map((character) => {
    const id = existingIds.has(character.id) ? crypto.randomUUID() : character.id
    existingIds.add(id)
    return {
      ...normalizeCharacter(character),
      id,
      updatedAt: character.updatedAt || new Date().toISOString(),
    }
  })

  characters.value = [...normalizedCharacters, ...characters.value]
  selectedId.value = normalizedCharacters[0]?.id ?? ''
  isEditing.value = false
  return normalizedCharacters
}

const chooseStorageFile = async () => {
  if (!window.showDirectoryPicker) {
    void initializeOpfsStorage().then((ready) => {
      if (ready) storageStatus.value = `当前浏览器使用${OPFS_STORAGE_LABEL}保存角色，可通过导出下载备份`
    })
    return
  }

  try {
    const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
    const currentCharacters = [...characters.value]
    const currentSelectedId = selectedId.value
    storageDirectoryHandle.value = handle
    storageMode.value = 'directory'
    storageLocationLabel.value = handle.name
    await writeStorageSetting(STORAGE_HANDLE_KEY, handle)
    const loaded = await loadCharactersFromDirectory(handle, 'directory')
    if ((!loaded || characters.value.length === 0) && currentCharacters.length > 0) {
      characters.value = currentCharacters
      selectedId.value = currentSelectedId || currentCharacters[0]?.id || ''
      await persistCharacters()
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return
    storageStatus.value = '选择本机存储目录失败'
  }
}

const importCharactersFromFile = async () => {
  if (!window.showOpenFilePicker) {
    importInput.value?.click()
    return
  }

  try {
    const [handle] = await window.showOpenFilePicker({
      multiple: false,
      types: [
        {
          description: 'DND 角色 JSON',
          accept: { 'application/json': ['.json'] },
        },
      ],
    })
    if (!handle) return

    const canRead = await requestFilePermission(handle, 'read')
    if (!canRead) {
      storageStatus.value = '没有读取导入文件的权限'
      return
    }

    const file = await handle.getFile()
    const importedCharacters = parseCharactersJson(await file.text())
    mergeImportedCharacters(importedCharacters)
    storageStatus.value = `已导入 ${importedCharacters.length} 个角色`
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return
    storageStatus.value = '导入角色失败，请确认 JSON 格式'
  }
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

const exportSelectedCharacter = () => {
  if (!selectedCharacter.value) return

  const data = JSON.stringify(selectedCharacter.value, null, 2)
  const blob = new Blob([data], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${selectedCharacter.value.name || 'character'}-${selectedCharacter.value.id}.json`
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
    parsed = parseCharactersJson(text)
  } catch {
    storageStatus.value = '导入角色失败，请确认 JSON 格式'
    target.value = ''
    return
  }

  const importedCharacters = mergeImportedCharacters(parsed)
  storageStatus.value = `已导入 ${importedCharacters.length} 个角色`
  target.value = ''
}

const metricCards = computed(() => [
  {
    label: 'HP',
    value: `${selectedCharacter.value?.hp.current ?? 0} / ${selectedCharacter.value?.hp.max ?? 0}${
      selectedCharacter.value?.hp.temporary ? ` +${selectedCharacter.value.hp.temporary}` : ''
    }`,
    tone: 'green',
  },
  { label: 'AC', value: selectedCharacter.value?.ac ?? '-', tone: 'steel' },
  { label: '先攻', value: signed(selectedCharacter.value?.initiative ?? 0), tone: 'violet' },
  { label: '速度', value: `${selectedCharacter.value?.speed ?? 0} 尺`, tone: 'amber' },
  { label: '熟练加值', value: signed(selectedCharacter.value?.proficiency ?? 0), tone: 'amber' },
  { label: '被动察觉', value: selectedCharacter.value?.passivePerception ?? '-', tone: 'blue' },
  { label: '攻击加值', value: signed(selectedCharacter.value?.attackBonus ?? 0), tone: 'bronze' },
  { label: '法术豁免', value: selectedCharacter.value?.spellSaveDc || '-', tone: 'violet' },
])

const proficiencyRows = computed(() => [
  ['武器熟练项', selectedCharacter.value?.proficiencies.weapons ?? ''],
  ['护甲熟练项', selectedCharacter.value?.proficiencies.armor ?? ''],
  ['工具熟练项', selectedCharacter.value?.proficiencies.tools ?? ''],
  ['语言', selectedCharacter.value?.proficiencies.languages ?? ''],
  ['其他熟练项', selectedCharacter.value?.proficiencies.other ?? ''],
])

const currentCreationStep = computed(() => characterCreationConfig.steps[creationStep.value])
const storyLength = computed(() => creationDraft.story.length)

const resolveCustomValue = (value: string, customValue: string) => {
  return value === CUSTOM_OPTION ? customValue.trim() : value
}

const previewRows = computed(() => [
  ['姓名', creationDraft.name.trim() || '未命名角色'],
  ['种族', resolveCustomValue(creationDraft.species, creationDraft.customSpecies) || '待填写'],
  ['性别', creationDraft.gender || '未说明'],
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

const currentProficiencyBonus = computed(() => {
  return calculateProficiencyBonus(creationDraft.level)
})

const getSkillValue = (skillKey: string) => {
  const skill = skillDefinitions.find((item) => item.key === skillKey)
  if (!skill) return 0

  const abilityModifier = modifier(getFinalAbilityScore(skill.abilityKey))
  const proficiencyMultiplier = creationDraft.skillExpertise[skillKey] ? 2 : creationDraft.skillProficiencies[skillKey] ? 1 : 0
  return abilityModifier + currentProficiencyBonus.value * proficiencyMultiplier
}

const selectedSkillProficiencyCount = computed(() => {
  return Object.values(creationDraft.skillProficiencies).filter(Boolean).length
})

const selectedSkillExpertiseCount = computed(() => {
  return Object.values(creationDraft.skillExpertise).filter(Boolean).length
})

const skillGroups = computed(() => {
  return abilityDefinitions.map((ability) => {
    const score = getFinalAbilityScore(ability.key)
    const abilityModifier = modifier(score)
    const skills = skillDefinitions
      .filter((skill) => skill.abilityKey === ability.key)
      .map((skill) => ({
        ...skill,
        value: getSkillValue(skill.key),
        proficient: creationDraft.skillProficiencies[skill.key],
        expertise: creationDraft.skillExpertise[skill.key],
      }))

    return {
      ...ability,
      score,
      modifier: abilityModifier,
      skills,
    }
  })
})

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

const setSkillProficiency = (skillKey: string, checked: boolean) => {
  creationDraft.skillProficiencies[skillKey] = checked
  if (!checked) {
    creationDraft.skillExpertise[skillKey] = false
  }
}

const setSkillExpertise = (skillKey: string, checked: boolean) => {
  creationDraft.skillExpertise[skillKey] = checked
  if (checked) {
    creationDraft.skillProficiencies[skillKey] = true
  }
}

const createAbilitiesFromDraft = (): Ability[] => {
  return abilityDefinitions.map((ability) => {
    const score = getFinalAbilityScore(ability.key)
    const baseModifier = modifier(score)
    const skills = skillDefinitions
      .filter((skill) => skill.abilityKey === ability.key)
      .map((skill) => ({
        name: skill.name,
        value: getSkillValue(skill.key),
        proficient: creationDraft.skillProficiencies[skill.key] || undefined,
        expertise: creationDraft.skillExpertise[skill.key] || undefined,
      }))

    return {
      ...ability,
      score,
      save: baseModifier,
      skills,
    }
  })
}

const resetCreationDraft = () => {
  Object.assign(creationDraft, {
    name: characterCreationConfig.defaults.name,
    species: characterCreationConfig.defaults.species,
    customSpecies: '',
    gender: characterCreationConfig.defaults.gender,
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
  Object.assign(creationDraft.skillProficiencies, createDefaultSkillSelection())
  Object.assign(creationDraft.skillExpertise, createDefaultSkillSelection())
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

  const characterClassName = resolveCustomValue(creationDraft.className, creationDraft.customClassName)
  const characterClasses = [createClassEntry(characterClassName, creationDraft.level)]
  const initialCoreStats = calculateInitialCoreStats(characterClasses, finalAbilityScores, currentProficiencyBonus.value)

  const character = createCharacter({
    name: creationDraft.name.trim(),
    race: resolveCustomValue(creationDraft.species, creationDraft.customSpecies),
    gender: creationDraft.gender,
    className: characterClassName,
    classes: characterClasses,
    level: creationDraft.level,
    alignment: creationDraft.alignment,
    background: resolveCustomValue(creationDraft.background, creationDraft.customBackground),
    size: resolveCustomValue(creationDraft.size, creationDraft.customSize),
    story: creationDraft.story.trim() || '这个角色的背景故事还在旅途中慢慢成形。',
    ...initialCoreStats,
    proficiency: currentProficiencyBonus.value,
    abilities: createAbilitiesFromDraft(),
    hitDice: normalizeHitDice(characterClasses, undefined),
    notes: '角色创建流程已记录基本信息，后续步骤可继续完善。',
  })
  characters.value = [character, ...characters.value]
  selectedId.value = character.id
  creationStep.value = 0
}


export const useCharacters = () => ({
  CUSTOM_OPTION,
  abilityDefinitions,
  skillDefinitions,
  characterCreationConfig,
  characters,
  selectedId,
  selectedCharacter,
  form,
  isEditing,
  creationStep,
  importInput,
  storageLocationLabel,
  storageStatus,
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
  currentProficiencyBonus,
  skillGroups,
  selectedSkillProficiencyCount,
  selectedSkillExpertiseCount,
  isAbilityStepValid,
  isBasicStepValid,
  syncForm,
  modifier,
  signed,
  selectCharacter,
  addCharacter,
  saveForm,
  deleteCharacter,
  calculateProficiencyBonus,
  getClassTotalLevel,
  getCharacterClassSummary,
  createClassEntry,
  createTraitEntry,
  createSpellEntry,
  createDefaultSpellSlots,
  createCustomResource,
  createInventoryItem,
  createAdventureLogEntry,
  createCreatureEntry,
  chooseStorageFile,
  importCharactersFromFile,
  exportJson,
  exportSelectedCharacter,
  importJson,
  resolveCustomValue,
  rollAbilityScores,
  resetAbilityScores,
  isRollOptionUsed,
  assignRollToAbility,
  setAbilityBonus,
  getAbilityBonus,
  getFinalAbilityScore,
  getSkillValue,
  setSkillProficiency,
  setSkillExpertise,
  resetCreationDraft,
  goNextCreationStep,
  goPreviousCreationStep,
  cancelCreation,
  finishCreation,
})
