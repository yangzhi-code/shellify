/**
 * 终端命令处理器类
 * 负责处理终端命令的执行和输出
 */
export class TerminalCommandHandler {
  /**
   * 构造函数
   * @param {TerminalManager} terminalManager - 终端管理器实例
   */
  constructor(terminalManager) {
    this.terminalManager = terminalManager
    this.currentDir = '~'
  }

  /**
   * 处理终端命令
   * @param {string} command - 要执行的命令
   * @param {string} connectionId - SSH连接ID
   */
  async handleCommand(command, connectionId) {
    // 检查是否已连接到服务器
    if (!connectionId) {
      this.terminalManager.writeln('请先连接到服务器！')
      return
    }

    // 处理clear命令
    if (command === 'clear') {
      this.terminalManager.clear()
      return
    }

    // 发送命令到服务器
    window.electron.ipcRenderer.send('terminal-input', {
      id: connectionId,
      data: command
    })
  }

  /**
   * 获取命令提示符
   * @param {string} username - 用户名
   * @param {string} host - 主机名
   * @returns {string} - 格式化的命令提示符
   */
  getPrompt(username, host) {
    return username === 'root'
      ? `[${username}@${host} ${this.currentDir}]# `
      : `[${username}@${host} ${this.currentDir}]$ `
  }
}