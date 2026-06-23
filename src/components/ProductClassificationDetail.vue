<template>
  <div class="classification-detail">
    <!-- 搜索栏 -->
    <div class="search-bar">
      <a-input-search
        v-model:value="searchKeyword"
        placeholder="搜索分类名称"
        style="width: 300px"
        allow-clear
        @search="onSearch"
      />
    </div>

    <!-- 一级分类操作栏 -->
    <div class="action-bar">
      <a-button type="primary" size="small" @click="showAddLevel1">
        <template #icon><PlusOutlined /></template>
        新增一级分类
      </a-button>
    </div>

    <!-- 分类树 -->
    <div class="tree-container" v-if="treeData && Object.keys(treeData).length > 0">
      <a-collapse v-model:activeKey="activeLevel1Keys" accordion>
        <template v-for="(level2, level1Name) in treeData" :key="level1Name">
          <a-collapse-panel :key="level1Name" v-if="isLevel1Visible(level1Name)">
            <template #header>
              <div class="level-header">
                <span class="level-name" v-html="highlightText(level1Name)"></span>
                <span class="level-count">({{ Object.keys(level2 || {}).length }}个二级分类)</span>
              </div>
            </template>
            <template #extra>
              <div class="level-actions" @click.stop>
                <a-tooltip title="新增二级分类">
                  <a-button type="link" size="small" @click.stop="showAddLevel2(level1Name)">
                    <template #icon><PlusOutlined /></template>
                  </a-button>
                </a-tooltip>
                <a-tooltip title="编辑">
                  <a-button type="link" size="small" @click.stop="showEditLevel1(level1Name)">
                    <template #icon><EditOutlined /></template>
                  </a-button>
                </a-tooltip>
                <a-tooltip title="删除">
                  <a-button type="link" size="small" danger @click.stop="confirmDeleteLevel1(level1Name)">
                    <template #icon><DeleteOutlined /></template>
                  </a-button>
                </a-tooltip>
              </div>
            </template>

            <!-- 二级分类 -->
            <div class="level2-list">
              <template v-for="(val, level2Name) in level2" :key="`${level1Name}/${level2Name}`">
                <div class="level2-item" v-if="isLevel2Visible(level1Name, level2Name)">
                  <span class="level2-name" v-html="highlightText(level2Name)"></span>
                  <div class="level2-actions">
                    <a-tooltip title="编辑">
                      <a-button type="link" size="small" @click="showEditLevel2(level1Name, level2Name)">
                        <template #icon><EditOutlined /></template>
                      </a-button>
                    </a-tooltip>
                    <a-tooltip title="删除">
                      <a-button type="link" size="small" danger @click="confirmDeleteLevel2(level1Name, level2Name)">
                        <template #icon><DeleteOutlined /></template>
                      </a-button>
                    </a-tooltip>
                  </div>
                </div>
              </template>
              <a-empty
                v-if="Object.keys(level2 || {}).length === 0"
                :image="simpleImage"
                description="暂无二级分类"
                :style="{ fontSize: '12px' }"
              />
            </div>
          </a-collapse-panel>
        </template>
      </a-collapse>
    </div>

    <a-empty
      v-else
      description="暂无分类数据，请点击上方按钮新增一级分类"
    />

    <!-- 新增/编辑弹窗 -->
    <a-modal
      v-model:visible="modalVisible"
      :title="modalTitle"
      @ok="handleModalOk"
      @cancel="modalVisible = false"
      :okText="modalMode === 'add' ? '添加' : '保存'"
      :confirmLoading="modalLoading"
      width="400px"
    >
      <a-form layout="vertical">
        <a-form-item label="分类名称" required>
          <a-input
            v-model:value="modalForm.name"
            :placeholder="modalPlaceholder"
            @pressEnter="handleModalOk"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { message, Modal, Empty } from 'ant-design-vue'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import { productClassificationApi } from '@/api/productClassification'
