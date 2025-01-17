// 添加状态缓存
const statusCache = new Map()
const CACHE_TTL = 2000 // 缓存有效期2秒

async getServerStatus(connectionId, options = {}) {
  const now = Date.now()
  const cached = statusCache.get(connectionId)
  
  // 如果有缓存且在有效期内，且不是强制刷新，则返回缓存
  if (cached && options.cache && (now - cached.timestamp < CACHE_TTL)) {
    return cached.data
  }

  try {
    const connection = this.connections.get(connectionId)
    if (!connection) {
      throw new Error('Connection not found')
    }

    // 检查连接状态
    if (!connection.ssh || !connection.ssh.connected) {
      console.log('SSH connection lost, attempting to reconnect...')
      // 可以在这里添加重连逻辑
      return this.getDefaultStatus()
    }

    const commands = [
      "head -1 /proc/loadavg",
      "free -b | grep Mem:",
      "df -P | grep -v tmpfs",
      "grep 'cpu ' /proc/stat",
      "cat /proc/uptime",
      "hostname -I | awk '{print $1}'",
      "cat /proc/net/dev | grep -E '^[^I].*:'"
    ]

    // 添加错误重试机制
    let retryCount = 0
    const maxRetries = 3
    
    const executeWithRetry = async () => {
      try {
        const results = await Promise.all(
          commands.map(cmd => this.executeCommand(connection, cmd))
        )
        return results
      } catch (error) {
        if (retryCount < maxRetries && error.message.includes('Channel open failure')) {
          retryCount++
          console.log(`Retry attempt ${retryCount}...`)
          // 添加短暂延迟后重试
          await new Promise(resolve => setTimeout(resolve, 500))
          return executeWithRetry()
        }
        throw error
      }
    }

    const results = await executeWithRetry()

    const status = this.parseServerStatus(results)
    
    // 更新缓存
    statusCache.set(connectionId, {
      data: status,
      timestamp: now
    })

    return status
  } catch (error) {
    console.error('Failed to get server status:', error)
    // 如果是通道错误，返回默认状态而不是抛出错误
    if (error.message.includes('Channel open failure')) {
      return this.getDefaultStatus()
    }
    throw error
  }
}

parseServerStatus(results) {
  // 使用更高效的数据处理方法
  const [loadavg, memory, disk, cpu, uptime, publicIp, netdev] = results

  // 优化解析逻辑
  try {
    // 使用解构赋值和正则表达式优化
    const [, load1, load5, load15] = loadavg.match(/^(\d+\.\d+)\s+(\d+\.\d+)\s+(\d+\.\d+)/) || []
    const [, memTotal, memUsed] = memory.match(/Mem:\s+(\d+)\s+(\d+)/) || []
    const [, user, nice, system, idle] = cpu.match(/cpu\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/) || []
    const [upTime] = uptime.split(' ')

    // 计算CPU使用率
    const totalCpu = parseInt(user) + parseInt(nice) + parseInt(system) + parseInt(idle)
    const cpuUsage = ((totalCpu - parseInt(idle)) / totalCpu * 100).toFixed(1)

    // 计算内存使用率
    const memoryPercentage = ((parseInt(memUsed) / parseInt(memTotal)) * 100).toFixed(1)

    return {
      load: {
        '1min': load1 || '0.00',
        '5min': load5 || '0.00',
        '15min': load15 || '0.00'
      },
      cpu: parseFloat(cpuUsage),
      memory: {
        percentage: parseFloat(memoryPercentage),
        used: this.formatBytes(parseInt(memUsed)),
        total: this.formatBytes(parseInt(memTotal))
      },
      // ... 其他解析逻辑保持不变
    }
  } catch (error) {
    console.error('Error parsing server status:', error)
    return this.getDefaultStatus()
  }
} 

// 添加辅助方法
getDefaultStatus() {
  return {
    load: { '1min': '0.00', '5min': '0.00', '15min': '0.00' },
    cpu: 0,
    memory: { percentage: 0, used: '0GB', total: '0GB' },
    network: { upload: '0 KB/s', download: '0 KB/s' },
    disks: []
  }
}

formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  return `${size.toFixed(1)}${units[unitIndex]}`
} 

// 修改 executeCommand 方法
async executeCommand(connection, command) {
  return new Promise((resolve, reject) => {
    connection.ssh.exec(command, { pty: false }, (err, stream) => {
      if (err) {
        reject(err)
        return
      }
      
      let data = ''
      let stderr = ''
      
      stream.on('data', (chunk) => {
        data += chunk
      })
      
      stream.stderr.on('data', (chunk) => {
        stderr += chunk
      })
      
      stream.on('close', () => {
        if (stderr) {
          reject(new Error(stderr))
        } else {
          resolve(data.trim())
        }
      })
      
      // 添加超时处理
      setTimeout(() => {
        stream.destroy()
        reject(new Error('Command execution timeout'))
      }, 5000)
    })
  })
} 