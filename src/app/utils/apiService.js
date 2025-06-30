// API Service for Card Detection
// utils/apiService.js - Updated sendFrameToAPI function
// export const sendFrameToAPI = async (frame, phase, sessionId, frameNumber) => {
//   // Hardcoded merchant credentials
//   const MERCHANT_ID = "MERCHANT_12345";
//   const AUTH_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwOi8vMTI3LjAuMC4xOjgwMDAvYXBpL2xvZ2luIiwiaWF0IjoxNzM1NDAwNzY3LCJleHAiOjE3MzU0MDQzNjcsIm5iZiI6MTczNTQwMDc2NywianRpIjoiQlQ2bWdEU3IxS3pNc1VRaSIsInN1YiI6IjEiLCJwcnYiOiIyM2JkNWM4OTQ5ZjYwMGFkYjM5ZTcwMWM0MDA4NzJkYjdhNTk3NmY3In0.sample_token_value";
  
//   const maxRetries = 2;
//   let lastError = null;
  
//   for (let attempt = 1; attempt <= maxRetries; attempt++) {
//     try {
//       const formData = new FormData();
      
//       formData.append('file', frame, `${phase}_frame_${frameNumber}.jpg`);
//       formData.append('phase', phase);
//       formData.append('session_id', sessionId);
      
//       console.log(`Sending frame ${frameNumber} for ${phase} phase to API (attempt ${attempt})...`);
      
//       // Updated URL with merchant_id and auth_token
//       const response = await fetch(`http://127.0.0.1:9002/detect/${MERCHANT_ID}/${AUTH_TOKEN}`, {
//         method: 'POST',
//         body: formData,
//         headers: {
//           'ngrok-skip-browser-warning': 'true'
//         }
//       });
      
//       if (!response.ok) {
//         const errorText = await response.text();
//         console.error('API Error Response:', errorText);
//         throw new Error(`API request failed: ${response.status} - ${errorText}`);
//       }
      
//       const result = await response.json();
//       console.log(`API Response for frame ${frameNumber}:`, result);
      
//       // Check if this is a final encrypted response
//       if (result.encrypted_card_data) {
//         console.log('🎉 Received final encrypted response!');
//         console.log(`Status: ${result.status}, Score: ${result.score}`);
//       }
      
//       return result;
      
//     } catch (error) {
//       console.error(`API request failed for frame ${frameNumber} (attempt ${attempt}):`, error);
//       lastError = error;
      
//       if (attempt < maxRetries) {
//         console.log(`Retrying frame ${frameNumber} in 1 second...`);
//         await new Promise(resolve => setTimeout(resolve, 1200));
//       }
//     }
//   }
  
//   throw lastError;
// };
// API Service for Card Detection
// export const sendFrameToAPI = async (frame, phase, sessionId, frameNumber) => {
//   // Get credentials from window object (set by POST response or URL params)
//   let merchantId, authToken;
  
//   if (window.__WEBVIEW_AUTH__) {
//     ({ merchantId, authToken } = window.__WEBVIEW_AUTH__);
//     console.log('🔑 Using auth data from:', window.__WEBVIEW_AUTH__.source || 'unknown');
//   } else {
//     console.error('❌ No authentication data available in window.__WEBVIEW_AUTH__');
//     throw new Error('Authentication data not available. Please restart from Android app.');
//   }
  
//   if (!merchantId || !authToken) {
//     console.error('❌ Invalid authentication data:', { merchantId: !!merchantId, authToken: !!authToken });
//     throw new Error('Invalid authentication credentials');
//   }
  
//   console.log('🔑 Using credentials:', { 
//     merchantId, 
//     authToken: authToken.substring(0, 10) + '...',
//     frameNumber,
//     phase
//   });
  
//   const maxRetries = 2;
//   let lastError = null;
  
//   for (let attempt = 1; attempt <= maxRetries; attempt++) {
//     try {
//       const formData = new FormData();
      
