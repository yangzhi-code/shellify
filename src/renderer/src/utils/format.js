export function formatFileSize(size) {
  if (!size) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let index = 0;
  let fileSize = size;

  while (fileSize >= 1024 && index < units.length - 1) {
    fileSize /= 1024;
    index++;
  }

  return `${fileSize.toFixed(2)} ${units[index]}`;
}

export function formatSpeed(bytesPerSecond) {
  if (!bytesPerSecond) return '0 B/s';
  const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  let index = 0;
  let speed = bytesPerSecond;

  while (speed >= 1024 && index < units.length - 1) {
    speed /= 1024;
    index++;
  }

  return `${speed.toFixed(1)} ${units[index]}`;
}

export function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleString();
}