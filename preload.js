const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  getCreds: () => ipcRenderer.invoke("getCreds"),
  saveCreds: (creds) => ipcRenderer.invoke("saveCreds", creds),
  getDevices: (creds) => ipcRenderer.invoke("getDevices", creds),

  // 🔹 General fetch proxy for Sauce APIs
  fetchSauce: (options) => ipcRenderer.invoke("fetchSauce", options),

  startSession: (data) => ipcRenderer.invoke("startSession", data),
  getSession: (data) => ipcRenderer.invoke("getSession", data),

  openLiveView: (url) => ipcRenderer.invoke("openLiveView", url),
  closeLiveView: () => ipcRenderer.invoke("closeLiveView"),

  // 💾 Save screenshot to file system
  saveScreenshot: (dataUrl) => ipcRenderer.invoke("saveScreenshot", dataUrl),

  // 🔹 New region getter
  getRegion: () => ipcRenderer.invoke("getRegion"),
});
