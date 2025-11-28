 // app/api/webview-entry/route.js
import { NextResponse } from 'next/server';

// In-memory session storage (for production, use Redis or database)
const sessions = new Map();

// Clean up old sessions (older than 10 minutes)
const cleanupSessions = () => {
  const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
  for (const [sessionId, session] of sessions.entries()) {
    if (session.createdAt < tenMinutesAgo) {
      sessions.delete(sessionId);
    }
  }
};



export async function POST(request) {
  try {
    console.log('------------------------------------------------');
    console.log('🔍 DEBUG START: Android Request Received');
    
    // 1. CLONE THE REQUEST
    // We clone because we might need to read the body as text AND formData
    const requestClone = request.clone();
    
    // 2. CHECK HEADERS
    const contentType = request.headers.get('content-type');
    console.log('Content-Type:', contentType);

    // 3. READ RAW BODY (The "Truth")
    // This will tell us exactly what string Android sent, ignoring parsing errors
    const rawBody = await requestClone.text();
    console.log('📄 Raw Body Content (First 500 chars):', rawBody.substring(0, 500));

    // 4. ATTEMPT EXTRACTION STRATEGY
    let merchantId = null;
    let authToken = null;
    let deviceInfoRaw = null;

    // STRATEGY A: Try parsing as FormData (Multipart or UrlEncoded)
    try {
      const formData = await request.formData();
      console.log('📋 FormData Keys found:', Array.from(formData.keys()));
      
      merchantId = formData.get('merchant_id');
      authToken = formData.get('auth_token');
      // CHECK BOTH CASINGS
      deviceInfoRaw = formData.get('device_info') || formData.get('device_Info'); 
    } catch (e) {
      console.log('⚠️ Could not parse as FormData, trying Query Params...');
    }

    // STRATEGY B: Try parsing as URL Search Params (if sent as raw string body)
    // The sample you showed looks like: merchant_id=XYZ&device_Info={...}
    if (!deviceInfoRaw && rawBody.includes('=')) {
      try {
        const params = new URLSearchParams(rawBody);
        if (params.has('device_Info')) {
          console.log('✅ Found data in Raw Body params!');
          merchantId = merchantId || params.get('merchant_id');
          authToken = authToken || params.get('auth_token');
          deviceInfoRaw = params.get('device_info') || params.get('device_Info');
        }
      } catch (e) {
        console.log('⚠️ Could not parse raw body as URL Params');
      }
    }

    // STRATEGY C: Check URL Query String (sometimes they put it in the URL, not body)
    if (!deviceInfoRaw) {
      const urlParams = new URL(request.url).searchParams;
      if (urlParams.has('device_Info') || urlParams.has('device_info')) {
        console.log('✅ Found data in URL Query String!');
        merchantId = merchantId || urlParams.get('merchant_id');
        authToken = authToken || urlParams.get('auth_token');
        deviceInfoRaw = urlParams.get('device_info') || urlParams.get('device_Info');
      }
    }

    console.log('🕵️ FINAL EXTRACTION RESULT:');
    console.log('   Merchant:', merchantId);
    console.log('   Device Info Found?', !!deviceInfoRaw);
    if (deviceInfoRaw) {
        console.log('   Device Info Length:', deviceInfoRaw.length);
        console.log('   Device Info Preview:', deviceInfoRaw.substring(0, 100));
    }

    // --- STOP HERE IF EMPTY ---
    if (!deviceInfoRaw) {
        console.error('❌ CRITICAL: Device Info is still empty after all checks.');
        // This log helps you prove to the Android dev what you received
        console.error('❌ RAW RECEIVED WAS:', rawBody);
    }

    // 5. PARSE JSON (Handle the double-encoding issue)
    let deviceData = null;
    if (deviceInfoRaw) {
      try {
        deviceData = JSON.parse(deviceInfoRaw);
      } catch (e) {
        console.log('⚠️ Standard parse failed. Trying to fix escaped quotes...');
        try {
            // If Android sent "{\"DeviceId\":...}" as a string literal
            const unescaped = deviceInfoRaw.replace(/\\"/g, '"');
            deviceData = JSON.parse(unescaped);
        } catch (e2) {
            console.error('❌ JSON Parsing failed completely.');
        }
      }
    }

    // 6. DELEGATE TO DEVICE-INFO ROUTE (Your existing logic)
    if (deviceData) {
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
        
        // Construct clean payload
        const payload = {
            DeviceId: deviceData.DeviceId, // Note: Android sent "DeviceId", not "deviceId"
            merchantId: merchantId,
            sessionId: sessionId,
            timestamp: Date.now(),
            device: deviceData.device,
            network: deviceData.network,
            sims: deviceData.sims || [],
            location: deviceData.location || null
        };

        // Fire and forget to local API
        const origin = new URL(request.url).origin;
        fetch(`${origin}/securityscan/api/device-info`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).catch(err => console.error('❌ Failed to forward to Laravel:', err));

        // Create Session & Redirect
        sessions.set(sessionId, { merchantId, authToken, createdAt: Date.now() });
        
        // Clean up
        cleanupSessions();

        const baseUrl = 'https://mobile.cardnest.io';
        const redirectUrl = `${baseUrl}/securityscan?session=${sessionId}&source=post`;
        
        console.log('🚀 Redirecting to:', redirectUrl);
        return NextResponse.redirect(redirectUrl, 302);
    }

    // Fallback if no data found
    return new Response('Data missing', { status: 400 });

  } catch (error) {
    console.error('💥 SERVER ERROR:', error);
    return new Response(error.message, { status: 500 });
  }
}

// GET endpoint to retrieve session data
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('session');
    
    console.log('🔍 GET request for session:', sessionId);
    
    if (!sessionId) {
      console.error('❌ No session ID provided');
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }
    
    const session = sessions.get(sessionId);
    
    if (!session) {
      console.error('❌ Invalid or expired session:', sessionId);
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 404 });
    }
    
    console.log('✅ Session found and returning data for:', sessionId);
    
    // Mark session as used and delete it (one-time use)
    sessions.delete(sessionId);
    
    return NextResponse.json({
      merchantId: session.merchantId,
      authToken: session.authToken,
      success: true,
      sessionId: sessionId
    });
    
  } catch (error) {
    console.error('❌ Session retrieval error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Optional: Add a health check endpoint
export async function HEAD(request) {
  return new Response(null, { 
    status: 200,
    headers: {
      'Cache-Control': 'no-cache'
    }
  });
}