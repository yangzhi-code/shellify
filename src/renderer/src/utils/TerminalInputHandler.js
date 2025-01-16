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
    this.terminalManager = terminalManager;
    this.commandHandler = commandHandler;
    this.currentInput = '';     // 当前输入的命令
    this.isComposing = false;   // 输入法状态标记
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
          id: context.connectionId,
          data: data
        });
      }
      return;
    }

    if (!context.connectionId) return;

    // 直接发送所有按键到服务器，包括特殊键
    window.electron.ipcRenderer.send('terminal-input', {
      id: context.connectionId,
      data: data
    });

    // 更新当前输入（仅用于本地跟踪）
    switch(data) {
      case '\r':  // 回车键
        this.currentInput = '';
        break;
      
      case '\u007F':  // 退格键
        if (this.currentInput.length > 0) {
          this.currentInput = this.currentInput.slice(0, -1);
        }
        break;
      
      default:  // 普通字符
        if (!data.startsWith('\u001b')) { // 不是控制序列
          this.currentInput += data;
        }
    }
  }

  /**
   * 清空当前输入
   */
  clearInput() {
    this.currentInput = '';
  }

  /**
   * 获取当前输入内容
   * @returns {string} 当前输入的命令
   */
  getCurrentInput() {
    return this.currentInput;
  }
}