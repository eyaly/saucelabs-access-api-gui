const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const Store = require("electron-store").default;

// ✅ native fetch is available in Electron (Node 18+)
const fetch = global.fetch;

// 🔹 Persistent storage for credentials + region
const store = new Store({
  defaults: {
    creds: {
      username: "",
      accessKey: "",
      region: "eu-central-1",
    },
  },
});

// ----------------------------------------------------
// 🪟 CREATE MAIN WINDOW
// ----------------------------------------------------
function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: true,
    center: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (!app.isPackaged) {
    win.loadURL("http://127.0.0.1:5173");
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, "dist/index.html"));
  }

  return win;
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ----------------------------------------------------
// 📦 ELECTRON STORE HANDLERS
// ----------------------------------------------------
ipcMain.handle("getCreds", () => store.get("creds"));
ipcMain.handle("saveCreds", (_, creds) => {
  store.set("creds", creds);
  return true;
});
ipcMain.handle("getRegion", () => {
  const creds = store.get("creds");
  return creds?.region || "eu-central-1";
});

// ----------------------------------------------------
// 🌐 GENERIC SAUCE API PROXY
// ----------------------------------------------------
ipcMain.handle("fetchSauce", async (_, { url, method = "GET", creds, body }) => {
  try {
    const region = creds?.region || store.get("creds").region || "eu-central-1";
    const updatedUrl = url
      .replace("eu-central-1", region)
      .replace("us-west-1", region);

    const headers = {
      Authorization:
        "Basic " +
        Buffer.from(`${creds.username}:${creds.accessKey}`).toString("base64"),
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    console.log(`🌍 ${method} → ${updatedUrl}`);

    // ✅ use native fetch
    const res = await fetch(updatedUrl, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : "";
    } catch {
      data = text;
    }

    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    console.error("❌ Error in fetchSauce:", err);
    return { ok: false, status: 0, data: err.message };
  }
});

// ----------------------------------------------------
// 🔗 OPEN LIVE VIEW LINKS IN DEFAULT BROWSER
// ----------------------------------------------------
ipcMain.handle("openLiveView", (_, url) => {
  if (url) shell.openExternal(url);
});
