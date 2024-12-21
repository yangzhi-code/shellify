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
    this.options = {
      cursorBlink: true,
      theme: {
        background: '#1e1e1e',
        foreground: '#ffffff'
      },
      scrollback: options.scrollback || 1000,
      convertEol: options.convertEol !== false,
      scrollBottomOffset: 5,
      scrollOnOutput: true,
      ...options
    }
    this.terminal = null
    this.fitAddon = null
    this.writeQueue = []
    this.isWriting = false
  }

  /**
   * 初始化终端
   * @param {HTMLElement} container - 终端容器DOM元素
   * @returns {Terminal} - 终端实例
   */
  init(container) {
    if (this.terminal) {
      return this.terminal
    }

    this.terminal = new Terminal(this.options)
    this.fitAddon = new FitAddon()
    
    try {
      this.terminal.loadAddon(this.fitAddon)
      this.terminal.loadAddon(new WebLinksAddon())
      this.terminal.loadAddon(new SearchAddon())
      
      if (container) {
        this.terminal.open(container)
        
        // 使用 IPC 处理右键菜单
        container.addEventListener('contextmenu', async (e) => {
          e.preventDefault()
          const selection = this.terminal.getSelection()
          
          // 通过 IPC 显示上下文菜单
          const result = await window.electron.ipcRenderer.invoke('show-context-menu', {
            hasSelection: !!selection
          })

          if (result === 'copy' && selection) {
            await window.electron.ipcRenderer.invoke('clipboard-write', selection)
          } else if (result === 'paste') {
            const text = await window.electron.ipcRenderer.invoke('clipboard-read')
            this.terminal.paste(text)
          } else if (result === 'selectAll') {
            this.terminal.selectAll()
          }
        })

        // 处理键盘快捷键
        container.addEventListener('keydown', async (e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
            const selection = this.terminal.getSelection()
            if (selection) {
              await window.electron.ipcRenderer.invoke('clipboard-write', selection)
            }
          }
          if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
            const text = await window.electron.ipcRenderer.invoke('clipboard-read')
            this.terminal.paste(text)
          }
        })

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
        const currentLine = this.terminal.buffer.active.baseY + this.terminal.buffer.active.cursorY;
        const maxLines = this.terminal.rows;
        if (currentLine > maxLines - this.options.scrollBottomOffset) {
          this.terminal.scrollLines(currentLine - (maxLines - this.options.scrollBottomOffset));
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