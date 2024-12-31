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
    // 初始化终端
    this._terminal = null;
    // 终端配置选项
    this.options = options;
    // 终端适配器
    this._fitAddon = null;
    // 终端链接插件
    this._webLinksAddon = null;
    // 终端搜索插件
    this._searchAddon = null;
    // 终端尺寸
    this._lastDimensions = { cols: 0, rows: 0 };
    // 终端写入队列
    this.writeQueue = []
    // 终端写入状态
    this.isWriting = false
    // 已加载插件集合
    this._addons = new Set() // 用于跟踪所有已加载的插件
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

    this._terminal = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: this.options.fontSize || 14,
      fontFamily: 'Consolas, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4'
      },
      allowTransparency: true,
      scrollback: 10000,
      convertEol: true
    })
    
    try {
      // 创建并加载插件
      this._fitAddon = new FitAddon()
      this._webLinksAddon = new WebLinksAddon()
      this._searchAddon = new SearchAddon()

      // 按顺序加载插件并记录
      this._loadAddon(this._fitAddon)
      this._loadAddon(this._webLinksAddon)
      this._loadAddon(this._searchAddon)
      
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
            this.handlePaste()
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
            e.preventDefault() // 阻止默认粘贴行为
            this.handlePaste()
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
   * 安全地加载插件的辅助方法
   * @param {Object} addon - 要加载的插件
   */
  _loadAddon(addon) {
    if (addon && this._terminal) {
      try {
        this._terminal.loadAddon(addon)
        this._addons.add(addon)
      } catch (error) {
        console.warn(`Failed to load addon:`, error)
      }
    }
  }

  /**
   * 安全地卸载插件的辅助方法
   * @param {Object} addon - 要卸载的插件
   */
  _disposeAddon(addon) {
    if (addon && this._addons.has(addon)) {
      try {
        addon.dispose()
      } catch (error) {
        console.warn(`Addon cleanup warning:`, error)
      }
      this._addons.delete(addon)
    }
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

      // 获新的尺寸
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
      if (this._terminal) {
        // 1. 移除所有事件监听器
        if (this._terminal._events) {
          this._terminal._events = {}
        }

        // 2. 按照加载的相反顺序卸载插件
        this._disposeAddon(this._searchAddon)
        this._disposeAddon(this._webLinksAddon)
        this._disposeAddon(this._fitAddon)

        // 3. 清空插件引用
        this._searchAddon = null
        this._webLinksAddon = null
        this._fitAddon = null
        this._addons.clear()

        // 4. 最后销毁终端
        if (!this._terminal._disposed) {
          try {
            this._terminal.dispose()
          } catch (error) {
            console.warn('Terminal dispose warning:', error)
          }
        }

        // 5. 清空终端引用
        this._terminal = null
      }
    } catch (error) {
      console.warn('Terminal cleanup warning:', error)
    }
  }

  // 添加统一的粘贴处理方法
  async handlePaste() {
    try {
      const text = await window.electron.ipcRenderer.invoke('clipboard-read')
      if (text && this._terminal) {
        // 只通过 onKey 事件处理粘贴的内容
        for (const char of text) {
          this._terminal._core._onKey.fire({ key: char })
        }
      }
    } catch (err) {
      console.error('粘贴失败:', err)
    }
  }
}