//       formData.append('file', frame, `${phase}_frame_${frameNumber}.jpg`);
//       formData.append('phase', phase);
//       formData.append('session_id', sessionId);
      
//       console.log(`📤 Sending frame ${frameNumber} for ${phase} phase to API (attempt ${attempt})...`);
      
//       // Use dynamic merchant_id and auth_token from Android POST data
//       const response = await fetch(`https://cardapp.hopto.org/detect/${merchantId}/${authToken}`, {
//         method: 'POST',
//         body: formData,
//         headers: {
//           'ngrok-skip-browser-warning': 'true'
//         }
//       });
      
//       if (!response.ok) {
//         const errorText = await response.text();
//         console.error('❌ API Error Response:', errorText);
//         throw new Error(`API request failed: ${response.status} - ${errorText}`);
//       }
      
//       const result = await response.json();
//       console.log(`✅ API Response for frame ${frameNumber}:`, result);
      
//       // Check if this is a final encrypted response
//       if (result.encrypted_card_data) {
//         console.log('🎉 Final encrypted response received!');
//         console.log(`Status: ${result.status}, Score: ${result.score}`);
//         console.log('🔐 Encrypted data length:', result.encrypted_card_data.length);
//       }
      
//       return result;
      
//     } catch (error) {
//       console.error(`❌ API request failed for frame ${frameNumber} (attempt ${attempt}):`, error);
//       lastError = error;
      
//       if (attempt < maxRetries) {
//         console.log(`🔄 Retrying frame ${frameNumber} in 1 second...`);
//         await new Promise(resolve => setTimeout(resolve, 1200));
//       }
//     }
//   }
  
//   throw lastError;
// };


// API Service for Card Detection
export const sendFrameToAPI = async (frame, phase, sessionId, frameNumber) => {
  // Get credentials from window object (set by POST response or URL params)
  let merchantId, authToken;
  
  if (window.__WEBVIEW_AUTH__) {
    ({ merchantId, authToken } = window.__WEBVIEW_AUTH__);
    console.log('🔑 Using auth data from:', window.__WEBVIEW_AUTH__.source || 'unknown');
  } else {
    console.error('❌ No authentication data available in window.__WEBVIEW_AUTH__');
    throw new Error('Authentication data not available. Please restart from Android app.');
  }
  
  if (!merchantId || !authToken) {
    console.error('❌ Invalid authentication data:', { merchantId: !!merchantId, authToken: !!authToken });
    throw new Error('Invalid authentication credentials');
  }
  
  console.log('🔑 Using credentials:', { 
    merchantId, 
    authToken: authToken.substring(0, 10) + '...',
    frameNumber,
    phase
  });
  
  const maxRetries = 2;
  let lastError = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const formData = new FormData();
      
      formData.append('file', frame, `${phase}_frame_${frameNumber}.jpg`);
      formData.append('phase', phase);
      formData.append('session_id', sessionId);
      
      console.log(`📤 Sending frame ${frameNumber} for ${phase} phase to API (attempt ${attempt})...`);
      
      
      const apiUrl = `https://cardapp.hopto.org/detect/${merchantId}/${authToken}`;
      
      console.log(`🎯 API URL: ${apiUrl}`);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error Response:', errorText);
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log(`✅ API Response for frame ${frameNumber}:`, result);
      
      // Check if this is a final encrypted response
      if (result.encrypted_card_data) {
        console.log('🎉 Final encrypted response received!');
        console.log(`Status: ${result.status}, Score: ${result.score}`);
        console.log('🔐 Encrypted data length:', result.encrypted_card_data.length);
      }
      
      return result;
      
    } catch (error) {
      console.error(`❌ API request failed for frame ${frameNumber} (attempt ${attempt}):`, error);
      lastError = error;
      
      if (attempt < maxRetries) {
        console.log(`🔄 Retrying frame ${frameNumber} in 1 second...`);
        await new Promise(resolve => setTimeout(resolve, 1200));
      }
    }
  }
  
  throw lastError;
};