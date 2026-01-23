import { ipcMain, BrowserWindow, app } from 'electron'
import * as os from 'os'
import * as fs from 'fs'
import * as path from 'path'
import { createReadStream } from 'fs'

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
  // 获取应用版本号
  ipcMain.handle('system:get-app-version', async () => {
    try {
      const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'))
      return packageJson.version || ''
    } catch (error) {
      console.error('获取应用版本失败:', error)
      return ''
    }
  })

  // 获取系统字体列表
  ipcMain.handle('system:get-fonts', async () => {
    return getSystemFonts()
  })

  // 获取资源路径
  ipcMain.handle('system:get-resource-path', async (event, resourceType) => {
    try {
      if (resourceType === 'imgs') {
        // 在开发环境中，从项目根目录的data/backgrounds获取
        // 在生产环境中，从用户数据目录的backgrounds获取
        const isDev = process.env.NODE_ENV === 'development'
        if (isDev) {
          return path.join(process.cwd(), 'data', 'backgrounds').replace(/\\/g, '/')
        } else {
          return path.join(app.getPath('userData'), 'backgrounds').replace(/\\/g, '/')
        }
      }
      return ''
    } catch (error) {
      console.error('获取资源路径失败:', error)
      return ''
    }
  })

  // 获取图片的base64数据
  ipcMain.handle('system:get-image-base64', async (event, imagePath) => {
    try {
      // 检查文件是否存在
      if (!fs.existsSync(imagePath)) {
        console.error('图片文件不存在:', imagePath)
        return null
      }

      // 读取图片文件并转换为base64
      const imageBuffer = fs.readFileSync(imagePath)
      return imageBuffer.toString('base64')
    } catch (error) {
      console.error('读取图片文件失败:', error)
      return null
    }
  })

  // 列出背景图片目录下的图片文件（返回文件名数组）
  ipcMain.handle('system:list-images', async () => {
    try {
      const isDev = process.env.NODE_ENV === 'development'
      const backgroundsDir = isDev
        ? path.join(process.cwd(), 'data', 'backgrounds')  // 开发环境：data/backgrounds
        : path.join(app.getPath('userData'), 'backgrounds')  // 生产环境：用户数据目录/backgrounds

      if (!fs.existsSync(backgroundsDir)) {
        return []
      }

      const files = fs.readdirSync(backgroundsDir)
      // 只返回常见图片扩展名
      const images = files.filter(f => {
        const ext = path.extname(f).toLowerCase()
        return ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'].includes(ext)
      })
      return images
    } catch (error) {
      console.error('列出背景图片失败:', error)
      return []
    }
  })

  // 导入图片到应用数据目录，避免直接引用本地任意路径
  // 返回导入后的文件名（不带路径），或 null 表示失败
  ipcMain.handle('system:import-image', async (event, srcPath) => {
    try {
      if (!srcPath || !fs.existsSync(srcPath)) {
        console.error('要导入的图片不存在:', srcPath)
        return null
      }

      const isDev = process.env.NODE_ENV === 'development'
      const backgroundsDir = isDev
        ? path.join(process.cwd(), 'data', 'backgrounds')  // 开发环境：data/backgrounds
        : path.join(app.getPath('userData'), 'backgrounds')  // 生产环境：用户数据目录/backgrounds

      if (!fs.existsSync(backgroundsDir)) {
        fs.mkdirSync(backgroundsDir, { recursive: true })
      }

      const ext = path.extname(srcPath)
      const baseName = path.basename(srcPath, ext)
      // 使用时间戳避免冲突
      const destName = `${baseName.replace(/[^a-zA-Z0-9-_]/g, '_')}_${Date.now()}${ext}`
      const destPath = path.join(backgroundsDir, destName)

      // 复制文件
      fs.copyFileSync(srcPath, destPath)

      return destName
    } catch (error) {
      console.error('导入图片失败:', error)
      return null
    }
  })

  // 终端字体更新
  ipcMain.on('terminal:font-updated', handleTerminalFontUpdate)
}
