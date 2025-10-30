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
          const detailUrl = `https://api.${region}.saucelabs.com/v1/rdc/devices/${d.descriptor}`;
          try {
            const detailResponse = await window.api.fetchSauce({
              url: detailUrl,
              creds,
              method: "GET",
            });
            if (detailResponse.ok) {
              return { ...d, ...detailResponse.data, region };
            } else {
              console.warn(`⚠️ Could not fetch details for ${d.descriptor}`);
              return d;
            }
          } catch {
            console.warn(`⚠️ Failed detail call for ${d.descriptor}`);
            return d;
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
                ? { ...d, sessionId: null, state: "AVAILABLE" }
                : d
            )
          );
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
        <button className="refresh-btn" onClick={fetchDevices}>
          Refresh
        </button>
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
