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
      let maxFramesReachedTime = null; // Track when we reached 10 frames
      
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
          
          // 📊 FRAME LIMIT: Only capture new frames if under 10 frame limit
          if (frameNumber >= maxFrames) {
            if (!maxFramesReachedTime) {
              maxFramesReachedTime = Date.now();
              console.log(`📋 Reached ${maxFrames} frames limit - no more captures, waiting for responses...`);
            }
            return; // Don't capture more frames, but keep waiting for responses
          }
          
          const frame = await captureFrame(videoRef, canvasRef);
          
          if (frame && frame.size > 0) {
            frameNumber++;
            
            setIsProcessing(true);
            try {
              const apiResponse = await sendFrameToAPI(frame, phase, currentSessionId, frameNumber);
              
              // 🎯 HIGHEST PRIORITY: Check for status success (regardless of other conditions)
              if (apiResponse.status === "success") {
                console.log('🎯 SUCCESS STATUS received! Stopping detection...');
                console.log(`Status: ${apiResponse.status}, Score: ${apiResponse.score}, Complete Scan: ${apiResponse.complete_scan}`);
                isComplete = true;
                cleanup();
                setCurrentPhase('results');
                resolve(apiResponse);
                return;
              }
              
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

            // General validation state check for all phases - Skip for front/back phases
            if (phase !== 'front' && phase !== 'back' && 
                (apiResponse.message_state === "VALIDATION_FAILED" || 
                 apiResponse.movement_state === "VALIDATION_FAILED")) {
              isComplete = true;
              cleanup();
              const errorMsg = apiResponse.message || 
                              apiResponse.movement_message || 
                              'Validation failed. Please try again.';
              setErrorMessage(errorMsg);
              setCurrentPhase('error');
              reject(new Error('Validation failed'));
              return;
            }              lastApiResponse = apiResponse;
              setIsProcessing(false);

              // Update front scan state for front phase
              if (phase === 'front') {
                // Log motion progress for debugging
                if (apiResponse.motion_progress) {
                  console.log(`🎯 Motion progress detected: ${apiResponse.motion_progress}`);
                }
                
                setFrontScanState({
                  framesBuffered: apiResponse.buffer_info?.front_frames_buffered || frameNumber,
                  chipDetected: apiResponse.chip || false,
                  bankLogoDetected: apiResponse.bank_logo || false,
                  physicalCardDetected: apiResponse.physical_card || false,
                  canProceedToBack: false,
                  motionProgress: apiResponse.motion_progress || null,
                  showMotionPrompt: apiResponse.motion_progress === "1/2",
                  hideMotionPrompt: apiResponse.motion_progress === "2/2",
                  motionPromptTimestamp: apiResponse.motion_progress === "1/2" ? Date.now() : null
                });
              }
              
              const bufferedFrames = phase === 'front' 
                ? apiResponse.buffer_info?.front_frames_buffered 
                : apiResponse.buffer_info?.back_frames_buffered;
              
              // MOVED: Check validation ONLY after we have sufficient buffered frames
              if (bufferedFrames >= 4) {
                // NOW check front_valid for front phase (only after 4 frames buffered)
                if (phase === 'front' && apiResponse.front_valid === false) {
                  console.log('❌ Front validation failed after 4 frames - front_valid is false');
                  isComplete = true;
                  cleanup();
                  if (handleDetectionFailure) {
                    handleDetectionFailure('Front side validation failed. Please ensure the card is properly positioned and try again.', 'front');
                  }
                  reject(new Error('Front validation failed - front_valid is false'));
                  return;
                }

                // NOW check back_valid for back phase (only after 4 frames buffered)
                if (phase === 'back' && apiResponse.back_valid === false) {
                  console.log('❌ Back validation failed after 4 frames - back_valid is false');
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
              if (phase === 'back' && bufferedFrames >= 4) {
                const { count, detectedFeatures } = countBackSideFeatures(apiResponse);
                
                if (count >= 3) { // requiredBackSideFeatures
                  isComplete = true;
                  cleanup();
                  console.log(`Back side complete - 4 frames buffered and ${count} features detected: ${detectedFeatures.join(', ')}`);
                  setCurrentPhase('results');
                  resolve(apiResponse);
                  return;
                }
              } else if (phase === 'front' && bufferedFrames >= 4) {
                // For front side, check if we have chip or bank logo AND physical_card is true
                if ((apiResponse.chip || apiResponse.bank_logo) && apiResponse.physical_card === true) {
                  isComplete = true;
                  cleanup();
                  console.log(`Front side complete - 4 frames buffered with chip: ${apiResponse.chip}, bank_logo: ${apiResponse.bank_logo}, physical_card: ${apiResponse.physical_card}`);
                  resolve(apiResponse);
                  return;
                }
              } else if (phase !== 'back' && phase !== 'front' && phase !== 'validation' && bufferedFrames >= 4) {
                isComplete = true;
                cleanup();
                console.log(`${phase} side complete - 4 frames buffered`);
                resolve(apiResponse);
                return;
              }
              
              // 📊 FALLBACK: Only stop due to frame limit if we've been waiting a while
              // This ensures we give time for API responses after sending 10 frames
              if (frameNumber >= maxFrames && maxFramesReachedTime && 
                  (Date.now() - maxFramesReachedTime > 10000)) { // Wait 10 seconds after last frame
                console.log(`📋 Waited 10 seconds after ${maxFrames} frames - stopping with last response`);
                isComplete = true;
                cleanup();
                
                if (lastApiResponse) {
                  if (phase === 'back') {
                    const buffered = lastApiResponse.buffer_info?.back_frames_buffered || 0;
                    const { count, detectedFeatures } = countBackSideFeatures(lastApiResponse);
                    
                    if (buffered >= 4 && count < 3) {
                      const missingCount = 3 - count;
                      setErrorMessage(`Insufficient back side features detected. Found ${count} out of required 3 features (${detectedFeatures.join(', ')}). Please ensure the card's back side is clearly visible showing magnetic strip, signature strip, hologram, and customer service details.`);
                      setCurrentPhase('error');
                      reject(new Error(`Insufficient back side features: only ${count}/3 detected`));
                    } else if (buffered < 4) {
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
              
              if (bufferedFrames >= 4 && count >= 3) {
                setCurrentPhase('results');
                resolve(lastApiResponse);
                return;
              } else if (bufferedFrames >= 4 && count < 3) {
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
      }, 45000);
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

  // Regular capture function for back side with feature validation
const captureAndSendFrames = async (phase) => {
  const currentSessionId = sessionId || `session_${Date.now()}`;
  if (!sessionId) {
    setSessionId(currentSessionId);
  }
  
  let lastApiResponse = null;
  const maxFrames = 40;
  const requiredBackSideFeatures = 2;  //replaced it to 2 before it was 3
  
  if (!videoRef.current || videoRef.current.readyState < 2) {
    throw new Error('Video not ready for capture');
  }
  
  return new Promise((resolve, reject) => {
    let frameNumber = 0;
    let timeoutId = null;
    let isComplete = false;
    let maxFramesReachedTime = null; // Track when we reached 10 frames
    
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
        
        // 📊 FRAME LIMIT: Only capture new frames if under 10 frame limit
        if (frameNumber >= maxFrames && !maxFramesReachedTime) {
          console.log(`📋 Reached ${maxFrames} frames limit - stopping new captures but continuing to wait for responses...`);
          maxFramesReachedTime = Date.now();
          return; // Don't capture more frames, but keep waiting for responses
        }

        if (maxFramesReachedTime) {
          return; // Don't send more frames, just wait for responses
        }
        
        // Double-check before frame capture to prevent race conditions
        if (isComplete || stopRequestedRef.current) return;
        
        const frame = await captureFrame(videoRef, canvasRef);
        
        // Check again after async frame capture to prevent race conditions
        if (isComplete || stopRequestedRef.current) return;
        
        if (frame && frame.size > 0) {
          frameNumber++;
          
          setIsProcessing(true);
          try {
            const apiResponse = await sendFrameToAPI(frame, phase, currentSessionId, frameNumber);
            
            // 🎯 HIGHEST PRIORITY: Check for status success (regardless of complete_scan)
            if (apiResponse.status === "success") {
              console.log('🎯 SUCCESS STATUS received! Stopping all detection immediately...');
              console.log(`Status: ${apiResponse.status}, Score: ${apiResponse.score}, Complete Scan: ${apiResponse.complete_scan}`);
              isComplete = true;
              cleanup();
              resolve(apiResponse);
              return;
            }
            
            // 🎯 SECOND PRIORITY: Check for final encrypted response with complete_scan
            if (apiResponse.status === "success" && apiResponse.complete_scan === true) {
              isComplete = true;
              cleanup();
              console.log('🎉 Complete scan with success status received!');
              console.log(`Status: ${apiResponse.status}, Score: ${apiResponse.score}, Complete Scan: ${apiResponse.complete_scan}`);
              resolve(apiResponse); // Let the calling function handle phase transition
              return;
            }

            // SECOND PRIORITY: Check for encrypted_card_data (legacy format)
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

            // General validation state check for all phases - Skip for front/back phases
            if (phase !== 'front' && phase !== 'back' && 
                (apiResponse.message_state === "VALIDATION_FAILED" || 
                 apiResponse.movement_state === "VALIDATION_FAILED")) {
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
              // Log motion progress for debugging
              if (apiResponse.motion_progress) {
                console.log(`🎯 Motion progress detected: ${apiResponse.motion_progress}`);
              }
              
              setFrontScanState({
                framesBuffered: apiResponse.buffer_info?.front_frames_buffered || frameNumber,
                chipDetected: apiResponse.chip || false,
                bankLogoDetected: apiResponse.bank_logo || false,
                physicalCardDetected: apiResponse.physical_card || false,
                canProceedToBack: false,
                motionProgress: apiResponse.motion_progress || null,
                showMotionPrompt: apiResponse.motion_progress === "1/2",
                hideMotionPrompt: apiResponse.motion_progress === "2/2",
                motionPromptTimestamp: apiResponse.motion_progress === "1/2" ? Date.now() : null
              });
            }
            
            const bufferedFrames = phase === 'front' 
              ? apiResponse.buffer_info?.front_frames_buffered 
              : apiResponse.buffer_info?.back_frames_buffered;
            
            // Check validation ONLY after we have sufficient buffered frames
            if (bufferedFrames >= 4) {
              // Check front_valid for front phase (only after 4 frames buffered)
              if (phase === 'front' && apiResponse.front_valid === false) {
                console.log('❌ Front validation failed after 4 frames - front_valid is false');
                isComplete = true;
                cleanup();
                if (handleDetectionFailure) {
                  handleDetectionFailure('Front side validation failed. Please ensure the card is properly positioned and try again.', 'front');
                }
                reject(new Error('Front validation failed - front_valid is false'));
                return;
              }

              // Check back_valid for back phase (only after 4 frames buffered)
              if (phase === 'back' && apiResponse.back_valid === false) {
                console.log('❌ Back validation failed after 4 frames - back_valid is false');
                isComplete = true;
                cleanup();
                if (handleDetectionFailure) {
                  handleDetectionFailure('Back side validation failed. Please ensure the card back is clearly visible and try again.', 'back');
                }
                reject(new Error('Back validation failed - back_valid is false'));
                return;
              }
            }
            
            // 🔄 MODIFIED: For back side, ONLY complete on feature detection if we haven't received complete_scan yet
            // This prevents premature completion before the final encrypted response
            if (phase === 'back' && bufferedFrames >= 4) {
              const { count, detectedFeatures } = countBackSideFeatures(apiResponse);
              
              // Only consider completing based on features if we've reached max frames
              // OR if we've been scanning for a very long time (fallback)
              if (count >= requiredBackSideFeatures && frameNumber >= 25) {
                console.log(`⚠️ Back side features detected after ${frameNumber} frames but continuing to wait for complete_scan response`);
                console.log(`Features found: ${count} (${detectedFeatures.join(', ')})`);
                // Continue processing, don't resolve yet - wait for complete_scan
              }
            } else if (phase === 'front' && bufferedFrames >= 4) {
              // For front side, check if we have chip or bank logo AND physical_card is true
              if ((apiResponse.chip || apiResponse.bank_logo) && apiResponse.physical_card === true) {
                isComplete = true;
                cleanup();
                console.log(`Front side complete - 4 frames buffered with chip: ${apiResponse.chip}, bank_logo: ${apiResponse.bank_logo}, physical_card: ${apiResponse.physical_card}`);
                resolve(apiResponse);
                return;
              }
            } else if (phase !== 'back' && phase !== 'front' && phase !== 'validation' && bufferedFrames >= 4) {
              isComplete = true;
              cleanup();
              console.log(`${phase} side complete - 4 frames buffered`);
              resolve(apiResponse);
              return;
            }
            
            // 📊 FALLBACK: Only stop due to frame limit if we've been waiting a while  
            // This ensures we give time for API responses after sending 10 frames
            if (frameNumber >= maxFrames) {
              // If we just reached the limit, wait 10 seconds for responses
              if (maxFramesReachedTime && (Date.now() - maxFramesReachedTime) < 10000) {
                console.log(`📋 Waiting for responses (${Math.round((Date.now() - maxFramesReachedTime) / 1000)}s since reaching frame limit)...`);
                return; // Keep waiting
              }
              
              console.log(`📋 Reached ${maxFrames} frames and waited - checking if we have sufficient response...`);
              
              if (lastApiResponse) {
                // Check one final time for complete_scan response
                if (lastApiResponse.status === "success" && lastApiResponse.complete_scan === true) {
                  console.log('🎯 Found complete_scan in final check');
                  resolve(lastApiResponse);
                  return;
                }
                
                if (phase === 'back') {
                  const buffered = lastApiResponse.buffer_info?.back_frames_buffered || 0;
                  const { count, detectedFeatures } = countBackSideFeatures(lastApiResponse);
                  
                  if (buffered >= 4 && count < requiredBackSideFeatures) {
                    const missingCount = requiredBackSideFeatures - count;
                    setErrorMessage(`Insufficient back side features detected. Found ${count} out of required ${requiredBackSideFeatures} features (${detectedFeatures.join(', ')}). Please ensure the card's back side is clearly visible showing magnetic strip, signature strip, hologram, and customer service details.`);
                    setCurrentPhase('error');
                    reject(new Error(`Insufficient back side features: only ${count}/${requiredBackSideFeatures} detected`));
                  } else if (buffered < 4) {
                    setErrorMessage('Failed to capture sufficient frames for back side. Please try again.');
                    setCurrentPhase('error');
                    reject(new Error('Insufficient frames captured for back side'));
                  } else {
                    // Features were sufficient but no complete_scan - this should retry
                    console.log('⚠️ Back side features sufficient but no complete_scan received');
                    reject(new Error('Back scan incomplete - complete_scan not received'));
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
        // Check if we're completed/stopped - if so, ignore errors and exit gracefully
        if (isComplete || stopRequestedRef.current) {
          console.log('🛑 Frame processing stopped due to completion state');
          return;
        }
        
        console.error('Error in frame processing:', error);
        
        // Only set processing to false if we're not completed
        if (!isComplete) {
          setIsProcessing(false);
        }
      }
    };
    
    processFrame();
    captureIntervalRef.current = setInterval(processFrame, 1500);
    
    timeoutId = setTimeout(() => {
      if (!isComplete) {
        cleanup();
        if (lastApiResponse) {
          console.log('Timeout reached, checking final conditions...');
          
          // PRIORITY CHECK: Final complete_scan response even on timeout
          if (lastApiResponse.status === "success" && lastApiResponse.complete_scan === true) {
            console.log('🎯 Complete scan found in timeout handler');
            resolve(lastApiResponse);
            return;
          }
          
          // Check for final encrypted response even on timeout
          if (lastApiResponse.encrypted_card_data && lastApiResponse.status) {
            console.log('🎉 Final encrypted response found on timeout');
            resolve(lastApiResponse);
            return;
          }
          
          if (phase === 'back') {
            const bufferedFrames = lastApiResponse.buffer_info?.back_frames_buffered || 0;
            const { count, detectedFeatures } = countBackSideFeatures(lastApiResponse);
            
            if (bufferedFrames >= 4 && count >= requiredBackSideFeatures) {
              // Features sufficient but no complete_scan - should retry front side
              console.log('⚠️ Timeout: Features sufficient but complete_scan not received');
              reject(new Error('Timeout: Back scan incomplete - complete_scan not received'));
              return;
            } else if (bufferedFrames >= 4 && count < requiredBackSideFeatures) {
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
    }, 40000);
  });
};

  return {
    captureAndSendFramesFront,
    captureAndSendFrames,
    captureIntervalRef
  };
};