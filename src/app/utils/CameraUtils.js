/**
 * 🎯 CAMERA UTILITIES FOR CARD DETECTION
 * 
 * This module handles camera initialization, frame capture, and cleanup.
 * 
 * FRAME CAPTURE SAFETY:
 * - Ensures only one frame capture operation at a time
 * - Proper async handling with toBlob()
 * - Frame counter should be managed by calling hook
 * - Built-in safeguards against multiple simultaneous captures
 */

// Camera Utilities for Card Detection

// 🔒 CAPTURE LOCK: Prevents multiple simultaneous frame captures
let isCapturing = false;

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


// 🎯 FRAME CAPTURE FUNCTION
// Captures a single frame from video feed with proper synchronization
// Returns a Promise that resolves with the captured frame blob
export const captureFrame = (videoRef, canvasRef) => {
  return new Promise((resolve, reject) => {
    try {
      // 🔒 CHECK CAPTURE LOCK: Wait for current capture to complete instead of rejecting
      if (isCapturing) {
        console.log('⏳ Frame capture in progress - waiting for completion...');
        
        // Wait for current capture to complete, then try again
        const waitForCapture = () => {
          if (!isCapturing) {
            // Retry the capture
            captureFrameInternal(videoRef, canvasRef, resolve, reject);
          } else {
            // Wait a bit more and check again
            setTimeout(waitForCapture, 100);
          }
        };
        
        setTimeout(waitForCapture, 100);
        return;
      }
      
      // Start the actual capture
      captureFrameInternal(videoRef, canvasRef, resolve, reject);
      
    } catch (error) {
      // 🔓 RELEASE CAPTURE LOCK on error
      isCapturing = false;
      console.error('❌ Frame capture error:', error);
      reject(error);
    }
  });
};

// 🎨 INTERNAL CAPTURE FUNCTION
const captureFrameInternal = (videoRef, canvasRef, resolve, reject) => {
  try {
    // 🔓 SET CAPTURE LOCK
    isCapturing = true;
    
    if (!videoRef.current || !canvasRef.current) {
      console.log('⚠️ Video or canvas reference is null - likely due to component cleanup');
      isCapturing = false; // Release lock
      reject(new Error('Video or canvas reference is null'));
      return;
    }
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Check if video is ready
    if (video.readyState < 2) {
      console.log('⚠️ Video not ready for capture');
      isCapturing = false; // Release lock
      reject(new Error('Video not ready for capture'));
      return;
    }
    
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.log('⚠️ Video has no dimensions');
      isCapturing = false; // Release lock
      reject(new Error('Video has no dimensions'));
      return;
    }
    
    const ctx = canvas.getContext('2d');
    
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    console.log('📷 Starting frame capture:', {
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      isCapturing: true
    });
    
    // 🎨 DRAW VIDEO FRAME to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // 🔄 CONVERT CANVAS to blob (async operation)
    canvas.toBlob((blob) => {
      // 🔓 RELEASE CAPTURE LOCK
      isCapturing = false;
      
      if (blob && blob.size > 0) {
        console.log(`✅ Frame capture completed: ${blob.size} bytes, type: ${blob.type}`);
        resolve(blob);
      } else {
        console.error('❌ Failed to create blob from canvas');
        reject(new Error('Failed to create blob from canvas'));
      }
    }, 'image/jpeg', 0.9); // High quality JPEG
    
  } catch (error) {
    // 🔓 RELEASE CAPTURE LOCK on error
    isCapturing = false;
    console.error('❌ Frame capture internal error:', error);
    reject(error);
  }
};
// 🧹 CLEANUP CAMERA STREAM
// Stops all video tracks and releases camera resources
export const cleanupCamera = (videoRef) => {
  if (videoRef.current?.srcObject) {
    const tracks = videoRef.current.srcObject.getTracks();
    tracks.forEach(track => track.stop());
  }
  // 🔓 RESET CAPTURE LOCK on cleanup
  isCapturing = false;
  console.log('📹 Camera cleanup completed and capture lock reset');
};

// 🔓 RESET CAPTURE LOCK
// Call this if you need to reset the capture state manually
export const resetCaptureState = () => {
  isCapturing = false;
  console.log('🔄 Capture state reset manually');
};