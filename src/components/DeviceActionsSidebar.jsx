import React, { useState } from "react";

export default function DeviceActionsSidebar({ device, onClose }) {
  const [selectedAction, setSelectedAction] = useState("installApp"); // "installApp", "screenshot", "sessionDetails", "runAdbShellCommand"
  const [installAppPath, setInstallAppPath] = useState("");
  const [adbShellCommand, setAdbShellCommand] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [apiMethod, setApiMethod] = useState("GET");
  const [apiPath, setApiPath] = useState("");
  const [apiBody, setApiBody] = useState("");
  const [apiResponse, setApiResponse] = useState(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState(null);

  if (!device || !device.sessionId) {
    return null;
  }

  // Check if device is Android
  const isAndroid = !(device.os || "").toUpperCase().includes("IOS");

  const handleCopySessionId = () => {
    navigator.clipboard.writeText(device.sessionId).then(() => {
      // Could show a toast notification here, but for now just copy silently
      alert("Session ID copied to clipboard!");
    }).catch(() => {
      alert("Failed to copy Session ID");
    });
  };

  const handleInstallApp = async () => {
    if (!installAppPath.trim()) {
      alert("Please enter an app path");
      return;
    }

    setActionLoading(true);
    setApiResponse(null);
    const creds = await window.api.getCreds();
    const region = device.region || creds.region || "eu-central-1";
    const url = `https://api.${region}.saucelabs.com/rdc/v2/sessions/${device.sessionId}/device/installApp`;
    const body = {
      app: installAppPath.trim(),
      enableInstrumentation: true,
      launchAfterInstall: true,
    };

    // Populate Custom API Request section
    setApiMethod("POST");
    setApiPath(`device/installApp`);
    setApiBody(JSON.stringify(body, null, 2));

    try {
      const response = await window.api.fetchSauce({
        url,
        creds,
        method: "POST",
        body,
      });

      setApiResponse({
        status: response.status,
        ok: response.ok,
        data: response.data,
      });

      if (response.ok) {
        setInstallAppPath("");
      }
    } catch (err) {
      setApiResponse({
        status: 0,
        ok: false,
        error: err.message,
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleTakeScreenshot = async () => {
    setActionLoading(true);
    setScreenshotUrl(null);
    setApiResponse(null);
    const creds = await window.api.getCreds();
    const region = device.region || creds.region || "eu-central-1";
    const url = `https://api.${region}.saucelabs.com/rdc/v2/sessions/${device.sessionId}/device/takeScreenshot`;

    // Populate Custom API Request section
    setApiMethod("POST");
    setApiPath(`device/takeScreenshot`);
    setApiBody("");

    try {
      const response = await window.api.fetchSauce({
        url,
        creds,
        method: "POST",
        headers: {
          Accept: "*/*", // Accept any content type for screenshot (image/png, image/jpeg, etc.)
        },
      });

      setApiResponse({
        status: response.status,
        ok: response.ok,
        data: response.data,
      });

      if (response.ok) {
        // Handle different response formats
        let imageUrl = null;
        if (typeof response.data === "string") {
          if (response.data.startsWith("data:")) {
            imageUrl = response.data;
          } else if (response.data.startsWith("http")) {
            imageUrl = response.data;
          } else {
            imageUrl = `data:image/png;base64,${response.data}`;
          }
        } else if (response.data?.screenshot) {
          imageUrl = response.data.screenshot;
        } else if (response.data?.url) {
          imageUrl = response.data.url;
        } else if (response.data?.data) {
          imageUrl = `data:image/png;base64,${response.data.data}`;
        } else if (response.data?.image) {
          imageUrl = response.data.image;
        }
        
        if (imageUrl) {
          setScreenshotUrl(imageUrl);
        }
      }
    } catch (err) {
      setApiResponse({
        status: 0,
        ok: false,
        error: err.message,
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRunAdbShellCommand = async () => {
    if (!adbShellCommand.trim()) {
      alert("Please enter an ADB shell command");
      return;
    }

    setActionLoading(true);
    setApiResponse(null);
    const creds = await window.api.getCreds();
    const region = device.region || creds.region || "eu-central-1";
    const url = `https://api.${region}.saucelabs.com/rdc/v2/sessions/${device.sessionId}/device/executeShellCommand`;
    const body = {
      adbShellCommand: adbShellCommand.trim(),
    };

    // Populate Custom API Request section
    setApiMethod("POST");
    setApiPath(`device/executeShellCommand`);
    setApiBody(JSON.stringify(body, null, 2));

    try {
      const response = await window.api.fetchSauce({
        url,
        creds,
        method: "POST",
        body,
      });

      setApiResponse({
        status: response.status,
        ok: response.ok,
        data: response.data,
      });

      if (response.ok) {
        setAdbShellCommand("");
      }
    } catch (err) {
      setApiResponse({
        status: 0,
        ok: false,
        error: err.message,
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleGetSessionDetails = async () => {
    setActionLoading(true);
    setApiResponse(null);
    const creds = await window.api.getCreds();
    const region = device.region || creds.region || "eu-central-1";
    const url = `https://api.${region}.saucelabs.com/rdc/v2/sessions/${device.sessionId}`;

    // Populate Custom API Request section - just the path without base URL
    setApiMethod("GET");
    setApiPath(`rdc/v2/sessions/${device.sessionId}`);
    setApiBody("");

    try {
      const response = await window.api.fetchSauce({
        url,
        creds,
        method: "GET",
      });

      setApiResponse({
        status: response.status,
        ok: response.ok,
        data: response.data,
      });
    } catch (err) {
      setApiResponse({
        status: 0,
        ok: false,
        error: err.message,
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCustomApiRequest = async () => {
    if (!apiPath.trim()) {
      alert("Please enter an API path");
      return;
    }

    setApiLoading(true);
    setApiResponse(null);
    try {
      const creds = await window.api.getCreds();
      const region = device.region || creds.region || "eu-central-1";
      
      // Build full URL - handle different path formats
      let fullUrl;
      if (apiPath.startsWith("http")) {
        // Full URL provided
        fullUrl = apiPath;
      } else if (apiPath.startsWith("rdc/v2/sessions")) {
        // Full API path like "rdc/v2/sessions/{sessionId}" or "rdc/v2/sessions/{sessionId}/something"
        fullUrl = `https://api.${region}.saucelabs.com/${apiPath}`;
      } else {
        // Relative path - append to base session endpoint
        const cleanPath = apiPath.startsWith("/") ? apiPath.substring(1) : apiPath;
        fullUrl = `https://api.${region}.saucelabs.com/rdc/v2/sessions/${device.sessionId}/${cleanPath}`;
      }

      let body = null;
      if (apiBody.trim() && apiMethod === "POST") {
        try {
          body = JSON.parse(apiBody);
        } catch {
          body = apiBody;
        }
      }

      const response = await window.api.fetchSauce({
        url: fullUrl,
        creds,
        method: apiMethod,
        body: body,
      });

      setApiResponse({
        status: response.status,
        ok: response.ok,
        data: response.data,
        headers: {}, // API proxy doesn't return headers currently
      });
    } catch (err) {
      setApiResponse({
        status: 0,
        ok: false,
        error: err.message,
      });
    } finally {
      setApiLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        right: 0,
        top: 0,
        bottom: 0,
        width: "400px",
        backgroundColor: "#2d2d2d",
        borderLeft: "1px solid #444",
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        boxShadow: "-2px 0 8px rgba(0,0,0,0.3)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px",
          borderBottom: "1px solid #444",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "#252525",
        }}
      >
        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: "#fff" }}>
          Device Actions
        </h3>
        <button
          onClick={onClose}
          style={{
            padding: "4px 10px",
            backgroundColor: "transparent",
            color: "#9ca3af",
            border: "1px solid #4b5563",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "12px",
          }}
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "16px",
        }}
      >
        {/* Session ID */}
        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", color: "#9ca3af", fontSize: "12px", marginBottom: "6px" }}>
            Session ID
          </label>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <div
              style={{
                flex: 1,
                padding: "8px 12px",
                backgroundColor: "#1e1e1e",
                border: "1px solid #4b5563",
                borderRadius: "4px",
                color: "#d4d4d4",
                fontSize: "12px",
                fontFamily: "monospace",
                wordBreak: "break-all",
              }}
            >
              {device.sessionId}
            </div>
            <button
              onClick={handleCopySessionId}
              style={{
                padding: "8px 12px",
                backgroundColor: "#3b82f6",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: 500,
                fontSize: "12px",
                whiteSpace: "nowrap",
              }}
              title="Copy Session ID"
            >
              Copy
            </button>
          </div>
        </div>

        {/* Device Info */}
        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", color: "#9ca3af", fontSize: "12px", marginBottom: "6px" }}>
            Device
          </label>
          <div
            style={{
              padding: "8px 12px",
              backgroundColor: "#1e1e1e",
              border: "1px solid #4b5563",
              borderRadius: "4px",
              color: "#d4d4d4",
              fontSize: "12px",
            }}
          >
            {device.name || device.descriptor}
          </div>
        </div>

        {/* Built-in Actions */}
        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", color: "#9ca3af", fontSize: "12px", marginBottom: "6px" }}>
            Action
          </label>
          <select
            value={selectedAction}
            onChange={(e) => {
              setSelectedAction(e.target.value);
              setApiResponse(null);
              setScreenshotUrl(null);
              setAdbShellCommand("");
            }}
            style={{
              width: "100%",
              padding: "8px 10px",
              backgroundColor: "#1e1e1e",
              border: "1px solid #4b5563",
              borderRadius: "4px",
              color: "#d4d4d4",
              fontSize: "12px",
              marginBottom: "12px",
            }}
          >
            <option value="installApp">Install App</option>
            <option value="screenshot">Take Screenshot</option>
            <option value="sessionDetails">Get Session Details</option>
            {isAndroid && <option value="runAdbShellCommand">Run ADB Shell Command</option>}
          </select>

          {/* Install App Form */}
          {selectedAction === "installApp" && (
            <div>
              <input
                type="text"
                placeholder="Enter app path (e.g., /path/to/app.apk)"
                value={installAppPath}
                onChange={(e) => setInstallAppPath(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  backgroundColor: "#1e1e1e",
                  border: "1px solid #4b5563",
                  borderRadius: "4px",
                  color: "#d4d4d4",
                  fontSize: "12px",
                  marginBottom: "8px",
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleInstallApp();
                  }
                }}
              />
              <button
                onClick={handleInstallApp}
                disabled={actionLoading || !installAppPath.trim()}
                style={{
                  width: "100%",
                  padding: "8px 16px",
                  backgroundColor: actionLoading || !installAppPath.trim() ? "#4b5563" : "#3b82f6",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: actionLoading || !installAppPath.trim() ? "not-allowed" : "pointer",
                  fontWeight: 500,
                  fontSize: "12px",
                }}
              >
                {actionLoading ? "Installing..." : "Install"}
              </button>
            </div>
          )}

          {/* Take Screenshot */}
          {selectedAction === "screenshot" && (
            <div>
              <button
                onClick={handleTakeScreenshot}
                disabled={actionLoading}
                style={{
                  width: "100%",
                  padding: "8px 16px",
                  backgroundColor: actionLoading ? "#4b5563" : "#10b981",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: actionLoading ? "not-allowed" : "pointer",
                  fontWeight: 500,
                  fontSize: "12px",
                }}
              >
                {actionLoading ? "Taking Screenshot..." : "Take Screenshot"}
              </button>
              {screenshotUrl && (
                <div style={{ marginTop: "12px" }}>
                  <img
                    src={screenshotUrl}
                    alt="Screenshot"
                    style={{
                      width: "100%",
                      border: "1px solid #4b5563",
                      borderRadius: "4px",
                      marginBottom: "8px",
                    }}
                  />
                  <button
                    onClick={async () => {
                      if (!screenshotUrl) return;
                      try {
                        const result = await window.api.saveScreenshot(screenshotUrl);
                        if (result.success) {
                          alert(`Screenshot saved to: ${result.filePath}`);
                        } else if (!result.cancelled) {
                          alert(`Failed to save screenshot: ${result.error || "Unknown error"}`);
                        }
                      } catch (err) {
                        alert(`Error saving screenshot: ${err.message}`);
                      }
                    }}
                    style={{
                      width: "100%",
                      padding: "8px 16px",
                      backgroundColor: "#3b82f6",
                      color: "#fff",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontWeight: 500,
                      fontSize: "12px",
                    }}
                  >
                    💾 Download Screenshot
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Get Session Details */}
          {selectedAction === "sessionDetails" && (
            <div>
              <button
                onClick={handleGetSessionDetails}
                disabled={actionLoading}
                style={{
                  width: "100%",
                  padding: "8px 16px",
                  backgroundColor: actionLoading ? "#4b5563" : "#8b5cf6",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: actionLoading ? "not-allowed" : "pointer",
                  fontWeight: 500,
                  fontSize: "12px",
                }}
              >
                {actionLoading ? "Loading..." : "Get Session Details"}
              </button>
            </div>
          )}

          {/* Run ADB Shell Command (Android only) */}
          {selectedAction === "runAdbShellCommand" && isAndroid && (
            <div>
              <input
                type="text"
                placeholder="Enter ADB shell command (e.g., ls -la, pm list packages)"
                value={adbShellCommand}
                onChange={(e) => setAdbShellCommand(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  backgroundColor: "#1e1e1e",
                  border: "1px solid #4b5563",
                  borderRadius: "4px",
                  color: "#d4d4d4",
                  fontSize: "12px",
                  marginBottom: "8px",
                  fontFamily: "monospace",
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleRunAdbShellCommand();
                  }
                }}
              />
              <button
                onClick={handleRunAdbShellCommand}
                disabled={actionLoading || !adbShellCommand.trim()}
                style={{
                  width: "100%",
                  padding: "8px 16px",
                  backgroundColor: actionLoading || !adbShellCommand.trim() ? "#4b5563" : "#f59e0b",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: actionLoading || !adbShellCommand.trim() ? "not-allowed" : "pointer",
                  fontWeight: 500,
                  fontSize: "12px",
                }}
              >
                {actionLoading ? "Running..." : "Run ADB Command"}
              </button>
            </div>
          )}
        </div>

        {/* Custom API Request */}
        <div>
          <h4 style={{ color: "#fff", fontSize: "14px", fontWeight: 600, marginBottom: "12px" }}>
            Custom API Request
          </h4>

          {/* Method Selector */}
          <div style={{ marginBottom: "8px" }}>
            <select
              value={apiMethod}
              onChange={(e) => setApiMethod(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                backgroundColor: "#1e1e1e",
                border: "1px solid #4b5563",
                borderRadius: "4px",
                color: "#d4d4d4",
                fontSize: "12px",
              }}
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
            </select>
          </div>

          {/* API Path */}
          <div style={{ marginBottom: "8px" }}>
            <input
              type="text"
              placeholder="API path (e.g., screenshot, device/installApp, or rdc/v2/sessions/{sessionId})"
              value={apiPath}
              onChange={(e) => setApiPath(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                backgroundColor: "#1e1e1e",
                border: "1px solid #4b5563",
                borderRadius: "4px",
                color: "#d4d4d4",
                fontSize: "12px",
                fontFamily: "monospace",
              }}
            />
            <div style={{ fontSize: "10px", color: "#6b7280", marginTop: "4px" }}>
              {apiPath.startsWith("http") ? (
                <>Full URL provided</>
              ) : apiPath.startsWith("rdc/v2/sessions") ? (
                <>Will be prefixed with: https://api.{(device.region || "eu-central-1")}.saucelabs.com/</>
              ) : (
                <>Will be prefixed with: https://api.{(device.region || "eu-central-1")}.saucelabs.com/rdc/v2/sessions/{device.sessionId}/</>
              )}
            </div>
          </div>

          {/* Request Body (for POST) */}
          {apiMethod === "POST" && (
            <div style={{ marginBottom: "8px" }}>
              <label style={{ display: "block", color: "#9ca3af", fontSize: "12px", marginBottom: "4px" }}>
                Request Body (JSON)
              </label>
              <textarea
                value={apiBody}
                onChange={(e) => setApiBody(e.target.value)}
                placeholder='{"key": "value"}'
                rows={6}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  backgroundColor: "#1e1e1e",
                  border: "1px solid #4b5563",
                  borderRadius: "4px",
                  color: "#d4d4d4",
                  fontSize: "12px",
                  fontFamily: "monospace",
                  resize: "vertical",
                }}
              />
            </div>
          )}

          {/* Send Button */}
          <button
            onClick={handleCustomApiRequest}
            disabled={apiLoading}
            style={{
              width: "100%",
              padding: "8px 16px",
              backgroundColor: apiLoading ? "#4b5563" : "#8b5cf6",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: apiLoading ? "not-allowed" : "pointer",
              fontWeight: 500,
              fontSize: "12px",
              marginBottom: "12px",
            }}
          >
            {apiLoading ? "Sending..." : "Send Request"}
          </button>

          {/* Response */}
          {apiResponse && (
            <div>
              <label style={{ display: "block", color: "#9ca3af", fontSize: "12px", marginBottom: "6px" }}>
                Response ({apiResponse.status} {apiResponse.ok ? "✓" : "✗"})
              </label>
              <pre
                style={{
                  padding: "12px",
                  backgroundColor: "#1e1e1e",
                  border: "1px solid #4b5563",
                  borderRadius: "4px",
                  color: apiResponse.ok ? "#10b981" : "#ef4444",
                  fontSize: "11px",
                  fontFamily: "monospace",
                  overflow: "auto",
                  maxHeight: "300px",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {apiResponse.error
                  ? apiResponse.error
                  : JSON.stringify(apiResponse.data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

