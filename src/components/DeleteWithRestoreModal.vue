<template>
  <a-modal
    :open="open"
    title="确认删除"
    width="480px"
    :footer="null"
    @cancel="emit('cancel')"
  >
    <p>确定要删除{{ docLabel }} <b>{{ orderNumber }}</b> 吗？</p>
    <p style="color: #8c8c8c">
      删除后会把单据商品数量回退到对应{{ planLabel }}的待办数量，并同步回退关联订单和库存。
    </p>
    <div class="delete-with-restore-actions">
      <a-button @click="emit('cancel')">取消</a-button>
      <a-button type="primary" danger @click="emit('confirm')">删除</a-button>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
defineProps<{
  open: boolean
  orderNumber: string
  docLabel: string
  planLabel: string
}>()

const emit = defineEmits<{
  (e: 'cancel'): void
  (e: 'confirm'): void
}>()
</script>

<style scoped>
.delete-with-restore-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
