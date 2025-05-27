// 'use client'
// import React, { useState, useEffect, useRef } from 'react';
// import { Camera, CreditCard, CheckCircle, RotateCcw, Phone } from 'lucide-react';

// const JsonResponseViewer = ({ data }) => {
//   if (!data) return null;

//   return (
//     <div className="mt-8 bg-gray-800 rounded-lg shadow-lg overflow-hidden">
//       <div className="bg-gray-900 px-4 py-3 border-b border-gray-700">
//         <h3 className="text-lg font-medium text-gray-200">API Response JSON</h3>
//       </div>
//       <div className="max-h-96 overflow-y-auto p-4">
//         <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
//           {JSON.stringify(data, null, 2)}
//         </pre>
//       </div>
//     </div>
//   );
// };

// const CardDetectionApp = () => {
//   // State management
//   const [currentPhase, setCurrentPhase] = useState('idle'); // idle, front-countdown, front, flip-card, back-countdown, back, results, error
//   const [detectionActive, setDetectionActive] = useState(false);
//   const [finalOcrResults, setFinalOcrResults] = useState(null);
//   const [isProcessing, setIsProcessing] = useState(false);
//   const [countdown, setCountdown] = useState(0);
//   const [errorMessage, setErrorMessage] = useState('');
//   const [sessionId, setSessionId] = useState('');
  
//   const videoRef = useRef(null);
//   const canvasRef = useRef(null);
//   const capturedFrames = useRef([]);
//   const captureIntervalRef = useRef(null);
//   const countdownIntervalRef = useRef(null);

