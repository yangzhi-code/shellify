# Shellify

Shellify 是一个基于 Electron 和 Vue 3 开发的现代化 SSH 终端工具，提供了直观的图形界面和丰富的功能特性。

---

## 📥 下载安装

### 方式一：官方下载页面
访问官方下载页面获取最新版本安装包：[http://shellify.yangzhi.me](http://shellify.yangzhi.me)

### 方式二：百度网盘下载

> **🔗 下载链接**：[https://pan.baidu.com/s/1tpIMI0-4mA2e7_CSC0l4cw?pwd=8888](https://pan.baidu.com/s/1tpIMI0-4mA2e7_CSC0l4cw?pwd=8888)  
> **🔑 提取码**：`8888`

---
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

### 开发安装


#### 环境要求

- Node.js >= 22
- Electron >= 31

#### 安装
1、克隆项目代码

    git clone https://github.com/xhdun/shellify.git
   
2、进入项目目录

    cd shellify

3、安装依赖

    npm install

4、启动开发环境

    windows:
     npm run dev
    mac:
     npm run macdev

## 🛠️ 技术栈

- Electron
- Vue 3
- Pinia
- Element Plus
- xterm.js
- SSH2
- ECharts
- SQLite3

## 效果图

![shellify](https://gitee.com/late_winter/shellify/raw/dev/file/imgs/0fba848fea73525a37b3028d716f52c.png)
![shellify](https://gitee.com/late_winter/shellify/raw/dev/file/imgs/faac02dbdc72ae19ab657a13810529d.jpg)

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

## 📜 许可证

本项目采用 Apache-2.0 许可证开源。

查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [xterm.js](https://xtermjs.org/)
- [ssh2](https://github.com/mscdex/ssh2)
- [electron-vite](https://github.com/alex8088/electron-vite)