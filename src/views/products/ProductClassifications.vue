<template>
  <div class="product-classifications-container">
    <div class="header">
      <h1>产品分类管理</h1>
      <a-button type="primary" @click="handleAdd">
        <template #icon>
          <PlusOutlined />
        </template>
        新增产品分类
      </a-button>
    </div>

    <a-card>
      <div class="search-bar">
        <a-form layout="inline">
          <a-form-item label="分类方案名称">
            <a-input
              v-model:value="searchParams.name"
              placeholder="请输入分类方案名称"
              allow-clear
              style="width: 200px"
            />
          </a-form-item>

          <a-form-item>
            <a-space>
              <a-button type="primary" @click="handleSearch"> <SearchOutlined /> 查询 </a-button>
              <a-button @click="handleReset"> <ReloadOutlined /> 重置 </a-button>
            </a-space>
          </a-form-item>
        </a-form>
      </div>

      <a-table
        :columns="columns"
        :data-source="classifications"
        :loading="loading"
        :pagination="false"
        rowKey="product_classification_id"
        :scroll="{ y: 'calc(100vh - 300px)' }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'classification_data'">
            <div class="tree-overview" v-if="hasClassificationData(record.classification_data)">
              <template v-for="(level2, level1Name) in parseTree(record.classification_data)" :key="level1Name">
                <div class="tree-l1">
                  <span class="tree-icon">▼</span> {{ level1Name }}
                </div>
                <template v-for="(val, level2Name) in level2" :key="`${level1Name}/${level2Name}`">
                  <div class="tree-l2">
                    <span class="tree-icon">└─</span> {{ level2Name }}
                  </div>
                </template>
              </template>
            </div>
            <span v-else style="color: #999;">暂无分类</span>
          </template>

          <template v-if="column.key === 'created_at'">
            {{ formatDate(record.created_at) }}
          </template>

          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button type="link" size="small" @click="handleManage(record)"> 管理分类 </a-button>
              <a-button type="link" size="small" @click="handleEdit(record)"> 编辑 </a-button>
              <a-button type="link" size="small" danger @click="handleDelete(record)">
                删除
              </a-button>
            </a-space>
          </template>
        </template>
      </a-table>
      <a-pagination
        v-model:current="pagination.current"
        v-model:pageSize="pagination.pageSize"
        :total="pagination.total"
        show-total
        show-size-changer
        show-quick-jumper
        :page-size-options="['10', '20', '50', '100']"
        style="margin-top: 16px; text-align: right"
        @change="handlePageChange"
        @showSizeChange="handlePageChange"
      />
    </a-card>

    <!-- 新增/编辑弹窗 -->
    <a-modal
      :title="isEdit ? '编辑产品分类' : '新增产品分类'"
      :visible="formVisible"
      @ok="handleSubmit"
      @cancel="formVisible = false"
      :okText="isEdit ? '保存' : '创建'"
      :confirmLoading="submitLoading"
      width="600px"
    >
      <a-form ref="formRef" :model="formData" :rules="formRules" layout="vertical">
        <a-form-item label="分类方案名称" name="classification_name">
          <a-input v-model:value="formData.classification_name" placeholder="请输入分类方案名称" />
        </a-form-item>

        <a-form-item label="描述" name="description">
          <a-textarea v-model:value="formData.description" :rows="2" placeholder="请输入描述" />
        </a-form-item>

        <a-form-item label="备注" name="remarks">
          <a-textarea v-model:value="formData.remarks" :rows="2" placeholder="请输入备注" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 分类详情弹窗 -->
    <a-modal
      v-if="detailVisible"
      :visible="detailVisible"
      :title="`管理分类 - ${currentClassification?.classification_name || ''}`"
      :footer="null"
      @cancel="detailVisible = false"
      width="900px"
      :bodyStyle="{ padding: '12px 24px', maxHeight: '70vh', overflow: 'auto' }"
    >
      <ProductClassificationDetail
        v-if="currentClassification"
        :classification="currentClassification"
        @refresh="handleDetailRefresh"
      />
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { PlusOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { productClassificationApi } from '@/api/productClassification'
import type { ProductClassification, ProductClassificationQueryParams, ClassificationTree } from '@/types'
import ProductClassificationDetail from '@/components/ProductClassificationDetail.vue'
import { formatDate } from '@/utils/date'
import dayjs from 'dayjs'

const classifications = ref<ProductClassification[]>([])
const loading = ref(false)
const formVisible = ref(false)
const isEdit = ref(false)
const submitLoading = ref(false)
const formRef = ref()
const currentEditId = ref<string | undefined>(undefined)

// 分类详情
const detailVisible = ref(false)
const currentClassification = ref<ProductClassification | undefined>(undefined)

const searchParams = reactive<ProductClassificationQueryParams>({
  page: 1,
  pageSize: 10,
  name: '',
})

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
})

const formData = reactive({
  classification_name: '',
  description: '',
  remarks: '',
})

