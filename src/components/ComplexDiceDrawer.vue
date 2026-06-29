<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

type DiceTerm = {
  id: string
  sign: 1 | -1
  count: number
  sides: number
}

type ConstantTerm = {
  id: string
  sign: 1 | -1
  value: number
}

type ParsedDiceExpression = {
  diceTerms: DiceTerm[]
  constants: ConstantTerm[]
  normalized: string
}

type ComplexDiceGroup = {
  id: string
  name: string
  expression: string
  favorite: boolean
  createdAt: string
  updatedAt: string
}

type ComplexDiceRollResult = {
  id: string
  expression: string
  groups: Array<{
    id: string
    label: string
    sign: 1 | -1
    rolls: number[]
    subtotal: number
  }>
  constants: ConstantTerm[]
  total: number
  expected: number
  createdAt: string
}

const COMPLEX_DICE_GROUPS_KEY = 'dnd-tools.complex-dice-groups.v1'
const COMPLEX_DICE_HISTORY_KEY = 'dnd-tools.complex-dice-history.v1'
const COMPLEX_DICE_HISTORY_LIMIT = 50

const isOpen = ref(false)
const isHistoryOpen = ref(false)
const isRolling = ref(false)
const expressionInput = ref('2d8+3d6')
const savedGroups = ref<ComplexDiceGroup[]>([])
const rollHistory = ref<ComplexDiceRollResult[]>([])
const latestRoll = ref<ComplexDiceRollResult | null>(null)
let rollTimer: ReturnType<typeof window.setInterval> | null = null

const parsedExpression = computed(() => {
  try {
    return parseDiceExpression(expressionInput.value)
  } catch {
    return null
  }
})
const parseError = computed(() => {
  try {
    parseDiceExpression(expressionInput.value)
    return ''
  } catch (error) {
    return error instanceof Error ? error.message : '表达式格式有误'
  }
})
const expectedValue = computed(() => (parsedExpression.value ? getExpectedValue(parsedExpression.value) : 0))
const sortedGroups = computed(() =>
  [...savedGroups.value].sort((first, second) => {
    if (first.favorite !== second.favorite) return first.favorite ? -1 : 1
    return new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime()
  }),
)

const formatNumber = (value: number) => {
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

function parseDiceExpression(rawExpression: string): ParsedDiceExpression {
  const expression = rawExpression.replace(/\s+/g, '').toLowerCase()
  if (!expression) throw new Error('请输入骰子表达式')

  const diceTerms: DiceTerm[] = []
  const constants: ConstantTerm[] = []
  const tokenPattern = /([+-]?)(?:(\d*)d(\d+)|(\d+))/g
  let cursor = 0
  let match: RegExpExecArray | null

  while ((match = tokenPattern.exec(expression))) {
    if (match.index !== cursor) throw new Error('支持格式：NdM、+K、-NdM')
    const sign: 1 | -1 = match[1] === '-' ? -1 : 1
    const diceCount = match[2] ? Number(match[2]) : 1
    const diceSides = Number(match[3])
    const constantValue = Number(match[4])

    if (match[3]) {
      if (!Number.isInteger(diceCount) || diceCount < 1 || diceCount > 99) throw new Error('骰子数量需在 1-99 之间')
      if (!Number.isInteger(diceSides) || diceSides < 2 || diceSides > 999) throw new Error('骰子面数需在 2-999 之间')
      diceTerms.push({
        id: `${match.index}-${diceCount}d${diceSides}-${sign}`,
        sign,
        count: diceCount,
        sides: diceSides,
      })
    } else {
      constants.push({
        id: `${match.index}-${constantValue}-${sign}`,
        sign,
        value: constantValue,
      })
    }

    cursor = tokenPattern.lastIndex
  }

  if (cursor !== expression.length || diceTerms.length === 0) throw new Error('至少需要包含一个骰子项')

  return {
    diceTerms,
    constants,
    normalized: [...diceTerms, ...constants]
      .map((term, index) => {
        const signText = term.sign === -1 ? '-' : index === 0 ? '' : '+'
        if ('sides' in term) return `${signText}${term.count}d${term.sides}`
        return `${signText}${term.value}`
      })
      .join(''),
  }
}

const getExpectedValue = (parsed: ParsedDiceExpression) => {
  const diceExpected = parsed.diceTerms.reduce((sum, term) => sum + term.sign * term.count * ((term.sides + 1) / 2), 0)
  const constantExpected = parsed.constants.reduce((sum, term) => sum + term.sign * term.value, 0)
  return diceExpected + constantExpected
}

const randomDie = (sides: number) => Math.floor(Math.random() * sides) + 1

const rollParsedExpression = (parsed: ParsedDiceExpression): ComplexDiceRollResult => {
  const groups = parsed.diceTerms.map((term) => {
    const rolls = Array.from({ length: term.count }, () => randomDie(term.sides))
    const subtotal = term.sign * rolls.reduce((sum, roll) => sum + roll, 0)
    return {
      id: term.id,
      label: `${term.sign === -1 ? '-' : ''}D${term.sides}（${term.count} 个）`,
      sign: term.sign,
      rolls,
      subtotal,
    }
  })
  const constantsTotal = parsed.constants.reduce((sum, term) => sum + term.sign * term.value, 0)

  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    expression: parsed.normalized,
    groups,
    constants: parsed.constants,
    total: groups.reduce((sum, group) => sum + group.subtotal, 0) + constantsTotal,
    expected: getExpectedValue(parsed),
    createdAt: new Date().toISOString(),
  }
}

