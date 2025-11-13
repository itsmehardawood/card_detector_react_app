"use client";
import { useEffect, useState } from "react";

export default function DeviceInfoPage() {
  const [status, setStatus] = useState("Initializing...");
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [apiResponse, setApiResponse] = useState(null);

  useEffect(() => {
    async function testDeviceBridge() {
      try {
        // 🔹 MOCK for testing in normal browser
        if (!window.read) {
          window.read = {
            device: {
              information: () => JSON.stringify({
                DeviceId: "test-1234",
                device: { brand: "Google", model: "Pixel 7" },
                network: { activeTransports: ["WIFI"], hasInternet: true },
                sims: [{ carrierId: 410, simType: "physical" }],
              }),
            },
            location: {
              get: () => JSON.stringify({
                latitude: 37.7749,
                longitude: -122.4194,
                accuracy: 10.5,
                provider: "gps"
              }),
            }
          };
          console.log("🧩 Mock Android bridge added for testing (with location).");
          setStatus("Mock Android bridge created for testing");
        }

        // Wait a bit for bridge to be ready
        await new Promise(resolve => setTimeout(resolve, 300));

        let deviceData = {};
        let locationData = {};

        // 🔹 Get device data from Android
        if (window.read && window.read.device && typeof window.read.device.information === "function") {
          setStatus("Fetching device info from Android...");
          const rawData = window.read.device.information();
          
          try {
            deviceData = JSON.parse(rawData);
            console.log("📱 Device Info:", deviceData);
            setDeviceInfo(deviceData);
          } catch (err) {
            console.error("❌ Failed to parse device info:", err);
            setStatus("Error: Failed to parse device info JSON");
            return;
          }
        }

        // 🔹 Get location data from Android
        if (window.read && window.read.location && typeof window.read.location.get === "function") {
          setStatus("Fetching location from Android...");
          const locationRaw = window.read.location.get();
          
          try {
            locationData = JSON.parse(locationRaw);
            console.log("📍 Location Info:", locationData);
          } catch (err) {
            console.error("❌ Failed to parse location:", err);
          }
        } else {
          console.log("⚠️ No location bridge, trying browser geolocation...");
          try {
            const position = await new Promise((resolve, reject) => {
              if (!navigator.geolocation) {
                reject(new Error("Geolocation not supported"));
                return;
              }
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
              });
            });

            locationData = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              source: "browser_geolocation"
            };
            console.log("📍 Location from browser:", locationData);
          } catch (geoError) {
            console.warn("⚠️ Location unavailable:", geoError.message);
          }
        }

        setStatus(deviceData ? "Device info retrieved successfully" : "No device info available");

        if (Object.keys(deviceData).length > 0 || Object.keys(locationData).length > 0) {
          // 🔹 Send to API with full context
          setStatus("Sending device info & location to API...");
          const res = await fetch("/securityscan/api/device-info", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...deviceData,
              location: locationData,
              merchantId: "TEST_MERCHANT", // Test merchant ID
              timestamp: Date.now(),
              sessionId: "test_session",
            }),
          });

          if (!res.ok) {
            throw new Error(`API returned ${res.status}: ${res.statusText}`);
          }

          const result = await res.json();
          console.log("✅ Sent to API:", result);
          setApiResponse(result);
          setStatus("✅ Test completed successfully!");
        } else {
          setStatus("❌ No device or location data found");
        }
      } catch (err) {
        console.error("❌ Test Error:", err);
        setStatus(`❌ Error: ${err.message}`);
      }
    }

    testDeviceBridge();
  }, []);

  return (
    <div style={{ padding: 20, fontFamily: "system-ui, sans-serif", maxWidth: 800, margin: "0 auto" }}>
      <h1 style={{ color: "#2563eb" }}>🔍 Device Info Bridge Test</h1>
      
      <div style={{ 
        padding: 15, 
        background: "#f3f4f6", 
        borderRadius: 8, 
        marginBottom: 20,
        border: "2px solid #d1d5db"
      }}>
        <strong>Status:</strong> {status}
      </div>

      {deviceInfo && (
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ color: "#059669" }}>📱 Device Info Retrieved:</h3>
          <pre style={{ 
            background: "#1f2937", 
            color: "#10b981", 
            padding: 15, 
            borderRadius: 8, 
            overflow: "auto",
            fontSize: 13
          }}>
            {JSON.stringify(deviceInfo, null, 2)}
          </pre>
        </div>
      )}

      {apiResponse && (
        <div>
          <h3 style={{ color: "#2563eb" }}>📤 API Response:</h3>
          <pre style={{ 
            background: "#1f2937", 
            color: "#60a5fa", 
            padding: 15, 
            borderRadius: 8, 
            overflow: "auto",
            fontSize: 13
          }}>
            {JSON.stringify(apiResponse, null, 2)}
          </pre>
        </div>
      )}

      <div style={{ 
        marginTop: 30, 
        padding: 15, 
        background: "#fef3c7", 
        borderRadius: 8,
        fontSize: 14
      }}>
        <strong>💡 Note:</strong> Open the browser console (F12) to see detailed logs
      </div>
    </div>
  );
}
