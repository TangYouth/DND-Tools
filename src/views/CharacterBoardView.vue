<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useCharacters } from '../composables/useCharacters'
import acIcon from '../components/icons/AC.png'
import hpIcon from '../components/icons/HP.png'
import passivePerceptionIcon from '../components/icons/beidongchajue.png'
import charismaIcon from '../components/icons/meili.png'
import constitutionIcon from '../components/icons/tizhi.png'
import dexterityIcon from '../components/icons/minjie.png'
import initiativeIcon from '../components/icons/xiangong.png'
import intelligenceIcon from '../components/icons/zhili.png'
import proficiencyIcon from '../components/icons/shulianjiazhi.png'
import speedIcon from '../components/icons/sudu.png'
import spellSaveIcon from '../components/icons/fashuhuomian.png'
import attackBonusIcon from '../components/icons/gongjijiazhi.png'
import strengthIcon from '../components/icons/liliang.png'
import wisdomIcon from '../components/icons/ganzhi.png'

type EditSection = 'profile' | 'core' | 'abilities' | 'proficiencies'

const {
  characters,
  selectedCharacter,
  form,
  characterCreationConfig,
  skillDefinitions,
  hpPercent,
  metricCards,
  proficiencyRows,
  syncForm,
  modifier,
  signed,
  saveForm,
  deleteCharacter,
  calculateProficiencyBonus,
  getClassTotalLevel,
  getCharacterClassSummary,
  createClassEntry,
  exportSelectedCharacter,
} = useCharacters()

const activeEditSection = ref<EditSection | ''>('')
const isHpQuickEditOpen = ref(false)
const hpDamageAmount = ref(0)
const hpHealAmount = ref(0)
const hpTemporaryAmount = ref(0)
const alignmentOptions = computed(() => characterCreationConfig.alignments.flat())
const classSummary = computed(() => getCharacterClassSummary(selectedCharacter.value))
const draftTotalLevel = computed(() => getClassTotalLevel(form.classes))
const metricIconMap: Record<string, string> = {
  HP: hpIcon,
  AC: acIcon,
  先攻: initiativeIcon,
  速度: speedIcon,
  熟练加值: proficiencyIcon,
  被动察觉: passivePerceptionIcon,
  攻击加值: attackBonusIcon,
  法术豁免: spellSaveIcon,
}
const abilityIconMap: Record<string, string> = {
  str: strengthIcon,
  dex: dexterityIcon,
  con: constitutionIcon,
  int: intelligenceIcon,
  wis: wisdomIcon,
  cha: charismaIcon,
}

const getMetricIcon = (label: string) => metricIconMap[label]
const getAbilityIcon = (key: string) => abilityIconMap[key]

const openEditSection = (section: EditSection) => {
  syncForm()
  activeEditSection.value = section
  isHpQuickEditOpen.value = false
}

const closeEditSection = () => {
  syncForm()
  activeEditSection.value = ''
}

const saveSection = () => {
  saveForm()
  activeEditSection.value = ''
}

const syncDraftLevelFromClasses = () => {
  form.level = getClassTotalLevel(form.classes)
  form.proficiency = calculateProficiencyBonus(form.level)
  form.className = form.classes[0]?.className || form.className
}

const deleteCurrentCharacter = () => {
  if (!selectedCharacter.value) return
  if (!window.confirm(`确定删除角色「${selectedCharacter.value.name}」吗？`)) return
  deleteCharacter()
  activeEditSection.value = ''
}

const updateProficiencyFromLevel = (value: number | null) => {
  const nextLevel = Math.max(1, Number(value) || 1)
  form.level = nextLevel
  form.proficiency = calculateProficiencyBonus(nextLevel)
}

const addDraftClass = () => {
  form.classes.push(createClassEntry('', 1))
  syncDraftLevelFromClasses()
}

const removeDraftClass = (classId: string) => {
  if (form.classes.length <= 1) return
  form.classes = form.classes.filter((entry) => entry.id !== classId)
  syncDraftLevelFromClasses()
}

const saveClassChange = () => {
  syncDraftLevelFromClasses()
}

const toggleHpQuickEdit = () => {
  syncForm()
  isHpQuickEditOpen.value = !isHpQuickEditOpen.value
  activeEditSection.value = ''
  hpDamageAmount.value = 0
  hpHealAmount.value = 0
  hpTemporaryAmount.value = form.hp.temporary ?? 0
}