const saveGroups = () => {
  localStorage.setItem(COMPLEX_DICE_GROUPS_KEY, JSON.stringify(savedGroups.value))
}

const saveHistory = () => {
  localStorage.setItem(COMPLEX_DICE_HISTORY_KEY, JSON.stringify(rollHistory.value.slice(0, COMPLEX_DICE_HISTORY_LIMIT)))
}

const isValidGroup = (group: ComplexDiceGroup): group is ComplexDiceGroup => {
  return (
    typeof group?.id === 'string' &&
    typeof group.name === 'string' &&
    typeof group.expression === 'string' &&
    typeof group.favorite === 'boolean' &&
    typeof group.createdAt === 'string' &&
    typeof group.updatedAt === 'string'
  )
}

const isValidRoll = (roll: ComplexDiceRollResult): roll is ComplexDiceRollResult => {
  return (
    typeof roll?.id === 'string' &&
    typeof roll.expression === 'string' &&
    Array.isArray(roll.groups) &&
    Array.isArray(roll.constants) &&
    typeof roll.total === 'number' &&
    typeof roll.expected === 'number' &&
    typeof roll.createdAt === 'string'
  )
}

const loadStoredData = () => {
  try {
    const parsedGroups = JSON.parse(localStorage.getItem(COMPLEX_DICE_GROUPS_KEY) || '[]')
    if (Array.isArray(parsedGroups)) savedGroups.value = parsedGroups.filter(isValidGroup)
  } catch {
    savedGroups.value = []
  }

  try {
    const parsedHistory = JSON.parse(localStorage.getItem(COMPLEX_DICE_HISTORY_KEY) || '[]')
    if (Array.isArray(parsedHistory)) {
      rollHistory.value = parsedHistory.filter(isValidRoll).slice(0, COMPLEX_DICE_HISTORY_LIMIT)
      latestRoll.value = rollHistory.value[0] ?? null
    }
  } catch {
    rollHistory.value = []
  }
}

const open = () => {
  isOpen.value = true
}

const close = () => {
  isOpen.value = false
  isHistoryOpen.value = false
}

