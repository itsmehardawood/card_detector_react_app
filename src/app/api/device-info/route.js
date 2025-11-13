
//  export async function GET() {
//   return Response.json({
//     message: "✅ Device Info API working!",
//     sample: {
//       device: { brand: "Google", model: "Pixel 7" },
//       network: { activeTransports: ["WIFI"], hasInternet: true },
//       sims: [{ carrierId: 410, simType: "physical" }],
//     },
//   });
// }

export async function POST(request) {
  try {
    const data = await request.json();
    console.log("📦 Received device info & location from Android:", {
      merchantId: data.merchantId,
      sessionId: data.sessionId,
      timestamp: data.timestamp,
      deviceId: data.DeviceId,
      hasDeviceData: !!data.device,
      hasNetworkData: !!data.network,
      hasLocationData: !!data.location,
      locationSource: data.location?.source || data.location?.provider || "unknown"
    });

    // Validate required fields
    if (!data.merchantId) {
      console.warn("⚠️ Device info received without merchantId");
    }

    // Log location data if available
    if (data.location) {
      console.log("📍 Location data:", {
        latitude: data.location.latitude,
        longitude: data.location.longitude,
        accuracy: data.location.accuracy,
        hasAddress: !!data.location.address
      });
    }

    // TODO: Later you can send to Laravel/backend here
    // Example:
    // const backendResponse = await fetch('https://admin.cardnest.io/api/device-info', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(data)
    // });

    return Response.json({ 
      success: true, 
      received: data,
      message: "Device info & location received successfully"
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









// after laravel side done


// export async function POST(request) {
//   try {
//     const data = await request.json();
//     console.log("📦 Received device info from Android:", data);

//     // ✅ NEW: Send to Laravel backend
//     const backendResponse = await fetch('https://admin.cardnest.io/api/device-info', {
//       method: 'POST',
//       headers: { 
//         'Content-Type': 'application/json',
//         // Add JWT token if needed
//         // 'Authorization': `Bearer ${data.authToken}`
//       },
//       body: JSON.stringify(data)
//     });

//     if (!backendResponse.ok) {
//       throw new Error(`Laravel API error: ${backendResponse.status}`);
//     }

//     const backendResult = await backendResponse.json();
//     console.log("✅ Sent to Laravel:", backendResult);

//     return Response.json({ 
//       success: true, 
//       message: "Device info received and stored",
//       backend: backendResult
//     });
//   } catch (error) {
//     console.error("❌ Error:", error);
//     return Response.json({ 
//       success: false, 
//       error: error.message 
//     }, { status: 500 });
//   }
// }