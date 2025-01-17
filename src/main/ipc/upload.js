import { ipcMain } from 'electron'
import UploadManager from '../services/SQLite/UploadManager'

export function setupUploadHandlers() {
  // 获取上传记录
  ipcMain.handle('store:get-uploads', async () => {
    return await UploadManager.getAll()
  })

  // 删除上传记录
  ipcMain.handle('store:delete-upload', async (event, id) => {
    return await UploadManager.delete(id)
  })

  // 删除所有上传记录
  ipcMain.handle('store:delete-all-uploads', async () => {
    return await UploadManager.deleteAll()
  })

  // 标记中断的上传
  ipcMain.handle('store:mark-interrupted-uploads', async (event, connectionId) => {
    return await UploadManager.markInterrupted(connectionId)
  })

  // 清理过期的上传记录
  ipcMain.handle('store:cleanup-old-uploads', async (event, days) => {
    return await UploadManager.cleanupOldRecords(days)
  })
} 