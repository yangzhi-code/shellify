<template>
  <div class="search-bar">
    <div class="search-input">
      <el-icon class="search-icon"><Search /></el-icon>
      <input
        :value="keyword"
        @input="updateKeyword($event.target.value)"
        class="input-field"
        placeholder="搜索文件..."
        @keyup.enter="handleSearch"
      />
      <el-icon 
        v-if="keyword" 
        class="clear-icon" 
        @click="handleClear"
      >
        <Close />
      </el-icon>
    </div>
    <div class="search-options">
      <el-checkbox 
        v-model="caseSensitive"
        size="small"
      >
        区分大小写
      </el-checkbox>
      <el-checkbox 
        v-model="recursive"
        size="small"
      >
        搜索子目录
      </el-checkbox>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { Search, Close } from '@element-plus/icons-vue';

const props = defineProps({
  modelValue: {
    type: Object,
    required: true,
    default: () => ({
      keyword: '',
      options: {
        caseSensitive: false,
        recursive: true
      }
    })
  }
});

const emit = defineEmits(['update:modelValue', 'search', 'clear']);

// 本地状态
const keyword = ref('');
const caseSensitive = ref(false);
const recursive = ref(true);

// 监听 props 变化，更新本地状态
watch(() => props.modelValue, (newVal) => {
  keyword.value = newVal.keyword;
  caseSensitive.value = newVal.options.caseSensitive;
  recursive.value = newVal.options.recursive;
}, { immediate: true, deep: true });

// 监听本地状态变化，通知父组件
watch([keyword, caseSensitive, recursive], () => {
  emit('update:modelValue', {
    keyword: keyword.value,
    options: {
      caseSensitive: caseSensitive.value,
      recursive: recursive.value
    }
  });

  // 当搜索框被清空时（包括退格清空），触发搜索
  if (!keyword.value) {
    emit('search', {
      keyword: '',
      options: {
        caseSensitive: caseSensitive.value,
        recursive: recursive.value
      }
    });
  }
}, { deep: true });

const updateKeyword = (value) => {
  keyword.value = value;
};

const handleSearch = () => {
  console.log('搜索触发', keyword.value, { caseSensitive: caseSensitive.value, recursive: recursive.value });
  emit('search', {
    keyword: keyword.value.trim(),
    options: {
      caseSensitive: caseSensitive.value,
      recursive: recursive.value
    }
  });
};

const handleClear = () => {
  keyword.value = '';
  emit('search', {
    keyword: '',
    options: {
      caseSensitive: caseSensitive.value,
      recursive: recursive.value
    }
  });
};
</script>

<style scoped>
.search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 24px;
}

.search-input {
  position: relative;
  width: 160px;
  height: 24px;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  background-color: var(--el-input-bg-color);
  transition: all 0.2s;
  box-sizing: border-box;
  padding: 0 28px;
}

.search-input:hover,
.search-input:focus-within {
  border-color: var(--el-color-primary);
}

.input-field {
  width: 100%;
  height: 22px;
  line-height: 22px;
  font-size: 12px;
  color: var(--el-text-color-regular);
  border: none;
  outline: none;
  background: none;
  padding: 0;
  margin: 0;
  display: block;
}

.search-icon {
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
  color: var(--el-text-color-placeholder);
}

.clear-icon {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
  color: var(--el-text-color-placeholder);
  cursor: pointer;
}

.search-options {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 24px;
}

:deep(.el-checkbox) {
  margin: 0;
  font-size: 12px;
  display: flex;
  align-items: center;
  min-height: 24px;
}

:deep(.el-checkbox__label) {
  font-size: 12px;
  line-height: 1;
  height: 24px;
  display: flex;
  align-items: center;
  white-space: nowrap;
}
</style> 