const formRules = {
  classification_name: [{ required: true, message: '请输入分类方案名称', trigger: 'blur' }],
}

const columns = [
  {
    title: '分类方案名称',
    dataIndex: 'classification_name',
    key: 'classification_name',
    width: 180,
  },
  {
    title: '分类概览',
    key: 'classification_data',
    width: 350,
  },
  {
    title: '描述',
    dataIndex: 'description',
    key: 'description',
    width: 200,
    ellipsis: true,
  },
  {
    title: '创建人',
    dataIndex: 'creator',
    key: 'creator',
    width: 100,
  },
  {
    title: '创建时间',
    dataIndex: 'created_at',
    key: 'created_at',
    width: 120,
    customRender: ({ text }: { text: string }) => formatDate(text),
  },
  {
    title: '操作',
    key: 'actions',
    width: 220,
    fixed: 'right' as const,
  },
]

// 解析树数据
const parseTree = (data: ClassificationTree | string): ClassificationTree => {
  if (!data) return {}
  if (typeof data === 'string') {
    try {
      return JSON.parse(data)
    } catch {
      return {}
    }
  }
  return data
}

// 判断是否有分类数据
const hasClassificationData = (data: ClassificationTree | string): boolean => {
  const tree = parseTree(data)
  return Object.keys(tree).length > 0
}

const loadClassifications = async () => {
  loading.value = true
  try {
    const response = await productClassificationApi.getAll(searchParams)
    classifications.value = response.data || []
    pagination.total = response.data?.pagination?.total || 0
    pagination.current = response.data?.pagination?.page || 1
    pagination.pageSize = response.data?.pagination?.pageSize || 10
  } catch (error) {
    console.error('加载产品分类列表失败:', error)
    message.error('加载产品分类列表失败')
    classifications.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  searchParams.page = 1
  loadClassifications()
}

const handleReset = () => {
  searchParams.name = ''
  handleSearch()
}

const handlePageChange = (page: number, pageSize: number) => {
  searchParams.page = page
  searchParams.pageSize = pageSize
  loadClassifications()
}

const handleAdd = () => {
  isEdit.value = false
  currentEditId.value = undefined
  formData.classification_name = ''
  formData.description = ''
  formData.remarks = ''
  formVisible.value = true
}

const handleEdit = (record: ProductClassification) => {
  isEdit.value = true
  currentEditId.value = record.product_classification_id
  formData.classification_name = record.classification_name
  formData.description = record.description || ''
  formData.remarks = record.remarks || ''
  formVisible.value = true
}

const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    submitLoading.value = true

    if (isEdit.value && currentEditId.value) {
      await productClassificationApi.update(currentEditId.value, {
        classification_name: formData.classification_name,
        description: formData.description,
        remarks: formData.remarks,
      })
      message.success('产品分类更新成功')
    } else {
      await productClassificationApi.create({
        classification_name: formData.classification_name,
        classification_data: {},
        description: formData.description,
        remarks: formData.remarks,
      })
      message.success('产品分类创建成功')
    }

    formVisible.value = false
    loadClassifications()
  } catch (error) {
    message.error((error as any).message || '操作失败')
  } finally {
    submitLoading.value = false
  }
}

const handleManage = async (record: ProductClassification) => {
  try {
    const response = await productClassificationApi.getById(record.product_classification_id)
    currentClassification.value = response.data
    detailVisible.value = true
  } catch (error) {
    message.error('获取分类详情失败')
  }
}

const handleDetailRefresh = async () => {
  if (currentClassification.value) {
    try {
      const response = await productClassificationApi.getById(currentClassification.value.product_classification_id)
      currentClassification.value = response.data
      loadClassifications()
    } catch (error) {
      message.error('刷新分类详情失败')
    }
  }
}

const handleDelete = (record: ProductClassification) => {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除产品分类"${record.classification_name}"吗？删除后将无法恢复。`,
    okText: '确认',
    cancelText: '取消',
    onOk: async () => {
      try {
        await productClassificationApi.delete(record.product_classification_id)
        message.success('删除成功')
        loadClassifications()
      } catch (error) {
        message.error('删除失败')
      }
    },
  })
}

onMounted(() => {
  loadClassifications()
})
</script>

<style scoped lang="scss">
.product-classifications-container {
  padding: 24px;

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;

    h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 500;
    }
  }

  .search-bar {
    margin-bottom: 16px;
  }

  .tree-overview {
    font-size: 13px;
    line-height: 1.6;
    white-space: nowrap;

    .tree-l1 {
      font-weight: 500;
      color: #333;

      .tree-icon {
        color: #1890ff;
        margin-right: 4px;
      }
    }

    .tree-l2 {
      padding-left: 20px;
      color: #555;

      .tree-icon {
        color: #999;
        margin-right: 2px;
      }
    }

    .tree-l3 {
      padding-left: 40px;
      color: #777;

      .tree-icon {
        color: #ccc;
        margin-right: 2px;
      }
    }
  }
}
</style>
