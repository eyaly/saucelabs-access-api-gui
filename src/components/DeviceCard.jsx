import React, { useState, useEffect } from "react";
import { FaAndroid, FaApple } from "react-icons/fa6";

export default function DeviceCard({ device, onToggleSession }) {
  const [connected, setConnected] = useState(!!device.sessionId);

  // Keep toggle synced with current sessionId after refresh
  useEffect(() => {
    setConnected(!!device.sessionId);
  }, [device.sessionId]);

  const handleToggle = async () => {
    // Prevent any action if device is updating
    if (device.isUpdating) return;
    
    // allow disconnect even if not AVAILABLE
    const isDisconnecting = connected;
    // Disable connecting if device state is not AVAILABLE
    if (!isDisconnecting && device.state !== "AVAILABLE") return;

    const newState = !connected;
    setConnected(newState);
    if (onToggleSession) await onToggleSession(device, newState);
  };

  const hasActiveSession = !!device.sessionId;
  const regionLabel = (() => {
    switch ((device.region || "").toLowerCase()) {
      case "eu-central-1":
        return "EU";
      case "us-west-1":
        return "US";
      default:
        return device.region || "N/A";
    }
  })();

  const cardStateClass = (() => {
    if (hasActiveSession) return "state-session";
    if (device.isUpdating) return "state-other";
    const state = (device.sessionState || device.state || "").toUpperCase();
    // Check state first - AVAILABLE should always be green
    if (state.includes("AVAILABLE")) return "state-available";
    // Check if device is in use by someone else (has inUseBy but no sessionId for current user)
    if (device.inUseBy && !hasActiveSession) return "state-inuse";
    if (state.includes("IN_USE") || state.includes("INUSE")) return "state-inuse";
    if (state.includes("ACTIVE")) return "state-active";
    if (state.includes("CLEANUP")) return "state-cleanup";
    return "state-other";
  })();

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
    <div className={`device-card ${cardStateClass}`}>
      <div className="device-info">
        <img
          className="device-image"
          src={`https://d3ty40hendov17.cloudfront.net/device-pictures/${device.descriptor}.png`}
          alt={device.name || device.descriptor}
        />

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
            {regionLabel} | Private
          </p>
          <p className="device-meta device-descriptor">{device.descriptor}</p>
          <p className="device-meta">
            session id: {device.sessionId || "—"}
          </p>

          <div className="device-meta device-toggle-inline">
            <div className="toggle-and-text">
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={connected}
                  onChange={handleToggle}
                  disabled={device.isUpdating || (!connected && device.state !== "AVAILABLE")}
                />
                <span className="slider"></span>
              </label>
              <span
                className={`toggle-text ${connected ? "connected-text" : ""}`}
              >
                {connected ? "Connected" : "Connect"}
              </span>
            </div>
          </div>

          <p className={`device-state ${borderClass}`}>
            {device.isUpdating ? "UPDATING..." : (device.sessionState || device.state || "UNKNOWN").toUpperCase()}
          </p>

          <div className={`device-links ${hasActiveSession ? "" : "disabled"}`}>
            <a
              href="#"
              className="device-link"
              aria-disabled={!hasActiveSession}
            >
              Launch Live Test
            </a>
            <a
              href="#"
              className="device-link"
              aria-disabled={!hasActiveSession}
            >
              View Device Log
            </a>
          </div>

          {inUseText && (
            <p className="inuse-by">In use by: {inUseText}</p>
          )}
        </div>
      </div>
    </div>
  );
}