import type { ProductClassification, ClassificationTree } from '@/types'

const props = defineProps<{
  classification: ProductClassification
}>()

const emit = defineEmits<{
  refresh: []
}>()

const simpleImage = Empty.PRESENTED_IMAGE_SIMPLE

const searchKeyword = ref('')
const activeLevel1Keys = ref<string[]>([])

// 树形数据
const treeData = computed(() => {
  if (!props.classification?.classification_data) return {}
  const data = props.classification.classification_data
  if (typeof data === 'string') {
    try {
      return JSON.parse(data) as ClassificationTree
    } catch {
      return {}
    }
  }
  return data
})

// 默认展开所有一级分类
watch(treeData, (tree) => {
  activeLevel1Keys.value = Object.keys(tree)
}, { immediate: true })

// 弹窗相关
const modalVisible = ref(false)
const modalMode = ref<'add' | 'edit'>('add')
const modalLevel = ref<1 | 2>(1)
const modalLoading = ref(false)
const modalForm = ref({ name: '' })

// 操作上下文
const contextLevel1 = ref('')
const contextOldName = ref('')

const modalTitle = computed(() => {
  const modeText = modalMode.value === 'add' ? '新增' : '编辑'
  if (modalLevel.value === 1) return `${modeText}一级分类`
  return `${modeText}二级分类`
})

const modalPlaceholder = computed(() => {
  if (modalLevel.value === 1) return '请输入一级分类名称'
  return '请输入二级分类名称'
})

// 搜索过滤
const isLevel1Visible = (name: string) => {
  if (!searchKeyword.value) return true
  const keyword = searchKeyword.value.toLowerCase()
  if (name.toLowerCase().includes(keyword)) return true
  const level2 = treeData.value[name] || {}
  for (const l2Name of Object.keys(level2)) {
    if (l2Name.toLowerCase().includes(keyword)) return true
  }
  return false
}

const isLevel2Visible = (_level1Name: string, level2Name: string) => {
  if (!searchKeyword.value) return true
  return level2Name.toLowerCase().includes(searchKeyword.value.toLowerCase())
}

const highlightText = (text: string) => {
  if (!searchKeyword.value) return text
  const keyword = searchKeyword.value
  const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return text.replace(regex, '<span style="color: #1890ff; font-weight: bold;">$1</span>')
}

const onSearch = () => {
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    const newLevel1Keys: string[] = []
    for (const l1Name of Object.keys(treeData.value)) {
      if (l1Name.toLowerCase().includes(keyword)) {
        newLevel1Keys.push(l1Name)
      }
      const level2 = treeData.value[l1Name] || {}
      for (const l2Name of Object.keys(level2)) {
        if (l2Name.toLowerCase().includes(keyword)) {
          newLevel1Keys.push(l1Name)
        }
      }
    }
    activeLevel1Keys.value = [...new Set(newLevel1Keys)]
  }
}

// ==================== 新增操作 ====================

const showAddLevel1 = () => {
  modalMode.value = 'add'
  modalLevel.value = 1
  modalForm.value.name = ''
  modalVisible.value = true
}

const showAddLevel2 = (level1Name: string) => {
  modalMode.value = 'add'
  modalLevel.value = 2
  contextLevel1.value = level1Name
  modalForm.value.name = ''
  modalVisible.value = true
}

// ==================== 编辑操作 ====================

const showEditLevel1 = (name: string) => {
  modalMode.value = 'edit'
  modalLevel.value = 1
  contextOldName.value = name
  modalForm.value.name = name
  modalVisible.value = true
}

const showEditLevel2 = (level1Name: string, level2Name: string) => {
  modalMode.value = 'edit'
  modalLevel.value = 2
  contextLevel1.value = level1Name
  contextOldName.value = level2Name
  modalForm.value.name = level2Name
  modalVisible.value = true
}

// ==================== 弹窗确认 ====================

