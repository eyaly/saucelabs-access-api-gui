import React, { useState, useEffect } from "react";
import DeviceCard from "../components/DeviceCard";

export default function Devices({ onViewDeviceLog }) {
  const [devices, setDevices] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

            // If device state is IN_USE, check for active sessions
            if (d.state === "IN_USE") {
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
                  const activeSession = sessions.find(s => s.state === "ACTIVE");
                  if (activeSession) {
                    // Found an ACTIVE session - set sessionId, device will be blue and toggle on
                    deviceDetails.sessionId = activeSession.id;
                    deviceDetails.state = "IN_USE";
                    // inUseBy is already set from status API response
                  } else {
                    // No active session found - device is IN_USE but no session for current user
                    deviceDetails.state = "IN_USE";
                    // inUseBy is already set from status API response
                  }
                } else {
                  // No sessions found
                  deviceDetails.state = "IN_USE";
                  // inUseBy is already set from status API response
                }
              } catch (sessionErr) {
                console.warn(`⚠️ Failed to fetch session for ${d.descriptor}:`, sessionErr);
                deviceDetails.state = d.state || "IN_USE";
              }
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

  return (
    <div className="page">
      <h1 className="page-title">Device Catalog</h1>

      <div className="search-refresh">
        <input
          className="search-input"
          placeholder="Search devices"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading && <p>🔄 Loading devices...</p>}
      {error && <p className="text-red-600">❌ {error}</p>}

      <div className="cards">
        {filteredDevices.map((device) => (
          <DeviceCard
            key={device.descriptor}
            device={device}
            onToggleSession={handleToggleSession}
            onViewDeviceLog={onViewDeviceLog}
          />
        ))}
      </div>
    </div>
  );
}
