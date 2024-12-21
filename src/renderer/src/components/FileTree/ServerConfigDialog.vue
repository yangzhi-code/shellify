<template>
  <el-form
    class="server-config-form"
    :model="form"
    :rules="rules"
    ref="formRef"
    size="small"
    label-width="60px"
  >
    <!-- 基本信息 -->
    <div class="form-section">
      <div class="section-title">基本信息</div>
      <el-form-item label="名称" prop="name">
        <el-input v-model="form.name" placeholder="名称" />
      </el-form-item>
      <div class="form-row">
        <el-form-item label="主机" prop="host" class="host-item">
          <el-input v-model="form.host" placeholder="主机地址">
            <template #append>
              <el-button @click="testConnection" :loading="testing">测试</el-button>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="端口" prop="port" class="port-item">
          <el-input-number 
            v-model="form.port" 
            :min="1" 
            :max="65535" 
            :controls="false"
            class="no-arrows"
          />
        </el-form-item>
      </div>
    </div>

    <!-- 认证设置 -->
    <div class="form-section">
      <div class="section-title">认证设置</div>
      <div class="form-row">
        <el-form-item label="用户" prop="username" class="user-item">
          <el-select v-model="form.username">
            <el-option label="root" value="root" />
            <el-option label="admin" value="admin" />
          </el-select>
        </el-form-item>
        <el-form-item label="认证" prop="authMethod" class="auth-item">
          <el-radio-group v-model="form.authMethod">
            <el-radio label="password">密码</el-radio>
            <el-radio label="key">密钥</el-radio>
          </el-radio-group>
        </el-form-item>
      </div>

      <!-- 密码认证 -->
      <template v-if="form.authMethod === 'password'">
        <el-form-item label="密码" prop="password">
          <el-input 
            v-model="form.password" 
            type="password" 
            placeholder="密码" 
            show-password
          />
        </el-form-item>
      </template>

      <!-- 密钥认证 -->
      <template v-if="form.authMethod === 'key'">
        <el-form-item label="私钥" prop="privateKey">
          <div class="key-select">
            <el-input v-model="privateKeyPath" placeholder="私钥文件" readonly>
              <template #append>
                <el-button @click="selectPrivateKey">选择</el-button>
              </template>
            </el-input>
          </div>
        </el-form-item>
        <el-form-item label="密码" prop="passphrase">
          <el-input 
            v-model="form.passphrase" 
            type="password" 
            placeholder="密钥密码" 
            show-password
          />
        </el-form-item>
      </template>
    </div>

    <!-- 高级设置 -->
    <div class="form-section">
      <div class="section-title">高级设置</div>
      <el-form-item label="编码" class="encoding-item">
        <el-select v-model="form.encoding">
          <el-option label="UTF-8" value="utf8" />
          <el-option label="GBK" value="gbk" />
        </el-select>
      </el-form-item>
      <el-form-item label="备注" class="remark-item">
        <el-input 
          v-model="form.remark" 
          placeholder="备注"
        />
      </el-form-item>
    </div>

    <!-- 按钮区域 -->
    <div class="form-buttons">
      <el-button @click="$emit('cancel')" size="small">取消</el-button>
      <el-button type="primary" @click="handleSubmit" :loading="saving" size="small">保存</el-button>
    </div>
  </el-form>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  node: { type: Object, required: true }
})

const emit = defineEmits(['update-node', 'cancel'])
const formRef = ref(null)
const privateKeyPath = ref('')
const testing = ref(false)
const saving = ref(false)

// 表单数据
const form = ref({
  name: '',
  host: '',
  port: 22,
  authMethod: 'password',
  username: 'root',
  password: '',
  privateKey: null,
  passphrase: '',
  encoding: 'utf8',
  remark: '',
})

// 表单验证规则
const rules = {
  name: [{ required: true, message: '请输入连接名称', trigger: 'blur' }],
  host: [{ required: true, message: '请输入主机地址', trigger: 'blur' }],
  port: [
    { required: true, message: '请输入端口号' },
    { type: 'number', min: 1, max: 65535, message: '端口号范围 1-65535' }
  ],
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ 
    required: true, 
    message: '请输入密码', 
    trigger: 'blur',
    validator: (rule, value, callback) => {
      if (form.value.authMethod === 'password' && !value) {
        callback(new Error('请输入密码'))
      } else {
        callback()
      }
    }
  }],
  privateKey: [{
    required: true,
    message: '请选择私钥文件',
    trigger: 'change',
    validator: (rule, value, callback) => {
      if (form.value.authMethod === 'key' && !value) {
        callback(new Error('请选择私钥文件'))
      } else {
        callback()
      }
    }
  }]
}

// 测试连接
const testConnection = async () => {
  if (!form.value.host || !form.value.port || !form.value.username) {
    ElMessage.warning('请填写完整的连接信息')
    return
  }
  
  testing.value = true
  try {
    // TODO: 实现连接测试逻辑
    await new Promise(resolve => setTimeout(resolve, 1000))
    ElMessage.success('连接测试成功')
  } catch (error) {
    ElMessage.error('连接测试失败')
  } finally {
    testing.value = false
  }
}

// 选择私钥文件
const selectPrivateKey = async () => {
  try {
    const result = await window.electron.ipcRenderer.invoke('select-private-key')
    if (result.filePath) {
      privateKeyPath.value = result.filePath
      form.value.privateKey = result.filePath
    }
  } catch (error) {
    ElMessage.error('选择文件失败')
  }
}

