<script setup lang="ts">
import type { FormInst } from 'naive-ui'
import { useAuthStore } from '@/store'
import { changePasswordApi } from '@/service/api/login'
import avatarUrl from '@/assets/avatar.png'

const authStore = useAuthStore()

const { userInfo } = authStore
const formRef = ref()
const formValue = ref({
  user: {
    name: '',
    age: '',
  },
  phone: '',
})
const rules = {
  user: {
    name: {
      required: true,
      message: '请输入姓名',
      trigger: 'blur',
    },
    age: {
      required: true,
      message: '请输入年龄',
      trigger: ['input', 'blur'],
    },
  },
  phone: {
    required: true,
    message: '请输入电话号码',
    trigger: ['input'],
  },
}

function handleValidateClick() {
  formRef.value?.validate((errors: any) => {
    if (!errors)
      window.$message.success('验证通过')
    else window.$message.error('验证不通过')
  })
}

// 修改密码相关
const showPasswordModal = ref(false)
const passwordFormRef = ref<FormInst | null>(null)
const passwordFormValue = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})
const passwordRules = computed(() => ({
  oldPassword: {
    required: true,
    message: '请输入旧密码',
    trigger: ['input', 'blur'],
  },
  newPassword: {
    required: true,
    message: '请输入新密码',
    trigger: ['input', 'blur'],
  },
  confirmPassword: {
    required: true,
    // message: '请再次输入新密码',
    trigger: ['input', 'blur'],
    validator: (rule: any, value: string) => {
      if (!value) {
        return new Error('请再次输入新密码')
      }
      if (passwordFormValue.value.newPassword && value !== passwordFormValue.value.newPassword) {
        return new Error('两次输入的新密码不一致')
      }
      return true
    },
  },
}))

const isSubmitting = ref(false)

function handleOpenPasswordModal() {
  showPasswordModal.value = true
  passwordFormValue.value = {
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  }
}

function handleClosePasswordModal() {
  showPasswordModal.value = false
  passwordFormRef.value?.restoreValidation()
  return true
}

async function handleSubmitPassword(): Promise<boolean> {
  return new Promise((resolve) => {
    passwordFormRef.value?.validate(async (errors) => {
      if (errors) {
        resolve(false)
        return
      }

      isSubmitting.value = true
      try {
        const { isSuccess } = await changePasswordApi({
          oldPassword: passwordFormValue.value.oldPassword,
          newPassword: passwordFormValue.value.newPassword,
        })

        if (isSuccess) {
          window.$message.success('密码修改成功，请重新登录')
          handleClosePasswordModal()
          // 延迟一下再退出，让用户看到成功提示
          setTimeout(() => {
            authStore.logout()
          }, 1000)
          resolve(true)
        }
        else {
          // HTTP 层已经自动显示了错误消息，这里不需要再次显示
          resolve(false)
        }
      }
      catch (error) {
        // HTTP 层已经自动显示了错误消息，这里不需要再次显示
        resolve(false)
      }
      finally {
        isSubmitting.value = false
      }
    })
  })
}
</script>

<template>
  <div>
    <n-space vertical>
      <n-card title="个人信息">
        <n-space size="large">
          <n-avatar round :size="128" :src="avatarUrl" />

          <n-descriptions label-placement="left" :column="1" :title="`傍晚好，${userInfo?.username}`">
            <n-descriptions-item label="用户名">
              <n-flex align="center" :gap="12">
                <span>{{ userInfo?.username }}</span>
                <n-button size="small" type="primary" @click="handleOpenPasswordModal">
                  修改密码
                </n-button>
              </n-flex>
            </n-descriptions-item>
            <n-descriptions-item label="邮箱">
              {{ userInfo?.email }}
            </n-descriptions-item>
          </n-descriptions>
        </n-space>
      </n-card>
      <!-- <n-card title="信息修改">
        <n-space justify="center">
          <n-form ref="formRef" class="w-500px" :label-width="80" :model="formValue" :rules="rules">
            <n-form-item label="姓名" path="user.name">
              <n-input v-model:value="formValue.user.name" placeholder="输入姓名" />
            </n-form-item>
            <n-form-item label="年龄" path="user.age">
              <n-input v-model:value="formValue.user.age" placeholder="输入年龄" />
            </n-form-item>
            <n-form-item label="电话号码" path="phone">
              <n-input v-model:value="formValue.phone" placeholder="电话号码" />
            </n-form-item>
            <n-form-item>
              <n-button type="primary" attr-type="button" block @click="handleValidateClick">
                验证
              </n-button>
            </n-form-item>
          </n-form>
        </n-space>
      </n-card> -->
    </n-space>

    <!-- 修改密码弹框 -->
    <n-modal
      v-model:show="showPasswordModal"
      preset="dialog"
      title="修改密码"
      positive-text="提交"
      negative-text="取消"
      :positive-button-props="{ loading: isSubmitting }"
      :on-positive-click="handleSubmitPassword"
      :on-negative-click="handleClosePasswordModal"
    >
      <n-form
        ref="passwordFormRef"
        :model="passwordFormValue"
        :rules="passwordRules"
        label-placement="left"
        label-width="100"
        require-mark-placement="right-hanging"
      >
        <n-form-item label="旧密码" path="oldPassword">
          <n-input
            v-model:value="passwordFormValue.oldPassword"
            type="password"
            placeholder="请输入旧密码"
            show-password-on="click"
            clearable
            autocomplete="off"
          />
        </n-form-item>
        <n-form-item label="新密码" path="newPassword">
          <n-input
            v-model:value="passwordFormValue.newPassword"
            type="password"
            placeholder="请输入新密码"
            show-password-on="click"
            clearable
            autocomplete="new-password"
            @input="() => {
              // 当新密码变化时，如果重复密码有值，重新验证重复密码字段
              if (passwordFormValue.confirmPassword) {
                nextTick(() => {
                  // 手动触发重复密码字段的验证
                  passwordFormRef?.validate(
                    () => {},
                    (rule: any) => {
                      // 只验证 confirmPassword 字段
                      return rule?.key === 'confirmPassword'
                    },
                  )
                })
              }
            }"
          />
        </n-form-item>
        <n-form-item label="重复新密码" path="confirmPassword">
          <n-input
            v-model:value="passwordFormValue.confirmPassword"
            type="password"
            placeholder="请再次输入新密码"
            show-password-on="click"
            clearable
            autocomplete="new-password"
          />
        </n-form-item>
      </n-form>
    </n-modal>
  </div>
</template>

<style scoped></style>
