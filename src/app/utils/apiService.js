export const sendFrameToAPI = async (
  frameBlob,
  phase,
  sessionId,
  frameNumber
) => {
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


  // testing ngrok
  // const apiUrl = `https://14c022cf3f5a.ngrok-free.app/detect/${merchantId}`;

  // dev server
  // const apiUrl = `https://testscan.cardnest.io/detect/${merchantId}`;

  // prod server
  const apiUrl = `https://api.cardnest.io/detect/${merchantId}`;

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
      "auth-token": encodeURIComponent(authToken), // :white_check_mark: URL encode the auth token to handle special characters
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
  console.log("Response of API: ", data);

  return data;
};
