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
  const [sessionIdCopied, setSessionIdCopied] = useState(false);
  const [showStorageFiles, setShowStorageFiles] = useState(false);
  const [storageFiles, setStorageFiles] = useState([]);
  const [loadingStorageFiles, setLoadingStorageFiles] = useState(false);
  const [openUrl, setOpenUrl] = useState("");

  if (!device || !device.sessionId) {
    return null;
  }

  // Check if device is Android
  const isAndroid = !(device.os || "").toUpperCase().includes("IOS");

  const handleCopySessionId = () => {
    navigator.clipboard.writeText(device.sessionId).then(() => {
      setSessionIdCopied(true);
      setTimeout(() => {
        setSessionIdCopied(false);
      }, 2000); // Revert after 2 seconds
    }).catch(() => {
      // Silently fail - could add error state if needed
    });
  };

  const handleFetchStorageFiles = async () => {
    setLoadingStorageFiles(true);
    try {
      const creds = await window.api.getCreds();
      const region = device.region || creds.region || "eu-central-1";
      const url = `https://api.${region}.saucelabs.com/v1/storage/files`;

      const response = await window.api.fetchSauce({
        url,
        creds,
        method: "GET",
      });

      if (response.ok && response.data) {
        // Extract file names from response
        let files = Array.isArray(response.data) 
          ? response.data.map(item => item.name || item).filter(Boolean)
          : response.data.items 
          ? response.data.items.map(item => item.name || item).filter(Boolean)
          : [];
        
        // Filter files based on device OS
        if (isAndroid) {
          // Android: show only .apk and .aab files
          files = files.filter(fileName => {
            const lowerName = fileName.toLowerCase();
            return lowerName.endsWith('.apk') || lowerName.endsWith('.aab');
          });
        } else {
          // iOS: show only .ipa files
          files = files.filter(fileName => {
            const lowerName = fileName.toLowerCase();
            return lowerName.endsWith('.ipa');
          });
        }
        
        setStorageFiles(files);
        setShowStorageFiles(true);
      } else {
        alert(`Failed to fetch storage files: ${response.status}`);
      }
    } catch (err) {
      alert(`Error fetching storage files: ${err.message}`);
    } finally {
      setLoadingStorageFiles(false);
    }
  };

  const handleSelectStorageFile = (fileName) => {
    setInstallAppPath(`storage:filename=${fileName}`);
    setShowStorageFiles(false);
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

  const handleListAppInstallations = async () => {
    setActionLoading(true);
    setApiResponse(null);
    const creds = await window.api.getCreds();
    const region = device.region || creds.region || "eu-central-1";
    const url = `https://api.${region}.saucelabs.com/rdc/v2/sessions/${device.sessionId}/device/listAppInstallations`;

    // Populate Custom API Request section
    setApiMethod("POST");
    setApiPath(`device/listAppInstallations`);
    setApiBody("");

    try {
      const response = await window.api.fetchSauce({
        url,
        creds,
        method: "POST",
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

  const handleOpenUrl = async () => {
    if (!openUrl.trim()) {
      alert("Please enter a URL");
      return;
    }

    setActionLoading(true);
    setApiResponse(null);
    const creds = await window.api.getCreds();
    const region = device.region || creds.region || "eu-central-1";
    const url = `https://api.${region}.saucelabs.com/rdc/v2/sessions/${device.sessionId}/device/openUrl`;
    const body = {
      url: openUrl.trim(),
    };

    // Populate Custom API Request section
    setApiMethod("POST");
    setApiPath(`device/openUrl`);
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
        setOpenUrl("");
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
                backgroundColor: sessionIdCopied ? "#4b5563" : "#3b82f6",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: 500,
                fontSize: "12px",
                whiteSpace: "nowrap",
                transition: "background-color 0.2s ease",
              }}
              title="Copy Session ID"
            >
              {sessionIdCopied ? "Copied" : "Copy"}
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
              setOpenUrl("");
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
            <option value="listAppInstallations">List App Installations</option>
            <option value="openUrl">Open a URL</option>
            {isAndroid && <option value="runAdbShellCommand">Run ADB Shell Command</option>}
          </select>

          {/* Install App Form */}
          {selectedAction === "installApp" && (
            <div>
              <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
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
                  onClick={handleFetchStorageFiles}
                  disabled={loadingStorageFiles}
                  style={{
                    padding: "8px 12px",
                    backgroundColor: loadingStorageFiles ? "#4b5563" : "#8b5cf6",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    cursor: loadingStorageFiles ? "not-allowed" : "pointer",
                    fontWeight: 500,
                    fontSize: "12px",
                    whiteSpace: "nowrap",
                  }}
                  title="Select from Sauce Labs storage"
                >
                  {loadingStorageFiles ? "Loading..." : "📁 Storage"}
                </button>
              </div>
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

              {/* Storage Files Modal */}
              {showStorageFiles && (
                <>
                  <div
                    style={{
                      position: "fixed",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: "rgba(0, 0, 0, 0.5)",
                      zIndex: 2000,
                      cursor: "pointer",
                    }}
                    onClick={() => setShowStorageFiles(false)}
                  />
                  <div
                    style={{
                      position: "fixed",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      width: "500px",
                      maxHeight: "600px",
                      backgroundColor: "#2d2d2d",
                      border: "1px solid #4b5563",
                      borderRadius: "8px",
                      zIndex: 2001,
                      display: "flex",
                      flexDirection: "column",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
                    }}
                  >
                    <div
                      style={{
                        padding: "16px",
                        borderBottom: "1px solid #4b5563",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <h3 style={{ margin: 0, color: "#fff", fontSize: "16px", fontWeight: 600 }}>
                        Select File from Storage
                      </h3>
                      <button
                        onClick={() => setShowStorageFiles(false)}
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
                    <div
                      style={{
                        flex: 1,
                        overflow: "auto",
                        padding: "12px",
                      }}
                    >
                      {storageFiles.length === 0 ? (
                        <div style={{ color: "#9ca3af", textAlign: "center", padding: "20px" }}>
                          No files found in storage
                        </div>
                      ) : (
                        storageFiles.map((fileName, index) => (
                          <div
                            key={index}
                            onClick={() => handleSelectStorageFile(fileName)}
                            style={{
                              padding: "12px",
                              marginBottom: "8px",
                              backgroundColor: "#1e1e1e",
                              border: "1px solid #4b5563",
                              borderRadius: "4px",
                              cursor: "pointer",
                              color: "#d4d4d4",
                              fontSize: "14px",
                              transition: "background-color 0.2s",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#252525";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "#1e1e1e";
                            }}
                          >
                            {fileName}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
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

          {/* List App Installations */}
          {selectedAction === "listAppInstallations" && (
            <div>
              <button
                onClick={handleListAppInstallations}
                disabled={actionLoading}
                style={{
                  width: "100%",
                  padding: "8px 16px",
                  backgroundColor: actionLoading ? "#4b5563" : "#f59e0b",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: actionLoading ? "not-allowed" : "pointer",
                  fontWeight: 500,
                  fontSize: "12px",
                }}
              >
                {actionLoading ? "Loading..." : "List App Installations"}
              </button>
            </div>
          )}

          {/* Open a URL */}
          {selectedAction === "openUrl" && (
            <div>
              <input
                type="text"
                placeholder="Enter URL (e.g., https://example.com)"
                value={openUrl}
                onChange={(e) => setOpenUrl(e.target.value)}
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
                    handleOpenUrl();
                  }
                }}
              />
              <button
                onClick={handleOpenUrl}
                disabled={actionLoading || !openUrl.trim()}
                style={{
                  width: "100%",
                  padding: "8px 16px",
                  backgroundColor: actionLoading || !openUrl.trim() ? "#4b5563" : "#10b981",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: actionLoading || !openUrl.trim() ? "not-allowed" : "pointer",
                  fontWeight: 500,
                  fontSize: "12px",
                }}
              >
                {actionLoading ? "Opening..." : "Open URL"}
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
              placeholder="API path"
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

