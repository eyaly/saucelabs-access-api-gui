import React, { useState, useEffect, useRef } from "react";

export default function DeviceLogModal({ websocketUrl, deviceName, sessionId, onClose, index }) {
  const [logs, setLogs] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  const wsRef = useRef(null);
  const logContainerRef = useRef(null);
  const [position, setPosition] = useState({ x: 50 + (index % 3) * 30, y: 50 + (index % 3) * 30 });
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const modalRef = useRef(null);
  const headerRef = useRef(null);

  // Calculate initial position offset for multiple modals
  useEffect(() => {
    setPosition({ x: 50 + (index % 3) * 30, y: 50 + (index % 3) * 30 });
  }, [index]);

  // Handle dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const handleHeaderMouseDown = (e) => {
    if (e.target.tagName === "BUTTON") return;
    setIsDragging(true);
    const rect = modalRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleResizeMouseDown = (e) => {
    e.stopPropagation();
    setIsResizing(true);
    const rect = modalRef.current.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = rect.width;
    const startHeight = rect.height;
    
    const handleMouseMove = (e) => {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      const newWidth = Math.max(400, startWidth + deltaX);
      const newHeight = Math.max(300, startHeight + deltaY);
      setSize({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handlePause = () => {
    setIsPaused(true);
    isPausedRef.current = true;
  };

  const handleContinue = () => {
    setIsPaused(false);
    isPausedRef.current = false;
  };

  // WebSocket connection
  useEffect(() => {
    if (!websocketUrl) return;

    const connectWebSocket = () => {
      try {
        console.log(`🔌 Connecting to WebSocket: ${websocketUrl.replace(/\/\/[^@]+@/, "//***:***@")}`); // Hide credentials in log
        const ws = new WebSocket(websocketUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log("✅ WebSocket connected");
          setIsConnected(true);
          setError(null);
          setLogs((prev) => [
            ...prev,
            { type: "system", message: `Connected to device log at ${new Date().toLocaleTimeString()}` },
          ]);
        };

        ws.onmessage = (event) => {
          // Only process messages if not paused
          if (isPausedRef.current) return;

          try {
            const data = JSON.parse(event.data);
            setLogs((prev) => [
              ...prev,
              {
                type: "log",
                message: typeof data === "string" ? data : JSON.stringify(data, null, 2),
                timestamp: new Date().toLocaleTimeString(),
              },
            ]);
          } catch (e) {
            // If not JSON, treat as plain text
            setLogs((prev) => [
              ...prev,
              {
                type: "log",
                message: event.data,
                timestamp: new Date().toLocaleTimeString(),
              },
            ]);
          }
        };

        ws.onerror = (error) => {
          console.error("❌ WebSocket error:", error);
          setError("WebSocket connection error");
          setIsConnected(false);
        };

        ws.onclose = (event) => {
          console.log("🔌 WebSocket closed", event.code, event.reason);
          setIsConnected(false);
          setLogs((prev) => [
            ...prev,
            {
              type: "system",
              message: `Connection closed at ${new Date().toLocaleTimeString()}. Reconnecting...`,
            },
          ]);

          // Auto-reconnect after 2 seconds
          setTimeout(() => {
            if (wsRef.current === ws) {
              // Only reconnect if this is still the current connection
              connectWebSocket();
            }
          }, 2000);
        };
      } catch (err) {
        console.error("❌ WebSocket connection failed:", err);
        setError(err.message);
        setIsConnected(false);
      }
    };

    connectWebSocket();

    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [websocketUrl]);

  // Auto-scroll to bottom when new logs arrive (only if not paused)
  useEffect(() => {
    if (logContainerRef.current && !isPaused) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, isPaused]);

  const handleClear = () => {
    setLogs([]);
  };

  return (
    <>
      {/* Light backdrop */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.1)",
          zIndex: 1000 + index,
          pointerEvents: "none",
        }}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        style={{
          position: "fixed",
          top: `${position.y}px`,
          left: `${position.x}px`,
          width: `${size.width}px`,
          height: `${size.height}px`,
          backgroundColor: "#1e1e1e",
          borderRadius: "8px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          zIndex: 1001 + index,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          cursor: isDragging ? "grabbing" : isResizing ? "nwse-resize" : "default",
        }}
      >
        {/* Header */}
        <div
          ref={headerRef}
          onMouseDown={handleHeaderMouseDown}
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid #333",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#2d2d2d",
            cursor: "grab",
            userSelect: "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
            <div
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                backgroundColor: isConnected ? "#10b981" : "#ef4444",
              }}
            />
            <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "#fff" }}>
              {deviceName ? `Device Log: ${deviceName}` : "Device Log"}
            </h3>
            {sessionId && (
              <span style={{ fontSize: "11px", color: "#9ca3af" }}>({sessionId.substring(0, 8)}...)</span>
            )}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            {isPaused ? (
              <button
                onClick={handleContinue}
                style={{
                  padding: "4px 10px",
                  backgroundColor: "#10b981",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontWeight: 500,
                  fontSize: "12px",
                }}
              >
                ▶ Continue
              </button>
            ) : (
              <button
                onClick={handlePause}
                style={{
                  padding: "4px 10px",
                  backgroundColor: "#f59e0b",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontWeight: 500,
                  fontSize: "12px",
                }}
              >
                ⏸ Pause
              </button>
            )}
            <button
              onClick={handleClear}
              style={{
                padding: "4px 10px",
                backgroundColor: "transparent",
                color: "#9ca3af",
                border: "1px solid #4b5563",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: 500,
                fontSize: "12px",
              }}
            >
              Clear
            </button>
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
              onMouseOver={(e) => {
                e.target.style.backgroundColor = "#ef4444";
                e.target.style.color = "#fff";
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = "transparent";
                e.target.style.color = "#9ca3af";
              }}
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* Log content */}
        <div
          ref={logContainerRef}
          style={{
            flex: 1,
            overflow: "auto",
            padding: "12px",
            fontFamily: "monospace",
            fontSize: "12px",
            lineHeight: "1.5",
            backgroundColor: "#1e1e1e",
            color: "#d4d4d4",
          }}
        >
          {error && (
            <div style={{ color: "#ef4444", marginBottom: "8px" }}>Error: {error}</div>
          )}
          {logs.length === 0 && !error && (
            <div style={{ color: "#6b7280", fontStyle: "italic" }}>Waiting for logs...</div>
          )}
          {logs.map((log, idx) => (
            <div
              key={idx}
              style={{
                marginBottom: "4px",
                color: log.type === "system" ? "#9ca3af" : "#d4d4d4",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {log.timestamp && (
                <span style={{ color: "#6b7280", marginRight: "8px" }}>[{log.timestamp}]</span>
              )}
              {log.message}
            </div>
          ))}
        </div>

        {/* Resize handle */}
        <div
          onMouseDown={handleResizeMouseDown}
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: "20px",
            height: "20px",
            cursor: "nwse-resize",
            backgroundColor: "transparent",
            zIndex: 10,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(59, 130, 246, 0.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          <div
            style={{
              position: "absolute",
              bottom: "4px",
              right: "4px",
              width: "0",
              height: "0",
              borderLeft: "8px solid transparent",
              borderBottom: "8px solid #9ca3af",
            }}
          />
        </div>
      </div>
    </>
  );
}

