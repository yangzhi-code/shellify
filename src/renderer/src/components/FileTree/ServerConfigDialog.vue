<template>
  <el-form
    class="server-config-form"
    :model="form"
    :rules="rules"
    ref="formRef"
    size="small"
  >
    <el-form-item label="名称" prop="name">
      <el-input v-model="form.name" placeholder="名称" />
    </el-form-item>
    <el-form-item label="主机" prop="host">
      <el-input v-model="form.host" placeholder="主机地址" />
    </el-form-item>
    <el-form-item label="端口" prop="port">
      <el-input-number v-model="form.port" :min="1" :max="65535" />
    </el-form-item>
    <el-form-item label="备注">
      <el-input type="textarea" v-model="form.remark" placeholder="备注" />
    </el-form-item>
    <el-form-item label="认证" prop="authMethod">
      <el-select v-model="form.authMethod" placeholder="认证方法">
        <el-option label="密码" value="password" />
        <el-option label="私钥" value="key" />
      </el-select>
    </el-form-item>
    <el-form-item label="用户名" prop="username">
      <el-input v-model="form.username" placeholder="用户名" />
    </el-form-item>
    <el-form-item v-if="form.authMethod === 'password'" label="密码" prop="password">
      <el-input v-model="form.password" placeholder="密码" show-password />
    </el-form-item>
    <el-form-item v-if="form.authMethod === 'key'" label="私钥" prop="privateKey">
      <el-upload
        action=""
        :auto-upload="false"
        :file-list="privateKeyList"
        :on-change="handleFileChange"
        list-type="text"
      >
        <el-button type="primary" size="mini">选择文件</el-button>
      </el-upload>
    </el-form-item>
    <!-- 按钮区域 -->
    <el-form-item>
      <div class="form-buttons">
        <el-button type="primary" size="small" @click="onSubmit">确定</el-button>
      </div>
    </el-form-item>
  </el-form>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { ElMessage } from "element-plus";

// 定义表单数据和校验规则
const form = ref({
  name: "",
  host: "",
  port: 22,
  remark: "",
  authMethod: "password",
  username: "root",
  password: "",
  privateKey: null,
});

const privateKeyList = ref([]);
const formRef = ref(null);

const rules = {
  name: [{ required: true, message: "名称不能为空", trigger: "blur" }],
  host: [{ required: true, message: "主机地址不能为空", trigger: "blur" }],
  port: [
    { required: true, message: "端口号不能为空", trigger: "blur" },
    { type: "number", min: 1, max: 65535, message: "端口号必须在1-65535之间", trigger: "blur" },
  ],
  authMethod: [{ required: true, message: "请选择认证方法", trigger: "change" }],
  username: [{ required: true, message: "用户名不能为空", trigger: "blur" }],
  password: [{ required: true, message: "密码不能为空", trigger: "blur", when: (form) => form.authMethod === "password" }],
  privateKey: [{ required: true, message: "请上传私钥文件", trigger: "change", when: (form) => form.authMethod === "key" }],
};

// 事件发射器
const emit = defineEmits(["updata-node"])

// 接收父组件传递的节点数据
const props = defineProps({
  node: { type: Object, required: true }
})
// 文件选择处理
const handleFileChange = (file) => {
  privateKeyList.value = [file];
  form.value.privateKey = file.raw;
};

// 提交表单
const onSubmit = () => {
  formRef.value.validate((valid) => {
    if (valid) {
      emit('updata-node', form.value)
    } else {
      ElMessage.error("请检查表单输入");
    }
  });
};
onMounted(() => {
  // 初始化表单数据
  if (props.node.info) {
    form.value = props.node.info
  }
  
})
</script>

<style scoped>
.server-config-form {
  padding: 5px;
}

.el-form-item {
  margin-bottom: 12px;
}

.form-buttons {
  display: flex;
  justify-content: flex-end; /* 确保按钮靠右 */
  gap: 8px;
  width: 100%; /* 占满父容器宽度 */
}

.el-input,
.el-input-number,
.el-select {
  width: 100%;
}

.el-button {
  margin: 0;
}
.el-form-item__label {
  text-align: left; /* 设置文字左对齐 */
}

</style>
