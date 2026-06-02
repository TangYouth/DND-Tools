<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCharacters } from '../composables/useCharacters'
import backgroundIcon from '../components/icons/beijing.png'
import storyIcon from '../components/icons/beijinggushi.png'
import levelIcon from '../components/icons/dengji.png'
import basicInfoIcon from '../components/icons/jibenxinxi.png'
import characterIcon from '../components/icons/juese.png'
import sizeIcon from '../components/icons/tixing.png'
import alignmentIcon from '../components/icons/zhenying.png'
import classIcon from '../components/icons/zhiye.png'
import speciesIcon from '../components/icons/zhongzu.png'

const router = useRouter()
const {
  CUSTOM_OPTION,
  abilityDefinitions,
  characterCreationConfig,
  creationStep,
  creationDraft,
  abilityRolls,
  currentCreationStep,
  storyLength,
  previewRows,
  sortedRolls,
  usedRollIds,
  abilityPreview,
  assignedRollCount,
  isAbilityStepValid,
  isBasicStepValid,
  signed,
  modifier,
  rollAbilityScores,
  isRollOptionUsed,
  assignRollToAbility,
  goNextCreationStep,
  goPreviousCreationStep,
  resetCreationDraft,
  finishCreation,
} = useCharacters()

onMounted(() => {
  resetCreationDraft()
  creationStep.value = 0
})

const backToBoard = () => {
  router.push({ name: 'characters' })
}

const completeCreation = () => {
  finishCreation()
  router.push({ name: 'characters' })
}

const previewIconMap: Record<string, string> = {
  姓名: characterIcon,
  种族: speciesIcon,
  职业: classIcon,
  等级: levelIcon,
  阵营: alignmentIcon,
  背景: backgroundIcon,
  体型: sizeIcon,
  背景故事: storyIcon,
}

const getPreviewIcon = (label: string | undefined) => (label ? previewIconMap[label] : undefined)
</script>

<template>
  <section class="creation-workspace">
    <header class="creation-header">
      <div>
        <p class="eyebrow">创建角色</p>
        <h1>创建角色</h1>
      </div>
      <button class="plain-button" type="button" @click="backToBoard">返回看板</button>
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
            <span class="title-icon-wrap"><img :src="basicInfoIcon" alt="" /></span>
            <h2>基本信息</h2>
          </div>

          <div class="creation-form">
            <label class="required-field">
              <span class="field-label">姓名 <em>*</em></span>
              <el-input v-model="creationDraft.name" maxlength="40" placeholder="输入角色姓名" show-word-limit />
            </label>

            <label class="required-field">
              <span class="field-label">种族<em>*</em></span>
              <el-select v-model="creationDraft.species" placeholder="选择种族">
                <el-option label="自定义" :value="CUSTOM_OPTION" />
                <el-option v-for="species in characterCreationConfig.species" :key="species" :label="species" :value="species">
                  {{ species }}
                </el-option>
              </el-select>
            </label>
            <label v-if="creationDraft.species === CUSTOM_OPTION" class="custom-field">
              自定义
              <el-input v-model="creationDraft.customSpecies" placeholder="例如：半精灵" />
            </label>

            <label class="required-field">
              <span class="field-label">职业 <em>*</em></span>
              <el-select v-model="creationDraft.className" placeholder="选择职业">
                <el-option label="自定义" :value="CUSTOM_OPTION" />
                <el-option v-for="className in characterCreationConfig.classes" :key="className" :label="className" :value="className">
                  {{ className }}
                </el-option>
              </el-select>
            </label>
            <label v-if="creationDraft.className === CUSTOM_OPTION" class="custom-field">
              自定义职业
              <el-input v-model="creationDraft.customClassName" placeholder="输入职业名称" />
            </label>

            <label class="compact-field required-field">
              <span class="field-label">等级 <em>*</em></span>
              <el-input-number v-model="creationDraft.level" :min="1" :max="20" controls-position="right" />
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
              <el-select v-model="creationDraft.background" placeholder="选择背景">
                <el-option label="自定义" :value="CUSTOM_OPTION" />
                <el-option
                  v-for="background in characterCreationConfig.backgrounds"
                  :key="background"
                  :label="background"
                  :value="background"
                />
              </el-select>
            </label>
            <label v-if="creationDraft.background === CUSTOM_OPTION" class="custom-field">
              自定义背景
              <el-input v-model="creationDraft.customBackground" placeholder="输入背景名称" />
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
              <el-input v-model="creationDraft.customSize" placeholder="输入体型" />
            </label>

            <label class="story-field">
              背景故事
              <el-input
                v-model="creationDraft.story"
                type="textarea"
                maxlength="1000"
                :rows="7"
                placeholder="可先简单填写，后续可在角色卡中继续完善"
              />
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
              <strong>
                <img v-if="getPreviewIcon(label)" :src="getPreviewIcon(label)" alt="" />
                {{ label }}
              </strong>
              <span>{{ value }}</span>
            </div>
          </div>
        </aside>
      </div>

      <footer class="creation-footer">
        <button class="plain-button" type="button" @click="backToBoard">取消</button>
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
                <el-input-number
                  v-if="creationDraft.abilityMode === 'manual'"
                  v-model="creationDraft.abilityScores[ability.key]"
                  :min="1"
                  :max="30"
                  controls-position="right"
                />
                <el-select
                  v-else
                  v-model="creationDraft.abilityAssignments[ability.key]"
                  placeholder="选择数值"
                  :disabled="abilityRolls.length === 0"
                  @change="assignRollToAbility(ability.key, $event)"
                >
                  <el-option label="选择数值" value="" />
                  <el-option
                    v-for="roll in sortedRolls"
                    :key="roll.id"
                    :label="String(roll.total)"
                    :value="roll.id"
                    :disabled="isRollOptionUsed(roll.id, ability.key)"
                  />
                </el-select>
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
        <button v-else class="primary-button large-action" type="button" @click="completeCreation">
          完成并创建角色
        </button>
      </footer>
    </section>
  </section>


</template>
