import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'

/**
 * 终端管理器类
 * 负责管理xterm终端实例及其基本操作
 */
export class TerminalManager {
  /**
   * 构造函数
   * @param {Object} options - 终端配置选项
   */
  constructor(options = {}) {
    this.terminal = null        // xterm终端实例
    this.fitAddon = null       // 终端自适应插件实例
    this.options = {
      fontSize: options.fontSize || 14,      // 字体大小
      rows: options.rows || 30,             // 终端行数
      cols: options.cols || 80,             // 终端列数
      cursorBlink: true,                    // 光标闪烁
      mouseEvents: true,                    // 鼠标事件支持
      enableClipboard: true,                // 剪贴板支持
      copyOnSelection: true                 // 选中自动复制
    }
  }

  /**
   * 初始化终端
   * @param {HTMLElement} container - 终端容器DOM元素
   * @returns {Terminal} - 终端实例
   */
  init(container) {
    this.terminal = new Terminal(this.options)
    this.fitAddon = new FitAddon()
    this.terminal.loadAddon(this.fitAddon)
    
    if (container) {
      this.terminal.open(container)
      this.fitAddon.fit()
    }
    
    return this.terminal
  }

  /**
   * 调整终端大小以适应容器
   */
  resize() {
    this.fitAddon?.fit()
  }

  /**
   * 向终端写入数据
   * @param {string} data - 要写入的数据
   */
  write(data) {
    this.terminal?.write(data)
  }

  /**
   * 向终端写入一行数据
   * @param {string} data - 要写入的数据
   */
  writeln(data) {
    this.terminal?.writeln(data)
  }

  /**
   * 清空终端内容
   */
  clear() {
    this.terminal?.clear()
  }

  /**
   * 绑定数据输入事件
   * @param {Function} callback - 数据输入回调函数
   */
  onData(callback) {
    return this.terminal?.onData(callback)
  }

  /**
   * 销毁终端实例
   */
  dispose() {
    this.terminal?.dispose()
  }
}