const saveCurrentGroup = () => {
  const parsed = parseDiceExpression(expressionInput.value)
  const normalized = parsed.normalized
  const existingIndex = savedGroups.value.findIndex((group) => group.expression.toLowerCase() === normalized.toLowerCase())
  const now = new Date().toISOString()

  if (existingIndex >= 0) {
    const existingGroup = savedGroups.value[existingIndex]
    if (!existingGroup) return
    savedGroups.value[existingIndex] = {
      ...existingGroup,
      expression: normalized,
      updatedAt: now,
    }
  } else {
    savedGroups.value = [
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: normalized,
        expression: normalized,
        favorite: false,
        createdAt: now,
        updatedAt: now,
      },
      ...savedGroups.value,
    ]
  }

  saveGroups()
}

const togglePinned = (id: string) => {
  savedGroups.value = savedGroups.value.map((group) => (group.id === id ? { ...group, favorite: !group.favorite, updatedAt: new Date().toISOString() } : group))
  saveGroups()
}

const deleteGroup = (id: string) => {
  savedGroups.value = savedGroups.value.filter((group) => group.id !== id)
  saveGroups()
}

const useSavedGroup = (group: ComplexDiceGroup) => {
  expressionInput.value = group.expression
}

const rollCurrentExpression = () => {
  if (isRolling.value || parseError.value) return
  const parsed = parseDiceExpression(expressionInput.value)
  isRolling.value = true
  isHistoryOpen.value = false

  if (rollTimer) window.clearInterval(rollTimer)
  rollTimer = window.setInterval(() => {
    latestRoll.value = rollParsedExpression(parsed)
  }, 90)

  window.setTimeout(() => {
    if (rollTimer) {
      window.clearInterval(rollTimer)
      rollTimer = null
    }

    const result = rollParsedExpression(parsed)
    latestRoll.value = result
    rollHistory.value = [result, ...rollHistory.value].slice(0, COMPLEX_DICE_HISTORY_LIMIT)
    saveHistory()
    isRolling.value = false
  }, 900)
}

const rollSavedGroup = (group: ComplexDiceGroup) => {
  useSavedGroup(group)
  rollCurrentExpression()
}

const clearResult = () => {
  latestRoll.value = null
}

const clearHistory = () => {
  rollHistory.value = []
  latestRoll.value = null
  saveHistory()
}

const getGroupSummary = (expression: string) => {
  try {
    const parsed = parseDiceExpression(expression)
    return {
      expected: getExpectedValue(parsed),
    }
  } catch {
    return {
      expected: 0,
    }
  }
}

const formatRollDetails = (roll: ComplexDiceRollResult) => {
  const diceDetails = roll.groups.map((group) => {
    const rolls = group.rolls.map((value) => (group.sign === -1 ? -value : value)).join(' / ')
    return `${group.label}：${rolls}`
  })
  const constants = roll.constants.map((constant) => `常数：${constant.sign === -1 ? '-' : '+'}${constant.value}`)
  return [...diceDetails, ...constants].join('；')
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.ctrlKey && event.key.toLowerCase() === 'r') {
    event.preventDefault()
    isOpen.value = !isOpen.value
  }

  if (event.key === 'Escape' && isOpen.value) {
    close()
  }
}

onMounted(() => {
  loadStoredData()
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  if (rollTimer) window.clearInterval(rollTimer)
})

