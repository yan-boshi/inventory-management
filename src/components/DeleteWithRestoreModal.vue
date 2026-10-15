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
      选择「删除并回退数量」会把单据商品数量加回对应{{ planLabel }}的待办数量。
    </p>
    <div class="delete-with-restore-actions">
      <a-button @click="emit('cancel')">取消</a-button>
      <a-button danger @click="emit('delete')">直接删除</a-button>
      <a-button type="primary" danger @click="emit('deleteWithRestore')">删除并回退数量</a-button>
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
  (e: 'delete'): void
  (e: 'deleteWithRestore'): void
}>()
</script>

<style scoped>
.delete-with-restore-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
