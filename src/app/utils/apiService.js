// // API Service for Card Detection
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

//       // const apiUrl = `https://cardapp.hopto.org/detect/${merchantId}/${authToken}`;
//       const apiUrl = `https://de90b759b94b.ngrok-free.ap/detect/${merchantId}/${authToken}`;

//       console.log(`🎯 API URL: ${apiUrl}`);

//       const response = await fetch(apiUrl, {
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


export const sendFrameToAPI = async (frameBlob, phase, sessionId, frameNumber) => {
  let merchantId, authToken;
  // :white_check_mark: Extract merchantId and authToken from WebView context
  if (window.__WEBVIEW_AUTH__) {
    ({ merchantId, authToken } = window.__WEBVIEW_AUTH__);
  } else {
    throw new Error("No authentication available. Start from the app.");
  }
  // :white_check_mark: Basic credential checks
  if (!merchantId || !authToken) {
    throw new Error("Missing auth credentials.");
  }
  const apiUrl = `https://cardapp.hopto.org/detect/${merchantId}`;
  // :white_check_mark: Create File from Blob for FastAPI UploadFile
  const file = new File([frameBlob], `${phase}_frame_${frameNumber}.jpg`, {
    type: "image/jpeg",
  });
  // :white_check_mark: Build FormData (do NOT set Content-Type manually)
  const formData = new FormData();
  formData.append("file", file);
  formData.append("phase", phase);
  formData.append("session_id", sessionId);
  // :white_check_mark: Send request
  const response = await fetch(apiUrl, {
    method: "POST",
    body: formData,
    headers: {
      "auth-token": authToken, // :white_check_mark: FastAPI reads this with Header(...)
      "ngrok-skip-browser-warning": "true", // optional, safe to include
      // :warning: DO NOT include "Content-Type" here
    },
  });
  // :white_check_mark: Error handling
 if (!response.ok) {
    const errorText = await response.text();
    console.error(":x: API Error:", errorText);
    throw new Error(`API request failed with status ${response.status}`);
  }
  // :white_check_mark: Parse and return response JSON
  const data = await response.json();
      console.log("Response of API: ",data);

  return data;
};