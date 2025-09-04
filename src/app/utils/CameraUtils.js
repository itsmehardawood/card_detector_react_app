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
// export const captureFrame = (videoRef, canvasRef) => {
//   if (!videoRef.current || !canvasRef.current) return null;
  
//   const video = videoRef.current;
//   const canvas = canvasRef.current;
//   const ctx = canvas.getContext('2d');
  
//   canvas.width = video.videoWidth || 640;
//   canvas.height = video.videoHeight || 480;
  
//   ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  
//   return new Promise((resolve) => {
//     canvas.toBlob((blob) => {
//       if (blob) {
//         console.log(`Frame captured: ${blob.size} bytes, type: ${blob.type}`);
//         resolve(blob);
//       } else {
//         console.error('Failed to create blob from canvas');
//         resolve(null);
//       }
//     }, 'image/jpeg', 0.9);
//   });
// };
// utils/CameraUtils.js - Update captureFrame function
export const captureFrame = (videoRef, canvasRef) => {
  return new Promise((resolve, reject) => {
    try {
      if (!videoRef.current || !canvasRef.current) {
        console.log('⚠️ Video or canvas reference is null - likely due to component cleanup');
        reject(new Error('Video or canvas reference is null'));
        return;
      }
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Check if video is ready
      if (video.readyState < 2) {
        console.log('⚠️ Video not ready for capture');
        reject(new Error('Video not ready for capture'));
        return;
      }
      
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        console.log('⚠️ Video has no dimensions');
        reject(new Error('Video has no dimensions'));
        return;
      }
      
      const ctx = canvas.getContext('2d');
      
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      console.log('📷 Capturing frame:', {
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height
      });
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => {
        if (blob && blob.size > 0) {
          console.log(`✅ Frame captured: ${blob.size} bytes, type: ${blob.type}`);
          resolve(blob);
        } else {
          console.error('❌ Failed to create blob from canvas');
          reject(new Error('Failed to create blob from canvas'));
        }
      }, 'image/jpeg', 0.9);
      
    } catch (error) {
      console.error('❌ Frame capture error:', error);
      reject(error);
    }
  });
};
// Cleanup camera stream
export const cleanupCamera = (videoRef) => {
  if (videoRef.current?.srcObject) {
    const tracks = videoRef.current.srcObject.getTracks();
    tracks.forEach(track => track.stop());
  }
};