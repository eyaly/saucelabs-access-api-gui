import React, { useState, useEffect } from "react";
import { FaAndroid, FaApple } from "react-icons/fa6";

export default function DeviceCard({ device, onToggleSession, onViewDeviceLog }) {
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

  // Handle "View Device Log" click
  const handleViewDeviceLog = async (e) => {
    e.preventDefault();
    if (!hasActiveSession || !device.sessionId) {
      console.warn("No active session to view device log");
      return;
    }

    // Pass the device info to parent, which will fetch session and open log modal
    if (onViewDeviceLog) {
      onViewDeviceLog(device);
    }
  };

  // Handle "Launch Live View" click
  const handleLaunchLiveView = async (e) => {
    e.preventDefault();
    if (!hasActiveSession || !device.sessionId) {
      console.warn("No active session to launch live view");
      return;
    }

    try {
      const creds = await window.api.getCreds();
      if (!creds?.username || !creds?.accessKey) {
        console.error("Missing credentials");
        return;
      }

      const region = device.region || creds.region || "eu-central-1";
      const sessionUrl = `https://api.${region}.saucelabs.com/rdc/v2/sessions/${device.sessionId}`;

      console.log(`📡 Fetching session details for ${device.sessionId}`);
      const response = await window.api.fetchSauce({
        url: sessionUrl,
        creds,
        method: "GET",
      });

      if (!response.ok) {
        console.error(`❌ Failed to fetch session: ${response.status}`);
        return;
      }

      const liveViewUrl = response.data?.links?.liveViewUrl;
      if (liveViewUrl) {
        console.log(`✅ Opening live view in browser: ${liveViewUrl}`);
        if (window.api?.openLiveView) {
          window.api.openLiveView(liveViewUrl);
        } else {
          console.error("❌ openLiveView API not available");
        }
      } else {
        console.warn("⚠️ No liveViewUrl found in session response");
      }
    } catch (err) {
      console.error("❌ Error launching live view:", err);
    }
  };

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
            {inUseText && (
              <span className="device-state-user"> {inUseText}</span>
            )}
          </p>

          <div className={`device-links ${hasActiveSession ? "" : "disabled"}`}>
            <a
              href="#"
              className="device-link"
              aria-disabled={!hasActiveSession}
              onClick={handleLaunchLiveView}
            >
              Launch Live View
            </a>
            <a
              href="#"
              className="device-link"
              aria-disabled={!hasActiveSession}
              onClick={handleViewDeviceLog}
            >
              View Device Log
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
