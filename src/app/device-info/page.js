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
              // ✅ Using REAL Android data format (without location)
              information: () => "{\"DeviceId\":\"fda769bcad48d0eb\",\"device\":{\"bootCount\":61,\"brand\":\"samsung\",\"buildFingerprint\":\"samsung/e3qxxx/e3q:16/BP2A.250605.031.A3/S928BXXS4CYJ7:user/release-keys\",\"buildId\":\"BP2A.250605.031.A3\",\"device\":\"e3q\",\"manufacturer\":\"samsung\",\"model\":\"SM-S928B\",\"product\":\"e3qxxx\",\"release\":\"16\",\"sdkInt\":36,\"securityPatch\":\"2025-10-01\"},\"network\":{\"activeTransports\":[\"WIFI\"],\"bandwidthKbpsDown\":40439,\"bandwidthKbpsUp\":46265,\"dns\":[\"192.168.0.1\",\"114.114.114.114\"],\"hasInternet\":true,\"ipv4\":[\"192.168.0.175\"],\"ipv6\":[\"fe80::b005:fff:fe90:2b06\"],\"isMetered\":false,\"isValidated\":true,\"wifi\":{\"linkSpeedMbps\":432,\"rssi\":-65}},\"sims\":[{\"carrierId\":1970,\"mccmmc\":\"42403\",\"sim\":\"971559467800\",\"simType\":\"physical\",\"subscriptionId\":9},{\"carrierId\":1970,\"mccmmc\":\"42403\",\"sim\":\"971585589455\",\"simType\":\"physical\",\"subscriptionId\":5}]}"
            }
          };
          console.log("🧩 Mock Android device bridge added.");
          setStatus("Mock Android bridge created");
        }

        // Wait a bit for bridge to be ready
        await new Promise(resolve => setTimeout(resolve, 300));

        let deviceData = {};

        // 🔹 Get device data from Android
        if (window.read && window.read.device && typeof window.read.device.information === "function") {
          setStatus("Fetching device info from Android...");
          const rawData = window.read.device.information();
          
          // Handle both string and object return types
          if (typeof rawData === 'object' && rawData !== null) {
            // Android returned a JavaScript object directly
            deviceData = rawData;
            console.log("📱 Device Info (object):", deviceData);
            setDeviceInfo(deviceData);
          } else if (typeof rawData === 'string') {
            // Android returned a JSON string
            try {
              deviceData = JSON.parse(rawData);
              console.log("📱 Device Info (parsed string):", deviceData);
              setDeviceInfo(deviceData);
            } catch (err) {
              console.error("❌ Failed to parse device info:", err);
              setStatus("Error: Failed to parse device info JSON");
              return;
            }
          } else {
            console.error("❌ Unexpected data type from bridge:", typeof rawData);
            setStatus("Error: Invalid data type from Android bridge");
            return;
          }
        } else {
          console.log("⚠️ No Android device bridge found — likely in browser mode.");
        }

        setStatus(deviceData && Object.keys(deviceData).length > 0 ? "Device info retrieved successfully" : "No device info available");

        if (Object.keys(deviceData).length > 0) {
          // 🔹 Send device info to API
          setStatus("Sending device info to API...");
          const res = await fetch("/securityscan/api/device-info", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...deviceData,
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
          setStatus("❌ No device info found");
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
