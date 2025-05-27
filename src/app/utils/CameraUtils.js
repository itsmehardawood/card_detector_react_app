// Camera Utilities for Card Detection

// Initialize camera with proper settings
export const initializeCamera = async (videoRef) => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        width: 1280, 
        height: 720,
        facingMode: 'environment'
      } 
    });
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
    return stream;
  } catch (error) {
    console.error('Camera initialization failed:', error);
    throw new Error('Camera access is required for card detection');
  }
};

// Capture frame from video element
export const captureFrame = (videoRef, canvasRef) => {
  if (!videoRef.current || !canvasRef.current) return null;
  
  const video = videoRef.current;
  const canvas = canvasRef.current;
  const ctx = canvas.getContext('2d');
  
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        console.log(`Frame captured: ${blob.size} bytes, type: ${blob.type}`);
        resolve(blob);
      } else {
        console.error('Failed to create blob from canvas');
        resolve(null);
      }
    }, 'image/jpeg', 0.9);
  });
};

// Cleanup camera stream
export const cleanupCamera = (videoRef) => {
  if (videoRef.current?.srcObject) {
    const tracks = videoRef.current.srcObject.getTracks();
    tracks.forEach(track => track.stop());
  }
};