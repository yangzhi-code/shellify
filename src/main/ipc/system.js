import { ipcMain, BrowserWindow } from 'electron'
import * as os from 'os'
import * as fs from 'fs'
import * as path from 'path'

// 获取系统字体列表
function getSystemFonts() {
  const platform = os.platform()
  const fonts = new Set()

  try {
    if (platform === 'win32') {
      // Windows: 从系统字体目录获取
      const fontDirs = [
        'C:\\Windows\\Fonts',
        path.join(os.homedir(), 'AppData\\Local\\Microsoft\\Windows\\Fonts')
      ]

      fontDirs.forEach(dir => {
        try {
          if (fs.existsSync(dir)) {
            const files = fs.readdirSync(dir)
            files.forEach(file => {
              const ext = path.extname(file).toLowerCase()
              if (['.ttf', '.otf', '.woff', '.woff2'].includes(ext)) {
                // 从文件名提取字体名
                const fontName = path.basename(file, ext)
                  .replace(/[-_]/g, ' ')
                  .trim()
                if (fontName && fontName.length > 1) {
                  fonts.add(fontName)
                }
              }
            })
          }
        } catch (error) {
          console.log(`无法读取字体目录 ${dir}:`, error.message)
        }
      })

      // 添加一些常见的Windows字体
      const commonWindowsFonts = [
        'Consolas', 'Courier New', 'Arial', 'Times New Roman',
        'Microsoft YaHei', '微软雅黑', 'SimSun', '宋体',
        'SimHei', '黑体', 'FangSong', '仿宋'
      ]
      commonWindowsFonts.forEach(font => fonts.add(font))

    } else if (platform === 'darwin') {
      // macOS: 从系统字体目录获取
      const fontDirs = [
        '/System/Library/Fonts',
        '/Library/Fonts',
        path.join(os.homedir(), 'Library/Fonts')
      ]

      fontDirs.forEach(dir => {
        try {
          if (fs.existsSync(dir)) {
            const files = fs.readdirSync(dir, { withFileTypes: true })
            files.forEach(file => {
              if (file.isFile()) {
                const ext = path.extname(file.name).toLowerCase()
                if (['.ttf', '.otf', '.woff', '.woff2'].includes(ext)) {
                  const fontName = path.basename(file.name, ext)
                    .replace(/[-_]/g, ' ')
                    .trim()
                  if (fontName && fontName.length > 1) {
                    fonts.add(fontName)
                  }
                }
              }
            })
          }
        } catch (error) {
          console.log(`无法读取字体目录 ${dir}:`, error.message)
        }
      })

      // 添加一些常见的macOS字体
      const commonMacFonts = [
        'Menlo', 'Monaco', 'Courier New', 'Helvetica',
        'PingFang SC', 'Hiragino Sans GB', 'STHeiti'
      ]
      commonMacFonts.forEach(font => fonts.add(font))

    } else if (platform === 'linux') {
      // Linux: 从常见字体目录获取
      const fontDirs = [
        '/usr/share/fonts',
        '/usr/local/share/fonts',
        path.join(os.homedir(), '.fonts'),
        '/usr/share/fonts/truetype',
        '/usr/share/fonts/opentype'
      ]

      fontDirs.forEach(dir => {
        try {
          if (fs.existsSync(dir)) {
            const walkDir = (dirPath) => {
              const files = fs.readdirSync(dirPath, { withFileTypes: true })
              files.forEach(file => {
                const fullPath = path.join(dirPath, file.name)
                if (file.isDirectory()) {
                  walkDir(fullPath)
                } else if (file.isFile()) {
                  const ext = path.extname(file.name).toLowerCase()
                  if (['.ttf', '.otf', '.woff', '.woff2'].includes(ext)) {
                    const fontName = path.basename(file.name, ext)
                      .replace(/[-_]/g, ' ')
                      .trim()
                    if (fontName && fontName.length > 1) {
                      fonts.add(fontName)
                    }
                  }
                }
              })
            }
            walkDir(dir)
          }
        } catch (error) {
          console.log(`无法读取字体目录 ${dir}:`, error.message)
        }
      })

      // 添加一些常见的Linux字体
      const commonLinuxFonts = [
        'DejaVu Sans Mono', 'Liberation Mono', 'Monospace',
        'Ubuntu Mono', 'FreeMono', '文泉驿等宽微米黑'
      ]
      commonLinuxFonts.forEach(font => fonts.add(font))
    }

    // 转换为数组并排序
    const fontArray = Array.from(fonts).sort()

    // 如果没有找到字体，提供一些默认的编程字体
    if (fontArray.length === 0) {
      return [
        'Consolas', 'Menlo', 'Monaco', 'Courier New', 'Monospace',
        'DejaVu Sans Mono', 'Liberation Mono', 'Fira Code'
      ]
    }

    return fontArray

  } catch (error) {
    console.error('获取系统字体失败:', error)
    // 返回一些常用的编程字体作为fallback
    return [
      'Consolas', 'Menlo', 'Monaco', 'Courier New', 'Monospace',
      'DejaVu Sans Mono', 'Liberation Mono', 'Fira Code'
    ]
  }
}

// 处理字体更新事件
function handleTerminalFontUpdate(event, fontConfig) {
  console.log('主进程接收到字体更新事件:', fontConfig)
  // 广播给所有窗口
  const windows = BrowserWindow.getAllWindows()
  console.log(`广播给 ${windows.length} 个窗口`)
  windows.forEach((window, index) => {
    if (!window.isDestroyed()) {
      console.log(`发送给窗口 ${index + 1}`)
      window.webContents.send('terminal:font-updated', fontConfig)
    }
  })
}

export function setupSystemHandlers() {
  // 获取系统字体列表
  ipcMain.handle('system:get-fonts', async () => {
    return getSystemFonts()
  })

  // 终端字体更新
  ipcMain.on('terminal:font-updated', handleTerminalFontUpdate)
}
