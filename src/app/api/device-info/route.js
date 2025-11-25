


export async function POST(request) {
  try {
    const data = await request.json();
    
    console.log("\n🔍 ========================================");
    console.log("🔍 RAW REQUEST BODY RECEIVED:");
    console.log("🔍 ========================================");
    console.log(JSON.stringify(data, null, 2));
    console.log("🔍 ========================================\n");
    
    console.log("📦 ========================================");
    console.log("📦 DEVICE INFO RECEIVED FROM ANDROID");
    console.log("📦 ========================================");
    
    // Log Device ID
    console.log("🆔 Device ID:", data.DeviceId);
    
    // Log Device Information
    if (data.device) {
      console.log(" Device Details:", {
        brand: data.device.brand,
        manufacturer: data.device.manufacturer,
        model: data.device.model,
        androidVersion: data.device.release,
        sdkInt: data.device.sdkInt,
        securityPatch: data.device.securityPatch,
        bootCount: data.device.bootCount,
        buildId: data.device.buildId,
        buildFingerprint: data.device.buildFingerprint
      });
    }
    
    // Log Network Information
    if (data.network) {
      console.log("🌐 Network Details:", {
        hasInternet: data.network.hasInternet,
        activeTransports: data.network.activeTransports,
        ipv4: data.network.ipv4,
        ipv6: data.network.ipv6,
        dns: data.network.dns,
        isMetered: data.network.isMetered,
        isValidated: data.network.isValidated,
        bandwidthDown: `${data.network.bandwidthKbpsDown} Kbps`,
        bandwidthUp: `${data.network.bandwidthKbpsUp} Kbps`
      });
      
      if (data.network.wifi) {
        console.log("📶 WiFi Info:", {
          linkSpeed: `${data.network.wifi.linkSpeedMbps} Mbps`,
          rssi: data.network.wifi.rssi
        });
      }
    }
    
    // Log SIM Information
    if (data.sims && data.sims.length > 0) {
      console.log("📞 SIM Cards:", data.sims.map((sim, index) => ({
        slot: index + 1,
        number: sim.sim,
        type: sim.simType,
        carrier: sim.carrierId,
        mccmnc: sim.mccmmc,
        subscriptionId: sim.subscriptionId
      })));
    }
    
    // Log Session Information
    if (data.merchantId || data.sessionId) {
      console.log("🔑 Session Info:", {
        merchantId: data.merchantId,
        sessionId: data.sessionId,
        timestamp: data.timestamp
      });
    }
    
    // Log complete raw data for Laravel API reference
    console.log("📄 COMPLETE RAW DATA (for Laravel API):");
    console.log(JSON.stringify(data, null, 2));
    console.log("📦 ========================================\n");

    // Validate required fields
    if (!data.merchantId) {
      console.warn("⚠️ Device info received without merchantId");
    }

    return Response.json({ 
      success: true, 
      received: data,
      message: "Device info received and logged successfully"
    });
  } catch (error) {
    console.error("❌ Error parsing device info:", error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 400 });
  }
}

export async function GET() {
  return Response.json({
    message: "✅ Device Info API working!",
  });
}