defineExpose({
  open,
})
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen" class="dice-drawer-layer">
      <button class="dice-drawer-scrim" type="button" aria-label="关闭复杂骰子工具" @click="close"></button>
      <aside class="dice-drawer complex-dice-drawer" aria-labelledby="complex-dice-title">
        <header class="dice-drawer-header">
          <div>
            <h2 id="complex-dice-title">复杂骰子工具</h2>
            <small>Ctrl + R 唤出 / Esc 关闭</small>
          </div>
          <div class="dice-drawer-header-actions">
            <button class="plain-button" type="button" @click="isHistoryOpen = !isHistoryOpen">↺ 历史记录</button>
            <button class="icon-button" type="button" aria-label="关闭复杂骰子工具" @click="close">×</button>
          </div>
        </header>

        <section class="dice-tool-section complex-editor-section">
          <h3><span>1</span>骰子组编辑</h3>
          <div class="complex-editor-grid">
            <input v-model="expressionInput" class="complex-expression-input" type="text" placeholder="例如：2d8+3d6+3" />
            <button class="primary-button" type="button" :disabled="Boolean(parseError)" @click="saveCurrentGroup">保存组合</button>
          </div>
          <p class="complex-format-tip" :class="{ error: parseError }">
            ⓘ {{ parseError || '支持格式：NdM [+/- K] [+/- NdM ...]，例如：2d8+3d6、4d6+2、3d10-1d4' }}
          </p>
        </section>

        <section class="dice-tool-section complex-preview-section">
          <header class="complex-section-header">
            <h3><span>2</span>已存组合</h3>
            <small>共 {{ savedGroups.length }} 组组合</small>
          </header>

          <div v-if="sortedGroups.length > 0" class="complex-groups-table">
            <div class="complex-table-head">
              <span>表达式</span>
              <span>期望值</span>
              <span>操作</span>
            </div>
            <article v-for="group in sortedGroups" :key="group.id" class="complex-table-row">
              <strong>{{ group.expression }}</strong>
              <span>{{ formatNumber(getGroupSummary(group.expression).expected) }}</span>
              <div>
                <button class="icon-button" type="button" :aria-label="group.favorite ? '取消置顶' : '置顶该组合'" @click="togglePinned(group.id)">
                  {{ group.favorite ? '⇡' : '↑' }}
                </button>
                <button class="icon-button" type="button" aria-label="投掷该组合" @click="rollSavedGroup(group)">▷</button>
                <button class="icon-button" type="button" aria-label="删除该组合" @click="deleteGroup(group.id)">×</button>
              </div>
            </article>
          </div>
          <div v-else class="complex-empty-state">暂无已存组合，输入表达式后点击保存组合。</div>
        </section>

        <section class="dice-tool-section">
          <h3><span>3</span>投掷结果</h3>
          <div class="complex-result-panel" :class="{ rolling: isRolling }">
            <div>
              <span>骰子之和</span>
              <strong>{{ latestRoll?.total ?? 0 }}</strong>
            </div>
            <div>
              <span>各骰点数（分区展示）</span>
              <div v-if="latestRoll" class="complex-roll-groups">
                <section v-for="group in latestRoll.groups" :key="group.id">
                  <b>{{ group.label }}</b>
                  <p class="dice-roll-pills">
                    <i v-for="(roll, index) in group.rolls" :key="`${group.id}-${index}`">{{ group.sign === -1 ? -roll : roll }}</i>
                  </p>
                </section>
                <section v-if="latestRoll.constants.length > 0">
                  <b>常数</b>
                  <p class="dice-roll-pills">
                    <i v-for="constant in latestRoll.constants" :key="constant.id">{{ constant.sign === -1 ? '-' : '+' }}{{ constant.value }}</i>
                  </p>
                </section>
              </div>
              <small v-else>等待投掷</small>
            </div>
            <div>
              <span>期望值</span>
              <strong>{{ formatNumber(latestRoll?.expected ?? expectedValue) }}</strong>
            </div>
          </div>
        </section>

        <section v-if="isHistoryOpen" class="dice-history-panel complex-history-panel">
          <header>
            <h3>近期记录</h3>
            <button class="plain-button" type="button" @click="clearHistory">清空记录</button>
          </header>
          <div v-if="rollHistory.length > 0" class="dice-history-list">
            <article v-for="roll in rollHistory" :key="roll.id">
              <strong>{{ roll.expression }} = {{ roll.total }}</strong>
              <span>{{ formatRollDetails(roll) }}</span>
              <small>{{ new Date(roll.createdAt).toLocaleString() }}</small>
            </article>
          </div>
          <p v-else>暂无历史记录。</p>
        </section>

        <footer class="dice-drawer-footer">
          <button class="primary-button" type="button" :disabled="isRolling || Boolean(parseError)" @click="rollCurrentExpression">
            ⚂ {{ isRolling ? '投掷中' : '开始投掷' }}
          </button>
          <button class="plain-button" type="button" @click="clearResult">清空</button>
        </footer>
      </aside>
    </div>
  </Teleport>
</template>
