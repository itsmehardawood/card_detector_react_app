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
 * 
 * PERMISSION HANDLING:
 * - Detects "Only This Time" permission issues
 * - Automatic permission re-request functionality
 * - Comprehensive error handling for mobile webview
 */

// Camera Utilities for Card Detection

// 🔒 CAPTURE LOCK: Prevents multiple simultaneous frame captures
let isCapturing = false;

// 📱 CHECK CAMERA PERMISSIONS
// Checks current camera permission status
export const checkCameraPermissions = async () => {
  try {
    if (!navigator.permissions) {
      console.log('🔍 Permissions API not available, will attempt direct access');
      return 'granted'; // Assume granted for older browsers
    }

    const result = await navigator.permissions.query({ name: 'camera' });
    console.log('📹 Camera permission status:', result.state);
    return result.state; // 'granted', 'denied', or 'prompt'
  } catch (error) {
    console.log('🔍 Permission query failed, will attempt direct access:', error);
    return 'unknown';
  }
};

// 🎯 ENHANCED CAMERA INITIALIZATION WITH PERMISSION HANDLING
// Initialize camera with proper settings and permission detection
export const initializeCamera = async (videoRef, onPermissionDenied = null) => {
  try {
    console.log('📹 Starting camera initialization...');
    
    // First check if we have existing permissions
    const permissionStatus = await checkCameraPermissions();
    console.log('🔐 Current permission status:', permissionStatus);

    if (permissionStatus === 'denied') {
      throw new Error('PERMISSION_DENIED');
    }

    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        width: 1280, 
        height: 720,
        facingMode: 'environment'
      } 
    });

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      
      // Wait for video to be ready
      return new Promise((resolve, reject) => {
        const video = videoRef.current;
        
        const onLoadedData = () => {
          console.log('✅ Camera initialized successfully');
          video.removeEventListener('loadeddata', onLoadedData);
          video.removeEventListener('error', onError);
          resolve(stream);
        };

        const onError = (error) => {
          console.error('❌ Video element error:', error);
          video.removeEventListener('loadeddata', onLoadedData);
          video.removeEventListener('error', onError);
          reject(new Error('VIDEO_ELEMENT_ERROR'));
        };

        video.addEventListener('loadeddata', onLoadedData);
        video.addEventListener('error', onError);

        // Timeout if video doesn't load within 10 seconds
        setTimeout(() => {
          video.removeEventListener('loadeddata', onLoadedData);
          video.removeEventListener('error', onError);
          reject(new Error('VIDEO_LOAD_TIMEOUT'));
        }, 10000);
      });
    } else {
      throw new Error('VIDEO_REF_NULL');
    }
  } catch (error) {
    console.error('❌ Camera initialization failed:', error);
    
    // Handle specific error types
    if (error.name === 'NotAllowedError' || error.message === 'PERMISSION_DENIED') {
      // Permission was denied or revoked
      console.log('🚫 Camera permission denied or revoked');
      if (onPermissionDenied) {
        onPermissionDenied('PERMISSION_DENIED');
      }
      throw new Error('PERMISSION_DENIED');
    } else if (error.name === 'NotFoundError') {
      // No camera found
      console.log('📹 No camera device found');
      if (onPermissionDenied) {
        onPermissionDenied('NO_CAMERA');
      }
      throw new Error('NO_CAMERA');
    } else if (error.name === 'NotReadableError') {
      // Camera in use by another app
      console.log('📹 Camera is in use by another application');
      if (onPermissionDenied) {
        onPermissionDenied('CAMERA_IN_USE');
      }
      throw new Error('CAMERA_IN_USE');
    } else {
      // Generic error
      console.log('❌ Generic camera error:', error.message);
      if (onPermissionDenied) {
        onPermissionDenied('GENERIC_ERROR');
      }
      throw new Error('CAMERA_ACCESS_FAILED');
    }
  }
};

// 🔄 RE-REQUEST CAMERA PERMISSIONS
// Attempts to re-request camera permissions (useful for "Only This Time" scenarios)
export const requestCameraPermissions = async (videoRef, onPermissionDenied = null) => {
  console.log('🔄 Re-requesting camera permissions...');
  
  try {
    // Clean up any existing stream first
    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }

    // Wait a moment for cleanup
    await new Promise(resolve => setTimeout(resolve, 500));

    // Try to initialize camera again
    return await initializeCamera(videoRef, onPermissionDenied);
  } catch (error) {
    console.error('❌ Camera permission re-request failed:', error);
    throw error;
  }
};

// 📹 CHECK IF CAMERA IS WORKING
// Validates if the camera stream is active and working
export const isCameraWorking = (videoRef) => {
  if (!videoRef.current) {
    console.log('📹 Video ref is null');
    return false;
  }

  const video = videoRef.current;
  
  // Check if video has a source
  if (!video.srcObject) {
    console.log('📹 No video source object');
    return false;
  }

  // Check if stream is active
  const stream = video.srcObject;
  const tracks = stream.getTracks();
  
  if (tracks.length === 0) {
    console.log('📹 No video tracks found');
    return false;
  }

  const videoTrack = tracks.find(track => track.kind === 'video');
  if (!videoTrack) {
    console.log('📹 No video track found');
    return false;
  }

  if (videoTrack.readyState !== 'live') {
    console.log('📹 Video track is not live:', videoTrack.readyState);
    return false;
  }

  // Check video dimensions
  if (video.videoWidth === 0 || video.videoHeight === 0) {
    console.log('📹 Video has no dimensions');
    return false;
  }

  // Check if video is ready
  if (video.readyState < 2) {
    console.log('📹 Video not ready:', video.readyState);
    return false;
  }

  console.log('✅ Camera is working properly');
  return true;
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