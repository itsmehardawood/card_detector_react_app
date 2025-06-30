// // app/api/start-scan/route.js
// import { NextResponse } from 'next/server';

// export async function POST(request) {
//   try {
//     const body = await request.json();
//     const { merchant_id, auth_token, device_type, user_agent, screen_width, screen_height } = body;

//     // Validate required fields
//     if (!merchant_id || !auth_token) {
//       return NextResponse.json(
//         { error: 'Merchant ID and Auth Token are required' },
//         { status: 400 }
//       );
//     }

//     // Validate merchant ID length
//     if (merchant_id.length < 5) {
//       return NextResponse.json(
//         { error: 'Merchant ID must be at least 5 characters' },
//         { status: 400 }
//       );
//     }

//     // Validate auth token length
//     if (auth_token.length !== 32) {
//       return NextResponse.json(
//         { error: 'Auth Token must be exactly 32 characters' },
//         { status: 400 }
//       );
//     }

//     // Prepare data for backend API
//     const backendData = {
//       merchant_id,
//       auth_token,
//       device_info: {
//         type: device_type,
//         user_agent,
//         screen_width,
//         screen_height,
//         timestamp: new Date().toISOString()
//       }
//     };

//     // Call Python backend API
//     const backendUrl = process.env.BACKEND_API_URL || 'https://4598-161-248-186-101.ngrok-free.app';
    
//     const response = await fetch(`${backendUrl}/start-scan`, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'ngrok-skip-browser-warning': 'true'
//       },
//       body: JSON.stringify(backendData)
//     });

//     const result = await response.json();

//     if (!response.ok) {
//       return NextResponse.json(
//         { error: result.error || 'Backend validation failed' },
//         { status: response.status }
//       );
//     }

//     // Handle response based on device type
//     if (device_type === 'mobile') {
//       return NextResponse.json({
//         status: 'success',
//         device_type: 'mobile',
//         redirect_url: '/securityscan',
//         session_id: result.session_id,
//         message: 'Redirecting to security scan...'
//       });
//     } else {
//       // For desktop, generate QR code URL
//       const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
//       const scanUrl = `${baseUrl}/securityscan?session=${result.session_id}&merchant=${merchant_id}`;
      
//       return NextResponse.json({
//         status: 'success',
//         device_type: 'desktop',
//         scan_url: scanUrl,
//         session_id: result.session_id,
//         message: 'Scan QR code with mobile device'
//       });
//     }

//   } catch (error) {
//     console.error('Start scan API error:', error);
    
//     // Handle network errors
//     if (error.code === 'ECONNREFUSED' || error.name === 'FetchError') {
//       return NextResponse.json(
//         { error: 'Backend service is currently unavailable. Please try again later.' },
//         { status: 503 }
//       );
//     }

//     return NextResponse.json(
//       { error: 'Internal server error. Please try again.' },
//       { status: 500 }
//     );
//   }
// }

// app/api/start-scan/route.js (Optional - Keep for GET request fallback)
// app/api/start-scan/route.js
import { NextResponse } from 'next/server';

// Shared session storage (same as webview-entry)
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

// Enhanced function to get the correct base URL (same as webview-entry)
const getBaseUrlFromRequest = (request) => {
  const url = new URL(request.url);
  
  // Get various headers that might contain the correct host/protocol
  const host = request.headers.get('host');
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const forwardedPort = request.headers.get('x-forwarded-port');
  
  // Determine the final host (prioritize forwarded headers for proxied environments)
  const finalHost = forwardedHost || host;
  
  // Determine protocol
  let protocol = 'https'; // Default to https for production
  
  if (forwardedProto) {
    protocol = forwardedProto.split(',')[0].trim();
  } else if (url.protocol) {
    protocol = url.protocol.replace(':', '');
  }
  
  // For localhost or development, allow http
  if (finalHost && (finalHost.includes('localhost') || finalHost.includes('127.0.0.1'))) {
    protocol = 'http';
  }
  
  // Handle port if necessary
  let portSuffix = '';
  if (forwardedPort && !['80', '443'].includes(forwardedPort)) {
    portSuffix = `:${forwardedPort}`;
  }
  
  const baseUrl = `${protocol}://${finalHost}${portSuffix}`;
  
  console.log('🔧 start-scan URL Construction:', {
    originalUrl: request.url,
    host: host,
    forwardedHost: forwardedHost,
    forwardedProto: forwardedProto,
    finalHost: finalHost,
    finalProtocol: protocol,
    constructedBaseUrl: baseUrl
  });
  
  return baseUrl;
};

