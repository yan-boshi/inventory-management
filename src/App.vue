<template>
  <a-config-provider :locale="zhCN" :theme="themeConfig">
    <router-view />
  </a-config-provider>
</template>

<script setup lang="ts">
import { ConfigProvider as AConfigProvider } from 'ant-design-vue'
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'

dayjs.locale('zh-cn')
const themeConfig = {
  token: {
    // 全局 Design Token（影响所有组件）
    colorPrimary: '#1677ff',
    borderRadius: 6,
    fontSize: 14,
  },
  components: {
    // 针对特定组件的 Token
    Table: {
      fontSize: 12,
    },
    Select: {
      fontSize: 12,
    },
  },
}
</script>

<style scoped>
</style>
