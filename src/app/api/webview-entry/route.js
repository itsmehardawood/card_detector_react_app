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
    
    // 1. CLONE & READ RAW BODY
    const requestClone = request.clone();
    const rawBody = await requestClone.text();
    
    // 2. EXTRACT DATA
    let merchantId = null;
    let authToken = null;
    let deviceInfoRaw = null;

    // Try FormData first
    try {
      const formData = await request.formData();
      merchantId = formData.get('merchant_id');
      authToken = formData.get('auth_token');
      deviceInfoRaw = formData.get('device_info') || formData.get('device_Info');
    } catch (e) { /* ignore */ }

    // Try URL Params fallback
    if (!deviceInfoRaw && rawBody.includes('=')) {
      const params = new URLSearchParams(rawBody);
      merchantId = merchantId || params.get('merchant_id');
      authToken = authToken || params.get('auth_token');
      deviceInfoRaw = params.get('device_info') || params.get('device_Info');
    }

    // Try Query String fallback
    const urlParams = new URL(request.url).searchParams;
    merchantId = merchantId || urlParams.get('merchant_id');
    authToken = authToken || urlParams.get('auth_token');
    deviceInfoRaw = deviceInfoRaw || urlParams.get('device_info') || urlParams.get('device_Info');

    console.log('🕵️ FINAL EXTRACTION:');
    console.log('   Merchant:', merchantId);
    console.log('   Device Info Present:', !!deviceInfoRaw && deviceInfoRaw.length > 0);

    // 3. PROCESS DEVICE INFO (Only if we have it)
    if (deviceInfoRaw && deviceInfoRaw.length > 0) {
      try {
        let deviceData;
        try {
          deviceData = JSON.parse(deviceInfoRaw);
        } catch (e) {
           const unescaped = deviceInfoRaw.replace(/\\"/g, '"');
           deviceData = JSON.parse(unescaped);
        }

        // DELEGATE TO LARAVEL VIA LOCAL API
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
        const payload = {
            DeviceId: deviceData.DeviceId,
            merchantId: merchantId,
            sessionId: sessionId,
            timestamp: Date.now(),
            device: deviceData.device,
            network: deviceData.network,
            sims: deviceData.sims || [],
            location: deviceData.location || null
        };

        const currentUrl = request.url;
        const targetApiUrl = currentUrl.replace('webview-entry', 'device-info');
        
        // Fire and forget - Send data to backend
        fetch(targetApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).catch(err => console.error('❌ Failed to forward to device-info:', err));

        // Create Session
        sessions.set(sessionId, { merchantId, authToken, createdAt: Date.now() });
        cleanupSessions();

        // REDIRECT (Scenario A: We have data)
        const baseUrl = 'https://mobile.cardnest.io';
        const redirectUrl = `${baseUrl}/securityscan?session=${sessionId}&source=post`;
        console.log('🚀 Redirecting WITH data to:', redirectUrl);
        return NextResponse.redirect(redirectUrl, 302);

      } catch (error) {
        console.error('❌ Error parsing device info:', error);
      }
    } else {
        console.warn('⚠️ WARNING: Proceeding WITHOUT Device Info (Android sent empty data)');
    }

    // 4. FALLBACK REDIRECT (Scenario B: Data was missing or broken)
    // We still generate a session so the user can see the UI
    const fallbackSessionId = `session_${Date.now()}_fallback`;
    sessions.set(fallbackSessionId, { merchantId, authToken, createdAt: Date.now() });
    
    const baseUrl = 'https://mobile.cardnest.io';
    const redirectUrl = `${baseUrl}/securityscan?session=${fallbackSessionId}&source=post&status=missing_device_info`;
    
    console.log('🚀 Redirecting (Fallback) to:', redirectUrl);
    return NextResponse.redirect(redirectUrl, 302);

  } catch (error) {
    console.error('💥 SERVER ERROR:', error);
    // Even on crash, try to redirect to home so user isn't stuck
    return NextResponse.redirect('https://mobile.cardnest.io/securityscan?error=server_error', 302);
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