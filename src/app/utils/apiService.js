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
  const apiUrl = `https://f3da1b09ed94.ngrok-free.app/detect/${merchantId}`;
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