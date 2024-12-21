<template>
  <div class="file-manager">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="path-nav">
        <el-breadcrumb>
          <el-breadcrumb-item v-for="(part, index) in currentPath" :key="index">
            {{ part }}
          </el-breadcrumb-item>
        </el-breadcrumb>
      </div>
      <div class="tools">
        <el-button-group>
          <el-button size="small" @click="refresh">
            <el-icon><Refresh /></el-icon>
          </el-button>
          <el-button size="small" @click="uploadFile">
            <el-icon><Upload /></el-icon>上传
          </el-button>
          <el-button size="small" @click="createFolder">
            <el-icon><FolderAdd /></el-icon>新建文件夹
          </el-button>
        </el-button-group>
      </div>
    </div>

    <!-- 文件列表 -->
    <el-table 
      :data="currentPageData" 
      style="width: 100%"
      v-loading="loading"
    >
      <el-table-column prop="name" label="文件名" min-width="200">
        <template #default="{ row }">
          <div class="file-name-cell">
            <el-icon v-if="row.type === 'directory'"><Folder /></el-icon>
            <el-icon v-else><Document /></el-icon>
            <span class="file-name" @click="handleFileClick(row)">{{ row.name }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="size" label="大小" width="120">
        <template #default="{ row }">
          {{ formatFileSize(row.size) }}
        </template>
      </el-table-column>
      <el-table-column prop="permissions" label="权限" width="100" />
      <el-table-column prop="modifiedTime" label="修改时间" width="180" />
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button-group>
            <el-button size="small" @click="downloadFile(row)">
              <el-icon><Download /></el-icon>
            </el-button>
            <el-button size="small" @click="renameFile(row)">
              <el-icon><Edit /></el-icon>
            </el-button>
            <el-button size="small" type="danger" @click="deleteFile(row)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </el-button-group>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页器 -->
    <div class="pagination-container">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="fileList.length"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  Folder, Document, Refresh, Upload, FolderAdd,
  Download, Edit, Delete
} from '@element-plus/icons-vue'

const props = defineProps({
  connectionId: {
    type: String,
    required: true
  }
})

// 状态变量
const currentPath = ref(['/'])
const fileList = ref([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)

// 计算当前页的数据
const currentPageData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return fileList.value.slice(start, end)
})

// 加载文件列表
const loadFileList = async () => {
  loading.value = true
  try {
    // TODO: 实现从服务器获取文件列表
    // const response = await window.electron.ipcRenderer.invoke('list-files', {
    //   connectionId: props.connectionId,
    //   path: currentPath.value.join('/')
    // })
    // fileList.value = response
  } catch (error) {
    console.error('加载文件列表失败:', error)
    ElMessage.error('加载文件列表失败')
  } finally {
    loading.value = false
  }
}

// 处理文件点击
const handleFileClick = (file) => {
  if (file.type === 'directory') {
    currentPath.value.push(file.name)
    loadFileList()
  }
}

// 分页相关方法
const handleSizeChange = (val) => {
  pageSize.value = val
  currentPage.value = 1
}

const handleCurrentChange = (val) => {
  currentPage.value = val
}

// 文件大小格式化
const formatFileSize = (size) => {
  if (!size) return '-'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let index = 0
  let fileSize = size

  while (fileSize >= 1024 && index < units.length - 1) {
    fileSize /= 1024
    index++
  }

  return `${fileSize.toFixed(2)} ${units[index]}`
}

// 其他文件操作方法
const refresh = () => {
  loadFileList()
}

const uploadFile = () => {
  // TODO: 实现文件上传
}

const createFolder = () => {
  // TODO: 实现创建文件夹
}

const downloadFile = (file) => {
  // TODO: 实现文件下载
}

const renameFile = (file) => {
  // TODO: 实现文件重命名
}

const deleteFile = (file) => {
  // TODO: 实现文件删除
}

onMounted(() => {
  loadFileList()
})
</script>

<style scoped>
.file-manager {
  height: 100%;
  display: flex;
  flex-direction: column;
  flex: 1;
  background: #fff;
}

.toolbar {
  padding: 8px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.path-nav {
  flex: 1;
  margin-right: 16px;
}

.tools {
  display: flex;
  gap: 8px;
}

:deep(.el-table) {
  flex: 1;
  overflow: auto;
}

.pagination-container {
  padding: 10px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
}

.file-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-name {
  cursor: pointer;
}

.file-name:hover {
  color: var(--el-color-primary);
}

/* 确保图标垂直居中 */
:deep(.el-icon) {
  display: flex;
  align-items: center;
}
</style> 