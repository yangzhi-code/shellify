<template>
  <div class="about-section">
    <!-- 应用信息卡片 -->
    <div class="app-info-card">
      <div class="app-header">
        <div class="app-icon">
          <el-icon size="48"><Monitor /></el-icon>
        </div>
        <div class="app-title">
          <h3>Shellify</h3>
          <span v-if="appVersion" class="app-version">v{{ appVersion }}</span>
        </div>
      </div>

      <div class="app-details">
        <div class="detail-row">
          <el-icon><Message /></el-icon>
          <span class="detail-label">邮箱：</span>
          <span class="detail-value">1265728251@qq.com</span>
        </div>
        <div class="detail-row">
          <el-icon><Link /></el-icon>
          <span class="detail-label">官网：</span>
          <a href="#" @click.prevent="openWebsite" class="detail-link">shellify.yangzhi.me</a>
        </div>
        <div class="detail-row">
          <el-icon><Document /></el-icon>
          <span class="detail-label">功能：</span>
          <span class="detail-value">现代化的 SSH 终端管理工具</span>
        </div>
      </div>
    </div>

    <!-- 功能特性 -->
    <div class="features-section">
      <h4>主要特性</h4>
      <div class="features-grid">
        <div class="feature-item">
          <el-icon><Monitor /></el-icon>
          <span>多会话管理</span>
        </div>
        <div class="feature-item">
          <el-icon><Setting /></el-icon>
          <span>个性化配置</span>
        </div>
        <div class="feature-item">
          <el-icon><Edit /></el-icon>
          <span>文本编辑器</span>
        </div>
        <div class="feature-item">
          <el-icon><Operation /></el-icon>
          <span>文件传输</span>
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="action-section">
      <el-button type="primary" @click="openWebsite" icon="Link" class="action-button">
        访问官网
      </el-button>
      <el-button @click="openFeedback" icon="Message" class="action-button">
        意见反馈
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Monitor, Message, Link, Document, Setting, Edit, Operation } from '@element-plus/icons-vue'

// 本组件自行获取应用版本
const appVersion = ref('')

// 获取应用版本信息
const loadAppInfo = async () => {
  try {
    const version = await window.electron.ipcRenderer.invoke('system:get-app-version')
    appVersion.value = version || ''
  } catch (error) {
    console.error('获取应用版本失败:', error)
    appVersion.value = ''
  }
}

onMounted(async () => {
  await loadAppInfo()
})

// 打开官网
const openWebsite = () => {
  window.open('https://shellify.yangzhi.me', '_blank')
}

// 打开反馈页面
const openFeedback = () => {
  window.open('https://shellify.yangzhi.me/prod-api/q/wnTmYv', '_blank')
}
</script>

<style scoped>
.about-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 600px;
  margin: 0 auto;
  user-select: text;
}

.app-info-card {
  background: var(--el-bg-color-page);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  user-select: text;
}

.app-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.app-icon {
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.app-title h3 {
  margin: 0 0 4px 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  user-select: text;
}

.app-version {
  color: var(--el-text-color-regular);
  font-size: 14px;
  background: var(--el-fill-color-lighter);
  padding: 2px 8px;
  border-radius: 12px;
  user-select: text;
}

.app-details {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
}

.detail-row .el-icon {
  color: var(--el-text-color-regular);
  font-size: 16px;
  min-width: 16px;
}

.detail-label {
  font-weight: 500;
  color: var(--el-text-color-regular);
  min-width: 60px;
}

.detail-value {
  color: var(--el-text-color-primary);
  flex: 1;
  user-select: text;
}

.detail-link {
  color: var(--el-color-primary);
  text-decoration: none;
  transition: color 0.3s ease;
  user-select: text;
}

.detail-link:hover {
  color: var(--el-color-primary-dark-2);
  text-decoration: underline;
}

.features-section h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  user-select: text;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: var(--el-bg-color-page);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  transition: all 0.3s ease;
  user-select: text;
}

.feature-item:hover {
  border-color: var(--el-color-primary-light-5);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
}

.feature-item .el-icon {
  color: var(--el-color-primary);
  font-size: 18px;
}

.feature-item span {
  color: var(--el-text-color-regular);
  font-size: 14px;
}

.action-section {
  display: flex;
  justify-content: center;
  gap: 12px;
  padding: 20px 0;
  margin-top: 8px;
}

.action-button {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;

}
</style>


