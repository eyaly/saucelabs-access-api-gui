import React, { useState, useEffect } from "react";
import DeviceCard from "../components/DeviceCard";

export default function Devices() {
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

      // 🧩 Fetch extra /v1 details for each device
      const detailedDevices = await Promise.all(
        deviceList.map(async (d) => {
          // Check if this device is already connected from the previous state
          const existingDevice = devices.find(prevD => prevD.descriptor === d.descriptor);
          if (existingDevice && existingDevice.sessionId) {
            // If device has an active session, ALWAYS preserve it and only update inUseBy
            // Don't refresh the device - just update the "in use by" information from status API
            return { 
              ...existingDevice, 
              region,
              // Only update inUseBy from status API if available
              inUseBy: d.inUseBy || existingDevice.inUseBy
            };
          }

          const detailUrl = `https://api.${region}.saucelabs.com/v1/rdc/devices/${d.descriptor}`;
          try {
            const detailResponse = await window.api.fetchSauce({
              url: detailUrl,
              creds,
              method: "GET",
            });
            let deviceDetails = { ...d, region };
            // Preserve initial state from status API
            const initialState = d.state;
            if (detailResponse.ok) {
              deviceDetails = { ...deviceDetails, ...detailResponse.data };
              // Preserve IN_USE state from status API if detail API doesn't have it but status API does
              if (initialState === "IN_USE" && !deviceDetails.state) {
                deviceDetails.state = "IN_USE";
              }
            } else {
              console.warn(`⚠️ Could not fetch details for ${d.descriptor}`);
            }

            // If device is IN_USE (from either status or detail API), fetch session ID
            if (deviceDetails.state === "IN_USE" || initialState === "IN_USE") {
              if (deviceDetails.state !== "IN_USE") {
                deviceDetails.state = "IN_USE";
              }
              const sessionsUrl = `https://api.${region}.saucelabs.com/rdc/v2/sessions?deviceName=${d.descriptor}`;
              try {
                const sessionsResponse = await window.api.fetchSauce({
                  url: sessionsUrl,
                  creds,
                  method: "GET",
                });
                if (sessionsResponse.ok && sessionsResponse.data?.items?.length > 0) {
                  const activeSession = sessionsResponse.data.items.find(s => s.state === "ACTIVE");
                  if (activeSession) {
                    deviceDetails.sessionId = activeSession.id;
                    deviceDetails.state = "IN_USE";
                  } else {
                    // No active session found, but keep IN_USE if inUseBy exists
                    deviceDetails.sessionId = null;
                    if (deviceDetails.inUseBy) {
                      deviceDetails.state = "IN_USE";
                    } else {
                      deviceDetails.state = "AVAILABLE";
                    }
                  }
                } else {
                  // No sessions found, but keep IN_USE if inUseBy exists
                  deviceDetails.sessionId = null;
                  if (deviceDetails.inUseBy) {
                    deviceDetails.state = "IN_USE";
                  } else {
                    deviceDetails.state = "AVAILABLE";
                  }
                }
              } catch (sessionErr) {
                console.warn(`⚠️ Failed to fetch session for ${d.descriptor}:`, sessionErr);
                // On error, preserve IN_USE state if inUseBy exists
                deviceDetails.sessionId = null;
                if (deviceDetails.inUseBy) {
                  deviceDetails.state = "IN_USE";
                } else {
                  deviceDetails.state = "AVAILABLE";
                }
              }
            }
            return deviceDetails;
          } catch (err) {
            console.warn(`⚠️ Failed detail call for ${d.descriptor}:`, err);
            return { ...d, region, sessionId: null, state: "AVAILABLE" };
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

  // 🔍 Filter by search text
  const filteredDevices = devices.filter((d) =>
    d.descriptor.toLowerCase().includes(search.toLowerCase())
  );

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
          />
        ))}
      </div>
    </div>
  );
}