const closeHpQuickEdit = () => {
  syncForm()
  isHpQuickEditOpen.value = false
}

const applyHpDamage = () => {
  const damage = Math.max(0, Number(hpDamageAmount.value) || 0)
  const absorbedByTemporary = Math.min(form.hp.temporary ?? 0, damage)
  form.hp.temporary = Math.max(0, (form.hp.temporary ?? 0) - absorbedByTemporary)
  form.hp.current = Math.max(0, form.hp.current - (damage - absorbedByTemporary))
  hpDamageAmount.value = 0
  saveForm()
  isHpQuickEditOpen.value = false
}

const applyHpHeal = () => {
  const healing = Math.max(0, Number(hpHealAmount.value) || 0)
  form.hp.current = Math.min(form.hp.max, form.hp.current + healing)
  hpHealAmount.value = 0
  saveForm()
  isHpQuickEditOpen.value = false
}

const saveTemporaryHp = () => {
  form.hp.temporary = Math.max(0, Number(hpTemporaryAmount.value) || 0)
  saveForm()
  isHpQuickEditOpen.value = false
}

const getDraftAbilityModifier = (score: number) => modifier(score)

const getDraftSaveValue = (ability: (typeof form.abilities)[number]) => {
  return getDraftAbilityModifier(ability.score) + (ability.proficient ? form.proficiency : 0)
}

const getDraftSkillValue = (ability: (typeof form.abilities)[number], skill: (typeof ability.skills)[number]) => {
  const skillDefinition = skillDefinitions.find((item) => item.name === skill.name)
  const sourceAbility = skillDefinition ? form.abilities.find((item) => item.key === skillDefinition.abilityKey) : ability
  const proficiencyMultiplier = skill.expertise ? 2 : skill.proficient ? 1 : 0
  return getDraftAbilityModifier(sourceAbility?.score ?? ability.score) + form.proficiency * proficiencyMultiplier
}

const setDraftSkillProficiency = (skill: (typeof form.abilities)[number]['skills'][number], checked: boolean) => {
  skill.proficient = checked || undefined
  if (!checked) skill.expertise = undefined
}