// Add CORS headers for development/testing
const addCorsHeaders = (response) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (isDevelopment) {
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  }
  
  return response;
};

export async function OPTIONS(request) {
  console.log('🔧 start-scan OPTIONS request received');
  const response = new Response(null, { status: 200 });
  return addCorsHeaders(response);
}

export async function POST(request) {
  try {
    console.log('📱 start-scan POST request received');
    console.log('🌐 Full request URL:', request.url);
    
    const body = await request.json();
    const { merchant_id, auth_token, device_info } = body;

    console.log('📊 start-scan data received:', { 
      merchant_id, 
      auth_token_length: auth_token ? auth_token.length : 0,
      device_info: device_info ? 'present' : 'missing'
    });

    // Validate required fields
    if (!merchant_id || !auth_token) {
      console.error('❌ Missing required parameters in start-scan');
      const response = NextResponse.json(
        { error: 'Merchant ID and Auth Token are required' },
        { status: 400 }
      );
      return addCorsHeaders(response);
    }

    // Validate merchant ID length
    if (merchant_id.length < 5) {
      console.error('❌ Invalid merchant ID length');
      const response = NextResponse.json(
        { error: 'Merchant ID must be at least 5 characters' },
        { status: 400 }
      );
      return addCorsHeaders(response);
    }

    // Create secure session instead of passing tokens in URL
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    
    sessions.set(sessionId, {
      merchantId: merchant_id,
      authToken: auth_token,
      deviceInfo: device_info,
      createdAt: Date.now(),
      used: false,
      source: 'start-scan-api'
    });
    
    // Clean up old sessions
    cleanupSessions();
    
    console.log('💾 start-scan session stored:', sessionId);

    // Get base URL dynamically instead of using hardcoded URL
    const baseUrl = getBaseUrlFromRequest(request);
    const redirectUrl = `${baseUrl}/securityscan?session=${sessionId}&source=api`;
    
    console.log('🔄 start-scan redirect URL:', redirectUrl);
    
    // Validate the redirect URL doesn't contain localhost for production
    if (process.env.NODE_ENV === 'production' && redirectUrl.includes('localhost')) {
      console.error('⚠️ WARNING: start-scan production redirect contains localhost!');
    }
    
    const response = NextResponse.json({
      status: 'success',
      redirect_url: redirectUrl,
      session_id: sessionId,
      message: 'Session created successfully. Redirect to the provided URL.',
      timestamp: new Date().toISOString()
    });

    return addCorsHeaders(response);

  } catch (error) {
    console.error('❌ Start scan API error:', error);
    console.error('📊 Error stack:', error.stack);
    
    const response = NextResponse.json(
      { 
        error: 'Internal server error. Please try again.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
    
    return addCorsHeaders(response);
  }
}

// GET endpoint for testing/health check
export async function GET(request) {
  try {
    console.log('🔍 start-scan GET request - health check');
    
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('session');
    
    if (sessionId) {
      // If session ID provided, return session info (for debugging)
      const session = sessions.get(sessionId);
      
      if (!session) {
        const response = NextResponse.json({ 
          error: 'Session not found',
          sessionId: sessionId,
          availableSessions: Array.from(sessions.keys())
        }, { status: 404 });
        return addCorsHeaders(response);
      }
      
      const response = NextResponse.json({
        sessionExists: true,
        sessionId: sessionId,
        createdAt: new Date(session.createdAt).toISOString(),
        source: session.source,
        used: session.used
      });
      
      return addCorsHeaders(response);
    }
    
    // Health check response
    const baseUrl = getBaseUrlFromRequest(request);
    
    const response = NextResponse.json({
      status: 'healthy',
      endpoint: 'start-scan',
      method: 'GET',
      baseUrl: baseUrl,
      environment: process.env.NODE_ENV || 'unknown',
      activeSessions: sessions.size,
      timestamp: new Date().toISOString()
    });

    return addCorsHeaders(response);

  } catch (error) {
    console.error('❌ start-scan GET error:', error);
    
    const response = NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
    
    return addCorsHeaders(response);
  }
}