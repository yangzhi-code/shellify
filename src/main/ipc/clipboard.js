import { ipcMain, clipboard } from 'electron';

export function setupClipboardHandlers() {
  ipcMain.handle('clipboard-write', (event, text) => {
    clipboard.writeText(text);
  });

  ipcMain.handle('clipboard-read', () => {
    return clipboard.readText();
  });
} 