import React, { useState } from "react";

export default function DeviceActionsSidebar({ device, onClose }) {
  const [installAppPath, setInstallAppPath] = useState("");
  const [installing, setInstalling] = useState(false);
  const [apiMethod, setApiMethod] = useState("GET");
  const [apiPath, setApiPath] = useState("");
  const [apiBody, setApiBody] = useState("");
  const [apiResponse, setApiResponse] = useState(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [screenshotLoading, setScreenshotLoading] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState(null);

  if (!device || !device.sessionId) {
    return null;
  }

  const handleInstallApp = async () => {
    if (!installAppPath.trim()) {
      alert("Please enter an app path");
      return;
    }

    setInstalling(true);
    try {
      const creds = await window.api.getCreds();
      const region = device.region || creds.region || "eu-central-1";
      const url = `https://api.${region}.saucelabs.com/rdc/v2/sessions/${device.sessionId}/install`;

      const response = await window.api.fetchSauce({
        url,
        creds,
        method: "POST",
        body: { appPath: installAppPath },
      });

      if (response.ok) {
        alert("App installed successfully!");
        setInstallAppPath("");
      } else {
        alert(`Failed to install app: ${response.status} - ${JSON.stringify(response.data)}`);
      }
    } catch (err) {
      alert(`Error installing app: ${err.message}`);
    } finally {
      setInstalling(false);
    }
  };

  const handleTakeScreenshot = async () => {
    setScreenshotLoading(true);
    setScreenshotUrl(null);
    try {
      const creds = await window.api.getCreds();
      const region = device.region || creds.region || "eu-central-1";
      const url = `https://api.${region}.saucelabs.com/rdc/v2/sessions/${device.sessionId}/screenshot`;

      const response = await window.api.fetchSauce({
        url,
        creds,
        method: "GET",
      });

      if (response.ok) {
        // Handle different response formats
        let imageUrl = null;
        if (typeof response.data === "string") {
          // Might be base64 or URL string
          if (response.data.startsWith("data:")) {
            imageUrl = response.data;
          } else if (response.data.startsWith("http")) {
            imageUrl = response.data;
          } else {
            // Assume base64
            imageUrl = `data:image/png;base64,${response.data}`;
          }
        } else if (response.data?.screenshot) {
          imageUrl = response.data.screenshot;
        } else if (response.data?.url) {
          imageUrl = response.data.url;
        } else if (response.data?.data) {
          // Base64 data
          imageUrl = `data:image/png;base64,${response.data.data}`;
        } else if (response.data?.image) {
          imageUrl = response.data.image;
        }
        
        if (imageUrl) {
          setScreenshotUrl(imageUrl);
        } else {
          alert(`Screenshot API returned unexpected format. Check console for details.`);
          console.log("Screenshot response:", response.data);
        }
      } else {
        alert(`Failed to take screenshot: ${response.status} - ${JSON.stringify(response.data)}`);
      }
    } catch (err) {
      alert(`Error taking screenshot: ${err.message}`);
    } finally {
      setScreenshotLoading(false);
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
      
      // Build full URL - handle both relative and absolute paths
      let fullUrl;
      if (apiPath.startsWith("http")) {
        fullUrl = apiPath;
      } else {
        // Remove leading slash if present
        const cleanPath = apiPath.startsWith("/") ? apiPath.substring(1) : apiPath;
        fullUrl = `https://api.${region}.saucelabs.com/rdc/v2/sessions/${device.sessionId}/${cleanPath}`;
      }

      let body = null;
      if (apiBody.trim() && (apiMethod === "POST" || apiMethod === "PUT" || apiMethod === "PATCH")) {
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
          <div
            style={{
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

        {/* Install App */}
        <div style={{ marginBottom: "24px" }}>
          <h4 style={{ color: "#fff", fontSize: "14px", fontWeight: 600, marginBottom: "12px" }}>
            Install App
          </h4>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              placeholder="Enter app path (e.g., /path/to/app.apk)"
              value={installAppPath}
              onChange={(e) => setInstallAppPath(e.target.value)}
              style={{
                flex: 1,
                padding: "8px 10px",
                backgroundColor: "#1e1e1e",
                border: "1px solid #4b5563",
                borderRadius: "4px",
                color: "#d4d4d4",
                fontSize: "12px",
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleInstallApp();
                }
              }}
            />
            <button
              onClick={handleInstallApp}
              disabled={installing}
              style={{
                padding: "8px 16px",
                backgroundColor: installing ? "#4b5563" : "#3b82f6",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: installing ? "not-allowed" : "pointer",
                fontWeight: 500,
                fontSize: "12px",
              }}
            >
              {installing ? "Installing..." : "Install"}
            </button>
          </div>
        </div>

        {/* Take Screenshot */}
        <div style={{ marginBottom: "24px" }}>
          <h4 style={{ color: "#fff", fontSize: "14px", fontWeight: 600, marginBottom: "12px" }}>
            Screenshot
          </h4>
          <button
            onClick={handleTakeScreenshot}
            disabled={screenshotLoading}
            style={{
              width: "100%",
              padding: "8px 16px",
              backgroundColor: screenshotLoading ? "#4b5563" : "#10b981",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: screenshotLoading ? "not-allowed" : "pointer",
              fontWeight: 500,
              fontSize: "12px",
            }}
          >
            {screenshotLoading ? "Taking Screenshot..." : "Take Screenshot"}
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
                }}
              />
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
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
              <option value="PATCH">PATCH</option>
            </select>
          </div>

          {/* API Path */}
          <div style={{ marginBottom: "8px" }}>
            <input
              type="text"
              placeholder="API path (e.g., screenshot, install, or full URL)"
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
              Relative to: /rdc/v2/sessions/{device.sessionId}/
            </div>
          </div>

          {/* Request Body (for POST/PUT/PATCH) */}
          {(apiMethod === "POST" || apiMethod === "PUT" || apiMethod === "PATCH") && (
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

