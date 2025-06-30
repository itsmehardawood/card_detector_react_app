// // app/api/webview-entry/route.js
// import { NextResponse } from 'next/server';

// // In-memory session storage (for production, use Redis or database)
// const sessions = new Map();

// // Clean up old sessions (older than 10 minutes)
// const cleanupSessions = () => {
//   const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
//   for (const [sessionId, session] of sessions.entries()) {
//     if (session.createdAt < tenMinutesAgo) {
//       sessions.delete(sessionId);
//     }
//   }
// };

// // Helper function to get the correct base URL from the request
// const getBaseUrlFromRequest = (request) => {
//   const url = new URL(request.url);
//   const host = request.headers.get('host');
//   const forwardedProto = request.headers.get('x-forwarded-proto');
  
//   // Determine protocol - ngrok uses x-forwarded-proto header
//   let protocol;
//   if (forwardedProto) {
//     protocol = forwardedProto;
//   } else {
//     protocol = url.protocol.replace(':', ''); // Remove colon from protocol
//   }
  
//   // Ensure protocol has proper format
//   if (!protocol.endsWith(':')) {
//     protocol = protocol + ':';
//   }
  
//   // Build the base URL from the current request
//   const baseUrl = `${protocol}//${host}`;
  
//   console.log('🔧 URL Construction Debug:', {
//     originalProtocol: url.protocol,
//     forwardedProto: forwardedProto,
//     finalProtocol: protocol,
//     host: host,
//     constructedBaseUrl: baseUrl
//   });
  
//   return baseUrl;
// };

// export async function POST(request) {
//   try {
//     console.log('📱 Received POST request from Android WebView');
    
//     const formData = await request.formData();
//     const merchantId = formData.get('merchant_id');
//     const authToken = formData.get('auth_token');
    
//     console.log('🔑 POST Auth data received:', { 
//       merchantId, 
//       authTokenLength: authToken ? authToken.length : 0,
//       authTokenPreview: authToken ? authToken.substring(0, 20) + '...' : 'null'
//     });
    
//     // Log request details for debugging
//     const requestUrl = new URL(request.url);
//     const host = request.headers.get('host');
//     const protocol = request.headers.get('x-forwarded-proto') || requestUrl.protocol;
    
//     console.log('🌐 Request details:', {
//       host,
//       protocol,
//       originalUrl: request.url,
//       userAgent: request.headers.get('user-agent')
//     });
    
//     // Basic validation
//     if (!merchantId || !authToken) {
//       console.error('❌ Missing required parameters');
//       return new Response(`
//         <!DOCTYPE html>
//         <html><body>
//           <h1>Error: Missing Parameters</h1>
//           <p>merchant_id and auth_token are required</p>
//         </body></html>
//       `, { 
//         status: 400,
//         headers: { 'Content-Type': 'text/html' }
//       });
//     }
    
//     // Generate secure session ID
//     const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    
//     // Store session data securely (not in URL)
//     sessions.set(sessionId, {
//       merchantId,
//       authToken,
//       createdAt: Date.now(),
//       used: false
//     });
    
//     // Clean up old sessions
//     cleanupSessions();
    
//     console.log('💾 Session stored:', sessionId);
    
//     // Get the base URL from the current request (preserves ngrok domain)
//     const baseUrl = getBaseUrlFromRequest(request);
//     const redirectUrl = `${baseUrl}/securityscan?session=${sessionId}&source=post`;
    
//     console.log('🔄 Redirecting to:', redirectUrl);
//     console.log('📍 Base URL determined from request:', baseUrl);
    
//     // Create redirect response with proper headers
//     const response = NextResponse.redirect(redirectUrl, 302);
    
//     // Add headers to ensure proper redirect handling
//     response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
//     response.headers.set('Pragma', 'no-cache');
//     response.headers.set('Expires', '0');
    
//     return response;
    
//   } catch (error) {
//     console.error('❌ POST handler error:', error);
//     return new Response(`
//       <!DOCTYPE html>
//       <html><body>
//         <h1>Server Error</h1>
//         <p>Failed to process request: ${error.message}</p>
//         <script>
//           console.error('Server Error:', '${error.message}');
//         </script>
//       </body></html>
//     `, { 
//       status: 500,
//       headers: { 'Content-Type': 'text/html' }
//     });
//   }
// }

// // GET endpoint to retrieve session data
// export async function GET(request) {
//   try {
//     const url = new URL(request.url);
//     const sessionId = url.searchParams.get('session');
    
//     console.log('🔍 GET request for session:', sessionId);
    
//     if (!sessionId) {
//       console.error('❌ No session ID provided');
//       return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
//     }
    
//     const session = sessions.get(sessionId);
    
//     if (!session) {
//       console.error('❌ Invalid or expired session:', sessionId);
//       return NextResponse.json({ error: 'Invalid or expired session' }, { status: 404 });
//     }
    
//     console.log('✅ Session found and returning data for:', sessionId);
    
//     // Mark session as used and delete it (one-time use)
//     sessions.delete(sessionId);
    
//     return NextResponse.json({
//       merchantId: session.merchantId,
//       authToken: session.authToken,
//       success: true,
//       sessionId: sessionId
//     });
    
//   } catch (error) {
//     console.error('❌ Session retrieval error:', error);
//     return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
//   }
// }

// // Optional: Add a health check endpoint
// export async function HEAD(request) {
//   return new Response(null, { 
//     status: 200,
//     headers: {
//       'Cache-Control': 'no-cache'
//     }
//   });
// }




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

