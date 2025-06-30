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
  stopRequestedRef,
  handleDetectionFailure // Add this parameter for validation failures
) => {
  const captureIntervalRef = useRef(null);

  // Capture and send frames for front side with chip and bank logo detection
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
                setCurrentPhase('results');
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

              // Update front scan state for front phase
              if (phase === 'front') {
                setFrontScanState({
                  framesBuffered: apiResponse.buffer_info?.front_frames_buffered || frameNumber,
                  chipDetected: apiResponse.chip || false,
                  bankLogoDetected: apiResponse.bank_logo || false,
                  canProceedToBack: false
                });
              }
              
              const bufferedFrames = phase === 'front' 
                ? apiResponse.buffer_info?.front_frames_buffered 
                : apiResponse.buffer_info?.back_frames_buffered;
              
              // MOVED: Check validation ONLY after we have sufficient buffered frames
              if (bufferedFrames >= 6) {
                // NOW check front_valid for front phase (only after 6 frames buffered)
                if (phase === 'front' && apiResponse.front_valid === false) {
                  console.log('❌ Front validation failed after 6 frames - front_valid is false');
                  isComplete = true;
                  cleanup();
                  if (handleDetectionFailure) {
                    handleDetectionFailure('Front side validation failed. Please ensure the card is properly positioned and try again.', 'front');
                  }
                  reject(new Error('Front validation failed - front_valid is false'));
                  return;
                }

                // NOW check back_valid for back phase (only after 6 frames buffered)
                if (phase === 'back' && apiResponse.back_valid === false) {
                  console.log('❌ Back validation failed after 6 frames - back_valid is false');
                  isComplete = true;
                  cleanup();
                  if (handleDetectionFailure) {
                    handleDetectionFailure('Back side validation failed. Please ensure the card back is clearly visible and try again.', 'back');
                  }
                  reject(new Error('Back validation failed - back_valid is false'));
                  return;
                }
              }
              
              // For back side, check both sufficient frames and required features
              if (phase === 'back' && bufferedFrames >= 6) {
                const { count, detectedFeatures } = countBackSideFeatures(apiResponse);
                
                if (count >= 3) { // requiredBackSideFeatures
                  isComplete = true;
                  cleanup();
                  console.log(`Back side complete - 6 frames buffered and ${count} features detected: ${detectedFeatures.join(', ')}`);
                  setCurrentPhase('results');
                  resolve(apiResponse);
                  return;
                }
              } else if (phase === 'front' && bufferedFrames >= 6) {
                // For front side, check if we have chip or bank logo
                if (apiResponse.chip || apiResponse.bank_logo) {
                  isComplete = true;
                  cleanup();
                  console.log(`Front side complete - 6 frames buffered with chip: ${apiResponse.chip}, bank_logo: ${apiResponse.bank_logo}`);
                  resolve(apiResponse);
                  return;
                }
              } else if (phase !== 'back' && phase !== 'front' && phase !== 'validation' && bufferedFrames >= 6) {
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
                    
                    if (buffered >= 6 && count < 3) {
                      const missingCount = 3 - count;
                      setErrorMessage(`Insufficient back side features detected. Found ${count} out of required 3 features (${detectedFeatures.join(', ')}). Please ensure the card's back side is clearly visible showing magnetic strip, signature strip, hologram, and customer service details.`);
                      setCurrentPhase('error');
                      reject(new Error(`Insufficient back side features: only ${count}/3 detected`));
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
      
      timeoutId = setTimeout(() => {
        if (!isComplete) {
          cleanup();
          if (lastApiResponse) {
            console.log('Timeout reached, checking final conditions...');
            
            // CRITICAL FIX: Check for final encrypted response in timeout
            if (lastApiResponse.encrypted_card_data && lastApiResponse.status) {
              console.log('🎯 Final encrypted response found in timeout handler');
              setCurrentPhase('results');
              resolve(lastApiResponse);
              return;
            }
            
            if (phase === 'back') {
              const bufferedFrames = lastApiResponse.buffer_info?.back_frames_buffered || 0;
              const { count, detectedFeatures } = countBackSideFeatures(lastApiResponse);
              
              if (bufferedFrames >= 6 && count >= 3) {
                setCurrentPhase('results');
                resolve(lastApiResponse);
                return;
              } else if (bufferedFrames >= 6 && count < 3) {
                setErrorMessage(`Timeout: Insufficient back side features detected. Found ${count} out of required 3 features (${detectedFeatures.join(', ')}). Please ensure the card's back side is clearly visible.`);
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
    };
    
    return {
      features,
      count: Object.values(features).filter(Boolean).length,
      detectedFeatures: Object.keys(features).filter(key => features[key])
    };
  };

  // Regular capture function for back side with feature validation
  const captureAndSendFrames = async (phase) => {
    const currentSessionId = sessionId || `session_${Date.now()}`;
    if (!sessionId) {
      setSessionId(currentSessionId);
    }
    
    let lastApiResponse = null;
    const maxFrames = 40;
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
                setCurrentPhase('results');
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
              
              // MOVED: Check validation ONLY after we have sufficient buffered frames
              if (bufferedFrames >= 6) {
                // NOW check front_valid for front phase (only after 6 frames buffered)
                if (phase === 'front' && apiResponse.front_valid === false) {
                  console.log('❌ Front validation failed after 6 frames - front_valid is false');
                  isComplete = true;
                  cleanup();
                  if (handleDetectionFailure) {
                    handleDetectionFailure('Front side validation failed. Please ensure the card is properly positioned and try again.', 'front');
                  }
                  reject(new Error('Front validation failed - front_valid is false'));
                  return;
                }

                // NOW check back_valid for back phase (only after 6 frames buffered)
                if (phase === 'back' && apiResponse.back_valid === false) {
                  console.log('❌ Back validation failed after 6 frames - back_valid is false');
                  isComplete = true;
                  cleanup();
                  if (handleDetectionFailure) {
                    handleDetectionFailure('Back side validation failed. Please ensure the card back is clearly visible and try again.', 'back');
                  }
                  reject(new Error('Back validation failed - back_valid is false'));
                  return;
                }
              }
              
              // For back side, check both sufficient frames and required features
              if (phase === 'back' && bufferedFrames >= 6) {
                const { count, detectedFeatures } = countBackSideFeatures(apiResponse);
                
                if (count >= requiredBackSideFeatures) {
                  isComplete = true;
                  cleanup();
                  console.log(`Back side complete - 6 frames buffered and ${count} features detected: ${detectedFeatures.join(', ')}`);
                  setCurrentPhase('results');
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
      
      timeoutId = setTimeout(() => {
        if (!isComplete) {
          cleanup();
          if (lastApiResponse) {
            console.log('Timeout reached, checking final conditions...');
            
            // Check for final encrypted response even on timeout
            if (lastApiResponse.encrypted_card_data && lastApiResponse.status) {
              console.log('🎉 Final encrypted response found on timeout');
              setCurrentPhase('results');
              resolve(lastApiResponse);
              return;
            }
            
            if (phase === 'back') {
              const bufferedFrames = lastApiResponse.buffer_info?.back_frames_buffered || 0;
              const { count, detectedFeatures } = countBackSideFeatures(lastApiResponse);
              
              if (bufferedFrames >= 6 && count >= requiredBackSideFeatures) {
                setCurrentPhase('results');
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