const setDraftSkillExpertise = (skill: (typeof form.abilities)[number]['skills'][number], checked: boolean) => {
  skill.expertise = checked || undefined
  if (checked) skill.proficient = true
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
    </nav>

    <section class="board-grid">
      <article class="panel profile-panel">
        <div class="section-title">
          <h2>基本信息</h2>
          <button class="icon-button" type="button" aria-label="编辑基本信息" @click="openEditSection('profile')">✎</button>
        </div>

        <div class="name-block">
          <h3>{{ selectedCharacter.name }}</h3>
        </div>

        <dl class="info-grid">
          <div>
            <dt>种族</dt>
            <dd>{{ selectedCharacter.race }}</dd>
          </div>
          <div>
            <dt>性别</dt>
            <dd>{{ selectedCharacter.gender || '未说明' }}</dd>
          </div>
          <div>
            <dt>职业</dt>
            <dd>{{ classSummary }}</dd>
          </div>
          <div>
            <dt>总等级</dt>
            <dd>Lv.{{ selectedCharacter.level }}</dd>
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
          <p class="story-text" :title="selectedCharacter.story || '暂无背景故事。'">{{ selectedCharacter.story || '暂无背景故事。' }}</p>
        </div>

        <form v-if="activeEditSection === 'profile'" class="card-edit-panel" @submit.prevent="saveSection">
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
              性别
              <el-select v-model="form.gender" placeholder="选择性别">
                <el-option v-for="gender in characterCreationConfig.genders" :key="gender" :label="gender" :value="gender" />
              </el-select>
            </label>
            <label>
              背景
              <el-input v-model="form.background" />
            </label>
            <label>
              体型
              <el-input v-model="form.size" />
            </label>
            <label>
              阵营
              <el-select v-model="form.alignment" placeholder="选择阵营">
                <el-option v-for="alignment in alignmentOptions" :key="alignment" :label="alignment" :value="alignment" />
              </el-select>
            </label>
          </div>
          <div class="class-editor">
            <header>
              <strong>职业与等级</strong>
              <span>总等级 Lv.{{ draftTotalLevel }} · 熟练加值 {{ signed(calculateProficiencyBonus(draftTotalLevel)) }}</span>
              <button class="plain-button" type="button" @click="addDraftClass">添加职业</button>
            </header>
            <div v-for="classEntry in form.classes" :key="classEntry.id" class="class-edit-row">
              <label>
                职业
                <el-input v-model="classEntry.className" placeholder="例如：战士" @change="saveClassChange" />
              </label>
              <label>
                等级
                <el-input-number v-model="classEntry.level" :min="1" :max="20" controls-position="right" @change="saveClassChange" />
              </label>
              <label>
                子职业
                <el-input v-model="classEntry.subclass" placeholder="例如：战斗大师" />
              </label>
              <button class="plain-button" type="button" :disabled="form.classes.length <= 1" @click="removeDraftClass(classEntry.id)">
                移除
              </button>
            </div>
          </div>
          <label class="wide-field">
            背景故事
            <el-input v-model="form.story" type="textarea" :rows="5" />
          </label>
          <footer class="card-edit-actions">
            <button class="plain-button" type="button" @click="closeEditSection">取消</button>
            <button class="primary-button" type="submit">保存基本信息</button>
          </footer>
        </form>
      </article>

      <article class="panel">
        <div class="section-title">
          <h2>核心数据</h2>
          <button class="icon-button" type="button" aria-label="编辑核心数据" @click="openEditSection('core')">✎</button>
        </div>

        <div class="metric-grid">
          <button
            v-for="metric in metricCards"
            :key="metric.label"
            class="metric-card"
            :class="[metric.tone, { interactive: metric.label === 'HP' }]"
            type="button"
            :title="metric.label === 'HP' ? '点击快速调整 HP' : undefined"
            @click="metric.label === 'HP' && toggleHpQuickEdit()"
          >
            <span class="metric-label">
              <img v-if="getMetricIcon(metric.label)" :src="getMetricIcon(metric.label)" alt="" />
              {{ metric.label }}
            </span>
            <strong>{{ metric.value }}</strong>
            <small v-if="metric.label === 'HP'" class="metric-action-hint"></small>
            <i v-if="metric.label === 'HP'" :style="{ width: `${hpPercent}%` }"></i>
          </button>
        </div>

        <form v-if="activeEditSection === 'core'" class="card-edit-panel" @submit.prevent="saveSection">
          <div class="form-grid">
            <label>
              HP 当前
              <el-input-number v-model="form.hp.current" :min="0" controls-position="right" />
            </label>
            <label>
              HP 最大
              <el-input-number v-model="form.hp.max" :min="1" controls-position="right" />
            </label>
            <label>
              临时生命值
              <el-input-number v-model="form.hp.temporary" :min="0" controls-position="right" />
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
          <footer class="card-edit-actions">
            <button class="plain-button" type="button" @click="closeEditSection">取消</button>
            <button class="primary-button" type="submit">保存核心数据</button>
          </footer>
        </form>
      </article>
    </section>

    <Teleport to="body">
      <div v-if="isHpQuickEditOpen" class="hp-dialog-backdrop" @click.self="closeHpQuickEdit">
        <section class="hp-dialog" role="dialog" aria-modal="true" aria-labelledby="hp-dialog-title">
          <header>
            <div>
              <p class="eyebrow">核心数据</p>
              <h2 id="hp-dialog-title">快速调整 HP</h2>
            </div>
            <button class="icon-button" type="button" aria-label="关闭 HP 弹窗" @click="closeHpQuickEdit">×</button>
          </header>

          <div class="hp-dialog-body">
            <div class="hp-dialog-summary">
              <div>
                <span>当前生命值</span>
                <strong>{{ form.hp.current }} / {{ form.hp.max }}</strong>
              </div>
              <div>
                <span>临时生命值</span>
                <strong>{{ form.hp.temporary || 0 }}</strong>
              </div>
            </div>

            <section class="hp-dialog-actions">
              <div class="hp-action-block">
                <h3>受到伤害</h3>
                <p>会优先扣除临时生命值，再扣除当前生命值。</p>
                <label>
                  伤害数值
                  <el-input-number v-model="hpDamageAmount" :min="0" controls-position="right" />
                </label>
                <button class="danger-button" type="button" @click="applyHpDamage">扣除伤害</button>
              </div>

              <div class="hp-action-block">
                <h3>恢复生命</h3>
                <p>恢复不会超过最大生命值。</p>
                <label>
                  恢复数值
                  <el-input-number v-model="hpHealAmount" :min="0" controls-position="right" />
                </label>
                <button class="plain-button" type="button" @click="applyHpHeal">恢复 HP</button>
              </div>

              <div class="hp-action-block">
                <h3>临时生命值</h3>
                <p>设置新的临时生命值，用于承受后续伤害。</p>
                <label>
                  临时生命值
                  <el-input-number v-model="hpTemporaryAmount" :min="0" controls-position="right" />
                </label>
                <button class="primary-button" type="button" @click="saveTemporaryHp">保存临时 HP</button>
              </div>
            </section>
          </div>
        </section>
      </div>
    </Teleport>

    <section class="panel">
      <div class="section-title">
        <h2>属性 · 技能 · 豁免</h2>
        <button class="icon-button" type="button" aria-label="编辑属性" @click="openEditSection('abilities')">✎</button>
      </div>

      <div class="ability-grid">
        <article v-for="ability in selectedCharacter.abilities" :key="ability.key" class="ability-card" :class="ability.key">
          <header>
            <span class="ability-label">
              <img :src="getAbilityIcon(ability.key)" alt="" />
              {{ ability.label }}
            </span>
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
              <i v-if="skill.expertise">专精</i>
              <i v-else-if="skill.proficient">熟练</i>
            </span>
          </div>
        </article>
      </div>

      <form v-if="activeEditSection === 'abilities'" class="card-edit-panel" @submit.prevent="saveSection">
        <div class="ability-compact-editor">
          <article v-for="ability in form.abilities" :key="ability.key" class="ability-compact-card">
            <header>
              <strong>{{ ability.label }}</strong>
              <span>{{ signed(getDraftAbilityModifier(ability.score)) }}</span>
            </header>
            <div class="ability-compact-controls">
              <label>
                属性
                <el-input-number v-model="ability.score" controls-position="right" />
              </label>
              <label class="checkbox-field">
                <el-checkbox v-model="ability.proficient" />
                豁免熟练
              </label>
              <span>豁免 {{ signed(getDraftSaveValue(ability)) }}</span>
            </div>
            <div v-if="ability.skills.length > 0" class="skill-compact-list">
              <div v-for="skill in ability.skills" :key="skill.name" class="skill-compact-row">
                <span>{{ skill.name }}</span>
                <strong>{{ signed(getDraftSkillValue(ability, skill)) }}</strong>
                <el-checkbox
                  :model-value="Boolean(skill.proficient)"
                  @change="setDraftSkillProficiency(skill, Boolean($event))"
                >
                  熟练
                </el-checkbox>
                <el-checkbox
                  :model-value="Boolean(skill.expertise)"
                  @change="setDraftSkillExpertise(skill, Boolean($event))"
                >
                  专精
                </el-checkbox>
              </div>
            </div>
            <div v-else class="skill-compact-empty">暂无关联技能</div>
          </article>
        </div>
        <footer class="card-edit-actions">
          <button class="plain-button" type="button" @click="closeEditSection">取消</button>
          <button class="primary-button" type="submit">保存属性技能</button>
        </footer>
      </form>
    </section>

    <section class="panel proficiency-panel">
      <div class="section-title">
        <h2>熟练项</h2>
        <button class="icon-button" type="button" aria-label="编辑熟练项" @click="openEditSection('proficiencies')">✎</button>
      </div>

      <div class="proficiency-grid">
        <div v-for="[label, value] in proficiencyRows" :key="label">
          <h3>{{ label }}</h3>
          <p>{{ value || '未填写' }}</p>
        </div>
      </div>

      <form v-if="activeEditSection === 'proficiencies'" class="card-edit-panel" @submit.prevent="saveSection">
        <div class="proficiency-edit-grid">
          <label>
            武器熟练项
            <el-input v-model="form.proficiencies.weapons" type="textarea" :rows="3" />
          </label>
          <label>
            护甲熟练项
            <el-input v-model="form.proficiencies.armor" type="textarea" :rows="3" />
          </label>
          <label>
            工具熟练项
            <el-input v-model="form.proficiencies.tools" type="textarea" :rows="3" />
          </label>
          <label>
            语言
            <el-input v-model="form.proficiencies.languages" type="textarea" :rows="3" />
          </label>
          <label>
            其他熟练项
            <el-input v-model="form.proficiencies.other" type="textarea" :rows="3" />
          </label>
        </div>
        <footer class="card-edit-actions">
          <button class="plain-button" type="button" @click="closeEditSection">取消</button>
          <button class="primary-button" type="submit">保存熟练项</button>
        </footer>
      </form>
    </section>

  </template>
</template>
