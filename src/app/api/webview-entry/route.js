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

// Helper function to get the correct base URL from the request
const getBaseUrlFromRequest = (request) => {
  const url = new URL(request.url);
  const host = request.headers.get('host');
  const forwardedProto = request.headers.get('x-forwarded-proto');
  
  // Determine protocol - ngrok uses x-forwarded-proto header
  let protocol;
  if (forwardedProto) {
    protocol = forwardedProto;
  } else {
    protocol = url.protocol.replace(':', ''); // Remove colon from protocol
  }
  
  // Ensure protocol has proper format
  if (!protocol.endsWith(':')) {
    protocol = protocol + ':';
  }
  
  // Build the base URL from the current request
  const baseUrl = `${protocol}//${host}`;
  
  console.log('🔧 URL Construction Debug:', {
    originalProtocol: url.protocol,
    forwardedProto: forwardedProto,
    finalProtocol: protocol,
    host: host,
    constructedBaseUrl: baseUrl
  });
  
  return baseUrl;
};

export async function POST(request) {
  try {
    console.log('📱 Received POST request from Android WebView');
    
    const formData = await request.formData();
    const merchantId = formData.get('merchant_id');
    const authToken = formData.get('auth_token');
    
    console.log('🔑 POST Auth data received:', { 
      merchantId, 
      authTokenLength: authToken ? authToken.length : 0,
      authTokenPreview: authToken ? authToken.substring(0, 20) + '...' : 'null'
    });
    
    // Log request details for debugging
    const requestUrl = new URL(request.url);
    const host = request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || requestUrl.protocol;
    
    console.log('🌐 Request details:', {
      host,
      protocol,
      originalUrl: request.url,
      userAgent: request.headers.get('user-agent')
    });
    
    // Basic validation
    if (!merchantId || !authToken) {
      console.error('❌ Missing required parameters');
      return new Response(`
        <!DOCTYPE html>
        <html><body>
          <h1>Error: Missing Parameters</h1>
          <p>merchant_id and auth_token are required</p>
        </body></html>
      `, { 
        status: 400,
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    // Generate secure session ID
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    
    // Store session data securely (not in URL)
    sessions.set(sessionId, {
      merchantId,
      authToken,
      createdAt: Date.now(),
      used: false
    });
    
    // Clean up old sessions
    cleanupSessions();
    
    console.log('💾 Session stored:', sessionId);
    
    // Get the base URL from the current request (preserves ngrok domain)
    const baseUrl = getBaseUrlFromRequest(request);
    const redirectUrl = `${baseUrl}/securityscan?session=${sessionId}&source=post`;
    
    console.log('🔄 Redirecting to:', redirectUrl);
    console.log('📍 Base URL determined from request:', baseUrl);
    
    // Create redirect response with proper headers
    const response = NextResponse.redirect(redirectUrl, 302);
    
    // Add headers to ensure proper redirect handling
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
    
  } catch (error) {
    console.error('❌ POST handler error:', error);
    return new Response(`
      <!DOCTYPE html>
      <html><body>
        <h1>Server Error</h1>
        <p>Failed to process request: ${error.message}</p>
        <script>
          console.error('Server Error:', '${error.message}');
        </script>
      </body></html>
    `, { 
      status: 500,
      headers: { 'Content-Type': 'text/html' }
    });
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