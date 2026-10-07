const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,

  // Overlay listener for captured screen buffer and display info
  onDisplayCapture: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('snip:display-capture', handler);
    return () => ipcRenderer.removeListener('snip:display-capture', handler);
  },

  // Close / dismiss overlay window
  cancelSnip: () => {
    ipcRenderer.send('snip:cancel');
  },

  // Send selected crop coordinates to main process
  sendCroppedRegion: (payload) => {
    ipcRenderer.send('snip:crop-selected', payload);
  },

  // Main window listener for completed snip
  onSnipCompleted: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('snip:completed', handler);
    return () => ipcRenderer.removeListener('snip:completed', handler);
  },

  // Trigger snip from renderer buttons (e.g. Hero, Navbar)
  triggerSnip: () => {
    ipcRenderer.send('snip:trigger-from-renderer');
  },
});
