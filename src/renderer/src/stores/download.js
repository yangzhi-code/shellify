import { defineStore } from 'pinia';

export const useDownloadStore = defineStore('download', {
  state: () => ({
    records: []
  }),

  actions: {
    setRecords(records) {
      this.records = records;
    },

    updateProgress(id, progress) {
      const record = this.records.find(r => r.id === id);
      if (record) {
        record.progress = progress;
      }
    }
  }
}); 