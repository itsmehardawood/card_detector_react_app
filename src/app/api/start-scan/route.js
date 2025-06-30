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
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { merchant_id, auth_token, device_info } = body;

    console.log('📱 GET request fallback to start-scan API');

    // Validate required fields
    if (!merchant_id || !auth_token) {
      return NextResponse.json(
        { error: 'Merchant ID and Auth Token are required' },
        { status: 400 }
      );
    }

    // Validate merchant ID length
    if (merchant_id.length < 5) {
      return NextResponse.json(
        { error: 'Merchant ID must be at least 5 characters' },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://card-detector-react-app-dawood-ayubs-projects.vercel.app';
    const redirectUrl = `${baseUrl}/securityscan?merchant_id=${encodeURIComponent(merchant_id)}&auth_token=${encodeURIComponent(auth_token)}`;
    
    return NextResponse.json({
      status: 'success',
      redirect_url: redirectUrl,
      message: 'Use POST to main page instead'
    });

  } catch (error) {
    console.error('Start scan API error:', error);
    return NextResponse.json(
      { error: 'Internal server error. Please try again.' },
      { status: 500 }
    );
  }
}