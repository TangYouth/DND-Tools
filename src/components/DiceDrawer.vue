<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

type DiceRollResult = {
  id: string
  count: number
  sides: number
  rolls: number[]
  total: number
  expected: number
  createdAt: string
}

const DICE_HISTORY_KEY = 'dnd-tools.dice-history.v1'
const DICE_HISTORY_LIMIT = 50
const diceCountOptions = [1, 2, 3, 4, 5, 8]
const diceSideOptions = [4, 6, 8, 10, 12, 20]

const isDicePanelOpen = ref(false)
const isDiceHistoryOpen = ref(false)
const isRollingDice = ref(false)
const diceCount = ref(2)
const diceSides = ref(20)
const customDiceCount = ref(6)
const customDiceSides = ref(100)
const dicePreview = ref<number[]>([])
const latestRoll = ref<DiceRollResult | null>(null)
const diceHistory = ref<DiceRollResult[]>([])
let diceRollTimer: ReturnType<typeof window.setInterval> | null = null

const diceExpectedValue = computed(() => getExpectedValue(diceCount.value, diceSides.value))
const visibleDiceResult = computed(() => {
  if (isRollingDice.value && dicePreview.value.length > 0) {
    return {
      total: dicePreview.value.reduce((sum, roll) => sum + roll, 0),
      rolls: dicePreview.value,
      expected: diceExpectedValue.value,
    }
  }

  if (latestRoll.value) {
    return latestRoll.value
  }

  return {
    total: 0,
    rolls: [],
    expected: diceExpectedValue.value,
  }
})

const clampInteger = (value: number | undefined, min: number, max: number) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return min
  }

  return Math.min(max, Math.max(min, Math.round(value)))
}

function getExpectedValue(count: number, sides: number) {
  return count * ((sides + 1) / 2)
}

const formatNumber = (value: number) => {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

const getRollExpression = (roll: Pick<DiceRollResult, 'count' | 'sides'>) => `${roll.count}D${roll.sides}`

const randomDie = (sides: number) => Math.floor(Math.random() * sides) + 1

const getRandomRolls = () => {
  return Array.from({ length: diceCount.value }, () => randomDie(diceSides.value))
}

const saveDiceHistory = () => {
  localStorage.setItem(DICE_HISTORY_KEY, JSON.stringify(diceHistory.value.slice(0, DICE_HISTORY_LIMIT)))
}

const loadDiceHistory = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(DICE_HISTORY_KEY) || '[]')
    if (Array.isArray(parsed)) {
      diceHistory.value = parsed
        .filter((roll): roll is DiceRollResult => {
          return (
            typeof roll?.id === 'string' &&
            typeof roll.count === 'number' &&
            typeof roll.sides === 'number' &&
            Array.isArray(roll.rolls) &&
            typeof roll.total === 'number' &&
            typeof roll.expected === 'number' &&
            typeof roll.createdAt === 'string'
          )
        })
        .slice(0, DICE_HISTORY_LIMIT)
      latestRoll.value = diceHistory.value[0] ?? null
    }
  } catch {
    diceHistory.value = []
  }
}

const openDicePanel = () => {
  isDicePanelOpen.value = true
}

const closeDicePanel = () => {
  isDicePanelOpen.value = false
  isDiceHistoryOpen.value = false
}

const selectDiceCount = (count: number) => {
  diceCount.value = count
}

const selectDiceSides = (sides: number) => {
  diceSides.value = sides
}

const applyCustomDiceCount = () => {
  customDiceCount.value = clampInteger(customDiceCount.value, 1, 99)
  diceCount.value = customDiceCount.value
}

const applyCustomDiceSides = () => {
  customDiceSides.value = clampInteger(customDiceSides.value, 2, 999)
  diceSides.value = customDiceSides.value
}

const clearDiceResult = () => {
  latestRoll.value = null
  dicePreview.value = []
}

const clearDiceHistory = () => {
  diceHistory.value = []
  saveDiceHistory()
}

const rollDice = () => {
  if (isRollingDice.value) {
    return
  }

  isRollingDice.value = true
  isDiceHistoryOpen.value = false
  dicePreview.value = getRandomRolls()

  if (diceRollTimer) {
    window.clearInterval(diceRollTimer)
  }

  diceRollTimer = window.setInterval(() => {
    dicePreview.value = getRandomRolls()
  }, 90)

  window.setTimeout(() => {
    if (diceRollTimer) {
      window.clearInterval(diceRollTimer)
      diceRollTimer = null
    }

    const rolls = getRandomRolls()
    const rollResult: DiceRollResult = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      count: diceCount.value,
      sides: diceSides.value,
      rolls,
      total: rolls.reduce((sum, roll) => sum + roll, 0),
      expected: diceExpectedValue.value,
      createdAt: new Date().toISOString(),
    }

    latestRoll.value = rollResult
    diceHistory.value = [rollResult, ...diceHistory.value].slice(0, DICE_HISTORY_LIMIT)
    saveDiceHistory()
    dicePreview.value = []
    isRollingDice.value = false
  }, 1000)
}

