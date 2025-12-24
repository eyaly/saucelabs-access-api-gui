import React, { useState } from "react";
import Devices from "./pages/Devices";
import Settings from "./pages/Settings";
import DeviceLogModal from "./components/DeviceLogModal";

export default function App() {
  const [page, setPage] = useState("devices");
  const [deviceLogs, setDeviceLogs] = useState([]); // Array of { id, websocketUrl, deviceName, sessionId }

  // Handle "View Device Log" click
  const handleViewDeviceLog = async (device) => {
    try {
      const creds = await window.api.getCreds();
      if (!creds?.username || !creds?.accessKey) {
        console.error("Missing credentials");
        return;
      }

      const region = device.region || creds.region || "eu-central-1";
      const sessionUrl = `https://api.${region}.saucelabs.com/rdc/v2/sessions/${device.sessionId}`;

      console.log(`📡 Fetching session details for device log: ${device.sessionId}`);
      const response = await window.api.fetchSauce({
        url: sessionUrl,
        creds,
        method: "GET",
      });

      if (!response.ok) {
        console.error(`❌ Failed to fetch session: ${response.status}`);
        return;
      }

      const eventsWebsocketUrl = response.data?.links?.eventsWebsocketUrl;
      if (eventsWebsocketUrl) {
        // Format WebSocket URL with credentials
        // From: wss://api.eu-central-1.saucelabs.com/rdc/v2/socket/companion/<session id>
        // To: wss://username:accessKey@api.eu-central-1.saucelabs.com/rdc/v2/socket/companion/<session id>
        // Remove the wss:// prefix, add credentials, then add wss:// back
        const urlWithoutProtocol = eventsWebsocketUrl.replace(/^wss:\/\//, "");
        const authenticatedUrl = `wss://${encodeURIComponent(creds.username)}:${encodeURIComponent(creds.accessKey)}@${urlWithoutProtocol}`;

        console.log(`✅ Opening device log WebSocket`);
        const newLog = {
          id: Date.now(),
          websocketUrl: authenticatedUrl,
          deviceName: device.name || device.descriptor,
          sessionId: device.sessionId,
        };
        setDeviceLogs((prev) => [...prev, newLog]);
      } else {
        console.warn("⚠️ No eventsWebsocketUrl found in session response");
      }
    } catch (err) {
      console.error("❌ Error opening device log:", err);
    }
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* 🔹 Top Navigation Bar */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "#222",
          color: "#fff",
          padding: "10px 20px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img
            src="./sauce-logo.png"
            alt="Sauce Labs"
            style={{ height: 30, width: "auto" }}
          />
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0 }}>
            Sauce Labs Access API GUI
          </h2>
        </div>

        {/* 🔹 Navigation buttons */}
        <nav style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => setPage("devices")}
            style={{
              background: page === "devices" ? "#ffb300" : "transparent",
              color: page === "devices" ? "#000" : "#fff",
              border: "none",
              borderRadius: 5,
              padding: "8px 14px",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 14,
              transition: "0.2s",
            }}
          >
            Devices
          </button>

          <button
            onClick={() => setPage("settings")}
            style={{
              background: page === "settings" ? "#ffb300" : "transparent",
              color: page === "settings" ? "#000" : "#fff",
              border: "none",
              borderRadius: 5,
              padding: "8px 14px",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 14,
              transition: "0.2s",
            }}
          >
            Settings
          </button>
        </nav>
      </header>

      {/* 🔹 Page Content */}
      <main
        style={{
          flex: 1,
          overflow: "auto",
          backgroundColor: "#fafafa",
        }}
      >
        {page === "devices" && <Devices onViewDeviceLog={handleViewDeviceLog} />}
        {page === "settings" && <Settings />}

        {/* Render all device log modals */}
        {deviceLogs.map((log, index) => (
          <DeviceLogModal
            key={log.id}
            websocketUrl={log.websocketUrl}
            deviceName={log.deviceName}
            sessionId={log.sessionId}
            index={index}
            onClose={() => {
              setDeviceLogs((prev) => prev.filter((l) => l.id !== log.id));
            }}
          />
        ))}
      </main>
    </div>
  );
}
