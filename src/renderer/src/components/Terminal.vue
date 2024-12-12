<template>
  <div ref="terminalContainer" class="terminal-container"></div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

// Props
const props = defineProps({
  fontSize: { type: Number, default: 14 },
  rows: { type: Number, default: 30 },
  cols: { type: Number, default: 80 },
});

// 定义引用和状态
const terminalContainer = ref(null);
const terminal = ref(null);
const fitAddon = ref(null);

// 初始化终端
const initTerminal = () => {
  terminal.value = new Terminal({
    fontSize: props.fontSize,
    rows: props.rows,
    cols: props.cols,
    cursorBlink: true,
  });

  fitAddon.value = new FitAddon();
  terminal.value.loadAddon(fitAddon.value);

  if (terminalContainer.value) {
    terminal.value.open(terminalContainer.value);
    fitAddon.value.fit();
  }

  // 示例输出
  terminal.value.writeln('Welcome to your custom terminal!');
  terminal.value.writeln('Type commands below...');
};

// 调整终端大小
const resizeTerminal = () => {
  if (fitAddon.value) fitAddon.value.fit();
};

// 初始化和销毁生命周期
onMounted(() => {
  initTerminal();
  window.addEventListener('resize', resizeTerminal);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeTerminal);
  terminal.value?.dispose();
});

// 曝露方法
defineExpose({
  write: (data) => terminal.value?.write(data),
  onData: (callback) => terminal.value?.onData(callback),
});
</script>

<style>
.terminal-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: #1e1e1e;
}
</style>
