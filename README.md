# Shellify

Shellify 是一个基于 Electron 和 Vue 3 开发的现代化 SSH 终端工具，提供了直观的图形界面和丰富的功能特性。

## ✨ 特性

- 🖥️ **多标签终端管理**：支持多个 SSH 连接的标签式管理
- 📊 **实时系统监控**：
  - CPU、内存使用率监控
  - 网络流量实时图表
  - 磁盘使用情况
  - 系统负载监控
- 📁 **文件管理器**：
  - 可视化文件浏览
  - 文件上传/下载
  - 文件搜索
  - 基本文件操作（新建、删除等）
- 🔐 **多种认证方式**：
  - 密码认证
  - SSH 密钥认证
- 🎨 **现代化界面**：
  - 响应式设计
  - 深色/浅色主题
  - 可自定义的终端样式
- ⚡ **高性能**：
  - 异步数据处理
  - 优化的终端渲染
  - 流式文件传输

## 🚀 快速开始

### 环境要求

- Node.js >= 16
- npm >= 8

### 安装

### 使用方法

1. 启动应用后，点击"新建连接"
2. 输入服务器信息（主机、端口、用户名等）
3. 选择认证方式（密码/密钥）
4. 点击连接即可开始使用

## 🛠️ 技术栈

- Electron
- Vue 3
- Pinia
- Element Plus
- xterm.js
- SSH2
- ECharts
- SQLite3

## 📝 开发计划

- [ ] SFTP 文件传输进度显示
- [ ] 会话管理
- [ ] 终端分屏
- [ ] 命令历史记录
- [ ] 快捷命令管理
- [ ] 代理支持

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

## 📜 许可证

本项目采用 Apache-2.0 许可证开源。

查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [xterm.js](https://xtermjs.org/)
- [ssh2](https://github.com/mscdex/ssh2)
- [electron-vite](https://github.com/alex8088/electron-vite)