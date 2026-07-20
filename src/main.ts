import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Antd from 'ant-design-vue'
import App from './App.vue'
import router from './router'
import { scrollTopbar } from './directives/scrollTopbar'
import { initGlobalScrollbarTop } from './utils/scrollTopbar'

import 'ant-design-vue/dist/reset.css'
import './assets/styles/main.scss'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(Antd)

// 注册全局指令
app.directive('scroll-topbar', scrollTopbar)

// 初始化全局滚动条置顶
initGlobalScrollbarTop()

app.mount('#app')