// 提交表单
const handleSubmit = () => {
  formRef.value.validate(async (valid) => {
    if (valid) {
      saving.value = true
      try {
        // 更新节点信息
        emit('update-node', { ...form.value, name: form.value.name })
        ElMessage.success('保存成功')
      } catch (error) {
        ElMessage.error('保存失败')
      } finally {
        saving.value = false
      }
    }
  })
}

// 初始化表单数据
onMounted(() => {
  if (props.node.info) {
    form.value = { ...form.value, ...props.node.info }
    if (form.value.privateKey) {
      privateKeyPath.value = form.value.privateKey
    }
  }
})
</script>

<style scoped>
.server-config-form {
  padding: 8px;
  max-width: 360px;
  margin: 0 auto;
}

.form-section {
  margin-bottom: 6px;
  padding: 4px 6px;
  background-color: var(--el-fill-color-light);
  border-radius: 4px;
}

.section-title {
  font-size: 11px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  margin-bottom: 6px;
  padding-bottom: 3px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.form-row {
  display: flex;
  gap: 4px;
  margin-bottom: 4px;
}

.host-item {
  flex: 3;
  margin-bottom: 0;
}

.port-item {
  flex: 1;
  margin-bottom: 0;
  min-width: 120px;
}

.user-item {
  flex: 1;
  margin-bottom: 0;
  min-width: 120px;
}

.auth-item {
  flex: 2;
  margin-bottom: 0;
}

.encoding-item {
  margin-bottom: 4px;
}

.remark-item {
  margin-bottom: 0;
}

.form-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
  padding-top: 6px;
  border-top: 1px solid var(--el-border-color-light);
}

:deep(.el-input-number) {
  width: 100%;
}

:deep(.el-input-number .el-input__inner) {
  height: 24px;
  line-height: 24px;
  padding: 0 6px;
  width: 100%;
}

:deep(.el-input__wrapper) {
  padding: 0 6px;
}

:deep(.el-input__inner) {
  height: 24px !important;
  line-height: 24px !important;
  font-size: 11px;
  width: 95%;
}

:deep(.el-select__wrapper) {
  height: 24px !important;
}

:deep(.el-select .el-input__inner) {
  height: 24px !important;
  line-height: 24px !important;
}

:deep(.el-button--small) {
  height: 24px;
  line-height: 24px;
  padding: 0 8px;
}

:deep(.el-form-item__label) {
  line-height: 24px;
  height: 24px;
  font-size: 11px;
}

:deep(.el-form-item__content) {
  line-height: 24px;
  min-height: 24px;
}

:deep(.el-radio) {
  margin-right: 8px;
  height: 24px;
  line-height: 24px;
}

:deep(.el-radio__input) {
  height: 24px;
  line-height: 24px;
}

:deep(.el-radio__label) {
  font-size: 11px;
  padding-left: 4px;
  height: 24px;
  line-height: 24px;
}

/* 移除数字输入框的箭头 */
:deep(.el-input-number.no-arrows .el-input-number__decrease),
:deep(.el-input-number.no-arrows .el-input-number__increase) {
  display: none;
}

/* 调整所有输入框的内边距 */
:deep(.el-input .el-input__wrapper) {
  padding: 0 8px;
}

/* 调整下拉框的样式 */
:deep(.el-select .el-input .el-input__wrapper) {
  padding: 0 8px;
}

/* 调整表单间距 */
.form-section {
  margin-bottom: 6px;
  padding: 6px;
}

.form-row {
  gap: 6px;
  margin-bottom: 6px;
}

/* 调整按钮区域 */
.form-buttons {
  margin-top: 8px;
  padding-top: 6px;
}

/* 调整标题样式 */
.section-title {
  margin-bottom: 6px;
  padding-bottom: 3px;
}

/* 修改对话框标题样式 */
:deep(.el-dialog__title) {
  font-size: 14px;
  text-align: center;
  display: block;
}

/* 调整所有输入框的高度和文字对齐 */
:deep(.el-input__wrapper) {
  padding: 0 6px;
  height: 28px !important;
  display: flex;
  align-items: center;
}

:deep(.el-input__inner) {
  height: 28px !important;
  line-height: 28px !important;
  font-size: 12px;
  text-align: center;
  vertical-align: middle;
}

/* 调整数字输入框 */
:deep(.el-input-number .el-input__wrapper) {
  height: 28px !important;
  display: flex;
  align-items: center;
}

/* 调整下拉框 */
:deep(.el-select .el-input__wrapper) {
  height: 28px !important;
  display: flex;
  align-items: center;
}

/* 调整单选框垂直对齐 */
:deep(.el-radio) {
  display: flex;
  align-items: center;
  height: 28px;
}

.encoding-item, .remark-item {
  flex: auto;
  min-width: auto;
}

/* 调整所有输入框的样式 */
:deep(.el-input__wrapper) {
  padding: 0 6px;
  height: 28px !important;
  display: flex;
  align-items: center;
  justify-content: center;  /* 水平居中 */
}

:deep(.el-input__inner) {
  height: 28px !important;
  line-height: 28px !important;
  font-size: 12px;
  text-align: center;
  padding: 0;  /* 移除内边距 */
  margin: 0;   /* 移除外边距 */
}

/* 调整下拉框的样式 */
:deep(.el-select .el-input__wrapper) {
  justify-content: center;
}

:deep(.el-select .el-input__inner) {
  text-align: center;
}

/* 调整数字输入框的样式 */
:deep(.el-input-number .el-input__wrapper) {
  justify-content: center;
}

:deep(.el-input-number .el-input__inner) {
  text-align: center;
  padding: 0;
}

/* 确保输入框内容不会被截断 */
:deep(.el-input__wrapper.is-focus) {
  box-shadow: none;  /* 移除焦点时的阴影，避免影响对齐 */
}
</style>
