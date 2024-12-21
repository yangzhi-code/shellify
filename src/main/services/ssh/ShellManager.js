import SSHConnectionManager from './SSHConnectionManager';

class ShellManager {
  constructor() {
    this.shells = {};
    this.callbacks = {};
    this.buffers = {};
    this.flushInterval = 16;
  }

  createShell(connectionId, cols = 80, rows = 24) {
    return new Promise((resolve, reject) => {
      const client = SSHConnectionManager.getClient(connectionId);

      const env = {
        TERM: 'xterm-256color',
        LANG: 'en_US.UTF-8'
      };

      client.shell({
        term: 'xterm-256color',
        cols: cols,
        rows: rows,
        env: env
      }, (err, stream) => {
        if (err) {
          reject(err);
          return;
        }

        this.shells[connectionId] = stream;
        this.setupShellEvents(connectionId, stream);
        resolve(stream);
      });
    });
  }

  setupShellEvents(connectionId, stream) {
    this.buffers[connectionId] = {
      data: '',
      timer: null
    };

    stream.on('data', (data) => {
      if (this.callbacks[connectionId]) {
        this.buffers[connectionId].data += data.toString();
        
        if (!this.buffers[connectionId].timer) {
          this.buffers[connectionId].timer = setInterval(() => {
            if (this.buffers[connectionId].data) {
              this.callbacks[connectionId](this.buffers[connectionId].data);
              this.buffers[connectionId].data = '';
            }
          }, this.flushInterval);
        }
      }
    });

    stream.on('error', (err) => {
      console.error('Shell error:', err);
    });

    stream.on('close', () => {
      this.cleanup(connectionId);
    });
  }

  onData(connectionId, callback) {
    this.callbacks[connectionId] = callback;
  }

  writeToShell(connectionId, data) {
    const shell = this.shells[connectionId];
    if (shell && !shell.destroyed) {
      shell.write(data);
    }
  }

  resizeShell(connectionId, cols, rows) {
    const shell = this.shells[connectionId];
    if (shell && !shell.destroyed) {
      shell.setWindow(rows, cols);
    }
  }

  cleanup(connectionId) {
    if (this.buffers[connectionId]?.timer) {
      clearInterval(this.buffers[connectionId].timer);
    }
    delete this.buffers[connectionId];
    delete this.shells[connectionId];
    delete this.callbacks[connectionId];
  }

  closeShell(connectionId) {
    if (this.shells[connectionId]) {
      this.shells[connectionId].end();
      this.cleanup(connectionId);
    }
  }
}

export default new ShellManager(); 