// Enhanced function to get the correct base URL from the request
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
    protocol = forwardedProto.split(',')[0].trim(); // Handle multiple protocols
  } else if (url.protocol) {
    protocol = url.protocol.replace(':', '');
  }
  
  // For localhost or development, allow http
  if (finalHost && (finalHost.includes('localhost') || finalHost.includes('127.0.0.1'))) {
    protocol = 'http';
  }
  
  // Handle port if necessary (usually not needed for deployed apps)
  let portSuffix = '';
  if (forwardedPort && !['80', '443'].includes(forwardedPort)) {
    portSuffix = `:${forwardedPort}`;
  }
  
  const baseUrl = `${protocol}://${finalHost}${portSuffix}`;
  
  console.log('🔧 URL Construction Debug:', {
    originalUrl: request.url,
    originalProtocol: url.protocol,
    host: host,
    forwardedHost: forwardedHost,
    forwardedProto: forwardedProto,
    forwardedPort: forwardedPort,
    finalHost: finalHost,
    finalProtocol: protocol,
    constructedBaseUrl: baseUrl,
    userAgent: request.headers.get('user-agent')
  });
  
  return baseUrl;
};

// Add CORS headers for development/testing
const addCorsHeaders = (response) => {
  // Only add CORS headers in development or for specific origins
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (isDevelopment) {
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  }
  
  return response;
};

export async function OPTIONS(request) {
  console.log('🔧 OPTIONS request received');
  const response = new Response(null, { status: 200 });
  return addCorsHeaders(response);
}

export async function POST(request) {
  try {
    console.log('📱 Received POST request');
    console.log('🌐 Full request URL:', request.url);
    console.log('📋 All headers:', Object.fromEntries(request.headers.entries()));
    
    const formData = await request.formData();
    const merchantId = formData.get('merchant_id');
    const authToken = formData.get('auth_token');
    
    console.log('🔑 POST Auth data received:', { 
      merchantId, 
      authTokenLength: authToken ? authToken.length : 0,
      authTokenPreview: authToken ? authToken.substring(0, 20) + '...' : 'null'
    });
    
    // Basic validation
    if (!merchantId || !authToken) {
      console.error('❌ Missing required parameters');
      const errorResponse = new Response(`
        <!DOCTYPE html>
        <html><body>
          <h1>Error: Missing Parameters</h1>
          <p>merchant_id and auth_token are required</p>
          <p>Received: merchant_id=${merchantId}, auth_token=${authToken ? 'present' : 'missing'}</p>
        </body></html>
      `, { 
        status: 400,
        headers: { 'Content-Type': 'text/html' }
      });
      return addCorsHeaders(errorResponse);
    }
    
    // Generate secure session ID
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    
    // Store session data securely
    sessions.set(sessionId, {
      merchantId,
      authToken,
      createdAt: Date.now(),
      used: false
    });
    
    // Clean up old sessions
    cleanupSessions();
    
    console.log('💾 Session stored:', sessionId);
    console.log('📊 Total active sessions:', sessions.size);
    
    // Get the base URL from the current request
    const baseUrl = getBaseUrlFromRequest(request);
    const redirectUrl = `${baseUrl}/securityscan?session=${sessionId}&source=post`;
    
    console.log('🔄 Redirecting to:', redirectUrl);
    
    // Validate the redirect URL doesn't contain localhost for production
    if (process.env.NODE_ENV === 'production' && redirectUrl.includes('localhost')) {
      console.error('⚠️ WARNING: Production redirect contains localhost!');
      console.error('🔧 This suggests an issue with host header detection');
    }
    
    // Create redirect response with proper headers
    const response = NextResponse.redirect(redirectUrl, 302);
    
    // Add comprehensive headers
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('Location', redirectUrl); // Explicit location header
    
    return addCorsHeaders(response);
    
  } catch (error) {
    console.error('❌ POST handler error:', error);
    console.error('📊 Error stack:', error.stack);
    
    const errorResponse = new Response(`
      <!DOCTYPE html>
      <html><body>
        <h1>Server Error</h1>
        <p>Failed to process request: ${error.message}</p>
        <p>Environment: ${process.env.NODE_ENV || 'unknown'}</p>
        <script>
          console.error('Server Error:', '${error.message}');
        </script>
      </body></html>
    `, { 
      status: 500,
      headers: { 'Content-Type': 'text/html' }
    });
    
    return addCorsHeaders(errorResponse);
  }
}

// GET endpoint to retrieve session data
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('session');
    
    console.log('🔍 GET request for session:', sessionId);
    console.log('📊 Available sessions:', Array.from(sessions.keys()));
    
    if (!sessionId) {
      console.error('❌ No session ID provided');
      const response = NextResponse.json({ error: 'Session ID required' }, { status: 400 });
      return addCorsHeaders(response);
    }
    
    const session = sessions.get(sessionId);
    
    if (!session) {
      console.error('❌ Invalid or expired session:', sessionId);
      const response = NextResponse.json({ 
        error: 'Invalid or expired session',
        sessionId: sessionId,
        availableSessions: Array.from(sessions.keys())
      }, { status: 404 });
      return addCorsHeaders(response);
    }
    
    console.log('✅ Session found and returning data for:', sessionId);
    
    // Mark session as used and delete it (one-time use)
    sessions.delete(sessionId);
    
    const response = NextResponse.json({
      merchantId: session.merchantId,
      authToken: session.authToken,
      success: true,
      sessionId: sessionId,
      retrievedAt: new Date().toISOString()
    });
    
    return addCorsHeaders(response);
    
  } catch (error) {
    console.error('❌ Session retrieval error:', error);
    const response = NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
    return addCorsHeaders(response);
  }
}

// Health check endpoint
export async function HEAD(request) {
  console.log('💓 Health check request received');
  const response = new Response(null, { 
    status: 200,
    headers: {
      'Cache-Control': 'no-cache',
      'X-API-Status': 'healthy'
    }
  });
  return addCorsHeaders(response);
}