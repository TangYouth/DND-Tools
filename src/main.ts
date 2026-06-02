import 'element-plus/theme-chalk/base.css'
import 'element-plus/theme-chalk/el-checkbox.css'
import 'element-plus/theme-chalk/el-icon.css'
import 'element-plus/theme-chalk/el-input.css'
import 'element-plus/theme-chalk/el-input-number.css'
import 'element-plus/theme-chalk/el-option.css'
import 'element-plus/theme-chalk/el-popper.css'
import 'element-plus/theme-chalk/el-scrollbar.css'
import 'element-plus/theme-chalk/el-select.css'
import 'element-plus/theme-chalk/el-tag.css'
import './assets/main.css'

import { createApp } from 'vue'
import { ElCheckbox, ElInput, ElInputNumber, ElOption, ElSelect } from 'element-plus'
import App from './App.vue'
import router from './router'

createApp(App)
  .use(ElCheckbox)
  .use(ElInput)
  .use(ElInputNumber)
  .use(ElOption)
  .use(ElSelect)
  .use(router)
  .mount('#app')
