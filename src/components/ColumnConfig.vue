<template>
  <div class="column-config-wrapper">
    <a-button @click="visible = !visible">
      <template #icon>
        <SettingOutlined />
      </template>
      列设置
    </a-button>
    <div v-if="visible" class="column-config-panel" @click.stop>
      <div class="column-config-header">
        <a-checkbox
          :checked="isAllChecked"
          :indeterminate="isIndeterminate"
          @change="handleCheckAll"
        >
          全选
        </a-checkbox>
      </div>
      <a-divider style="margin: 8px 0" />
      <div class="column-config-list">
        <div
          v-for="(col, index) in localColumns"
          :key="col.key || col.dataIndex"
          class="column-config-item"
          :class="{ 'drag-over': dragOverIndex === index }"
          draggable="true"
          @dragstart="handleDragStart($event, index)"
          @dragover.prevent="handleDragOver($event, index)"
          @dragenter.prevent="handleDragEnter(index)"
          @dragleave="handleDragLeave"
          @drop="handleDrop($event, index)"
          @dragend="handleDragEnd"
        >
          <span class="drag-handle">⠿</span>
          <a-checkbox
            :checked="col.visible !== false"
            @change="(e: any) => handleColumnVisibleChange(index, e.target.checked)"
          >
            {{ col.title }}
          </a-checkbox>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { SettingOutlined } from '@ant-design/icons-vue'

interface ColumnConfig {
  title: string
  key?: string
  dataIndex?: string
  visible?: boolean
  [key: string]: any
}

const props = defineProps<{
  columns: ColumnConfig[]
}>()

const emit = defineEmits<{
  (e: 'update:columns', columns: ColumnConfig[]): void
}>()

const visible = ref(false)
const localColumns = ref<ColumnConfig[]>([])
const dragIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

// 监听 props 变化
watch(
  () => props.columns,
  (newColumns) => {
    localColumns.value = newColumns.map(col => ({
      ...col,
      visible: col.visible !== false
    }))
  },
  { immediate: true, deep: true }
)

// 点击外部关闭面板
const handleClickOutside = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (!target.closest('.column-config-wrapper')) {
    visible.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// 计算属性
const isAllChecked = computed(() => {
  return localColumns.value.every(col => col.visible !== false)
})

const isIndeterminate = computed(() => {
  const visibleCount = localColumns.value.filter(col => col.visible !== false).length
  return visibleCount > 0 && visibleCount < localColumns.value.length
})

// 全选/取消全选
const handleCheckAll = (e: any) => {
  const checked = e.target.checked
  localColumns.value.forEach(col => {
    col.visible = checked
  })
  emitUpdate()
}

// 列显示/隐藏变化
const handleColumnVisibleChange = (index: number, checked: boolean) => {
  localColumns.value[index].visible = checked
  emitUpdate()
}

// 拖拽相关
const handleDragStart = (e: DragEvent, index: number) => {
  dragIndex.value = index
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', index.toString())
  }
}

const handleDragOver = (e: DragEvent, index: number) => {
  e.preventDefault()
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move'
  }
}

const handleDragEnter = (index: number) => {
  if (dragIndex.value !== null && dragIndex.value !== index) {
    dragOverIndex.value = index
  }
}

const handleDragLeave = () => {
  dragOverIndex.value = null
}

const handleDrop = (e: DragEvent, toIndex: number) => {
  e.preventDefault()
  dragOverIndex.value = null

  if (dragIndex.value === null || dragIndex.value === toIndex) return

  const fromIndex = dragIndex.value
  const [removed] = localColumns.value.splice(fromIndex, 1)
  localColumns.value.splice(toIndex, 0, removed)

  emitUpdate()
}

const handleDragEnd = () => {
  dragIndex.value = null
  dragOverIndex.value = null
}

// 发送更新
const emitUpdate = () => {
  emit('update:columns', [...localColumns.value])
}
</script>

<style scoped lang="scss">
.column-config-wrapper {
  position: relative;
  display: inline-block;
}

.column-config-panel {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 1050;
  width: 220px;
}

.column-config-header {
  padding: 8px 12px 4px;
}

.column-config-list {
  max-height: 300px;
  overflow-y: auto;
  padding: 4px 0;
}

.column-config-item {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  cursor: move;
  transition: all 0.2s;
  user-select: none;

  &:hover {
    background-color: #f5f5f5;
  }

  &.drag-over {
    border-top: 2px solid #1890ff;
  }

  .drag-handle {
    margin-right: 8px;
    color: #999;
    cursor: move;
    font-size: 16px;
  }
}
</style>
