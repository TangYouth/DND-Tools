<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useCharacters } from '../composables/useCharacters'

type ItemLocation = 'equipment' | 'backpack'

const {
  selectedCharacter,
  form,
  syncForm,
  saveForm,
  deleteCharacter,
  exportSelectedCharacter,
  getCharacterClassSummary,
  createInventoryItem,
} = useCharacters()

const itemDraft = reactive({
  id: '',
  name: '',
  quantity: 1,
  value: 0,
  description: '',
  requiresAttunement: false,
  location: 'backpack' as ItemLocation,
})
const isItemDialogOpen = ref(false)

const classSummary = computed(() => getCharacterClassSummary(selectedCharacter.value))
const attunedItems = computed(() => selectedCharacter.value?.inventoryItems.filter((item) => item.requiresAttunement && item.attuned) ?? [])
const equipmentItems = computed(() => selectedCharacter.value?.inventoryItems.filter((item) => item.location === 'equipment') ?? [])
const backpackItems = computed(() => selectedCharacter.value?.inventoryItems.filter((item) => item.location === 'backpack') ?? [])
const itemDialogTitle = computed(() => `${itemDraft.id ? '编辑' : '添加'}物品`)

const deleteCurrentCharacter = () => {
  if (!selectedCharacter.value) return
  if (!window.confirm(`确定删除角色「${selectedCharacter.value.name}」吗？`)) return
  deleteCharacter()
}

const adjustGold = (delta: number) => {
  syncForm()
  form.gold = Math.max(0, Number(form.gold) + delta)
  saveForm()
}

const saveGold = () => {
  form.gold = Math.max(0, Number(form.gold) || 0)
  saveForm()
}

const saveAttunementMax = () => {
  form.attunementMax = Math.max(0, Number(form.attunementMax) || 0)
  form.inventoryItems
    .filter((item) => item.requiresAttunement && item.attuned)
    .slice(form.attunementMax)
    .forEach((item) => {
      item.attuned = false
    })
  saveForm()
}

const resetItemDraft = (location: ItemLocation = 'backpack') => {
  itemDraft.id = ''
  itemDraft.name = ''
  itemDraft.quantity = 1
  itemDraft.value = 0
  itemDraft.description = ''
  itemDraft.requiresAttunement = false
  itemDraft.location = location
}

const openItemDialog = (location: ItemLocation = 'backpack', itemId = '') => {
  syncForm()
  const item = itemId ? form.inventoryItems.find((entry) => entry.id === itemId) : undefined
  itemDraft.id = item?.id ?? ''
  itemDraft.name = item?.name ?? ''
  itemDraft.quantity = item?.quantity ?? 1
  itemDraft.value = item?.value ?? 0
  itemDraft.description = item?.description ?? ''
  itemDraft.requiresAttunement = item?.requiresAttunement ?? false
  itemDraft.location = item?.location ?? location
  isItemDialogOpen.value = true
}

const closeItemDialog = () => {
  resetItemDraft()
  isItemDialogOpen.value = false
}

const saveItem = () => {
  syncForm()
  const nextItem = createInventoryItem(
    itemDraft.name.trim() || '未命名物品',
    itemDraft.quantity,
    itemDraft.value,
    itemDraft.description.trim(),
    itemDraft.requiresAttunement,
    itemDraft.location,
    false,
  )

  if (itemDraft.id) {
    const index = form.inventoryItems.findIndex((item) => item.id === itemDraft.id)
    const previous = index !== -1 ? form.inventoryItems[index] : undefined
    if (index !== -1) {
      form.inventoryItems[index] = {
        ...nextItem,
        id: itemDraft.id,
        attuned: nextItem.requiresAttunement && Boolean(previous?.attuned),
      }
    }
  } else {
    form.inventoryItems.push(nextItem)
  }

  saveForm()
  resetItemDraft()
  isItemDialogOpen.value = false
}

const removeItem = (itemId: string) => {
  syncForm()
  const item = form.inventoryItems.find((entry) => entry.id === itemId)
  if (!item) return
  if (!window.confirm(`确定删除「${item.name}」吗？`)) return
  form.inventoryItems = form.inventoryItems.filter((entry) => entry.id !== itemId)
  saveForm()
}

const toggleAttunement = (itemId: string) => {
  syncForm()
  const item = form.inventoryItems.find((entry) => entry.id === itemId)
  if (!item?.requiresAttunement) return
  const currentAttunedCount = form.inventoryItems.filter((entry) => entry.requiresAttunement && entry.attuned).length
  if (!item.attuned && currentAttunedCount >= form.attunementMax) return
  item.attuned = !item.attuned
  saveForm()
}

