<template>
  <el-form
    class="server-config-form"
    :model="form"
    :rules="rules"
    ref="formRef"
    size="small"
    label-width="100px"
  >
    <!-- 基本信息 -->
    <div class="form-section">
      <div class="section-title">基本信息</div>
      <el-form-item label="名称" prop="name">
        <el-input v-model="form.name" placeholder="名称" />
      </el-form-item>
      <el-form-item label="主机" prop="host">
        <el-input v-model="form.host" placeholder="主机地址">
          <template #append>
            <el-button @click="testConnection">测试连接</el-button>
          </template>
        </el-input>
      </el-form-item>
      <el-form-item label="端口" prop="port">
        <el-input-number v-model="form.port" :min="1" :max="65535" />
      </el-form-item>
    </div>

    <!-- 认证设置 -->
    <div class="form-section">
      <div class="section-title">认证设置</div>
      <el-form-item label="认证方式" prop="authMethod">
        <el-radio-group v-model="form.authMethod">
          <el-radio label="password">密码认证</el-radio>
          <el-radio label="key">密钥认证</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="用户名" prop="username">
        <el-input v-model="form.username" placeholder="用户名">
          <template #prepend>
            <el-select v-model="form.username" style="width: 90px">
              <el-option label="root" value="root" />
              <el-option label="admin" value="admin" />
            </el-select>
          </template>
        </el-input>
      </el-form-item>

      <!-- 密码认证 -->
      <template v-if="form.authMethod === 'password'">
        <el-form-item label="密码" prop="password">
          <el-input 
            v-model="form.password" 
            type="password" 
            placeholder="请输入密码" 
            show-password
          />
        </el-form-item>
      </template>

      <!-- 密钥认证 -->
      <template v-if="form.authMethod === 'key'">
        <el-form-item label="私钥文件" prop="privateKey">
          <div class="key-upload">
            <el-input v-model="privateKeyPath" placeholder="选择私钥文件" readonly>
              <template #append>
                <el-button @click="selectPrivateKey">浏览...</el-button>
              </template>
            </el-input>
          </div>
        </el-form-item>
        <el-form-item label="密钥密码" prop="passphrase">
          <el-input 
            v-model="form.passphrase" 
            type="password" 
            placeholder="如果私钥有密码保护，请输入"
            show-password
          />
        </el-form-item>
      </template>
    </div>

    <!-- 高级设置 -->
    <div class="form-section">
      <div class="section-title">高级设置</div>
      <el-form-item label="字符编码">
        <el-select v-model="form.encoding" placeholder="选择字符编码">
          <el-option label="UTF-8" value="utf8" />
          <el-option label="GBK" value="gbk" />
        </el-select>
      </el-form-item>
      <el-form-item label="备注">
        <el-input 
          type="textarea" 
          v-model="form.remark" 
          placeholder="备注信息"
          :rows="2"
        />
      </el-form-item>
    </div>

    <!-- 按钮区域 -->
    <div class="form-buttons">
      <el-button @click="$emit('cancel')">取消</el-button>
      <el-button type="primary" @click="onSubmit">确定</el-button>
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
    when: (form) => form.authMethod === 'password'
  }],
  privateKey: [{
    required: true,
    message: '请选择私钥文件',
    trigger: 'change',
    when: (form) => form.authMethod === 'key'
  }]
}

// 测试连接
const testConnection = async () => {
  try {
    ElMessage.info('正在测试连接...')
    // TODO: 实现连接测试逻辑
  } catch (error) {
    ElMessage.error('连接测试失败')
  }
}

// 选择私钥文件
const selectPrivateKey = async () => {
  try {
    // TODO: 调用 electron 的文件选择对话框
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
const onSubmit = () => {
  formRef.value.validate((valid) => {
    if (valid) {
      emit('update-node', form.value)
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
  padding: 15px;
  max-height: 80vh;
  overflow-y: auto;
}

.form-section {
  margin-bottom: 20px;
  padding: 15px;
  background-color: var(--el-fill-color-light);
  border-radius: 4px;
}

.section-title {
  font-size: 14px;
  font-weight: bold;
  color: var(--el-text-color-primary);
  margin-bottom: 15px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.key-upload {
  display: flex;
  align-items: center;
  gap: 8px;
}

.form-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--el-border-color-light);
}

:deep(.el-input-number) {
  width: 100%;
}

:deep(.el-select) {
  width: 100%;
}

:deep(.el-radio-group) {
  width: 100%;
}

:deep(.el-form-item) {
  margin-bottom: 18px;
}

:deep(.el-form-item:last-child) {
  margin-bottom: 0;
}
</style>
