import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'
import { SearchAddon } from 'xterm-addon-search'

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
    this._terminal = null;
    this.options = options;
    this._fitAddon = null;
    this._lastDimensions = { cols: 0, rows: 0 };
    this.writeQueue = []
    this.isWriting = false
  }

  /**
   * 初始化终端
   * @param {HTMLElement} container - 终端容器DOM元素
   * @returns {Terminal} - 终端实例
   */
  init(container) {
    if (this._terminal) {
      return this._terminal
    }

    this._terminal = new Terminal(this.options)
    this._fitAddon = new FitAddon()
    
    try {
      this._terminal.loadAddon(this._fitAddon)
      this._terminal.loadAddon(new WebLinksAddon())
      this._terminal.loadAddon(new SearchAddon())
      
      if (container) {
        this._terminal.open(container)
        
        // 设置 TERM 环境变量
        this._terminal.write('\x1b]77;TERM=xterm\x07')
        
        // 使用 IPC 处理右键菜单
        container.addEventListener('contextmenu', async (e) => {
          e.preventDefault()
          const selection = this._terminal.getSelection()
          
          // 通过 IPC 显示上下文菜单
          const result = await window.electron.ipcRenderer.invoke('show-context-menu', {
            hasSelection: !!selection
          })

          if (result === 'copy' && selection) {
            await window.electron.ipcRenderer.invoke('clipboard-write', selection)
          } else if (result === 'paste') {
            const text = await window.electron.ipcRenderer.invoke('clipboard-read')
            this._terminal.paste(text)
          } else if (result === 'selectAll') {
            this._terminal.selectAll()
          }
        })

        // 处理键盘快捷键
        container.addEventListener('keydown', async (e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
            const selection = this._terminal.getSelection()
            if (selection) {
              await window.electron.ipcRenderer.invoke('clipboard-write', selection)
            }
          }
          if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
            const text = await window.electron.ipcRenderer.invoke('clipboard-read')
            this._terminal.paste(text)
          }
        })

        setTimeout(() => {
          this.resize()
        }, 0)
      }
    } catch (error) {
      console.error('Terminal initialization error:', error)
    }
    
    return this._terminal
  }

  /**
   * 调整终端大小
   */
  resize() {
    try {
      if (!this._terminal || !this._fitAddon) return;

      // 获取调整前的尺寸
      const oldDimensions = {
        cols: this._terminal.cols,
        rows: this._terminal.rows
      };

      // 调整终端大小
      this._fitAddon.fit();

      // 获取新的尺寸
      const newDimensions = {
        cols: this._terminal.cols,
        rows: this._terminal.rows
      };

      // 只有当尺寸真正发生变化时才触发更新
      if (oldDimensions.cols !== newDimensions.cols || 
          oldDimensions.rows !== newDimensions.rows) {
        this._lastDimensions = newDimensions;
        this._terminal.refresh(0, this._terminal.rows - 1);
      }
    } catch (error) {
      console.error('Resize error:', error);
    }
  }

  /**
   * 获取当前终端尺寸
   */
  getDimensions() {
    return this._lastDimensions;
  }

  /**
   * 向终端写入数据
   * @param {string} data - 要写入的数据
   */
  write(data) {
    try {
      if (!this._terminal) return;

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
        this._terminal.write(chunk);
        const currentLine = this._terminal.buffer.active.baseY + this._terminal.buffer.active.cursorY;
        const maxLines = this._terminal.rows;
        if (currentLine > maxLines - this.options.scrollBottomOffset) {
          this._terminal.scrollLines(currentLine - (maxLines - this.options.scrollBottomOffset));
        }
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
      if (this._terminal) {
        this._terminal.writeln(data)
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
      if (this._terminal) {
        this._terminal.clear()
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
      if (this._terminal) {
        return this._terminal.onData(callback)
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
      if (this._fitAddon) {
        this._fitAddon.dispose()
        this._fitAddon = null
      }
      if (this._terminal) {
        this._terminal.dispose()
        this._terminal = null
      }
    } catch (error) {
      console.error('Dispose error:', error)
    }
  }
}