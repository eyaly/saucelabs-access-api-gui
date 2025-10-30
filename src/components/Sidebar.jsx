import React from "react";

export default function Sidebar({ active, onNavigate }) {
  return (
    <aside className="sidebar">
      <div className="logo">SAUCELABS</div>
      <nav className="nav">
        <button className={active === "Home" ? "active" : ""} onClick={() => onNavigate("Home")}>Home</button>
        <button className={active === "Devices" ? "active" : ""} onClick={() => onNavigate("Devices")}>Device Catalog</button>
        <button className={active === "Settings" ? "active" : ""} onClick={() => onNavigate("Settings")}>Settings</button>
      </nav>
    </aside>
  );
}
