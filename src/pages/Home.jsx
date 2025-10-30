import React from "react";

export default function Home({ creds }) {
  const ready = !!(creds?.username && creds?.accessKey);

  return (
    <div>
      <h1 className="h1">Home</h1>
      <div style={{ background: "#fff", border: "1px solid #e9ecf1", borderRadius: 12, padding: 16 }}>
        <h3 style={{ marginTop: 0, color: "#7a8796" }}>Checks</h3>
        {ready ? (
          <div>✅ Ready. Credentials found for <b>{creds.username}</b>.</div>
        ) : (
          <div className="banner-warn">No data stored. Go to Settings and save your username, access key and region.</div>
        )}
      </div>
    </div>
  );
}
