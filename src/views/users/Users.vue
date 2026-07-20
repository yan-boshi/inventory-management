<template>
  <div class="users-container">
    <div class="header">
      <h1>用户管理</h1>
      <a-button
        type="primary"
        @click="showCreateModal"
      >
        <template #icon>
          <PlusOutlined />
        </template>
        新增用户
      </a-button>
    </div>

    <a-table
      :columns="columns"
      :data-source="dataSource"
      :loading="loading"
      :pagination="false"
      row-key="user_id"
      :scroll="{ y: 'calc(100vh - 250px)' }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'role'">
          <a-tag :color="getRoleColor(record.role)">
            {{ getRoleLabel(record.role) }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'action'">
          <a-space>
            <a-button
              type="link"
              size="small"
              @click="showEditModal(record)"
            >
              编辑
            </a-button>
            <a-popconfirm
              title="确定要删除该用户吗？"
              ok-text="确定"
              cancel-text="取消"
              @confirm="handleDelete(record.user_id)"
            >
              <a-button
                type="link"
                danger
                size="small"
              >
                删除
              </a-button>
            </a-popconfirm>
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

    <a-modal
      v-model:open="modalVisible"
      :title="modalTitle"
      :confirm-loading="submitting"
      @ok="handleSubmit"
      @cancel="handleCancel"
    >
      <a-form
        :model="formData"
        :label-col="{ span: 6 }"
        :wrapper-col="{ span: 16 }"
      >
        <a-form-item
          label="用户名"
          required
        >
          <a-input
            v-model:value="formData.username"
            placeholder="请输入用户名"
          />
        </a-form-item>
        <a-form-item
          label="密码"
          :required="!formData.user_id"
        >
          <a-input-password
            v-model:value="formData.password"
            placeholder="编辑时留空则不修改"
          />
        </a-form-item>
        <a-form-item
          label="角色"
          required
        >
          <a-select
            v-model:value="formData.role"
            placeholder="请选择角色"
            :disabled="!!formData.user_id && formData.role === 'admin'"
          >
            <a-select-option
              v-if="!formData.user_id && !hasAdmin"
              value="admin"
            >
              管理员
            </a-select-option>
            <a-select-option
              v-if="formData.user_id && formData.role === 'admin'"
              value="admin"
            >
              管理员
            </a-select-option>
            <a-select-option value="advanced">
              高级用户
            </a-select-option>
            <a-select-option value="normal">
              普通用户
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="联系电话" required>
          <a-input
            v-model:value="formData.phone"
            placeholder="请输入联系电话"
          />
        </a-form-item>
        <a-form-item label="邮箱" required>
          <a-input
            v-model:value="formData.email"
            placeholder="请输入邮箱"
          />
        </a-form-item>
        <a-form-item label="备注">
          <a-textarea
            v-model:value="formData.remarks"
            placeholder="请输入备注"
            :rows="3"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { getUsers, createUser, updateUser, deleteUser } from '@/api/users'
import type { User, CreateUserRequest } from '@/types'

const dataSource = ref<User[]>([])
const loading = ref(false)
const submitting = ref(false)
const modalVisible = ref(false)
const modalTitle = ref('新增用户')
const formData = reactive<CreateUserRequest & { user_id?: string }>({
  username: '',
  password: '',
  role: 'normal',
  phone: '',
  email: '',
  remarks: ''
})

const hasAdmin = ref(false)

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
})

const columns = [
  { title: '用户名', dataIndex: 'username', key: 'username' },
  { title: '角色', dataIndex: 'role', key: 'role' },
  { title: '联系电话', dataIndex: 'phone', key: 'phone' },
  { title: '邮箱', dataIndex: 'email', key: 'email' },
  { title: '备注', dataIndex: 'remarks', key: 'remarks' },
  { title: '创建时间', dataIndex: 'created_at', key: 'created_at' },
  { title: '操作', key: 'action', width: 150 }
]

const getRoleColor = (role: string) => {
  const colors: Record<string, string> = {
    admin: 'red',
    advanced: 'orange',
    normal: 'blue'
  }
  return colors[role] || 'default'
}

const getRoleLabel = (role: string) => {
  const labels: Record<string, string> = {
    admin: '管理员',
    advanced: '高级用户',
    normal: '普通用户'
  }
  return labels[role] || role
}

const fetchUsers = async () => {
  loading.value = true
  try {
    const res = await getUsers({ page: pagination.current, pageSize: pagination.pageSize })
    dataSource.value = res.data || []
    pagination.total = res.pagination?.total || 0
    hasAdmin.value = dataSource.value.some(u => u.role === 'admin')
  } catch (error) {
    console.error('获取用户列表失败:', error)
    message.error('获取用户列表失败')
    dataSource.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

const showCreateModal = () => {
  modalTitle.value = '新增用户'
  formData.user_id = undefined
  formData.username = ''
  formData.password = ''
  formData.role = 'normal'
  formData.phone = ''
  formData.email = ''
  formData.remarks = ''
  modalVisible.value = true
}

const showEditModal = (record: User) => {
  modalTitle.value = '编辑用户'
  formData.user_id = record.user_id
  formData.username = record.username
  formData.password = ''
  formData.role = record.role
  formData.phone = record.phone || ''
  formData.email = record.email || ''
  formData.remarks = record.remarks || ''
  modalVisible.value = true
}

const handleSubmit = async () => {
  submitting.value = true
  try {
    if (formData.user_id) {
      const updateData: {
        username: string
        role: 'admin' | 'advanced' | 'normal'
        phone?: string
        email?: string
        remarks?: string
        password?: string
      } = {
        username: formData.username,
        role: formData.role
      }
      if (formData.password) {
        updateData.password = formData.password
      }
      if (formData.phone) {
        updateData.phone = formData.phone
      }
      if (formData.email) {
        updateData.email = formData.email
      }
      if (formData.remarks) {
        updateData.remarks = formData.remarks
      }
      await updateUser(formData.user_id, updateData)
      message.success('更新用户成功')
    } else {
      await createUser(formData)
      message.success('新增用户成功')
    }
    modalVisible.value = false
    fetchUsers()
  } catch (error) {
    message.error(formData.user_id ? '更新用户失败' : '新增用户失败')
  } finally {
    submitting.value = false
  }
}

const handleDelete = async (id: string) => {
  const user = dataSource.value.find(u => u.user_id === id)
  if (user?.role === 'admin') {
    message.error('不能删除管理员')
    return
  }
  try {
    await deleteUser(id)
    message.success('删除用户成功')
    fetchUsers()
  } catch (error) {
    message.error('删除用户失败')
  }
}

const handleCancel = () => {
  modalVisible.value = false
}

const handlePageChange = (page: number, pageSize: number) => {
  pagination.current = page
  pagination.pageSize = pageSize
  fetchUsers()
}

onMounted(() => {
  fetchUsers()
})
</script>

<style scoped lang="scss">
.users-container {
  padding: 24px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;

  h1 {
    margin: 0;
    font-size: 24px;
    font-weight: bold;
  }
}
</style>
