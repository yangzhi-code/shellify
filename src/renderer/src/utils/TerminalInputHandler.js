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
    this.isComposing = false; // 添加输入法状态标记
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
   * @param {Object} context - 终端上下文信息（用户名、主机等）
   */
  handleInput(data, context) {
    // 如果是在输入法编辑状态，直接发送到终端
    if (this.isComposing) {
      if (context.connectionId) {
        window.electron.ipcRenderer.send('terminal-input', {
          connectionId: context.connectionId,
          input: data
        });
      }
      return;
    }

    // 只有在有连接ID的情况下才处理输入
    if (!context.connectionId) {
      return;
    }

    switch(data) {
      case '\r':  // 回车键
        window.electron.ipcRenderer.send('terminal-input', {
          id: context.connectionId,
          data: '\r'  // 只发送 \r，让服务器决定如何处理换行
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