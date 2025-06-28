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
  setFrontScanState,
  stopRequestedRef // Added this parameter from your main component
) => {
  const captureIntervalRef = useRef(null);

  // Capture and send frames for front side with chip and bank logo detection
  const captureAndSendFramesFront = async (phase) => {
    const currentSessionId = sessionId || `session_${Date.now()}`;
    if (!sessionId) {
      setSessionId(currentSessionId);
    }
    
    let lastApiResponse = null;
    const maxFrames = 80;
    
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
      
      // Replace the processFrame function inside captureAndSendFrames with this fixed version:
      
      const processFrame = async () => {
        try {
          // Check if stop requested or already complete
          if (isComplete || stopRequestedRef.current) return;
          
          const frame = await captureFrame(videoRef, canvasRef);
          
          if (frame && frame.size > 0) {
            frameNumber++;
            
            setIsProcessing(true);
            try {
              const apiResponse = await sendFrameToAPI(frame, phase, currentSessionId, frameNumber);
              
              // CRITICAL FIX: Check for final encrypted response first
              if (apiResponse.encrypted_card_data && apiResponse.status) {
                console.log('🎯 Final encrypted response received! Stopping detection...');
                isComplete = true;
                cleanup();
                resolve(apiResponse);
                return;
              }
              
              // Check for validation states first (for validation phase)
              if (phase === 'validation') {
                if (apiResponse.message_state === "VALIDATION_FAILED" || 
                    apiResponse.movement_state === "VALIDATION_FAILED") {
                  isComplete = true;
                  cleanup();
                  const errorMsg = apiResponse.message || 
                                  apiResponse.movement_message || 
                                  'Validation failed. Please try again.';
                  setErrorMessage(errorMsg);
                  setCurrentPhase('error');
                  reject(new Error('Validation failed'));
                  return;
                }

                if (apiResponse.message_state === "VALIDATION_PASSED" || 
                    apiResponse.movement_state === "VALIDATION_PASSED") {
                  isComplete = true;
                  cleanup();
                  setCurrentPhase('ready-for-front');
                  resolve(apiResponse);
                  return;
                }
              }

              // General validation state check for all phases
              if (apiResponse.message_state === "VALIDATION_FAILED" || 
                  apiResponse.movement_state === "VALIDATION_FAILED") {
                isComplete = true;
                cleanup();
                const errorMsg = apiResponse.message || 
                                apiResponse.movement_message || 
                                'Validation failed. Please try again.';
                setErrorMessage(errorMsg);
                setCurrentPhase('error');
                reject(new Error('Validation failed'));
                return;
              }
              
              lastApiResponse = apiResponse;
              setIsProcessing(false);
              
              const bufferedFrames = phase === 'front' 
                ? apiResponse.buffer_info?.front_frames_buffered 
                : apiResponse.buffer_info?.back_frames_buffered;
              
              // For back side, check both sufficient frames and required features
              if (phase === 'back' && bufferedFrames >= 6) {
                const { count, detectedFeatures } = countBackSideFeatures(apiResponse);
                
                if (count >= requiredBackSideFeatures) {
                  isComplete = true;
                  cleanup();
                  console.log(`Back side complete - 6 frames buffered and ${count} features detected: ${detectedFeatures.join(', ')}`);
                  resolve(apiResponse);
                  return;
                }
              } else if (phase !== 'back' && phase !== 'validation' && bufferedFrames >= 6) {
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
                  if (phase === 'back') {
                    const buffered = lastApiResponse.buffer_info?.back_frames_buffered || 0;
                    const { count, detectedFeatures } = countBackSideFeatures(lastApiResponse);
                    
                    if (buffered >= 6 && count < requiredBackSideFeatures) {
                      const missingCount = requiredBackSideFeatures - count;
                      setErrorMessage(`Insufficient back side features detected. Found ${count} out of required ${requiredBackSideFeatures} features (${detectedFeatures.join(', ')}). Please ensure the card's back side is clearly visible showing magnetic strip, signature strip, hologram, and customer service details.`);
                      setCurrentPhase('error');
                      reject(new Error(`Insufficient back side features: only ${count}/${requiredBackSideFeatures} detected`));
                    } else if (buffered < 6) {
                      setErrorMessage('Failed to capture sufficient frames for back side. Please try again.');
                      setCurrentPhase('error');
                      reject(new Error('Insufficient frames captured for back side'));
                    } else {
                      resolve(lastApiResponse);
                    }
                  } else {
                    resolve(lastApiResponse);
                  }
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
      captureIntervalRef.current = setInterval(processFrame, 1500);
      
      // Replace the timeout handler in captureAndSendFrames with this:
      
      timeoutId = setTimeout(() => {
        if (!isComplete) {
          cleanup();
          if (lastApiResponse) {
            console.log('Timeout reached, checking final conditions...');
            
            // CRITICAL FIX: Check for final encrypted response in timeout
            if (lastApiResponse.encrypted_card_data && lastApiResponse.status) {
              console.log('🎯 Final encrypted response found in timeout handler');
              resolve(lastApiResponse);
              return;
            }
            
            if (phase === 'back') {
              const bufferedFrames = lastApiResponse.buffer_info?.back_frames_buffered || 0;
              const { count, detectedFeatures } = countBackSideFeatures(lastApiResponse);
              
              if (bufferedFrames >= 6 && count >= requiredBackSideFeatures) {
                resolve(lastApiResponse);
                return;
              } else if (bufferedFrames >= 6 && count < requiredBackSideFeatures) {
                setErrorMessage(`Timeout: Insufficient back side features detected. Found ${count} out of required ${requiredBackSideFeatures} features (${detectedFeatures.join(', ')}). Please ensure the card's back side is clearly visible.`);
                setCurrentPhase('error');
                reject(new Error(`Timeout: Insufficient back side features detected`));
                return;
              }
            }
            
            console.log('Timeout reached, using last response');
            resolve(lastApiResponse);
          } else {
            reject(new Error('Timeout: No successful API responses received'));
          }
        }
      }, 120000);
    });
  };

  // Helper function to count detected back side features
  const countBackSideFeatures = (apiResponse) => {
    const features = {
      magstrip: apiResponse.magstrip || false,
      signstrip: apiResponse.signstrip || false,
      hologram: apiResponse.hologram || false,
      customer_service_detected: apiResponse.final_ocr?.customer_service.detected || false
    };
    
    return {
      features,
      count: Object.values(features).filter(Boolean).length,
      detectedFeatures: Object.keys(features).filter(key => features[key])
    };
  };

  // Regular capture function for back side with feature validation
  // Regular capture function for back side with feature validation
  const captureAndSendFrames = async (phase) => {
    const currentSessionId = sessionId || `session_${Date.now()}`;
    if (!sessionId) {
      setSessionId(currentSessionId);
    }
    
    let lastApiResponse = null;
    const maxFrames = 100;
    const requiredBackSideFeatures = 3;
    
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
          // Check if stopped
          if (isComplete || stopRequestedRef.current) return;
          
          const frame = await captureFrame(videoRef, canvasRef);
          
          if (frame && frame.size > 0) {
            frameNumber++;
            
            setIsProcessing(true);
            try {
              const apiResponse = await sendFrameToAPI(frame, phase, currentSessionId, frameNumber);
              
              // CHECK FOR FINAL ENCRYPTED RESPONSE FIRST - HIGHEST PRIORITY
              if (apiResponse.encrypted_card_data && apiResponse.status) {
                isComplete = true;
                cleanup();
                console.log('🎉 Final encrypted response received - stopping detection immediately');
                console.log(`Status: ${apiResponse.status}, Score: ${apiResponse.score}`);
                resolve(apiResponse);
                return;
              }
              
              // Check for validation states first (for validation phase)
              if (phase === 'validation') {
                if (apiResponse.message_state === "VALIDATION_FAILED" || 
                    apiResponse.movement_state === "VALIDATION_FAILED") {
                  isComplete = true;
                  cleanup();
                  const errorMsg = apiResponse.message || 
                                  apiResponse.movement_message || 
                                  'Validation failed. Please try again.';
                  setErrorMessage(errorMsg);
                  setCurrentPhase('error');
                  reject(new Error('Validation failed'));
                  return;
                }

                if (apiResponse.message_state === "VALIDATION_PASSED" || 
                    apiResponse.movement_state === "VALIDATION_PASSED") {
                  isComplete = true;
                  cleanup();
                  setCurrentPhase('ready-for-front');
                  resolve(apiResponse);
                  return;
                }
              }

              // General validation state check for all phases
              if (apiResponse.message_state === "VALIDATION_FAILED" || 
                  apiResponse.movement_state === "VALIDATION_FAILED") {
                isComplete = true;
                cleanup();
                const errorMsg = apiResponse.message || 
                                apiResponse.movement_message || 
                                'Validation failed. Please try again.';
                setErrorMessage(errorMsg);
                setCurrentPhase('error');
                reject(new Error('Validation failed'));
                return;
              }
              
              lastApiResponse = apiResponse;
              setIsProcessing(false);
              
              const bufferedFrames = phase === 'front' 
                ? apiResponse.buffer_info?.front_frames_buffered 
                : apiResponse.buffer_info?.back_frames_buffered;
              
              // For back side, check both sufficient frames and required features
              if (phase === 'back' && bufferedFrames >= 6) {
                const { count, detectedFeatures } = countBackSideFeatures(apiResponse);
                
                if (count >= requiredBackSideFeatures) {
                  isComplete = true;
                  cleanup();
                  console.log(`Back side complete - 6 frames buffered and ${count} features detected: ${detectedFeatures.join(', ')}`);
                  resolve(apiResponse);
                  return;
                }
              } else if (phase !== 'back' && phase !== 'validation' && bufferedFrames >= 6) {
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
                  if (phase === 'back') {
                    const buffered = lastApiResponse.buffer_info?.back_frames_buffered || 0;
                    const { count, detectedFeatures } = countBackSideFeatures(lastApiResponse);
                    
                    if (buffered >= 6 && count < requiredBackSideFeatures) {
                      const missingCount = requiredBackSideFeatures - count;
                      setErrorMessage(`Insufficient back side features detected. Found ${count} out of required ${requiredBackSideFeatures} features (${detectedFeatures.join(', ')}). Please ensure the card's back side is clearly visible showing magnetic strip, signature strip, hologram, and customer service details.`);
                      setCurrentPhase('error');
                      reject(new Error(`Insufficient back side features: only ${count}/${requiredBackSideFeatures} detected`));
                    } else if (buffered < 6) {
                      setErrorMessage('Failed to capture sufficient frames for back side. Please try again.');
                      setCurrentPhase('error');
                      reject(new Error('Insufficient frames captured for back side'));
                    } else {
                      resolve(lastApiResponse);
                    }
                  } else {
                    resolve(lastApiResponse);
                  }
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
            console.log('Timeout reached, checking final conditions...');
            
            // Check for final encrypted response even on timeout
            if (lastApiResponse.encrypted_card_data && lastApiResponse.status) {
              console.log('🎉 Final encrypted response found on timeout');
              resolve(lastApiResponse);
              return;
            }
            
            if (phase === 'back') {
              const bufferedFrames = lastApiResponse.buffer_info?.back_frames_buffered || 0;
              const { count, detectedFeatures } = countBackSideFeatures(lastApiResponse);
              
              if (bufferedFrames >= 6 && count >= requiredBackSideFeatures) {
                resolve(lastApiResponse);
                return;
              } else if (bufferedFrames >= 6 && count < requiredBackSideFeatures) {
                setErrorMessage(`Timeout: Insufficient back side features detected. Found ${count} out of required ${requiredBackSideFeatures} features (${detectedFeatures.join(', ')}). Please ensure the card's back side is clearly visible.`);
                setCurrentPhase('error');
                reject(new Error(`Timeout: Insufficient back side features detected`));
                return;
              }
            }
            
            console.log('Timeout reached, using last response');
            resolve(lastApiResponse);
          } else {
            reject(new Error('Timeout: No successful API responses received'));
          }
        }
      }, 120000);
    });
  };

  return {
    captureAndSendFramesFront,
    captureAndSendFrames,
    captureIntervalRef
  };
};