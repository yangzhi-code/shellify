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
  }

  /**
   * 处理键盘输入
   * @param {string} data - 输入的字符
   * @param {Object} context - 终端上下文信息（用户名、主机等）
   */
  handleInput(data, context) {
    switch(data) {
      case '\r':  // 回车键处理
        this.handleEnter(context)
        break
      
      case '\u007F':  // 退格键处理
        this.handleBackspace()
        break
      
      default:  // 普通字符输入处理
        this.handleCharacter(data, context)
    }
  }

  /**
   * 处理回车键
   * @param {Object} context - 终端上下文信息
   */
  handleEnter(context) {
    const command = this.currentInput.trim()
    window.electron.ipcRenderer.send('terminal-input', {
      id: context.connectionId,
      data: '\n'
    })
    this.currentInput = ''
  }

  /**
   * 处理退格键
   */
  handleBackspace() {
    if (this.currentInput.length > 0) {
      this.currentInput = this.currentInput.slice(0, -1)
      this.terminalManager.write('\b \b')
    }
  }

  /**
   * 处理普通字符输入
   * @param {string} char - 输入的字符
   */
  handleCharacter(char, context) {
    if (context.connectionId) {
      this.currentInput += char
      window.electron.ipcRenderer.send('terminal-input', {
        id: context.connectionId,
        data: char
      })
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