//   // Initialize camera
//   const initializeCamera = async () => {
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({ 
//         video: { 
//           width: 1280, 
//           height: 720,
//           facingMode: 'environment' // Use back camera on mobile
//         } 
//       });
//       if (videoRef.current) {
//         videoRef.current.srcObject = stream;
//       }
//     } catch (error) {
//       console.error('Camera initialization failed:', error);
//       alert('Camera access is required for card detection');
//     }
//   };

//   useEffect(() => {
//     const videoElement = videoRef.current; // ✅ Capture the ref once
//     initializeCamera();

//     return () => {
//       // Cleanup camera stream
//       if (videoElement?.srcObject) {
//         const tracks = videoElement.srcObject.getTracks();
//         tracks.forEach(track => track.stop());
//       }

//       if (captureIntervalRef.current) {
//         clearInterval(captureIntervalRef.current);
//       }

//       if (countdownIntervalRef.current) {
//         clearInterval(countdownIntervalRef.current);
//       }
//     };
//   }, []);

//   // Countdown function
//   const startCountdown = (onComplete) => {
//     setCountdown(5);
    
//     countdownIntervalRef.current = setInterval(() => {
//       setCountdown((prev) => {
//         if (prev <= 1) {
//           clearInterval(countdownIntervalRef.current);
//           onComplete();
//           return 0;
//         }
//         return prev - 1;
//       });
//     }, 1000);
//   };

//   // Capture frame from video
//   const captureFrame = () => {
//     if (!videoRef.current || !canvasRef.current) return null;
    
//     const video = videoRef.current;
//     const canvas = canvasRef.current;
//     const ctx = canvas.getContext('2d');
    
//     // Set canvas dimensions to match video
//     canvas.width = video.videoWidth || 640;
//     canvas.height = video.videoHeight || 480;
    
//     // Draw the current video frame to canvas
//     ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
//     return new Promise((resolve) => {
//       canvas.toBlob((blob) => {
//         if (blob) {
//           console.log(`Frame captured: ${blob.size} bytes, type: ${blob.type}`);
//           resolve(blob);
//         } else {
//           console.error('Failed to create blob from canvas');
//           resolve(null);
//         }
//       }, 'image/jpeg', 0.9);
//     });
//   };

//   // Send single frame to API
//   const sendFrameToAPI = async (frame, phase, sessionId, frameNumber) => {
//     const maxRetries = 2;
//     let lastError = null;
    
//     for (let attempt = 1; attempt <= maxRetries; attempt++) {
//       try {
//         const formData = new FormData();
        
//         // Add frame with the expected field name
//         formData.append('file', frame, `${phase}_frame_${frameNumber}.jpg`);
//         formData.append('phase', phase);
//         formData.append('session_id', sessionId);
        
//         console.log(`Sending frame ${frameNumber} for ${phase} phase to API (attempt ${attempt})...`);
        
//         const response = await fetch('https://700b-110-39-39-254.ngrok-free.app/detect', {
//           method: 'POST',
//           body: formData,
//           headers: {
//             'ngrok-skip-browser-warning': 'true'
//           }
//         });
        
//         if (!response.ok) {
//           const errorText = await response.text();
//           console.error('API Error Response:', errorText);
//           throw new Error(`API request failed: ${response.status} - ${errorText}`);
//         }
        
//         const result = await response.json();
//         console.log(`API Response for frame ${frameNumber}:`, result);
//         return result;
        
//       } catch (error) {
//         console.error(`API request failed for frame ${frameNumber} (attempt ${attempt}):`, error);
//         lastError = error;
        
//         if (attempt < maxRetries) {
//           console.log(`Retrying frame ${frameNumber} in 1 second...`);
//           await new Promise(resolve => setTimeout(resolve, 1200));
//         }
//       }
//     }
    
//     // If all attempts failed, throw the last error
//     throw lastError;
//   };

//   // Capture and send frames continuously
//   // Capture and send frames continuously
// const captureAndSendFrames = async (phase) => {
//   // Generate session ID if not exists
//   const currentSessionId = sessionId || `session_${Date.now()}`;
//   if (!sessionId) {
//     setSessionId(currentSessionId);
//   }
  
//   let lastApiResponse = null;
//   const maxFrames = 70; // Maximum 70 frames per side (safety limit)
  
//   // Ensure video is ready
//   if (!videoRef.current || videoRef.current.readyState < 2) {
//     throw new Error('Video not ready for capture');
//   }
  
//   return new Promise((resolve, reject) => {
//     let frameNumber = 0;
//     let timeoutId = null;
//     let isComplete = false; // Flag to track if we've got 6 frames
    
//     const cleanup = () => {
//       if (captureIntervalRef.current) {
//         clearInterval(captureIntervalRef.current);
//         captureIntervalRef.current = null;
//       }
//       if (timeoutId) {
//         clearTimeout(timeoutId);
//         timeoutId = null;
//       }
//       setIsProcessing(false);
//     };
    
//     const processFrame = async () => {
//       try {
//         if (isComplete) return; // Don't process more frames if we're done
        
//         const frame = await captureFrame();
        
//         if (frame && frame.size > 0) {
//           frameNumber++;
          
//           // Send frame immediately to API
//           setIsProcessing(true);
//           try {
//             const apiResponse = await sendFrameToAPI(frame, phase, currentSessionId, frameNumber);
            
//             // Store the latest response
//             lastApiResponse = apiResponse;
//             setIsProcessing(false);
            
//             // Check if we have buffered enough frames based on phase
//             const bufferedFrames = phase === 'front' 
//               ? apiResponse.buffer_info?.front_frames_buffered 
//               : apiResponse.buffer_info?.back_frames_buffered;
            
//             if (bufferedFrames >= 6) {
//               isComplete = true;
//               cleanup();
//               console.log(`${phase} side complete - 6 frames buffered`);
//               resolve(apiResponse);
//               return;
//             }
            
//             // Stop if we've reached maximum frames without getting buffer condition
//             if (frameNumber >= maxFrames) {
//               isComplete = true;
//               cleanup();
//               console.log(`Reached maximum ${maxFrames} frames for ${phase} side`);
//               if (lastApiResponse) {
//                 resolve(lastApiResponse);
//               } else {
//                 reject(new Error(`Failed to get sufficient frames after ${maxFrames} attempts`));
//               }
//               return;
//             }
            
//           } catch (apiError) {
//             console.error(`API error for frame ${frameNumber}:`, apiError);
//             setIsProcessing(false);
//             // Continue with next frame
//           }
//         }
//       } catch (error) {
//         console.error('Error in frame processing:', error);
//       }
//     };
    
//     // Start with an immediate frame capture
//     processFrame();
    
//     // Then set up interval for subsequent frames
//     captureIntervalRef.current = setInterval(processFrame, 1000); // Send frames every 1 second
    
//     // Timeout after 45 seconds (15 frames * 3 seconds per frame max)
//     timeoutId = setTimeout(() => {
//       if (!isComplete) {
//         cleanup();
//         if (lastApiResponse) {
//           console.log('Timeout reached, using last response');
//           resolve(lastApiResponse);
//         } else {
//           reject(new Error('Timeout: No successful API responses received'));
//         }
//       }
//     }, 100000);
//   });
// };

//   const startFrontSideDetection = async () => {
//     setCurrentPhase('front-countdown');
//     setErrorMessage('');

//     // Start 5-second countdown before beginning detection
//     startCountdown(async () => {
//       setCurrentPhase('front');
//       setDetectionActive(true);

//       try {
//         // Keep sending frames until front_frames_buffered = 6 (max 15 frames)
//         await captureAndSendFrames('front');
        
//         setDetectionActive(false);
        
//         // Wait for user to flip card and press button (no auto-start)
//         setCurrentPhase('flip-card');
        
//       } catch (error) {
//         console.error('Front side detection failed:', error);
//         setDetectionActive(false);
//         setErrorMessage(`Front side detection failed: ${error.message}`);
//         setCurrentPhase('error');
//       }
//     });
//   };

//   const startBackSideDetection = async () => {
//     setCurrentPhase('back-countdown');
//     setErrorMessage('');

//     // Start 5-second countdown before beginning detection
//     startCountdown(async () => {
//       setCurrentPhase('back');
//       setDetectionActive(true);

//       try {
//         // Keep sending frames until back_frames_buffered = 6
//         const finalResult = await captureAndSendFrames('back');
        
//         setFinalOcrResults(finalResult);
//         setCurrentPhase('results');
//         setDetectionActive(false);
        
//       } catch (error) {
//         console.error('Back side detection failed:', error);
//         setDetectionActive(false);
//         setErrorMessage(`Back side detection failed: ${error.message}`);
//         setCurrentPhase('error');
//       }
//     });
//   };

//   const resetApplication = () => {
//     setCurrentPhase('idle');
//     setDetectionActive(false);
//     setFinalOcrResults(null);
//     setIsProcessing(false);
//     setCountdown(0);
//     setErrorMessage('');
//     setSessionId('');
//     capturedFrames.current = [];
//     if (captureIntervalRef.current) {
//       clearInterval(captureIntervalRef.current);
//     }
//     if (countdownIntervalRef.current) {
//       clearInterval(countdownIntervalRef.current);
//     }
//   };

//   const renderDetectionResults = () => {
//     if (!finalOcrResults) return null;

//     const { final_ocr, confidence, physical_card, chip, bank_logo, magstrip, signstrip, customer_service_detected, hologram } = finalOcrResults;

//     return (
//       <div className="bg-white rounded-lg shadow-lg p-1 sm:p-6 max-w-4xl mx-auto">
//         <h2 className="text-2xl sm:text-3xl font-bold text-center my-4 sm:my-7 text-green-600">
//           Card Detection Complete
//         </h2>
        
//         {/* Final OCR Results */}
//         {final_ocr && (
//           <div className="mb-6 p-3 sm:p-4 bg-green-50 border text-black border-green-200 rounded-lg">
//             <h3 className="text-base sm:text-lg font-semibold mb-3 text-green-700">Final OCR Results</h3>
//             <div className="grid gap-3">
//               {final_ocr.cardholder_name && (
//                 <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 bg-white rounded border gap-2">
//                   <span className="font-medium text-sm sm:text-base">Cardholder Name</span>
//                   <div className="text-left sm:text-right">
//                     <div className="font-mono text-sm sm:text-base">{final_ocr.cardholder_name.value}</div>
//                     <div className="text-xs sm:text-sm text-gray-500">
//                       Confidence: {Math.round(final_ocr.cardholder_name.confidence * 100)}%
//                     </div>
//                   </div>
//                 </div>
//               )}
              
//               {final_ocr.card_number && (
//                 <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 bg-white rounded border gap-2">
//                   <span className="font-medium text-sm sm:text-base">Card Number</span>
//                   <div className="text-left sm:text-right">
//                     <div className="font-mono text-sm sm:text-base">{final_ocr.card_number.value}</div>
//                     <div className="text-xs sm:text-sm text-gray-500">
//                       Confidence: {Math.round(final_ocr.card_number.confidence * 100)}%
//                     </div>
//                   </div>
//                 </div>
//               )}
              
//               {final_ocr.expiry_date && (
//                 <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 bg-white rounded border gap-2">
//                   <span className="font-medium text-sm sm:text-base">Expiry Date</span>
//                   <div className="text-left sm:text-right">
//                     <div className="font-mono text-sm sm:text-base">{final_ocr.expiry_date.value}</div>
//                     <div className="text-xs sm:text-sm text-gray-500">
//                       Confidence: {Math.round(final_ocr.expiry_date.confidence * 100)}%
//                     </div>
//                   </div>
//                 </div>
//               )}
//             </div>
//           </div>
//         )}

//         {/* Detection Summary */}
//         <div className="mb-6 p-3 sm:p-4 bg-blue-50 border text-black border-blue-200 rounded-lg">
//           <h3 className="text-base sm:text-lg font-semibold mb-3 text-blue-700">Detection Summary</h3>
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             <div className="space-y-2 text-xs sm:text-sm">
//               <div className="flex justify-between">
//                 <span>Overall Confidence:</span>
//                 <span className="font-medium">{Math.round(confidence * 100)}%</span>
//               </div>
//               <div className="flex justify-between">
//                 <span>Physical Card:</span>
//                 <span className={physical_card ? 'text-green-600' : 'text-red-600'}>
//                   {physical_card ? 'Detected' : 'Not Detected'}
//                 </span>
//               </div>
//               <div className="flex justify-between">
//                 <span>Chip:</span>
//                 <span className={chip ? 'text-green-600' : 'text-red-600'}>
//                   {chip ? 'Present' : 'Not Present'}
//                 </span>
//               </div>
//               <div className="flex justify-between">
//                 <span>Bank Logo:</span>
//                 <span className={bank_logo ? 'text-green-600' : 'text-red-600'}>
//                   {bank_logo ? 'Detected' : 'Not Detected'}
//                 </span>
//               </div>
//                 <div className="flex justify-between">
//                 <span>Hologram:</span>
//                 <span className={hologram ? 'text-green-600' : 'text-red-600'}>
//                   {hologram ? 'Detected' : 'Not Detected'}
//                 </span>
//               </div>
//             </div>
//             <div className="space-y-2 text-xs sm:text-sm">
//               <div className="flex justify-between">
//                 <span>Magnetic Strip:</span>
//                 <span className={magstrip ? 'text-green-600' : 'text-red-600'}>
//                   {magstrip ? 'Detected' : 'Not Detected'}
//                 </span>
//               </div>
//               <div className="flex justify-between">
//                 <span>Signature Strip:</span>
//                 <span className={signstrip ? 'text-green-600' : 'text-red-600'}>
//                   {signstrip ? 'Present' : 'Not Present'}
//                 </span>
//               </div>
//               <div className="flex justify-between">
//                 <span>Customer Service:</span>
//                 <span className={customer_service_detected ? 'text-green-600' : 'text-red-600'}>
//                   {customer_service_detected ? 'Detected' : 'Not Detected'}
//                 </span>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Raw JSON Response Viewer */}
//         <JsonResponseViewer data={finalOcrResults} />

//         <div className="text-center mt-6">
//           <button
//             onClick={resetApplication}
//             className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base"
//           >
//             Start New Detection
//           </button>
//         </div>
//       </div>
//     );
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-700 to-black p-4 sm:p-4">
//       <div className="container mx-auto max-w-4xl">
//         <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-center mb-4 sm:mb-8 text-gray-100">
//           Card Detection System
//         </h1>

//         {/* Camera View */}
//         <div className="bg-white rounded-lg shadow-lg p-2 sm:p-4 mb-4 sm:mb-6">
//           <div className="relative rounded-lg overflow-hidden aspect-[4/3] sm:aspect-[16/9]">
//             <video
//               ref={videoRef}
//               autoPlay
//               playsInline
//               className="w-full h-full object-cover"
//             />
//             <canvas
//               ref={canvasRef}
//               className="absolute top-0 left-0 w-full h-full"
//               style={{ display: 'none' }}
//             />
            
//             {/* Card Detection Border Overlay - Responsive */}
//             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
//               <div className="relative">
//                 <div 
//                   className="rounded-xl"
//                   style={{
//                     // Responsive dimensions using clamp()
//                     width: 'clamp(200px, 60vw, 350px)',
//                     height: 'clamp(120px, 35vw, 200px)',
//                     transition: 'border-color 0.3s ease'
//                   }}
//                 >
//                   {/* Corner indicators - Responsive */}
//                   <div className="absolute -top-3 -left-1 sm:-left-2 w-4 h-4 sm:w-6 md:w-8 sm:h-6 md:h-8 border-l-2 sm:border-l-4 border-t-2 sm:border-t-4 border-white rounded-tl-lg"></div>
//                   <div className="absolute -top-3 -right-1 sm:-right-2 w-4 h-4 sm:w-6 md:w-8 sm:h-6 md:h-8 border-r-2 sm:border-r-4 border-t-2 sm:border-t-4 border-white rounded-tr-lg"></div>
//                   <div className="absolute -bottom-1 -left-1 sm:-left-2 w-4 h-4 sm:w-6 md:w-8 sm:h-6 md:h-8 border-l-2 sm:border-l-4 border-b-2 sm:border-b-4 border-white rounded-bl-lg"></div>
//                   <div className="absolute -bottom-1 -right-1 sm:-right-2 w-4 h-4 sm:w-6 md:w-8 sm:h-6 md:h-8 border-r-2 sm:border-r-4 border-b-2 sm:border-b-4 border-white rounded-br-lg"></div>
//                 </div>
                
//                 {/* Instruction text below the frame - Responsive */}
//                 <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 sm:mt-4">
//                   <div className="bg-opacity-75 rounded-lg px-2 sm:px-4 py-1 sm:py-2 text-center">
//                     <p className="text-white text-xs sm:text-sm font-medium whitespace-nowrap">
//                       Place card within frame
//                     </p>
//                   </div>
//                 </div>
//               </div>
//             </div>
            
//             {/* Countdown Overlay */}
//             {(currentPhase === 'front-countdown' || currentPhase === 'back-countdown') && countdown > 0 && (
//               <div className="absolute inset-0  bg-opacity-60 flex flex-col items-center justify-center text-white">
//                 <div className=" bg-opacity-75 rounded-lg p-4 sm:p-8 text-center mx-2 sm:mx-4">
//                   <div className="text-6xl sm:text-8xl font-bold mb-4 animate-pulse text-blue-400">
//                     {countdown}
//                   </div>
//                   <p className="text-lg sm:text-xl font-medium mb-2">
//                     {currentPhase === 'front-countdown' ? 'Preparing Front Side Scan' : 'Preparing Back Side Scan'}
//                   </p>
//                   <p className="text-sm sm:text-base text-gray-300">
//                     Position your card in the frame
//                   </p>
//                 </div>
//               </div>
//             )}
            
//             {/* Detection Overlay */}
//             {detectionActive && (
//               <div className="absolute inset-0 bg-opacity-60 flex flex-col items-center justify-center text-white">
//                 <div className="bg-opacity-75 rounded-lg p-4 sm:p-8 text-center mx-2 sm:mx-4">
//                   <div className="animate-spin w-8 h-8 sm:w-12 md:w-16 sm:h-12 md:h-16 border-2 sm:border-4 border-white border-t-transparent rounded-full mx-auto mb-3 sm:mb-6"></div>
//                   <p className="text-base sm:text-xl font-medium mb-2 sm:mb-4">
//                     {currentPhase === 'front' ? 'Scanning Front Side' : 'Scanning Back Side'}
//                   </p>
                  
//                   {isProcessing && (
//                     <p className="text-green-400 text-xs sm:text-sm">
//                       Processing
//                     </p>
//                   )}
//                 </div>
//               </div>
//             )}
//           </div>
//         </div>

//         {/* Control Panel */}
//         <div className="bg-white rounded-lg shadow-lg p-4 sm:p-8">
//           {currentPhase === 'idle' && (
//             <div className="text-center">
//               <CreditCard className="w-12 h-12 sm:w-16 md:w-20 sm:h-16 md:h-20 text-blue-500 mx-auto mb-3 sm:mb-6" />
//               <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-6 text-black">Ready to Scan Card</h2>
//               <p className="text-sm sm:text-base lg:text-lg text-gray-600 mb-4 sm:mb-8 max-w-2xl mx-auto px-2">
//                 Place the front side of your card in the camera view and click start. 
//               </p>
//               <button
//                 onClick={startFrontSideDetection}
//                 className="bg-blue-600 hover:bg-blue-700 text-white px-6 sm:px-10 py-3 sm:py-4 rounded-lg font-medium text-base sm:text-xl transition-colors flex items-center mx-auto"
//               >
//                 <Camera className="w-4 h-4 sm:w-6 sm:h-6 mr-2 sm:mr-3" />
//                 Start Front Scan
//               </button>
//             </div>
//           )}

//           {currentPhase === 'front-countdown' && (
//             <div className="text-center">
//               <div className="w-12 h-12 sm:w-16 md:w-20 sm:h-16 md:h-20 text-blue-500 mx-auto mb-3 sm:mb-6 flex items-center justify-center">
//                 <Camera className="w-full h-full" />
//               </div>
//               <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-6 text-blue-600">Get Ready!</h2>
//               <p className="text-sm sm:text-base lg:text-lg text-gray-600 mb-4 sm:mb-8 max-w-2xl mx-auto px-2">
//                 Front side scanning will begin in <span className="font-bold text-blue-600">{countdown}</span> seconds. Make sure your card is positioned in the frame.
//               </p>
//             </div>
//           )}

//           {currentPhase === 'flip-card' && (
//             <div className="text-center">
//               <RotateCcw className="w-12 h-12 sm:w-16 md:w-20 sm:h-16 md:h-20 text-green-500 mx-auto mb-3 sm:mb-6" />
//               <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-6 text-green-600">Front Side Complete!</h2>
//               <p className="text-sm sm:text-base lg:text-lg text-gray-600 mb-4 sm:mb-8 max-w-2xl mx-auto px-2">
//                 Please flip your card to show the back side and click the button below to scan the back.
//               </p>
//               <button
//                 onClick={startBackSideDetection}
//                 className="bg-purple-600 hover:bg-purple-700 text-white px-6 sm:px-10 py-3 sm:py-4 rounded-lg font-medium text-base sm:text-xl transition-colors flex items-center mx-auto"
//               >
//                 <Camera className="w-4 h-4 sm:w-6 sm:h-6 mr-2 sm:mr-3" />
//                 Start Back Side Scan
//               </button>
//             </div>
//           )}

//           {currentPhase === 'back-countdown' && (
//             <div className="text-center">
//               <div className="w-12 h-12 sm:w-16 md:w-20 sm:h-16 md:h-20 text-purple-500 mx-auto mb-3 sm:mb-6 flex items-center justify-center">
//                 <Camera className="w-full h-full" />
//               </div>
//               <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-6 text-purple-600">Get Ready!</h2>
//               <p className="text-sm sm:text-base lg:text-lg text-gray-600 mb-4 sm:mb-8 max-w-2xl mx-auto px-2">
//                 Back side scanning will begin in <span className="font-bold text-purple-600">{countdown}</span> seconds. Make sure your card is positioned in the frame.
//               </p>
//             </div>
//           )}

//           {currentPhase === 'results' && renderDetectionResults()}

//           {currentPhase === 'error' && (
//             <div className="text-center">
//               <div className="w-12 h-12 sm:w-16 md:w-20 sm:h-16 md:h-20 text-red-500 mx-auto mb-3 sm:mb-6 flex items-center justify-center">
//                 <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20">
//                   <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
//                 </svg>
//               </div>
//               <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-6 text-red-600">Detection Failed</h2>
//               <p className="text-sm sm:text-base lg:text-lg text-gray-600 mb-4 sm:mb-8 max-w-2xl mx-auto px-2">
//                 {errorMessage}
//               </p>
//               <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
//                 <button
//                   onClick={resetApplication}
//                   className="bg-blue-600 hover:bg-blue-700 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base"
//                 >
//                   Try Again
//                 </button>
//                 <button
//                   onClick={() => {
//                     setCurrentPhase('idle');
//                     setErrorMessage('');
//                   }}
//                   className="bg-gray-600 hover:bg-gray-700 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base"
//                 >
//                   Start Over
//                 </button>
//               </div>
//             </div>
//           )}
//         </div>

//         {/* Status Information */}
//         <div className="mt-4 sm:mt-6 bg-white rounded-lg shadow-lg p-3 sm:p-4">
//           <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs sm:text-sm text-gray-600 gap-2 sm:gap-0">
//             <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
//               <span className="font-medium">Phase: {currentPhase.replace('-', ' ').toUpperCase()}</span>
//               {sessionId && (
//                 <span className="font-medium">Session: {sessionId.slice(-8)}</span>
//               )}
//             </div>
//             <div className="flex items-center gap-3">
//               <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${detectionActive ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
//               <span className="font-medium">{detectionActive ? 'Processing...' : 'Ready'}</span>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default CardDetectionApp;





'use client'
import React, { useState, useEffect, useRef } from 'react';
import { Camera, CreditCard, CheckCircle, RotateCcw, Phone, Shield, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

const JsonResponseViewer = ({ data }) => {
  if (!data) return null;

  return (
    <div className="mt-8 bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      <div className="bg-gray-900 px-4 py-3 border-b border-gray-700">
        <h3 className="text-lg font-medium text-gray-200">API Response JSON</h3>
      </div>
      <div className="max-h-96 overflow-y-auto p-4">
        <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </div>
  );
};

const MovementIndicator = ({ movementState, movementMessage }) => {
  const getMovementIcon = () => {
    switch(movementState) {
      case 'MOVE_UP':
        return <ArrowUp className="w-8 h-8 sm:w-12 sm:h-12 text-blue-400 animate-bounce" />;
      case 'MOVE_DOWN':
        return <ArrowDown className="w-8 h-8 sm:w-12 sm:h-12 text-blue-400 animate-bounce" />;
      case 'MOVE_LEFT':
        return <ArrowLeft className="w-8 h-8 sm:w-12 sm:h-12 text-blue-400 animate-pulse" />;
      case 'MOVE_RIGHT':
        return <ArrowRight className="w-8 h-8 sm:w-12 sm:h-12 text-blue-400 animate-pulse" />;
      default:
        return <CheckCircle className="w-8 h-8 sm:w-12 sm:h-12 text-green-400" />;
    }
  };

  return (
    <div className="absolute inset-0 bg-opacity-60 flex flex-col items-center justify-center text-white">
      <div className=" bg-opacity-75 rounded-lg p-4 sm:p-8 text-center mx-2 sm:mx-4">
        <div className="mb-4">
          {getMovementIcon()}
        </div>
        <p className="text-lg sm:text-xl font-medium mb-2">Card Validation</p>
        <p className="text-sm sm:text-base text-gray-300 mb-4">
          {movementMessage || 'Position your card correctly'}
        </p>
        <div className="w-6 h-6 sm:w-8 sm:h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
      </div>
    </div>
  );
};

const CardDetectionApp = () => {
  // State management
  const [currentPhase, setCurrentPhase] = useState('idle'); // idle, validation, front-countdown, front, flip-card, back-countdown, back, results, error
  const [detectionActive, setDetectionActive] = useState(false);
  const [finalOcrResults, setFinalOcrResults] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [validationState, setValidationState] = useState({
    physicalCard: false,
    movementState: null,
    movementMessage: '',
    validationComplete: false
  });
  const [frontScanState, setFrontScanState] = useState({
    framesBuffered: 0,
    chipDetected: false,
    canProceedToBack: false
  });
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const capturedFrames = useRef([]);
  const captureIntervalRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const validationIntervalRef = useRef(null);

  // Initialize camera
  const initializeCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 1280, 
          height: 720,
          facingMode: 'environment' // Use back camera on mobile
        } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Camera initialization failed:', error);
      alert('Camera access is required for card detection');
    }
  };

  useEffect(() => {
    const videoElement = videoRef.current; // ✅ Capture the ref once
    initializeCamera();

    return () => {
      // Cleanup camera stream
      if (videoElement?.srcObject) {
        const tracks = videoElement.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }

      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
      }

      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }

      if (validationIntervalRef.current) {
        clearInterval(validationIntervalRef.current);
      }
    };
  }, []);

  // Countdown function
  const startCountdown = (onComplete) => {
    setCountdown(5);
    
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Capture frame from video
  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return null;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    // Draw the current video frame to canvas
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

  // Send single frame to API
  const sendFrameToAPI = async (frame, phase, sessionId, frameNumber) => {
    const maxRetries = 2;
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const formData = new FormData();
        
        // Add frame with the expected field name
        formData.append('file', frame, `${phase}_frame_${frameNumber}.jpg`);
        formData.append('phase', phase);
        formData.append('session_id', sessionId);
        
        console.log(`Sending frame ${frameNumber} for ${phase} phase to API (attempt ${attempt})...`);
        
        const response = await fetch('https://cardapp.hopto.org/detect', {
          method: 'POST',
          body: formData,
          headers: {
            'ngrok-skip-browser-warning': 'true'
          }
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('API Error Response:', errorText);
          throw new Error(`API request failed: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        console.log(`API Response for frame ${frameNumber}:`, result);
        return result;
        
      } catch (error) {
        console.error(`API request failed for frame ${frameNumber} (attempt ${attempt}):`, error);
        lastError = error;
        
        if (attempt < maxRetries) {
          console.log(`Retrying frame ${frameNumber} in 1 second...`);
          await new Promise(resolve => setTimeout(resolve, 1200));
        }
      }
    }
    
    // If all attempts failed, throw the last error
    throw lastError;
  };

  // Card validation process - only check movements and physical card
  const startCardValidation = async () => {
    setCurrentPhase('validation');
    setErrorMessage('');
    setValidationState({
      physicalCard: false,
      movementState: null,
      movementMessage: 'Starting validation...',
      validationComplete: false
    });

    // Generate session ID
    const currentSessionId = `session_${Date.now()}`;
    setSessionId(currentSessionId);

    let frameNumber = 0;
    let validationComplete = false;
    const maxValidationTime = 50000; // 30 seconds max
    const startTime = Date.now();

    // Ensure video is ready
    if (!videoRef.current || videoRef.current.readyState < 2) {
      setErrorMessage('Video not ready for capture');
      setCurrentPhase('error');
      return;
    }

    const processValidationFrame = async () => {
      try {
        if (validationComplete || (Date.now() - startTime) > maxValidationTime) {
          return;
        }

        const frame = await captureFrame();
        if (!frame || frame.size === 0) {
          return;
        }

        frameNumber++;
        setIsProcessing(true);

        const apiResponse = await sendFrameToAPI(frame, 'validation', currentSessionId, frameNumber);
        
        // Update validation state based on API response - only check physical_card and movements
        const newValidationState = {
          physicalCard: apiResponse.physical_card || false,
          movementState: apiResponse.movement_state || null,
          movementMessage: apiResponse.movement_message || '',
          validationComplete: apiResponse.physical_card || false // Only need physical card detection
        };

        setValidationState(newValidationState);
        setIsProcessing(false);

        // Check if validation is complete (only physical card needed)
        if (newValidationState.validationComplete) {
          validationComplete = true;
          if (validationIntervalRef.current) {
            clearInterval(validationIntervalRef.current);
          }
          
          // Wait a moment to show success, then show front scan button
          setTimeout(() => {
            setCurrentPhase('ready-for-front');
          }, 2000);
        }

      } catch (error) {
        console.error('Validation frame processing error:', error);
        setIsProcessing(false);
      }
    };

    // Start validation frame processing
    processValidationFrame(); // Initial frame
    validationIntervalRef.current = setInterval(processValidationFrame, 1200); // Every second

    // Timeout for validation
    setTimeout(() => {
      if (!validationComplete) {
        if (validationIntervalRef.current) {
          clearInterval(validationIntervalRef.current);
        }
        setErrorMessage('Card validation timeout. Please ensure your card is clearly visible and try again.');
        setCurrentPhase('error');
      }
    }, maxValidationTime);
  };

  // Capture and send frames continuously for front side with chip detection
  const captureAndSendFramesFront = async (phase) => {
    // Use existing session ID from validation
    const currentSessionId = sessionId || `session_${Date.now()}`;
    if (!sessionId) {
      setSessionId(currentSessionId);
    }
    
    let lastApiResponse = null;
    const maxFrames = 70; // Maximum 70 frames per side (safety limit)
    
    // Ensure video is ready
    if (!videoRef.current || videoRef.current.readyState < 2) {
      throw new Error('Video not ready for capture');
    }
    
    return new Promise((resolve, reject) => {
      let frameNumber = 0;
      let timeoutId = null;
      let isComplete = false; // Flag to track if we've got required conditions
      
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
          if (isComplete) return; // Don't process more frames if we're done
          
          const frame = await captureFrame();
          
          if (frame && frame.size > 0) {
            frameNumber++;
            
            // Send frame immediately to API
            setIsProcessing(true);
            try {
              const apiResponse = await sendFrameToAPI(frame, phase, currentSessionId, frameNumber);
              
              // Store the latest response
              lastApiResponse = apiResponse;
              setIsProcessing(false);
              
              // Check both conditions: 6 frames buffered AND chip detected
              const bufferedFrames = apiResponse.buffer_info?.front_frames_buffered || 0;
              const chipDetected = apiResponse.chip || false;
              
              // Update front scan state
              setFrontScanState({
                framesBuffered: bufferedFrames,
                chipDetected: chipDetected,
                canProceedToBack: bufferedFrames >= 6 && chipDetected
              });
              
              // Complete only when both conditions are met
              if (bufferedFrames >= 6 && chipDetected) {
                isComplete = true;
                cleanup();
                console.log(`Front side complete - 6 frames buffered AND chip detected`);
                resolve(apiResponse);
                return;
              }
              
              // Stop if we've reached maximum frames without getting both conditions
              if (frameNumber >= maxFrames) {
                isComplete = true;
                cleanup();
                console.log(`Reached maximum ${maxFrames} frames for ${phase} side`);
                if (lastApiResponse) {
                  // Check if we at least have 6 frames, even without chip
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
              // Continue with next frame
            }
          }
        } catch (error) {
          console.error('Error in frame processing:', error);
        }
      };
      
      // Start with an immediate frame capture
      processFrame();
      
      // Then set up interval for subsequent frames
      captureIntervalRef.current = setInterval(processFrame, 1200); // Send frames every 1 second
      
      // Timeout after 100 seconds
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

  // Regular capture function for back side (unchanged)
  const captureAndSendFrames = async (phase) => {
    // Use existing session ID from validation
    const currentSessionId = sessionId || `session_${Date.now()}`;
    if (!sessionId) {
      setSessionId(currentSessionId);
    }
    
    let lastApiResponse = null;
    const maxFrames = 70; // Maximum 70 frames per side (safety limit)
    
    // Ensure video is ready
    if (!videoRef.current || videoRef.current.readyState < 2) {
      throw new Error('Video not ready for capture');
    }
    
    return new Promise((resolve, reject) => {
      let frameNumber = 0;
      let timeoutId = null;
      let isComplete = false; // Flag to track if we've got 6 frames
      
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
          if (isComplete) return; // Don't process more frames if we're done
          
          const frame = await captureFrame();
          
          if (frame && frame.size > 0) {
            frameNumber++;
            
            // Send frame immediately to API
            setIsProcessing(true);
            try {
              const apiResponse = await sendFrameToAPI(frame, phase, currentSessionId, frameNumber);
              
              // Store the latest response
              lastApiResponse = apiResponse;
              setIsProcessing(false);
              
              // Check if we have buffered enough frames based on phase
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
              
              // Stop if we've reached maximum frames without getting buffer condition
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
              // Continue with next frame
            }
          }
        } catch (error) {
          console.error('Error in frame processing:', error);
        }
      };
      
      // Start with an immediate frame capture
      processFrame();
      
      // Then set up interval for subsequent frames
      captureIntervalRef.current = setInterval(processFrame, 1200); // Send frames every 1 second
      
      // Timeout after 45 seconds (15 frames * 3 seconds per frame max)
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

  const startFrontSideDetection = async () => {
    // Reset front scan state
    setFrontScanState({
      framesBuffered: 0,
      chipDetected: false,
      canProceedToBack: false
    });

    setCurrentPhase('front-countdown');
    setErrorMessage('');

    // Start 5-second countdown before beginning detection
    startCountdown(async () => {
      setCurrentPhase('front');
      setDetectionActive(true);

      try {
        // Keep sending frames until both conditions are met: front_frames_buffered = 6 AND chip = true
        await captureAndSendFramesFront('front');
        
        setDetectionActive(false);
        
        // Wait for user to flip card and press button (no auto-start)
        setCurrentPhase('ready-for-back');
        
      } catch (error) {
        console.error('Front side detection failed:', error);
        setDetectionActive(false);
        setErrorMessage(`Front side detection failed: ${error.message}`);
        setCurrentPhase('error');
      }
    });
  };

  const startBackSideDetection = async () => {
    setCurrentPhase('back-countdown');
    setErrorMessage('');

    // Start 5-second countdown before beginning detection
    startCountdown(async () => {
      setCurrentPhase('back');
      setDetectionActive(true);

      try {
        // Keep sending frames until back_frames_buffered = 6
        const finalResult = await captureAndSendFrames('back');
        
        setFinalOcrResults(finalResult);
        setCurrentPhase('results');
        setDetectionActive(false);
        
      } catch (error) {
        console.error('Back side detection failed:', error);
        setDetectionActive(false);
        setErrorMessage(`Back side detection failed: ${error.message}`);
        setCurrentPhase('error');
      }
    });
  };

  const resetApplication = () => {
    setCurrentPhase('idle');
    setDetectionActive(false);
    setFinalOcrResults(null);
    setIsProcessing(false);
    setCountdown(0);
    setErrorMessage('');
    setSessionId('');
    setValidationState({
      physicalCard: false,
      movementState: null,
      movementMessage: '',
      validationComplete: false
    });
    setFrontScanState({
      framesBuffered: 0,
      chipDetected: false,
      canProceedToBack: false
    });
    capturedFrames.current = [];
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    if (validationIntervalRef.current) {
      clearInterval(validationIntervalRef.current);
    }
  };

  const renderDetectionResults = () => {
    if (!finalOcrResults) return null;

    const { final_ocr, confidence, physical_card, chip, bank_logo, magstrip, signstrip, customer_service_detected, hologram } = finalOcrResults;

    return (
      <div className="bg-white rounded-lg shadow-lg p-1 sm:p-6 max-w-4xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-center my-4 sm:my-7 text-green-600">
          Card Detection Complete
        </h2>
        
        {/* Final OCR Results */}
        {final_ocr && (
          <div className="mb-6 p-3 sm:p-4 bg-green-50 border text-black border-green-200 rounded-lg">
            <h3 className="text-base sm:text-lg font-semibold mb-3 text-green-700">Final OCR Results</h3>
            <div className="grid gap-3">
              {final_ocr.cardholder_name && (
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 bg-white rounded border gap-2">
                  <span className="font-medium text-sm sm:text-base">Cardholder Name</span>
                  <div className="text-left sm:text-right">
                    <div className="font-mono text-sm sm:text-base">{final_ocr.cardholder_name.value}</div>
                    <div className="text-xs sm:text-sm text-gray-500">
                      Confidence: {Math.round(final_ocr.cardholder_name.confidence * 100)}%
                    </div>
                  </div>
                </div>
              )}
              
              {final_ocr.card_number && (
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 bg-white rounded border gap-2">
                  <span className="font-medium text-sm sm:text-base">Card Number</span>
                  <div className="text-left sm:text-right">
                    <div className="font-mono text-sm sm:text-base">{final_ocr.card_number.value}</div>
                    <div className="text-xs sm:text-sm text-gray-500">
                      Confidence: {Math.round(final_ocr.card_number.confidence * 100)}%
                    </div>
                  </div>
                </div>
              )}
              
              {final_ocr.expiry_date && (
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 bg-white rounded border gap-2">
                  <span className="font-medium text-sm sm:text-base">Expiry Date</span>
                  <div className="text-left sm:text-right">
                    <div className="font-mono text-sm sm:text-base">{final_ocr.expiry_date.value}</div>
                    <div className="text-xs sm:text-sm text-gray-500">
                      Confidence: {Math.round(final_ocr.expiry_date.confidence * 100)}%
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Detection Summary */}
        <div className="mb-6 p-3 sm:p-4 bg-blue-50 border text-black border-blue-200 rounded-lg">
          <h3 className="text-base sm:text-lg font-semibold mb-3 text-blue-700">Detection Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between">
                <span>Overall Confidence:</span>
                <span className="font-medium">{Math.round(confidence * 100)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Physical Card:</span>
                <span className={physical_card ? 'text-green-600' : 'text-red-600'}>
                  {physical_card ? 'Detected' : 'Not Detected'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Chip:</span>
                <span className={chip ? 'text-green-600' : 'text-red-600'}>
                  {chip ? 'Present' : 'Not Present'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Bank Logo:</span>
                <span className={bank_logo ? 'text-green-600' : 'text-red-600'}>
                  {bank_logo ? 'Detected' : 'Not Detected'}
                </span>
              </div>
                <div className="flex justify-between">
                <span>Hologram:</span>
                <span className={hologram ? 'text-green-600' : 'text-red-600'}>
                  {hologram ? 'Detected' : 'Not Detected'}
                </span>
              </div>
            </div>
            <div className="space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between">
                <span>Magnetic Strip:</span>
                <span className={magstrip ? 'text-green-600' : 'text-red-600'}>
                  {magstrip ? 'Detected' : 'Not Detected'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Signature Strip:</span>
                <span className={signstrip ? 'text-green-600' : 'text-red-600'}>
                  {signstrip ? 'Present' : 'Not Present'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Customer Service:</span>
                <span className={customer_service_detected ? 'text-green-600' : 'text-red-600'}>
                  {customer_service_detected ? 'Detected' : 'Not Detected'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Raw JSON Response Viewer */}
        <JsonResponseViewer data={finalOcrResults} />

        <div className="text-center mt-6">
          <button
            onClick={resetApplication}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base"
          >
            Start New Detection
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-700 to-black p-4 sm:p-4">
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-xl bg-white p-2 sm:text-2xl lg:text-3xl mb-5  rounded-md font-bold text-center mb-4 sm:mb-8 text-gray-900">
          Card Detection System
        </h1>

        {/* Camera View */}
        <div className="bg-white rounded-lg shadow-lg p-2 sm:p-4 mb-4 sm:mb-6">
          <div className="relative rounded-lg overflow-hidden aspect-[4/3] sm:aspect-[16/9]">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full"
              style={{ display: 'none' }}
            />
            
            {/* Card Detection Border Overlay - Updated for mobile */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative">
                <div 
                  className="rounded-xl"
                  style={{
                    // Updated responsive dimensions - wider and taller on mobile
                    width: 'clamp(250px, 70vw, 350px)',
                    height: 'clamp(150px, 42vw, 200px)',
                    transition: 'border-color 0.3s ease'
                  }}
                >
                  {/* Corner indicators - Responsive */}
                  <div className="absolute -top-3 -left-1 sm:-left-2 w-4 h-4 sm:w-6 md:w-8 sm:h-6 md:h-8 border-l-2 sm:border-l-4 border-t-2 sm:border-t-4 border-white rounded-tl-lg"></div>
                  <div className="absolute -top-3 -right-1 sm:-right-2 w-4 h-4 sm:w-6 md:w-8 sm:h-6 md:h-8 border-r-2 sm:border-r-4 border-t-2 sm:border-t-4 border-white rounded-tr-lg"></div>
                  <div className="absolute -bottom-1 -left-1 sm:-left-2 w-4 h-4 sm:w-6 md:w-8 sm:h-6 md:h-8 border-l-2 sm:border-l-4 border-b-2 sm:border-b-4 border-white rounded-bl-lg"></div>
                  <div className="absolute -bottom-1 -right-1 sm:-right-2 w-4 h-4 sm:w-6 md:w-8 sm:h-6 md:h-8 border-r-2 sm:border-r-4 border-b-2 sm:border-b-4 border-white rounded-br-lg"></div>
                </div>
              </div>
            </div>

            {/* Instruction text inside video with black background */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
              <div className="bg-black bg-opacity-75 rounded-lg px-3 sm:px-4 py-2 sm:py-2 text-center">
                <p className="text-white text-xs sm:text-sm font-medium whitespace-nowrap">
                  Place card within frame
                </p>
              </div>
            </div>

            {/* Validation Overlay */}
            {currentPhase === 'validation' && (
              <MovementIndicator 
                movementState={validationState.movementState}
                movementMessage={validationState.movementMessage}
              />
            )}
            
            {/* Countdown Overlay */}
            {(currentPhase === 'front-countdown' || currentPhase === 'back-countdown') && countdown > 0 && (
              <div className="absolute inset-0  bg-opacity-60 flex flex-col items-center justify-center text-white">
                <div className=" bg-opacity-75 rounded-lg p-4 sm:p-8 text-center mx-2 sm:mx-4">
                  <div className="text-6xl sm:text-8xl font-bold mb-4 animate-pulse text-blue-400">
                    {countdown}
                  </div>
                  <p className="text-lg sm:text-xl font-medium mb-2">
                    {currentPhase === 'front-countdown' ? 'Preparing Front Side Scan' : 'Preparing Back Side Scan'}
                  </p>
                  <p className="text-sm sm:text-base text-gray-300">
                    Position your card in the frame
                  </p>
                </div>
              </div>
            )}
            
            {/* Detection Overlay */}
            {detectionActive && (
              <div className="absolute inset-0 bg-opacity-60 flex flex-col items-center justify-center text-white">
                <div className="bg-opacity-75 rounded-lg p-4 sm:p-8 text-center mx-2 sm:mx-4">
                  <div className="animate-spin w-8 h-8 sm:w-12 md:w-16 sm:h-12 md:h-16 border-2 sm:border-4 border-white border-t-transparent rounded-full mx-auto mb-3 sm:mb-6"></div>
                  <p className="text-base sm:text-xl font-medium mb-2 sm:mb-4">
                    {currentPhase === 'front' ? 'Scanning Front Side' : 'Scanning Back Side'}
                  </p>
                  
                  {/* Front side specific status */}
                  {/* {currentPhase === 'front' && (
                    <div className="text-xs sm:text-sm space-y-1">
                      <p className={frontScanState.framesBuffered >= 6 ? 'text-green-400' : 'text-yellow-400'}>
                        Frames: {frontScanState.framesBuffered}/6
                      </p>
                      <p className={frontScanState.chipDetected ? 'text-green-400' : 'text-red-400'}>
                        Chip: {frontScanState.chipDetected ? 'Detected' : 'Not Detected'}
                      </p>
                    </div>
                  )} */}
                  
                  {isProcessing && (
                    <p className="text-green-400 text-xs sm:text-sm">
                      Processing
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Control Panel */}
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-8">
          {currentPhase === 'idle' && (
            <div className="text-center">
              <Shield className="w-12 h-12 sm:w-16 md:w-20 sm:h-16 md:h-20 text-blue-500 mx-auto mb-3 sm:mb-6" />
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-6 text-black">Ready to Validate Card</h2>
              <p className="text-sm sm:text-base lg:text-lg text-gray-600 mb-4 sm:mb-8 max-w-2xl mx-auto px-2">
                First, we will validate your card to ensure it is properly positioned and recognized as a physical card.
              </p>
              <button
                onClick={startCardValidation}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 sm:px-10 py-3 sm:py-4 rounded-lg font-medium text-base sm:text-xl transition-colors flex items-center mx-auto"
              >
                <Shield className="w-4 h-4 sm:w-6 sm:h-6 mr-2 sm:mr-3" />
                Start Card Validation
              </button>
            </div>
          )}

          {currentPhase === 'validation' && (
            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 md:w-20 sm:h-16 md:h-20 text-blue-500 mx-auto mb-3 sm:mb-6 flex items-center justify-center">
                <Shield className="w-full h-full" />
              </div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-6 text-blue-600">Validating Card</h2>
              
              {/* Validation Status - Only Physical Card */}
              <div className="mb-6 p-3 sm:p-4 bg-blue-50 border text-black border-blue-200 rounded-lg">
                <div className="flex justify-center items-center">
                  <div className="flex justify-between items-center w-64">
                    <span className="font-medium">Physical Card:</span>
                    <span className={validationState.physicalCard ? 'text-green-600' : 'text-red-600'}>
                      {validationState.physicalCard ? '✓ Detected' : '✗ Not Detected'}
                    </span>
                  </div>
                </div>
              </div>

              {validationState.movementMessage && (
                <p className="text-sm sm:text-base lg:text-lg text-gray-600 mb-4 sm:mb-8 max-w-2xl mx-auto px-2">
                  {validationState.movementMessage}
                </p>
              )}

              {validationState.validationComplete && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-700 font-medium">
                    ✓ Card validation complete! Ready for front side scan.
                  </p>
                </div>
              )}
            </div>
          )}

          {currentPhase === 'ready-for-front' && (
            <div className="text-center">
              <CheckCircle className="w-12 h-12 sm:w-16 md:w-20 sm:h-16 md:h-20 text-green-500 mx-auto mb-3 sm:mb-6" />
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-6 text-green-600">Validation Complete!</h2>
              <p className="text-sm sm:text-base lg:text-lg text-gray-600 mb-4 sm:mb-8 max-w-2xl mx-auto px-2">
                Physical card detected successfully. Click the button below to start scanning the front side of your card.
              </p>
              <button
                onClick={startFrontSideDetection}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 sm:px-10 py-3 sm:py-4 rounded-lg font-medium text-base sm:text-xl transition-colors flex items-center mx-auto"
              >
                <Camera className="w-4 h-4 sm:w-6 sm:h-6 mr-2 sm:mr-3" />
                Start Front Side Scan
              </button>
            </div>
          )}

          {currentPhase === 'front-countdown' && (
            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 md:w-20 sm:h-16 md:h-20 text-blue-500 mx-auto mb-3 sm:mb-6 flex items-center justify-center">
                <Camera className="w-full h-full" />
              </div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-6 text-blue-600">Get Ready!</h2>
              <p className="text-sm sm:text-base lg:text-lg text-gray-600 mb-4 sm:mb-8 max-w-2xl mx-auto px-2">
                Front side scanning will begin in <span className="font-bold text-blue-600">{countdown}</span> seconds. Make sure your card is positioned in the frame.
              </p>
            </div>
          )}

          {currentPhase === 'front' && (
            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 md:w-20 sm:h-16 md:h-20 text-blue-500 mx-auto mb-3 sm:mb-6 flex items-center justify-center">
                <Camera className="w-full h-full" />
              </div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-6 text-blue-600">Scanning Front Side</h2>
              
              {/* Front Scan Status */}
              {/* <div className="mb-6 p-3 sm:p-4 bg-blue-50 border text-black border-blue-200 rounded-lg">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Frames Captured:</span>
                    <span className={frontScanState.framesBuffered >= 6 ? 'text-green-600' : 'text-blue-600'}>
                      {frontScanState.framesBuffered}/6
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Chip Detection:</span>
                    <span className={frontScanState.chipDetected ? 'text-green-600' : 'text-red-600'}>
                      {frontScanState.chipDetected ? '✓ Detected' : '✗ Not Detected'}
                    </span>
                  </div>
                </div>
              </div> */}

              <p className="text-sm sm:text-base lg:text-lg text-gray-600 mb-4 sm:mb-8 max-w-2xl mx-auto px-2">
                Please ensure the chip is clearly visible. We need both 6 frames and chip detection to proceed.
              </p>
            </div>
          )}

          {currentPhase === 'ready-for-back' && (
            <div className="text-center">
              <RotateCcw className="w-12 h-12 sm:w-16 md:w-20 sm:h-16 md:h-20 text-green-500 mx-auto mb-3 sm:mb-6" />
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-6 text-green-600">Front Side Complete!</h2>
              <p className="text-sm sm:text-base lg:text-lg text-gray-600 mb-4 sm:mb-8 max-w-2xl mx-auto px-2">
                Chip detected and sufficient frames captured! Please flip your card to show the back side and click the button below to scan the back.
              </p>
              <button
                onClick={startBackSideDetection}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 sm:px-10 py-3 sm:py-4 rounded-lg font-medium text-base sm:text-xl transition-colors flex items-center mx-auto"
              >
                <Camera className="w-4 h-4 sm:w-6 sm:h-6 mr-2 sm:mr-3" />
                Start Back Side Scan
              </button>
            </div>
          )}

          {currentPhase === 'back-countdown' && (
            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 md:w-20 sm:h-16 md:h-20 text-purple-500 mx-auto mb-3 sm:mb-6 flex items-center justify-center">
                <Camera className="w-full h-full" />
              </div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-6 text-purple-600">Get Ready!</h2>
              <p className="text-sm sm:text-base lg:text-lg text-gray-600 mb-4 sm:mb-8 max-w-2xl mx-auto px-2">
                Back side scanning will begin in <span className="font-bold text-purple-600">{countdown}</span> seconds. Make sure your card is positioned in the frame.
              </p>
            </div>
          )}

          {currentPhase === 'results' && renderDetectionResults()}

          {currentPhase === 'error' && (
            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 md:w-20 sm:h-16 md:h-20 text-red-500 mx-auto mb-3 sm:mb-6 flex items-center justify-center">
                <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-6 text-red-600">Detection Failed</h2>
              <p className="text-sm sm:text-base lg:text-lg text-gray-600 mb-4 sm:mb-8 max-w-2xl mx-auto px-2">
                {errorMessage}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                <button
                  onClick={resetApplication}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base"
                >
                  Try Again
                </button>
                <button
                  onClick={() => {
                    setCurrentPhase('idle');
                    setErrorMessage('');
                  }}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base"
                >
                  Start Over
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Status Information */}
        <div className="mt-4 sm:mt-6 bg-white rounded-lg shadow-lg p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs sm:text-sm text-gray-600 gap-2 sm:gap-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
              <span className="font-medium">Phase: {currentPhase.replace('-', ' ').toUpperCase()}</span>
              {sessionId && (
                <span className="font-medium">Session: {sessionId.slice(-8)}</span>
              )}
              {currentPhase === 'validation' && (
                <span className="font-medium">
                  Validation: {validationState.physicalCard ? 'Complete' : 'In Progress'}
                </span>
              )}
              {currentPhase === 'ready-for-front' && (
                <span className="font-medium">
                  Ready for Front Scan
                </span>
              )}
              {currentPhase === 'front' && (
                <span className="font-medium">
                  Front: {frontScanState.canProceedToBack ? 'Complete' : 'In Progress'}
                </span>
              )}
              {currentPhase === 'ready-for-back' && (
                <span className="font-medium">
                  Ready for Back Scan
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${detectionActive || currentPhase === 'validation' ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
              <span className="font-medium">
                {detectionActive || currentPhase === 'validation' ? 'Processing...' : 'Ready'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardDetectionApp;