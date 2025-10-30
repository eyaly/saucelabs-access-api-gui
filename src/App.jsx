import React, { useState } from "react";
import Devices from "./pages/Devices";
import Settings from "./pages/Settings";

export default function App() {
  const [page, setPage] = useState("devices");

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
            src="/sauce-logo.png"
            alt="Sauce Labs"
            style={{ height: 30, width: "auto" }}
          />
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0 }}>
            Sauce Access GUI
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
        {page === "devices" && <Devices />}
        {page === "settings" && <Settings />}
      </main>
    </div>
  );
}