// 记录操作后需要展开的层级
const pendingExpandLevel1 = ref<string>('')

// 监听数据变化，自动展开待展开的层级
watch(() => props.classification?.classification_data, () => {
  if (pendingExpandLevel1.value) {
    if (!activeLevel1Keys.value.includes(pendingExpandLevel1.value)) {
      activeLevel1Keys.value = [...activeLevel1Keys.value, pendingExpandLevel1.value]
    }
    pendingExpandLevel1.value = ''
  }
})

const handleModalOk = async () => {
  if (!modalForm.value.name.trim()) {
    message.warning('分类名称不能为空')
    return
  }

  modalLoading.value = true
  try {
    const id = props.classification.product_classification_id
    const newName = modalForm.value.name.trim()

    if (modalMode.value === 'add') {
      if (modalLevel.value === 1) {
        await productClassificationApi.addLevel1(id, newName)
        pendingExpandLevel1.value = newName
      } else {
        await productClassificationApi.addLevel2(id, contextLevel1.value, newName)
        pendingExpandLevel1.value = contextLevel1.value
      }
      message.success('添加成功')
    } else {
      if (modalLevel.value === 1) {
        await productClassificationApi.updateLevel1(id, contextOldName.value, newName)
        const idx = activeLevel1Keys.value.indexOf(contextOldName.value)
        if (idx !== -1) {
          activeLevel1Keys.value.splice(idx, 1, newName)
        } else {
          pendingExpandLevel1.value = newName
        }
      } else {
        await productClassificationApi.updateLevel2(id, contextLevel1.value, contextOldName.value, newName)
      }
      message.success('编辑成功')
    }

    modalVisible.value = false
    emit('refresh')
  } catch (error: any) {
    message.error(error?.response?.data?.message || error?.message || '操作失败')
  } finally {
    modalLoading.value = false
  }
}

// ==================== 删除操作 ====================

const confirmDeleteLevel1 = (name: string) => {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除一级分类"${name}"吗？其下的所有二级分类将同时被删除。`,
    okText: '确认',
    cancelText: '取消',
    onOk: async () => {
      try {
        await productClassificationApi.deleteLevel1(props.classification.product_classification_id, name)
        message.success('删除成功')
        emit('refresh')
      } catch (error: any) {
        message.error(error?.response?.data?.message || '删除失败')
      }
    },
  })
}

const confirmDeleteLevel2 = (level1Name: string, level2Name: string) => {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除二级分类"${level2Name}"吗？`,
    okText: '确认',
    cancelText: '取消',
    onOk: async () => {
      try {
        await productClassificationApi.deleteLevel2(props.classification.product_classification_id, level1Name, level2Name)
        message.success('删除成功')
        emit('refresh')
      } catch (error: any) {
        message.error(error?.response?.data?.message || '删除失败')
      }
    },
  })
}
</script>

<style scoped lang="scss">
.classification-detail {
  .search-bar {
    margin-bottom: 12px;
  }

  .action-bar {
    margin-bottom: 12px;
  }

  .tree-container {
    .level-header {
      display: inline-flex;
      align-items: center;
      gap: 4px;

      .level-name {
        font-weight: 500;
      }

      .level-count {
        color: #999;
        font-size: 12px;
      }
    }

    .level-actions {
      display: flex;
      align-items: center;
      gap: 0;
    }

    .level2-list {
      .level2-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 12px;
        border-bottom: 1px solid #f0f0f0;

        &:last-child {
          border-bottom: none;
        }

        &:hover {
          background-color: #fafafa;
        }

        .level2-name {
          font-size: 14px;
        }

        .level2-actions {
          display: flex;
          gap: 0;
        }
      }
    }
  }

  :deep(.ant-collapse-header) {
    align-items: center !important;
  }

  :deep(.ant-collapse-extra) {
    position: absolute;
    right: 40px;
    top: 50%;
    transform: translateY(-50%);
  }
}
</style>
