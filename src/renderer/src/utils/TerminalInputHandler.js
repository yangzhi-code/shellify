/**
 * 终端输入处理器类
 * 负责处理终端的键盘输入
 */
export class TerminalInputHandler {
  /**
   * 构造函数
   * @param {TerminalManager} terminalManager - 终端管理器实例
   * @param {TerminalCommandHandler} commandHandler - 命令处理器实例
   */
  constructor(terminalManager, commandHandler) {
    this.terminalManager = terminalManager
    this.commandHandler = commandHandler
    this.currentInput = ''     // 当前输入的命令
    this.isComposing = false; // 输入法状态标记
    this.commandHistory = [];   // 命令历史记录
    this.historyIndex = -1;     // 历史记录索引
  }

  /**
   * 添加输入法模式控制方法
   * @param {boolean} composing - 输入法编辑状态
   */
  setCompositionMode(composing) {
    this.isComposing = composing;
  }

  /**
   * 处理键盘输入
   * @param {string} data - 输入的字符
   * @param {Object} context - 终端上下文信息
   */
  handleInput(data, context) {
    if (this.isComposing) {
      if (context.connectionId) {
        window.electron.ipcRenderer.send('terminal-input', {
          connectionId: context.connectionId,
          input: data
        });
      }
      return;
    }

    if (!context.connectionId) return;

    // 处理特殊键
    switch(data) {
      case '\u001b[A': // 上箭头
        this.handleUpArrow(context);
        break;

      case '\u001b[B': // 下箭头
        this.handleDownArrow(context);
        break;

      case '\r':  // 回车键
        if (this.currentInput.trim()) {
          this.commandHistory.push(this.currentInput);
          this.historyIndex = this.commandHistory.length;
        }
        window.electron.ipcRenderer.send('terminal-input', {
          id: context.connectionId,
          data: '\r'
        });
        this.currentInput = '';
        break;
      
      case '\u007F':  // 退格键
        if (this.currentInput.length > 0) {
          this.currentInput = this.currentInput.slice(0, -1);
          window.electron.ipcRenderer.send('terminal-input', {
            id: context.connectionId,
            data: '\b \b'
          });
        }
        break;
      
      default:  // 普通字符
        this.currentInput += data;
        window.electron.ipcRenderer.send('terminal-input', {
          id: context.connectionId,
          data: data
        });
    }
  }

  /**
   * 处理上箭头键
   * @private
   */
  handleUpArrow(context) {
    if (this.commandHistory.length === 0) return;

    if (this.historyIndex > 0) {
      this.historyIndex--;
    }

    // 清除当前行
    this.clearCurrentLine(context);

    // 设置新的命令
    const command = this.commandHistory[this.historyIndex];
    if (command) {
      this.currentInput = command;
      window.electron.ipcRenderer.send('terminal-input', {
        id: context.connectionId,
        data: command
      });
    }
  }

  /**
   * 处理下箭头键
   * @private
   */
  handleDownArrow(context) {
    if (this.commandHistory.length === 0) return;

    if (this.historyIndex < this.commandHistory.length) {
      this.historyIndex++;
    }

    // 清除当前行
    this.clearCurrentLine(context);

    // 设置新的命令
    const command = this.commandHistory[this.historyIndex] || '';
    this.currentInput = command;
    if (command) {
      window.electron.ipcRenderer.send('terminal-input', {
        id: context.connectionId,
        data: command
      });
    }
  }

  /**
   * 清除当前行
   * @private
   */
  clearCurrentLine(context) {
    // 发送足够的退格键来清除当前行
    const backspaces = '\b'.repeat(this.currentInput.length);
    const spaces = ' '.repeat(this.currentInput.length);
    window.electron.ipcRenderer.send('terminal-input', {
      id: context.connectionId,
      data: backspaces + spaces + backspaces
    });
  }

  /**
   * 清空当前输入
   */
  clearInput() {
    this.currentInput = ''
  }

  /**
   * 获取当前输入内容
   * @returns {string} 当前输入的命令
   */
  getCurrentInput() {
    return this.currentInput
  }
}