const handleAppKeydown = (event: KeyboardEvent) => {
  if (event.ctrlKey && event.key.toLowerCase() === 'e') {
    event.preventDefault()
    isDicePanelOpen.value = !isDicePanelOpen.value
  }

  if (event.key === 'Escape' && isDicePanelOpen.value) {
    closeDicePanel()
  }
}

onMounted(() => {
  loadDiceHistory()
  window.addEventListener('keydown', handleAppKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleAppKeydown)
  if (diceRollTimer) {
    window.clearInterval(diceRollTimer)
  }
})

defineExpose({
  open: openDicePanel,
})
</script>

<template>
  <Teleport to="body">
    <div v-if="isDicePanelOpen" class="dice-drawer-layer">
      <button class="dice-drawer-scrim" type="button" aria-label="关闭简易骰子工具" @click="closeDicePanel"></button>
      <aside class="dice-drawer" aria-labelledby="dice-drawer-title">
        <header class="dice-drawer-header">
          <div>
            <h2 id="dice-drawer-title">简易骰子工具</h2>
            <small>Ctrl + E 唤出 / Esc 关闭</small>
          </div>
          <div class="dice-drawer-header-actions">
            <button class="plain-button" type="button" @click="isDiceHistoryOpen = !isDiceHistoryOpen">
              <span aria-hidden="true">↺</span>
              <span class="dice-history-label-full">历史记录</span>
              <span class="dice-history-label-short">历史</span>
            </button>
            <button class="icon-button" type="button" aria-label="关闭简易骰子工具" @click="closeDicePanel">×</button>
          </div>
        </header>

        <section class="dice-tool-section">
          <h3><span>1</span>骰子数量</h3>
          <div class="dice-option-row">
            <button
              v-for="count in diceCountOptions"
              :key="count"
              type="button"
              :class="{ active: diceCount === count }"
              @click="selectDiceCount(count)"
            >
              {{ count }}
            </button>
            <button class="dice-plus-button" type="button" aria-label="应用自定义骰子数量" @click="applyCustomDiceCount">自定义</button>
          </div>
          <label class="dice-custom-field">
            自定义数量
            <el-input-number v-model="customDiceCount" :min="1" :max="99" controls-position="right" @change="applyCustomDiceCount" />
          </label>
        </section>

        <section class="dice-tool-section">
          <h3><span>2</span>骰子类型</h3>
          <div class="dice-type-grid">
            <button
              v-for="sides in diceSideOptions"
              :key="sides"
              type="button"
              :class="{ active: diceSides === sides }"
              @click="selectDiceSides(sides)"
            >
              <span class="dice-type-mark">D{{ sides }}</span>
              <strong>D{{ sides }}</strong>
            </button>
            <button class="dice-plus-button dice-type-plus" type="button" aria-label="应用自定义骰子面数" @click="applyCustomDiceSides">自定义</button>
          </div>
          <label class="dice-custom-field">
            自定义面数
            <el-input-number v-model="customDiceSides" :min="2" :max="999" controls-position="right" @change="applyCustomDiceSides" />
          </label>
        </section>

        <section class="dice-tool-section">
          <h3><span>3</span>投掷结果</h3>
          <div class="dice-result-panel" :class="{ rolling: isRollingDice }">
            <div>
              <span>投掷之和</span>
              <strong>{{ visibleDiceResult.total }}</strong>
            </div>
            <div>
              <span>各骰点数</span>
              <p v-if="visibleDiceResult.rolls.length > 0" class="dice-roll-pills">
                <b v-for="(roll, index) in visibleDiceResult.rolls" :key="`${roll}-${index}`">{{ roll }}</b>
              </p>
              <small v-else>等待投掷</small>
            </div>
            <div>
              <span>骰子期望</span>
              <strong>{{ formatNumber(visibleDiceResult.expected) }}</strong>
            </div>
          </div>
        </section>

        <section v-if="isDiceHistoryOpen" class="dice-history-panel">
          <header>
            <h3>近期记录</h3>
            <button class="plain-button" type="button" @click="clearDiceHistory">清空记录</button>
          </header>
          <div v-if="diceHistory.length > 0" class="dice-history-list">
            <article v-for="roll in diceHistory" :key="roll.id">
              <strong>{{ getRollExpression(roll) }} = {{ roll.total }}</strong>
              <span>{{ roll.rolls.join(' / ') }}</span>
              <small>{{ new Date(roll.createdAt).toLocaleString() }} · 期望 {{ formatNumber(roll.expected) }}</small>
            </article>
          </div>
          <p v-else>暂无历史记录。</p>
        </section>

        <footer class="dice-drawer-footer">
          <button class="primary-button" type="button" :disabled="isRollingDice" @click="rollDice">
            ⚂ {{ isRollingDice ? '投掷中' : '开始投掷' }}
          </button>
          <button class="plain-button" type="button" @click="clearDiceResult">清空</button>
        </footer>
      </aside>
    </div>
  </Teleport>
</template>
