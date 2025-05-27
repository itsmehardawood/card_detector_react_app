import { useRef } from 'react';
import { sendFrameToAPI } from '../utils/apiService';
import { captureFrame } from '../utils/CameraUtils';

// Custom hook for detection logic
export const useDetection = (
  videoRef,
  canvasRef,
  sessionId,
  setSessionId,
  setIsProcessing,
  setCurrentPhase,
  setErrorMessage,
  setFrontScanState
) => {
  const captureIntervalRef = useRef(null);

  // Capture and send frames for front side with chip detection
  const captureAndSendFramesFront = async (phase) => {
    const currentSessionId = sessionId || `session_${Date.now()}`;
    if (!sessionId) {
      setSessionId(currentSessionId);
    }
    
    let lastApiResponse = null;
    const maxFrames = 70;
    
    if (!videoRef.current || videoRef.current.readyState < 2) {
      throw new Error('Video not ready for capture');
    }
    
    return new Promise((resolve, reject) => {
      let frameNumber = 0;
      let timeoutId = null;
      let isComplete = false;
      
      const cleanup = () => {
        if (captureIntervalRef.current) {
          clearInterval(captureIntervalRef.current);
          captureIntervalRef.current = null;
        }
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        setIsProcessing(false);
      };
      
      const processFrame = async () => {
        try {
          if (isComplete) return;
          
          const frame = await captureFrame(videoRef, canvasRef);
          
          if (frame && frame.size > 0) {
            frameNumber++;
            
            setIsProcessing(true);
            try {
              const apiResponse = await sendFrameToAPI(frame, phase, currentSessionId, frameNumber);
              
              lastApiResponse = apiResponse;
              setIsProcessing(false);
              
              const bufferedFrames = apiResponse.buffer_info?.front_frames_buffered || 0;
              const chipDetected = apiResponse.chip || false;
              
              setFrontScanState({
                framesBuffered: bufferedFrames,
                chipDetected: chipDetected,
                canProceedToBack: bufferedFrames >= 6 && chipDetected
              });
              
              if (bufferedFrames >= 6 && chipDetected) {
                isComplete = true;
                cleanup();
                console.log(`Front side complete - 6 frames buffered AND chip detected`);
                resolve(apiResponse);
                return;
              }
              
              if (frameNumber >= maxFrames) {
                isComplete = true;
                cleanup();
                console.log(`Reached maximum ${maxFrames} frames for ${phase} side`);
                if (lastApiResponse) {
                  if (lastApiResponse.buffer_info?.front_frames_buffered >= 6) {
                    setErrorMessage('Card chip not detected. Please ensure the chip is clearly visible and try again.');
                  } else {
                    setErrorMessage('Failed to capture sufficient frames. Please try again.');
                  }
                  setCurrentPhase('error');
                  reject(new Error(`Failed to get both conditions after ${maxFrames} attempts`));
                } else {
                  reject(new Error(`Failed to get sufficient frames after ${maxFrames} attempts`));
                }
                return;
              }
              
            } catch (apiError) {
              console.error(`API error for frame ${frameNumber}:`, apiError);
              setIsProcessing(false);
            }
          }
        } catch (error) {
          console.error('Error in frame processing:', error);
        }
      };
      
      processFrame();
      captureIntervalRef.current = setInterval(processFrame, 1200);
      
      timeoutId = setTimeout(() => {
        if (!isComplete) {
          cleanup();
          if (lastApiResponse) {
            console.log('Timeout reached, checking conditions...');
            const bufferedFrames = lastApiResponse.buffer_info?.front_frames_buffered || 0;
            const chipDetected = lastApiResponse.chip || false;
            
            if (bufferedFrames >= 6 && !chipDetected) {
              setErrorMessage('Timeout: Chip not detected. Please ensure the chip is clearly visible and try again.');
            } else if (bufferedFrames < 6) {
              setErrorMessage('Timeout: Failed to capture sufficient frames. Please try again.');
            } else {
              resolve(lastApiResponse);
              return;
            }
            setCurrentPhase('error');
            reject(new Error('Timeout: Required conditions not met'));
          } else {
            reject(new Error('Timeout: No successful API responses received'));
          }
        }
      }, 100000);
    });
  };

  // Regular capture function for back side
  const captureAndSendFrames = async (phase) => {
    const currentSessionId = sessionId || `session_${Date.now()}`;
    if (!sessionId) {
      setSessionId(currentSessionId);
    }
    
    let lastApiResponse = null;
    const maxFrames = 70;
    
    if (!videoRef.current || videoRef.current.readyState < 2) {
      throw new Error('Video not ready for capture');
    }
    
    return new Promise((resolve, reject) => {
      let frameNumber = 0;
      let timeoutId = null;
      let isComplete = false;
      
      const cleanup = () => {
        if (captureIntervalRef.current) {
          clearInterval(captureIntervalRef.current);
          captureIntervalRef.current = null;
        }
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        setIsProcessing(false);
      };
      
      const processFrame = async () => {
        try {
          if (isComplete) return;
          
          const frame = await captureFrame(videoRef, canvasRef);
          
          if (frame && frame.size > 0) {
            frameNumber++;
            
            setIsProcessing(true);
            try {
              const apiResponse = await sendFrameToAPI(frame, phase, currentSessionId, frameNumber);
              
              lastApiResponse = apiResponse;
              setIsProcessing(false);
              
              const bufferedFrames = phase === 'front' 
                ? apiResponse.buffer_info?.front_frames_buffered 
                : apiResponse.buffer_info?.back_frames_buffered;
              
              if (bufferedFrames >= 6) {
                isComplete = true;
                cleanup();
                console.log(`${phase} side complete - 6 frames buffered`);
                resolve(apiResponse);
                return;
              }
              
              if (frameNumber >= maxFrames) {
                isComplete = true;
                cleanup();
                console.log(`Reached maximum ${maxFrames} frames for ${phase} side`);
                if (lastApiResponse) {
                  resolve(lastApiResponse);
                } else {
                  reject(new Error(`Failed to get sufficient frames after ${maxFrames} attempts`));
                }
                return;
              }
              
            } catch (apiError) {
              console.error(`API error for frame ${frameNumber}:`, apiError);
              setIsProcessing(false);
            }
          }
        } catch (error) {
          console.error('Error in frame processing:', error);
        }
      };
      
      processFrame();
      captureIntervalRef.current = setInterval(processFrame, 1200);
      
      timeoutId = setTimeout(() => {
        if (!isComplete) {
          cleanup();
          if (lastApiResponse) {
            console.log('Timeout reached, using last response');
            resolve(lastApiResponse);
          } else {
            reject(new Error('Timeout: No successful API responses received'));
          }
        }
      }, 100000);
    });
  };

  return {
    captureAndSendFramesFront,
    captureAndSendFrames,
    captureIntervalRef
  };
};