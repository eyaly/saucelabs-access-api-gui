import React, { useEffect, useState } from "react";

export default function Settings() {
  const [username, setUsername] = useState("");
  const [accessKey, setAccessKey] = useState("");
  const [region, setRegion] = useState("eu-central-1");
  const [status, setStatus] = useState("");

  // Load saved credentials from Electron store
  useEffect(() => {
    const loadCreds = async () => {
      const creds = await window.api.getCreds();
      if (creds) {
        setUsername(creds.username || "");
        setAccessKey(creds.accessKey || "");
        setRegion(creds.region || "eu-central-1");
      }
    };
    loadCreds();
  }, []);

  // Save credentials + region to Electron store
  const handleSave = async () => {
    try {
      await window.api.saveCreds({
        username,
        accessKey,
        region,
      });
      setStatus("✅ Saved successfully!");
      setTimeout(() => setStatus(""), 3000);
    } catch (err) {
      console.error("Error saving creds:", err);
      setStatus("❌ Failed to save credentials");
    }
  };

  return (
    <div style={{ padding: "50px", maxWidth: 500, margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.8rem", fontWeight: 800, marginBottom: 30 }}>
        Settings
      </h1>

      <p style={{ marginBottom: 20, lineHeight: "1.6", fontSize: "0.95rem", color: "#555" }}>
        This application provides a user-friendly interface for interacting with the{" "}
        <a
          href="https://github.com/saucelabs/real-device-api"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#007bff", textDecoration: "none" }}
        >
          official Sauce Labs Real Device API
        </a>
        . It enables you to execute various API commands on your private real devices directly from this UI, simplifying common tasks and device management.
      </p>

      <div style={{ marginBottom: 20 }}>
        <label style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>
          Sauce Username
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="your.username"
          style={{
            width: "100%",
            padding: "10px 14px",
            borderRadius: 6,
            border: "1px solid #ccc",
            fontSize: 15,
          }}
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>
          Access Key
        </label>
        <input
          type="password"
          value={accessKey}
          onChange={(e) => setAccessKey(e.target.value)}
          placeholder="••••••••••••"
          style={{
            width: "100%",
            padding: "10px 14px",
            borderRadius: 6,
            border: "1px solid #ccc",
            fontSize: 15,
          }}
        />
      </div>

      <div style={{ marginBottom: 30 }}>
        <label style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>
          Region
        </label>
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 14px",
            borderRadius: 6,
            border: "1px solid #ccc",
            fontSize: 15,
            backgroundColor: "#fff",
          }}
        >
          <option value="eu-central-1">🇪🇺 Europe (EU Central)</option>
          <option value="us-west-1">🇺🇸 United States (US West)</option>
          <option value="us-east-4">🇺🇸 United States (US East)</option>
        </select>
      </div>

      <button
        onClick={handleSave}
        style={{
          backgroundColor: "#34A853",
          color: "white",
          border: "none",
          borderRadius: 6,
          padding: "10px 20px",
          fontSize: 16,
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        Save Settings
      </button>

      {status && (
        <p style={{ marginTop: 20, color: status.startsWith("✅") ? "green" : "red" }}>
          {status}
        </p>
      )}
    </div>
  );
}
