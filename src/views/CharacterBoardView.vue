<script setup lang="ts">
import { useCharacters } from '../composables/useCharacters'

const {
  characters,
  selectedCharacter,
  form,
  isEditing,
  importInput,
  hpPercent,
  metricCards,
  proficiencyRows,
  syncForm,
  modifier,
  signed,
  saveForm,
  deleteCharacter,
  exportJson,
  importJson,
} = useCharacters()
</script>

<template>
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
    <el-input v-model="form.name" />
  </label>
  <label>
    种族
    <el-input v-model="form.race" />
  </label>
  <label>
    职业
    <el-input v-model="form.className" />
  </label>
  <label>
    等级
    <el-input-number v-model="form.level" :min="1" controls-position="right" />
  </label>
  <label>
    背景
    <el-input v-model="form.background" />
  </label>
  <label>
    阵营
    <el-input v-model="form.alignment" />
  </label>
  <label>
    HP 当前
    <el-input-number v-model="form.hp.current" :min="0" controls-position="right" />
  </label>
  <label>
    HP 最大
    <el-input-number v-model="form.hp.max" :min="1" controls-position="right" />
  </label>
  <label>
    AC
    <el-input-number v-model="form.ac" controls-position="right" />
  </label>
  <label>
    先攻
    <el-input-number v-model="form.initiative" controls-position="right" />
  </label>
  <label>
    速度
    <el-input-number v-model="form.speed" controls-position="right" />
  </label>
  <label>
    熟练加值
    <el-input-number v-model="form.proficiency" controls-position="right" />
  </label>
  <label>
    被动察觉
    <el-input-number v-model="form.passivePerception" controls-position="right" />
  </label>
  <label>
    攻击加值
    <el-input-number v-model="form.attackBonus" controls-position="right" />
  </label>
  <label>
    法术豁免 DC
    <el-input-number v-model="form.spellSaveDc" controls-position="right" />
  </label>
</div>

<label class="wide-field">
  背景故事
  <el-input v-model="form.story" type="textarea" :rows="5" />
</label>

<div class="ability-editor">
  <div v-for="ability in form.abilities" :key="ability.key" class="ability-edit-row">
    <strong>{{ ability.label }}</strong>
    <label>
      属性
      <el-input-number v-model="ability.score" controls-position="right" />
    </label>
    <label>
      豁免
      <el-input-number v-model="ability.save" controls-position="right" />
    </label>
    <label class="checkbox-field">
      <el-checkbox v-model="ability.proficient" />
      豁免熟练
    </label>
  </div>
</div>

<label class="wide-field">
  冒险备注
  <el-input v-model="form.notes" type="textarea" :rows="3" />
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
</template>
