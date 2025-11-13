<script setup lang="ts">
import type { FormInst } from 'naive-ui'
import { registerUserApi } from '@/service'

const emit = defineEmits(['update:modelValue'])
function toLogin() {
  emit('update:modelValue', 'login')
}
const { t } = useI18n()

const rules = {
  account: {
    required: true,
    trigger: 'blur',
    message: t('login.accountRuleTip'),
  },
  email: {
    required: true,
    trigger: 'blur',
    message: t('login.emailRuleTip'),
  },
  pwd: {
    required: true,
    trigger: 'blur',
    message: t('login.passwordRuleTip'),
  },
  rePwd: {
    required: true,
    trigger: 'blur',
    message: t('login.checkPasswordRuleTip'),
  },
}
const formValue = ref({
  account: '',
  email: '',
  pwd: '',
  rePwd: '',
})

// const isRead = ref(true)
const isLoading = ref(false)
const formRef = ref<FormInst | null>(null)
async function handleRegister() {
  formRef.value?.validate(async (errors) => {
    if (errors)
      return

    isLoading.value = true

    const { isSuccess } = await registerUserApi({
      username: formValue.value.account,
      email: formValue.value.email,
      password: formValue.value.pwd,
    })
    if (isSuccess) {
      window.$message.success('注册成功')
      toLogin()
    }
  })
}
</script>

<template>
  <div>
    <n-h2 depth="3" class="text-center">
      {{ $t('login.registerTitle') }}
    </n-h2>
    <n-form
      ref="formRef"
      :rules="rules"
      :model="formValue"
      :show-label="false"
      size="large"
    >
      <n-form-item path="email">
        <n-input
          v-model:value="formValue.email"
          clearable
          :placeholder="$t('login.emailPlaceholder')"
        />
      </n-form-item>
      <n-form-item path="account">
        <n-input
          v-model:value="formValue.account"
          clearable
          :placeholder="$t('login.accountPlaceholder')"
        />
      </n-form-item>
      <n-form-item path="pwd">
        <n-input
          v-model:value="formValue.pwd"
          type="password"
          :placeholder="$t('login.passwordPlaceholder')"
          clearable
          show-password-on="click"
        >
          <template #password-invisible-icon>
            <icon-park-outline-preview-close-one />
          </template>
          <template #password-visible-icon>
            <icon-park-outline-preview-open />
          </template>
        </n-input>
      </n-form-item>
      <n-form-item path="rePwd">
        <n-input
          v-model:value="formValue.rePwd"
          type="password"
          :placeholder="$t('login.checkPasswordPlaceholder')"
          clearable
          show-password-on="click"
        >
          <template #password-invisible-icon>
            <icon-park-outline-preview-close-one />
          </template>
          <template #password-visible-icon>
            <icon-park-outline-preview-open />
          </template>
        </n-input>
      </n-form-item>
      <n-form-item>
        <n-space
          vertical
          :size="20"
          class="w-full"
        >
          <!-- <n-checkbox v-model:checked="isRead">
            {{ $t('login.readAndAgree') }} <n-button
              type="primary"
              text
            >
              {{ $t('login.userAgreement') }}
            </n-button>
          </n-checkbox> -->
          <n-button
            block
            type="primary"
            :loading="isLoading"
            @click="handleRegister"
          >
            {{ $t('login.signUp') }}
          </n-button>
          <n-flex justify="center">
            <n-text>{{ $t('login.haveAccountText') }}</n-text>
            <n-button
              text
              type="primary"
              @click="toLogin"
            >
              {{ $t('login.signIn') }}
            </n-button>
          </n-flex>
        </n-space>
      </n-form-item>
    </n-form>
  </div>
</template>

<style scoped></style>
