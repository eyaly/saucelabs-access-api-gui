import React, { useState, useEffect } from "react";
import { FaAndroid, FaApple } from "react-icons/fa6";

export default function DeviceCard({ device, onToggleSession }) {
  const [connected, setConnected] = useState(!!device.sessionId);

  // Keep toggle synced with current sessionId after refresh
  useEffect(() => {
    setConnected(!!device.sessionId);
  }, [device.sessionId]);

  const handleToggle = async () => {
    // allow disconnect even if not AVAILABLE
    const isDisconnecting = connected;
    if (!isDisconnecting && device.state !== "AVAILABLE") return;

    const newState = !connected;
    setConnected(newState);
    if (onToggleSession) await onToggleSession(device, newState);
  };

  const isIOS = (device.os || "").toUpperCase().includes("IOS");
  const osIcon = isIOS ? (
    <FaApple className="icon" />
  ) : (
    <FaAndroid className="icon android" />
  );

  // Color by state
  const borderClass = (() => {
    const s = (device.sessionState || device.state || "").toUpperCase();
    if (s.includes("AVAILABLE")) return "state-available";
    if (s.includes("ACTIVE")) return "state-active";
    if (s.includes("CLEANUP")) return "state-cleanup";
    if (s.includes("PENDING") || s.includes("CREATING")) return "state-pending";
    if (s.includes("IN_USE") || s.includes("INUSE")) return "state-inuse";
    return "state-unknown";
  })();

  // "In use by" text normalization
  let inUseText = "";
  if (device.inUseBy) {
    if (Array.isArray(device.inUseBy)) {
      inUseText = device.inUseBy
        .map(u => (typeof u === "string" ? u : u?.username || u?.name || "Unknown"))
        .join(", ");
    } else if (typeof device.inUseBy === "object") {
      inUseText = device.inUseBy.username || device.inUseBy.name || "";
    } else {
      inUseText = device.inUseBy;
    }
  }

  return (
    <div className={`device-card ${connected ? "connected" : ""} ${borderClass}`}>
      <div className="device-info">
        <div className="device-image">device image</div>

        <div>
          <h2 className="device-name">{device.name || device.descriptor}</h2>
          <p className="device-os">
            {osIcon}
            {device.os || "OS"} {device.osVersion || ""}
          </p>
          <p className="device-meta">
            Screen: {device.screenSize ? `${device.screenSize}"` : "N/A"}
          </p>
          <p className="device-meta">
            {(() => {
              switch (device.region) {
                case "eu-central-1": return "EU";
                case "us-west-1": return "US";
                default: return device.region || "N/A";
              }
            })()}
          </p>
          <p className="device-meta">{device.descriptor}</p>
          <p className="device-meta">
            Private
          </p>

          <div className="device-meta device-toggle-inline">
            <div className="toggle-and-text">
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={connected}
                  onChange={handleToggle}
                  disabled={!connected && device.state !== "AVAILABLE"}
                />
                <span className="slider"></span>
              </label>
              <span
                className={`toggle-text ${connected ? "connected-text" : ""}`}
              >
                {connected ? "Connected" : "Connect"}
              </span>
            </div>

            {connected && device.sessionId && (
              <span className="session-id-display">{device.sessionId}</span>
            )}
          </div>

          <p className={`device-state ${borderClass}`}>
            {(device.sessionState || device.state || "UNKNOWN").toUpperCase()}
          </p>

          {inUseText && (
            <p className="inuse-by">In use by: {inUseText}</p>
          )}
        </div>
      </div>
    </div>
  );
}
