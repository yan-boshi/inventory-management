import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { scrollTopbar } from './directives/scrollTopbar'

import 'ant-design-vue/dist/reset.css'
import './assets/styles/main.scss'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// 注册全局指令（表格顶部横向滚动条，唯一机制；
// 原 utils/scrollTopbar.ts 的全局扫描版会与指令重复插条导致双滚动条，已移除）
app.directive('scroll-topbar', scrollTopbar)

app.mount('#app')