const canAttune = (itemId: string) => {
  const item = selectedCharacter.value?.inventoryItems.find((entry) => entry.id === itemId)
  if (!item?.requiresAttunement) return false
  return item.attuned || attunedItems.value.length < (selectedCharacter.value?.attunementMax ?? 0)
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

    <section class="item-management-panel">
      <header>
        <h2>物品管理</h2>
      </header>

      <div class="item-section-heading">
        <h3>金币</h3>
      </div>

      <article class="gold-editor-card">
        <div class="gold-icon">GP</div>
        <div>
          <h3>金币</h3>
          <strong>{{ selectedCharacter.gold }} <small>GP</small></strong>
        </div>
        <div class="gold-quick-controls">
          <button type="button" @click="adjustGold(-100)">−100</button>
          <button type="button" @click="adjustGold(-10)">−10</button>
          <el-input-number v-model="form.gold" :min="0" controls-position="right" @change="saveGold" />
          <button type="button" @click="adjustGold(10)">＋10</button>
          <button type="button" @click="adjustGold(100)">＋100</button>
        </div>
      </article>

      <div class="item-section-heading">
        <h3>同调状态</h3>
      </div>

      <article class="attunement-status-card">
        <div class="attunement-icon">◎</div>
        <div>
          <span>已同调</span>
          <strong>{{ attunedItems.length }} / {{ selectedCharacter.attunementMax }}</strong>
        </div>
        <p>可同调的魔法物品最多 {{ selectedCharacter.attunementMax }} 个。</p>
        <label>
          同调上限
          <el-input-number v-model="form.attunementMax" :min="0" controls-position="right" @change="saveAttunementMax" />
        </label>
      </article>

      <div class="item-section-heading">
        <h3>装备</h3>
      </div>

      <div class="item-card-grid">
        <article v-for="item in equipmentItems" :key="item.id" class="inventory-item-card" :class="{ attuned: item.attuned }">
          <div class="item-card-icon">{{ item.name.slice(0, 1) }}</div>
          <div class="item-card-body">
            <h3>{{ item.name }}</h3>
            <strong>{{ item.value }} GP <small>x {{ item.quantity }}</small></strong>
            <p>{{ item.description || '暂无描述。' }}</p>
          </div>
          <footer>
            <span>{{ item.requiresAttunement ? '需要同调' : '无需同调' }}</span>
            <button
              v-if="item.requiresAttunement"
              class="plain-button"
              type="button"
              :disabled="!canAttune(item.id)"
              @click="toggleAttunement(item.id)"
            >
              {{ item.attuned ? '已同调' : '点击同调' }}
            </button>
            <button class="icon-button" type="button" aria-label="编辑物品" @click="openItemDialog('equipment', item.id)">✎</button>
            <button class="icon-button danger-icon-button" type="button" aria-label="删除物品" @click="removeItem(item.id)">×</button>
          </footer>
        </article>

        <button class="add-item-card" type="button" @click="openItemDialog('equipment')">
          <span>＋</span>
          <strong>添加装备</strong>
          <small>添加新的装备</small>
        </button>
      </div>

      <div class="item-section-heading">
        <h3>背包</h3>
      </div>

      <div class="item-card-grid">
        <article v-for="item in backpackItems" :key="item.id" class="inventory-item-card" :class="{ attuned: item.attuned }">
          <div class="item-card-icon">{{ item.name.slice(0, 1) }}</div>
          <div class="item-card-body">
            <h3>{{ item.name }}</h3>
            <strong>{{ item.value }} GP <small>x {{ item.quantity }}</small></strong>
            <p>{{ item.description || '暂无描述。' }}</p>
          </div>
          <footer>
            <span>{{ item.requiresAttunement ? '需要同调' : '无需同调' }}</span>
            <button
              v-if="item.requiresAttunement"
              class="plain-button"
              type="button"
              :disabled="!canAttune(item.id)"
              @click="toggleAttunement(item.id)"
            >
              {{ item.attuned ? '已同调' : '点击同调' }}
            </button>
            <button class="icon-button" type="button" aria-label="编辑物品" @click="openItemDialog('backpack', item.id)">✎</button>
            <button class="icon-button danger-icon-button" type="button" aria-label="删除物品" @click="removeItem(item.id)">×</button>
          </footer>
        </article>

        <button class="add-item-card" type="button" @click="openItemDialog('backpack')">
          <span>＋</span>
          <strong>添加物品</strong>
          <small>添加装备或者背包中的物品</small>
        </button>
      </div>
    </section>

    <Teleport to="body">
      <div v-if="isItemDialogOpen" class="trait-dialog-backdrop" @click.self="closeItemDialog">
        <form class="trait-dialog item-dialog" @submit.prevent="saveItem">
          <header>
            <div>
              <p class="eyebrow">物品</p>
              <h2>{{ itemDialogTitle }}</h2>
            </div>
            <button class="icon-button" type="button" aria-label="关闭物品编辑" @click="closeItemDialog">×</button>
          </header>

          <div class="item-dialog-form">
            <label>
              名称
              <el-input v-model="itemDraft.name" placeholder="例如：防护披风" />
            </label>
            <label>
              价值
              <el-input-number v-model="itemDraft.value" :min="0" controls-position="right" />
            </label>
            <label>
              数量
              <el-input-number v-model="itemDraft.quantity" :min="1" controls-position="right" />
            </label>
            <label>
              所属
              <el-select v-model="itemDraft.location" placeholder="选择位置">
                <el-option label="装备" value="equipment" />
                <el-option label="背包" value="backpack" />
              </el-select>
            </label>
            <label class="checkbox-field item-attunement-field">
              <el-checkbox v-model="itemDraft.requiresAttunement" />
              需要同调
            </label>
            <label class="wide-field">
              描述
              <el-input v-model="itemDraft.description" type="textarea" :rows="5" placeholder="填写物品效果、用途或备注" />
            </label>
          </div>

          <footer>
            <button class="plain-button" type="button" @click="closeItemDialog">取消</button>
            <button class="primary-button" type="submit">保存物品</button>
          </footer>
        </form>
      </div>
    </Teleport>
  </template>
</template>
