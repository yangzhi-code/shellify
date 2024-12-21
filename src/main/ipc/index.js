import { setupSSHHandlers } from './ssh';
import { setupStoreHandlers } from './store';
import { setupClipboardHandlers } from './clipboard';
import { setupMenuHandlers } from './menu';

export function setupIpcHandlers() {
  setupSSHHandlers();
  setupStoreHandlers();
  setupClipboardHandlers();
  setupMenuHandlers();
} 