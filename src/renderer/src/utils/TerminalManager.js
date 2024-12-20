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
      copyOnSelection: true,                 // 选中自动复制
      scrollback: 1000,                     // 限制历史记录行数
      disableStdin: false,                 // 启用输入
      rendererType: 'canvas',              // 使用 canvas 渲染
      allowTransparency: false,            // 禁用透明度
      fastScrollModifier: 'alt',           // 快速滚动修饰键
      screenReaderMode: false,             // 禁用屏幕阅读模式
      minimumContrastRatio: 1,             // 最小对比度
      theme: options.theme || {
        background: '#1e1e1e',
        foreground: '#ffffff'
      },
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    }
    this.writeQueue = [];
    this.isWriting = false;
  }

  /**
   * 初始化终端
   * @param {HTMLElement} container - 终端容器DOM元素
   * @returns {Terminal} - 终端实例
   */
  init(container) {
    if (this.terminal) {
      return this.terminal;
    }

    this.terminal = new Terminal(this.options)
    this.fitAddon = new FitAddon()
    
    try {
      this.terminal.loadAddon(this.fitAddon)
      
      if (container) {
        this.terminal.open(container)
        setTimeout(() => {
          this.resize()
        }, 0)
      }
    } catch (error) {
      console.error('Terminal initialization error:', error)
    }
    
    return this.terminal
  }

  /**
   * 调整终端大小以适应容器
   */
  resize() {
    try {
      if (this.fitAddon && this.terminal) {
        this.fitAddon.fit()
        this.terminal.refresh(0, this.terminal.rows - 1)
      }
    } catch (error) {
      console.error('Resize error:', error)
    }
  }

  /**
   * 向终端写入数据
   * @param {string} data - 要写入的数据
   */
  write(data) {
    try {
      if (!this.terminal) return;

      this.writeQueue.push(data);
      if (!this.isWriting) {
        this.processWriteQueue();
      }
    } catch (error) {
      console.error('Write error:', error);
    }
  }

  processWriteQueue() {
    if (!this.writeQueue.length) {
      this.isWriting = false;
      return;
    }

    this.isWriting = true;
    const chunk = this.writeQueue.join('');
    this.writeQueue = [];

    requestAnimationFrame(() => {
      try {
        this.terminal.write(chunk);
      } catch (error) {
        console.error('Write error:', error);
      }
      this.processWriteQueue();
    });
  }

  /**
   * 向终端写入一行数据
   * @param {string} data - 要写入的数据
   */
  writeln(data) {
    try {
      if (this.terminal) {
        this.terminal.writeln(data)
      }
    } catch (error) {
      console.error('Writeln error:', error)
    }
  }

  /**
   * 清空终端内容
   */
  clear() {
    try {
      if (this.terminal) {
        this.terminal.clear()
      }
    } catch (error) {
      console.error('Clear error:', error)
    }
  }

  /**
   * 绑定数据输入事件
   * @param {Function} callback - 数据输入回调函数
   */
  onData(callback) {
    try {
      if (this.terminal) {
        return this.terminal.onData(callback)
      }
    } catch (error) {
      console.error('OnData error:', error)
    }
  }

  /**
   * 销毁终端实例
   */
  dispose() {
    try {
      if (this.fitAddon) {
        this.fitAddon.dispose()
        this.fitAddon = null
      }
      if (this.terminal) {
        this.terminal.dispose()
        this.terminal = null
      }
    } catch (error) {
      console.error('Dispose error:', error)
    }
  }
}