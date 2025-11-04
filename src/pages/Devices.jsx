import React, { useState, useEffect } from "react";
import DeviceCard from "../components/DeviceCard";
import DeviceActionsSidebar from "../components/DeviceActionsSidebar";

export default function Devices({ onViewDeviceLog }) {
  const [devices, setDevices] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDeviceForActions, setSelectedDeviceForActions] = useState(null);
  const [sortBy, setSortBy] = useState("status"); // "status" or "name"

  // 🔁 Fetch device list
  const fetchDevices = async () => {
    try {
      setLoading(true);
      setError("");
      console.log("📡 Fetching devices via Electron...");

      const creds = await window.api.getCreds();
      if (!creds?.username || !creds?.accessKey) {
        setError("Missing credentials. Please update Settings.");
        return;
      }

      const region = creds.region || "eu-central-1";
      const url = `https://api.${region}.saucelabs.com/rdc/v2/devices/status?privateOnly=true`;

      const response = await window.api.fetchSauce({
        url,
        creds,
        method: "GET",
      });

      if (!response.ok) throw new Error(`Failed: ${response.status}`);

      const deviceList = response.data?.devices || [];
      console.log(`✅ Loaded ${deviceList.length} devices`);

      // 🧩 Process devices from status API
      const detailedDevices = await Promise.all(
        deviceList.map(async (d) => {
          // Check if this device is already connected from the previous state
          const existingDevice = devices.find(prevD => prevD.descriptor === d.descriptor);
          if (existingDevice && existingDevice.sessionId) {
            // Device has an active session - preserve it completely, only update inUseBy
            return { 
              ...existingDevice, 
              region,
              // Only update inUseBy from status API if available
              inUseBy: d.inUseBy || existingDevice.inUseBy
            };
          }

          // Device doesn't have a sessionId - fetch device details and check for active sessions
          const detailUrl = `https://api.${region}.saucelabs.com/v1/rdc/devices/${d.descriptor}`;
          try {
            const detailResponse = await window.api.fetchSauce({
              url: detailUrl,
              creds,
              method: "GET",
            });
            let deviceDetails = { ...d, region, sessionId: null };
            if (detailResponse.ok) {
              deviceDetails = { ...deviceDetails, ...detailResponse.data };
            } else {
              console.warn(`⚠️ Could not fetch details for ${d.descriptor}`);
            }

            // Check for active sessions for all devices (not just IN_USE)
            // Look for ACTIVE sessions - ignore CLOSED sessions
            const sessionsUrl = `https://api.${region}.saucelabs.com/rdc/v2/sessions?deviceName=${d.descriptor}`;
            try {
              const sessionsResponse = await window.api.fetchSauce({
                url: sessionsUrl,
                creds,
                method: "GET",
              });
              // Handle both "items" and "sessions" response formats
              const sessions = sessionsResponse.data?.items || sessionsResponse.data?.sessions || [];
              if (sessions.length > 0) {
                // Find ACTIVE session (state === "ACTIVE"), ignore CLOSED sessions
                // Multiple sessions can exist (CLOSED and ACTIVE) - we only want ACTIVE ones
                const activeSession = sessions.find(s => (s.state || "").toUpperCase() === "ACTIVE");
                if (activeSession) {
                  // Found an ACTIVE session - use this sessionId
                  // Device will be blue and toggle on (connected state)
                  deviceDetails.sessionId = activeSession.id;
                  deviceDetails.state = "IN_USE";
                  // inUseBy is already set from status API response
                } else {
                  // No ACTIVE session found - only CLOSED sessions exist
                  // Ignore CLOSED sessions, keep device state as is from status API
                  deviceDetails.state = d.state || "AVAILABLE";
                }
              } else {
                // No sessions found at all
                deviceDetails.state = d.state || "AVAILABLE";
              }
            } catch (sessionErr) {
              console.warn(`⚠️ Failed to fetch session for ${d.descriptor}:`, sessionErr);
              deviceDetails.state = d.state || "AVAILABLE";
            }

            return deviceDetails;
          } catch (err) {
            console.warn(`⚠️ Failed detail call for ${d.descriptor}:`, err);
            return { ...d, region, sessionId: null, state: d.state || "AVAILABLE" };
          }
        })
      );

      setDevices(detailedDevices);
    } catch (err) {
      console.error("❌ Error fetching devices:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ▶️ Toggle session
  const handleToggleSession = async (device, isConnecting) => {
    try {
      const creds = await window.api.getCreds();
      const region = creds.region || "eu-central-1";

      if (isConnecting) {
        console.log(`▶️ Starting session for ${device.descriptor}`);
        const response = await window.api.fetchSauce({
          url: `https://api.${region}.saucelabs.com/rdc/v2/sessions`,
          creds,
          method: "POST",
          body: { device: { deviceName: device.descriptor } },
        });

        if (!response.ok) {
          console.error("❌ Failed to start session:", response);
          return;
        }

        const sessionId = response.data.id;
        console.log(`✅ Session started: ${sessionId}`);

        setDevices((prev) =>
          prev.map((d) =>
            d.descriptor === device.descriptor
              ? { ...d, sessionId, state: "IN_USE" }
              : d
          )
        );
      } else {
        console.log(`🛑 Stopping session for ${device.descriptor}`);
        if (!device.sessionId) {
          console.warn("⚠️ No sessionId found on device");
          return;
        }

        const response = await window.api.fetchSauce({
          url: `https://api.${region}.saucelabs.com/rdc/v2/sessions/${device.sessionId}`,
          creds,
          method: "DELETE",
        });

        if (response.ok) {
          console.log(`✅ Session deleted: ${device.sessionId}`);
          setDevices((prev) =>
            prev.map((d) =>
              d.descriptor === device.descriptor
                ? { ...d, sessionId: null, state: "UPDATING", isUpdating: true }
                : d
            )
          );
          // Wait for automatic 20-second refresh to update the device state
          // This prevents users from connecting while device is transitioning
        } else {
          console.error("❌ Failed to delete session:", response);
        }
      }
    } catch (err) {
      console.error("❌ Error toggling session:", err);
    }
  };

  useEffect(() => {
    fetchDevices();

    // Set up automatic refresh every 20 seconds
    const refreshInterval = setInterval(() => {
      fetchDevices();
    }, 20000); // 20 seconds

    // Cleanup interval on unmount
    return () => clearInterval(refreshInterval);
  }, []);

  // 🔍 Filter by search text (by device name)
  const filteredDevices = devices.filter((d) => {
    if (!search) return true; // Show all if search is empty
    const searchLower = search.toLowerCase();
    const deviceName = (d.name || "").toLowerCase();
    return deviceName.includes(searchLower);
  });

  // 📊 Sort devices by status: Connected > Available > In Use > Others
  const sortedDevices = [...filteredDevices].sort((a, b) => {
    if (sortBy === "status") {
      // Priority order: Connected (has sessionId) > Available > In Use > Others
      const getPriority = (device) => {
        // 1. Connected devices (has sessionId)
        if (device.sessionId) return 1;
        
        // 2. Available devices
        const state = (device.state || "").toUpperCase();
        if (state === "AVAILABLE") return 2;
        
        // 3. In Use devices (by others - has inUseBy but no sessionId)
        if (device.inUseBy && !device.sessionId) return 3;
        if (state.includes("IN_USE") || state.includes("INUSE")) return 3;
        
        // 4. All others (CLEANING, CLEANUP, etc.)
        return 4;
      };

      const priorityA = getPriority(a);
      const priorityB = getPriority(b);

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // If same priority, sort by name
      const nameA = (a.name || a.descriptor || "").toLowerCase();
      const nameB = (b.name || b.descriptor || "").toLowerCase();
      return nameA.localeCompare(nameB);
    } else {
      // Sort by name
      const nameA = (a.name || a.descriptor || "").toLowerCase();
      const nameB = (b.name || b.descriptor || "").toLowerCase();
      return nameA.localeCompare(nameB);
    }
  });

  // Handle "More Actions" click
  const handleMoreActions = (device) => {
    setSelectedDeviceForActions(device);
  };

  return (
    <div className="page" style={{ position: "relative", display: "flex" }}>
      <div style={{ flex: 1, marginRight: selectedDeviceForActions ? "400px" : "0", transition: "margin-right 0.3s ease" }}>
        <h1 className="page-title">Device Catalog</h1>

        <div style={{ display: "flex", gap: "20px", alignItems: "flex-end", marginBottom: "20px" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "14px", fontWeight: 600, color: "#333" }}>
              Search Devices
            </label>
            <div style={{ height: "40px", display: "flex", alignItems: "stretch" }}>
              <input
                type="text"
                placeholder="Search devices"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ 
                  flex: 1,
                  height: "100%",
                  paddingTop: "0",
                  paddingBottom: "0",
                  paddingLeft: "14px",
                  paddingRight: "14px",
                  fontSize: "16px",
                  border: "2px solid #f4a300",
                  borderRadius: "10px",
                  outline: "none",
                  backgroundColor: "#fff",
                  minWidth: "260px",
                  boxSizing: "border-box",
                  margin: 0,
                  lineHeight: "normal",
                  fontFamily: "inherit",
                }}
              />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "14px", fontWeight: 600, color: "#333" }}>
              SORT BY
            </label>
            <div style={{ height: "40px", display: "flex", alignItems: "stretch" }}>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  height: "100%",
                  paddingTop: "0",
                  paddingBottom: "0",
                  paddingLeft: "12px",
                  paddingRight: "12px",
                  fontSize: "14px",
                  border: "2px solid #f4a300",
                  borderRadius: "10px",
                  outline: "none",
                  backgroundColor: "#fff",
                  cursor: "pointer",
                  fontWeight: 500,
                  minWidth: "120px",
                  width: "120px",
                  boxSizing: "border-box",
                  margin: 0,
                  appearance: "none",
                  WebkitAppearance: "none",
                  MozAppearance: "none",
                  lineHeight: "normal",
                  fontFamily: "inherit",
                }}
              >
                <option value="status">Status</option>
                <option value="name">A to Z</option>
              </select>
            </div>
          </div>
        </div>

        {loading && <p>🔄 Loading devices...</p>}
        {error && <p className="text-red-600">❌ {error}</p>}

        <div className="cards">
          {sortedDevices.map((device) => (
            <DeviceCard
              key={device.descriptor}
              device={device}
              onToggleSession={handleToggleSession}
              onViewDeviceLog={onViewDeviceLog}
              onMoreActions={handleMoreActions}
            />
          ))}
        </div>
      </div>

      {/* Actions Sidebar */}
      {selectedDeviceForActions && (
        <DeviceActionsSidebar
          device={devices.find(d => d.descriptor === selectedDeviceForActions.descriptor) || selectedDeviceForActions}
          onClose={() => setSelectedDeviceForActions(null)}
        />
      )}
    </div>
  );
}
