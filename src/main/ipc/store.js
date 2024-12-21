import { ipcMain } from 'electron';
import connectionStore from '../services/store';

export function setupStoreHandlers() {
  ipcMain.handle('save-connection', (event, connection) => {
    return connectionStore.saveConnection(connection);
  });

  ipcMain.handle('get-connections', () => {
    return connectionStore.getAllConnections();
  });

  ipcMain.handle('delete-connection', (event, index) => {
    return connectionStore.deleteConnection(index);
  });

  ipcMain.handle('clear-connections', () => {
    return connectionStore.clearConnections();
  });
} 