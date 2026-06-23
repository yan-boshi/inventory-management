<template>
  <div class="register-container">
    <div class="register-card">
      <h1 class="title">注册账号</h1>
      <a-form :model="formData" :rules="rules" class="register-form" @finish="handleRegister">
        <a-form-item name="username">
          <a-input v-model:value="formData.username" placeholder="请输入用户名" size="large">
            <template #prefix>
              <UserOutlined />
            </template>
          </a-input>
        </a-form-item>
        <a-form-item name="password">
          <a-input-password v-model:value="formData.password" placeholder="请输入密码" size="large">
            <template #prefix>
              <LockOutlined />
            </template>
          </a-input-password>
        </a-form-item>
        <a-form-item name="confirmPassword">
          <a-input-password
            v-model:value="formData.confirmPassword"
            placeholder="请确认密码"
            size="large"
          >
            <template #prefix>
              <LockOutlined />
            </template>
          </a-input-password>
        </a-form-item>
        <a-form-item name="phone">
          <a-input
            v-model:value="formData.phone"
            placeholder="请输入联系电话"
            size="large"
          >
            <template #prefix>
              <PhoneOutlined />
            </template>
          </a-input>
        </a-form-item>
        <a-form-item name="email">
          <a-input v-model:value="formData.email" placeholder="请输入邮箱" size="large">
            <template #prefix>
              <MailOutlined />
            </template>
          </a-input>
        </a-form-item>
        <a-form-item>
          <a-button type="primary" html-type="submit" block size="large" :loading="loading">
            注册
          </a-button>
        </a-form-item>
      </a-form>
      <div class="login-link">已有账号？<router-link to="/login"> 立即登录 </router-link></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { UserOutlined, LockOutlined, PhoneOutlined, MailOutlined } from '@ant-design/icons-vue'
import { register } from '@/api/auth'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const formData = reactive({
  username: '',
  password: '',
  confirmPassword: '',
  phone: '',
  email: '',
})

const validatePassword = (_rule: unknown, value: string) => {
  if (value === '') {
    return Promise.reject('请输入确认密码')
  }
  if (value !== formData.password) {
    return Promise.reject('两次输入的密码不一致')
  }
  return Promise.resolve()
}

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度在3到20个字符', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度在6到20个字符', trigger: 'blur' },
  ],
  confirmPassword: [{ required: true, validator: validatePassword, trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入联系电话', trigger: 'blur' },
    { type: 'string', pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' },
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' },
  ],
}

const handleRegister = async () => {
  loading.value = true
  try {
    const res = await register({
      username: formData.username,
      password: formData.password,
      phone: formData.phone,
      email: formData.email,
    })
    console.log('注册返回信息', res)
    if (res.success) {
      userStore.setUser(
        {
          userId: res.data.user.userId,
          username: res.data.user.username,
          role: res.data.user.role as 'admin' | 'advanced' | 'normal',
          phone: res.data.user.phone,
          email: res.data.user.email,
        },
        res.data.token
      )
      message.success('注册成功')
      router.push('/customers')
    }
  } catch (error) {
    console.log('注册返回错误信息', error)
    const err = error as { response?: { data?: { message?: string } } }
    message.error(err.response?.data?.message || '注册失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
.register-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.register-card {
  width: 400px;
  padding: 40px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.title {
  text-align: center;
  margin-bottom: 32px;
  color: #333;
  font-size: 28px;
  font-weight: bold;
}

.register-form {
  margin-bottom: 16px;
}

.login-link {
  text-align: center;
  color: #666;

  a {
    color: #667eea;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
}
</style>
