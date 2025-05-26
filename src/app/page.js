// 'use client'
// import React, { useState, useEffect, useRef } from 'react';
// import { Camera, CreditCard, CheckCircle, RotateCcw, Phone } from 'lucide-react';

// const CardDetectionApp = () => {
//   // State management
//   const [currentPhase, setCurrentPhase] = useState('idle'); // idle, front, flip-card, back, results, error
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
//     initializeCamera();
//     return () => {
//       // Cleanup camera stream
//       if (videoRef.current?.srcObject) {
//         const tracks = videoRef.current.srcObject.getTracks();
//         tracks.forEach(track => track.stop());
//       }
//       if (captureIntervalRef.current) {
//         clearInterval(captureIntervalRef.current);
//       }
//     };
//   }, []);

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
        
//         const response = await fetch('https://a623-110-39-39-254.ngrok-free.app/detect', {
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
//           await new Promise(resolve => setTimeout(resolve, 1000));
//         }
//       }
//     }
    
//     // If all attempts failed, throw the last error
//     throw lastError;
//   };

//   // Capture and send frames continuously
//   const captureAndSendFrames = async (phase) => {
//     // Generate session ID if not exists
//     const currentSessionId = sessionId || `session_${Date.now()}`;
//     if (!sessionId) {
//       setSessionId(currentSessionId);
//     }
    
//     let lastApiResponse = null;
//     const maxFrames = 50; // Maximum 15 frames per side
    
//     // Ensure video is ready
//     if (!videoRef.current || videoRef.current.readyState < 2) {
//       throw new Error('Video not ready for capture');
//     }
    
//     return new Promise((resolve, reject) => {
//       let frameNumber = 0;
//       let timeoutId = null;
      
//       const cleanup = () => {
//         if (captureIntervalRef.current) {
//           clearInterval(captureIntervalRef.current);
//           captureIntervalRef.current = null;
//         }
//         if (timeoutId) {
//           clearTimeout(timeoutId);
//           timeoutId = null;
//         }
//         setIsProcessing(false);
//       };
      
//       captureIntervalRef.current = setInterval(async () => {
//         try {
//           const frame = await captureFrame();
          
//           if (frame && frame.size > 0) {
//             frameNumber++;
            
//             // Send frame immediately to API
//             setIsProcessing(true);
//             try {
//               const apiResponse = await sendFrameToAPI(frame, phase, currentSessionId, frameNumber);
              
//               // Store the latest response
//               lastApiResponse = apiResponse;
//               setIsProcessing(false);
              
//               // Check if we have buffered enough frames based on phase
//               if (phase === 'front' && apiResponse.buffer_info?.front_frames_buffered >= 6) {
//                 cleanup();
//                 console.log('Front side complete - 6 frames buffered');
//                 resolve(apiResponse);
//               } else if (phase === 'back' && apiResponse.buffer_info?.back_frames_buffered >= 6) {
//                 cleanup();
//                 console.log('Back side complete - 6 frames buffered');
//                 resolve(apiResponse);
//               }
              
//               // Stop if we've reached maximum frames without getting buffer condition
//               if (frameNumber >= maxFrames) {
//                 cleanup();
//                 console.log(`Reached maximum ${maxFrames} frames for ${phase} side`);
//                 if (lastApiResponse) {
//                   resolve(lastApiResponse);
//                 } else {
//                   reject(new Error(`Failed to get sufficient frames after ${maxFrames} attempts`));
//                 }
//               }
              
//             } catch (apiError) {
//               console.error(`API error for frame ${frameNumber}:`, apiError);
//               setIsProcessing(false);
//               // Continue with next frame
//             }
//           }
//         } catch (error) {
//           console.error('Error in capture loop:', error);
//         }
//       }, 1000); // Send frames every 0.5 seconds
      
//       // Timeout after 45 seconds (15 frames * 3 seconds per frame max)
//       timeoutId = setTimeout(() => {
//         cleanup();
//         if (lastApiResponse) {
//           console.log('Timeout reached, using last response');
//           resolve(lastApiResponse);
//         } else {
//           reject(new Error('Timeout: No successful API responses received'));
//         }
//       }, 45000);
//     });
//   };

//   const startFrontSideDetection = async () => {
//     setCurrentPhase('front');
//     setDetectionActive(true);
//     setErrorMessage('');

//     try {
//       // Keep sending frames until front_frames_buffered = 6 (max 15 frames)
//       await captureAndSendFrames('front');
      
//       setDetectionActive(false);
      
//       // Wait for user to flip card and press button (no auto-start)
//       setCurrentPhase('flip-card');
      
//     } catch (error) {
//       console.error('Front side detection failed:', error);
//       setDetectionActive(false);
//       setErrorMessage(`Front side detection failed: ${error.message}`);
//       setCurrentPhase('error');
//     }
//   };

//   const startBackSideDetection = async () => {
//     setCurrentPhase('back');
//     setDetectionActive(true);
//     setErrorMessage('');

//     try {
//       // Keep sending frames until back_frames_buffered = 6
//       const finalResult = await captureAndSendFrames('back');
      
//       setFinalOcrResults(finalResult);
//       setCurrentPhase('results');
//       setDetectionActive(false);
      
//     } catch (error) {
//       console.error('Back side detection failed:', error);
//       setDetectionActive(false);
//       setErrorMessage(`Back side detection failed: ${error.message}`);
//       setCurrentPhase('error');
//     }
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
//   };

//   const renderDetectionResults = () => {
//     if (!finalOcrResults) return null;

//     const { final_ocr, confidence, physical_card, chip, bank_logo, magstrip, signstrip, customer_service_detected } = finalOcrResults;

//     return (
//       <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
//         <h2 className="text-2xl font-bold text-center mb-6 text-green-600">
//           Card Detection Complete
//         </h2>
        
//         {/* Final OCR Results */}
//         {final_ocr && (
//           <div className="mb-6 p-4 bg-green-50 border text-black border-green-200 rounded-lg">
//             <h3 className="text-lg font-semibold mb-3 text-green-700">Final OCR Results</h3>
//             <div className="grid gap-3">
//               {final_ocr.cardholder_name && (
//                 <div className="flex justify-between items-center p-3 bg-white rounded border">
//                   <span className="font-medium">Cardholder Name</span>
//                   <div className="text-right">
//                     <div className="font-mono">{final_ocr.cardholder_name.value}</div>
//                     <div className="text-sm text-gray-500">
//                       Confidence: {Math.round(final_ocr.cardholder_name.confidence * 100)}%
//                     </div>
//                   </div>
//                 </div>
//               )}
              
//               {final_ocr.card_number && (
//                 <div className="flex justify-between items-center p-3 bg-white rounded border">
//                   <span className="font-medium">Card Number</span>
//                   <div className="text-right">
//                     <div className="font-mono">{final_ocr.card_number.value}</div>
//                     <div className="text-sm text-gray-500">
//                       Confidence: {Math.round(final_ocr.card_number.confidence * 100)}%
//                     </div>
//                   </div>
//                 </div>
//               )}
              
//               {final_ocr.expiry_date && (
//                 <div className="flex justify-between items-center p-3 bg-white rounded border">
//                   <span className="font-medium">Expiry Date</span>
//                   <div className="text-right">
//                     <div className="font-mono">{final_ocr.expiry_date.value}</div>
//                     <div className="text-sm text-gray-500">
//                       Confidence: {Math.round(final_ocr.expiry_date.confidence * 100)}%
//                     </div>
//                   </div>
//                 </div>
//               )}
//             </div>
//           </div>
//         )}

//         {/* Detection Summary */}
//         <div className="mb-6 p-4 bg-blue-50 border text-black border-blue-200 rounded-lg">
//           <h3 className="text-lg font-semibold mb-3 text-blue-700">Detection Summary</h3>
//           <div className="grid md:grid-cols-2 gap-4">
//             <div className="space-y-2 text-sm">
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
//             </div>
//             <div className="space-y-2 text-sm">
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

//         <div className="text-center">
//           <button
//             onClick={resetApplication}
//             className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
//           >
//             Start New Detection
//           </button>
//         </div>
//       </div>
//     );
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
//       <div className="container mx-auto max-w-6xl">
//         <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
//           Card Detection System
//         </h1>

//         {/* Camera View */}
//         <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
//           <div className="relative rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
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
            
//             {/* Card Detection Border Overlay */}
//             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
//               <div className="relative">
//                 <div 
//                   className="border-4 rounded-xl"
//                   style={{
//                     width: '320px',
//                     height: '200px',
//                     borderStyle: 'dashed',
//                     borderColor: detectionActive ? '#10b981' : '#ffffff',
//                     transition: 'border-color 0.3s ease'
//                   }}
//                 >
//                   {/* Corner indicators */}
//                   <div className="absolute -top-2 -left-2 w-8 h-8 border-l-4 border-t-4 border-white rounded-tl-lg"></div>
//                   <div className="absolute -top-2 -right-2 w-8 h-8 border-r-4 border-t-4 border-white rounded-tr-lg"></div>
//                   <div className="absolute -bottom-2 -left-2 w-8 h-8 border-l-4 border-b-4 border-white rounded-bl-lg"></div>
//                   <div className="absolute -bottom-2 -right-2 w-8 h-8 border-r-4 border-b-4 border-white rounded-br-lg"></div>
//                 </div>
//               </div>
//             </div>
            
//             {/* Detection Overlay */}
//             {detectionActive && (
//               <div className="absolute inset-0  bg-opacity-60 flex flex-col items-center justify-center text-white">
//                 <div className=" bg-opacity-75 rounded-lg p-8 text-center mx-4">
//                   <div className="animate-spin w-16 h-16 border-4 border-white border-t-transparent rounded-full mx-auto mb-6"></div>
//                   <p className="text-xl font-medium mb-4">
//                     {currentPhase === 'front' ? 'Scanning Front Side' : 'Scanning Back Side'}
//                   </p>
                  
//                   {isProcessing && (
//                     <p className="text-yellow-300 text-sm">
//                       Sending frames to AI...
//                     </p>
//                   )}
//                 </div>
//               </div>
//             )}
//           </div>
//         </div>

//         {/* Control Panel */}
//         <div className="bg-white rounded-lg shadow-lg p-8">
//           {currentPhase === 'idle' && (
//             <div className="text-center">
//               <CreditCard className="w-20 h-20 text-blue-500 mx-auto mb-6" />
//               <h2 className="text-3xl font-bold mb-6">Ready to Scan Card</h2>
//               <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
//                 Place the front side of your card in the camera view and click start. We'll capture 6 frames for analysis.
//               </p>
//               <button
//                 onClick={startFrontSideDetection}
//                 className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-lg font-medium text-xl transition-colors flex items-center mx-auto"
//               >
//                 <Camera className="w-6 h-6 mr-3" />
//                 Start Front Side Scan
//               </button>
//             </div>
//           )}

//           {currentPhase === 'flip-card' && (
//             <div className="text-center">
//               <RotateCcw className="w-20 h-20 text-green-500 mx-auto mb-6" />
//               <h2 className="text-3xl font-bold mb-6 text-green-600">Front Side Complete!</h2>
//               <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
//                 Please flip your card to show the back side and click the button below to scan the back.
//               </p>
//               {countdown > 0 && (
//                 <div className="mb-6">
//                   <div className="text-4xl font-bold text-blue-600 mb-2">{countdown}</div>
//                   <p className="text-gray-600">Auto-starting back side scan...</p>
//                 </div>
//               )}
//               <button
//                 onClick={startBackSideDetection}
//                 className="bg-purple-600 hover:bg-purple-700 text-white px-10 py-4 rounded-lg font-medium text-xl transition-colors flex items-center mx-auto"
//               >
//                 <Camera className="w-6 h-6 mr-3" />
//                 Start Back Side Scan
//               </button>
//             </div>
//           )}

//           {currentPhase === 'results' && renderDetectionResults()}

//           {currentPhase === 'error' && (
//             <div className="text-center">
//               <div className="w-20 h-20 text-red-500 mx-auto mb-6 flex items-center justify-center">
//                 <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20">
//                   <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
//                 </svg>
//               </div>
//               <h2 className="text-3xl font-bold mb-6 text-red-600">Detection Failed</h2>
//               <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
//                 {errorMessage}
//               </p>
//               <div className="flex flex-col sm:flex-row gap-4 justify-center">
//                 <button
//                   onClick={resetApplication}
//                   className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
//                 >
//                   Try Again
//                 </button>
//                 <button
//                   onClick={() => {
//                     setCurrentPhase('idle');
//                     setErrorMessage('');
//                   }}
//                   className="bg-gray-600 hover:bg-gray-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
//                 >
//                   Start Over
//                 </button>
//               </div>
//             </div>
//           )}
//         </div>

//         {/* Status Information */}
//         <div className="mt-6 bg-white rounded-lg shadow-lg p-4">
//           <div className="flex items-center justify-between text-sm text-gray-600">
//             <div className="flex items-center gap-6">
//               <span className="font-medium">Phase: {currentPhase.replace('-', ' ').toUpperCase()}</span>
//               {sessionId && (
//                 <span className="font-medium">Session: {sessionId.slice(-8)}</span>
//               )}
//             </div>
//             <div className="flex items-center gap-3">
//               <div className={`w-3 h-3 rounded-full ${detectionActive ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
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
import { Camera, CreditCard, CheckCircle, RotateCcw, Phone } from 'lucide-react';

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

const CardDetectionApp = () => {
  // State management
  const [currentPhase, setCurrentPhase] = useState('idle'); // idle, front, flip-card, back, results, error
  const [detectionActive, setDetectionActive] = useState(false);
  const [finalOcrResults, setFinalOcrResults] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [sessionId, setSessionId] = useState('');
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const capturedFrames = useRef([]);
  const captureIntervalRef = useRef(null);

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
    initializeCamera();
    return () => {
      // Cleanup camera stream
      if (videoRef.current?.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
      }
    };
  }, []);

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
        
        const response = await fetch('https://a623-110-39-39-254.ngrok-free.app/detect', {
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
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    // If all attempts failed, throw the last error
    throw lastError;
  };

  // Capture and send frames continuously
  const captureAndSendFrames = async (phase) => {
    // Generate session ID if not exists
    const currentSessionId = sessionId || `session_${Date.now()}`;
    if (!sessionId) {
      setSessionId(currentSessionId);
    }
    
    let lastApiResponse = null;
    const maxFrames = 70; // Maximum 15 frames per side
    
    // Ensure video is ready
    if (!videoRef.current || videoRef.current.readyState < 2) {
      throw new Error('Video not ready for capture');
    }
    
    return new Promise((resolve, reject) => {
      let frameNumber = 0;
      let timeoutId = null;
      
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
      
      captureIntervalRef.current = setInterval(async () => {
        try {
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
              if (phase === 'front' && apiResponse.buffer_info?.front_frames_buffered >= 6) {
                cleanup();
                console.log('Front side complete - 6 frames buffered');
                resolve(apiResponse);
              } else if (phase === 'back' && apiResponse.buffer_info?.back_frames_buffered >= 6) {
                cleanup();
                console.log('Back side complete - 6 frames buffered');
                resolve(apiResponse);
              }
              
              // Stop if we've reached maximum frames without getting buffer condition
              if (frameNumber >= maxFrames) {
                cleanup();
                console.log(`Reached maximum ${maxFrames} frames for ${phase} side`);
                if (lastApiResponse) {
                  resolve(lastApiResponse);
                } else {
                  reject(new Error(`Failed to get sufficient frames after ${maxFrames} attempts`));
                }
              }
              
            } catch (apiError) {
              console.error(`API error for frame ${frameNumber}:`, apiError);
              setIsProcessing(false);
              // Continue with next frame
            }
          }
        } catch (error) {
          console.error('Error in capture loop:', error);
        }
      }, 1000); // Send frames every 1 seconds
      
      // Timeout after 45 seconds (15 frames * 3 seconds per frame max)
      timeoutId = setTimeout(() => {
        cleanup();
        if (lastApiResponse) {
          console.log('Timeout reached, using last response');
          resolve(lastApiResponse);
        } else {
          reject(new Error('Timeout: No successful API responses received'));
        }
      }, 55000);
    });
  };

  const startFrontSideDetection = async () => {
    setCurrentPhase('front');
    setDetectionActive(true);
    setErrorMessage('');

    try {
      // Keep sending frames until front_frames_buffered = 6 (max 15 frames)
      await captureAndSendFrames('front');
      
      setDetectionActive(false);
      
      // Wait for user to flip card and press button (no auto-start)
      setCurrentPhase('flip-card');
      
    } catch (error) {
      console.error('Front side detection failed:', error);
      setDetectionActive(false);
      setErrorMessage(`Front side detection failed: ${error.message}`);
      setCurrentPhase('error');
    }
  };

  const startBackSideDetection = async () => {
    setCurrentPhase('back');
    setDetectionActive(true);
    setErrorMessage('');

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
  };

  const resetApplication = () => {
    setCurrentPhase('idle');
    setDetectionActive(false);
    setFinalOcrResults(null);
    setIsProcessing(false);
    setCountdown(0);
    setErrorMessage('');
    setSessionId('');
    capturedFrames.current = [];
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
    }
  };

  const renderDetectionResults = () => {
    if (!finalOcrResults) return null;

    const { final_ocr, confidence, physical_card, chip, bank_logo, magstrip, signstrip, customer_service_detected } = finalOcrResults;

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
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-center mb-4 sm:mb-8 text-gray-100">
          Card Detection System
        </h1>

        {/* Camera View */}
        <div className="bg-white rounded-lg shadow-lg p-2 sm:p-4 mb-4 sm:mb-6">
          <div className="relative rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
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
            
            {/* Card Detection Border Overlay - Responsive */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative">
                <div 
                  className="rounded-xl"
                  style={{
                    // Responsive dimensions using clamp()
                    width: 'clamp(200px, 60vw, 350px)',
                    height: 'clamp(120px, 35vw, 200px)',
                    transition: 'border-color 0.3s ease'
                  }}
                >
                  {/* Corner indicators - Responsive */}
                  <div className="absolute -top-3 -left-1 sm:-left-2 w-4 h-4 sm:w-6 md:w-8 sm:h-6 md:h-8 border-l-2 sm:border-l-4 border-t-2 sm:border-t-4 border-white rounded-tl-lg"></div>
                  <div className="absolute -top-3 -right-1 sm:-right-2 w-4 h-4 sm:w-6 md:w-8 sm:h-6 md:h-8 border-r-2 sm:border-r-4 border-t-2 sm:border-t-4 border-white rounded-tr-lg"></div>
                  <div className="absolute -bottom-1 -left-1 sm:-left-2 w-4 h-4 sm:w-6 md:w-8 sm:h-6 md:h-8 border-l-2 sm:border-l-4 border-b-2 sm:border-b-4 border-white rounded-bl-lg"></div>
                  <div className="absolute -bottom-1 -right-1 sm:-right-2 w-4 h-4 sm:w-6 md:w-8 sm:h-6 md:h-8 border-r-2 sm:border-r-4 border-b-2 sm:border-b-4 border-white rounded-br-lg"></div>
                </div>
                
                {/* Instruction text below the frame - Responsive */}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 sm:mt-4">
                  <div className="bg-black bg-opacity-75 rounded-lg px-2 sm:px-4 py-1 sm:py-2 text-center">
                    <p className="text-white text-xs sm:text-sm font-medium whitespace-nowrap">
                      Place card within frame
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Detection Overlay */}
            {detectionActive && (
              <div className="absolute inset-0 bg-opacity-60 flex flex-col items-center justify-center text-white">
                <div className="bg-opacity-75 rounded-lg p-4 sm:p-8 text-center mx-2 sm:mx-4">
                  <div className="animate-spin w-8 h-8 sm:w-12 md:w-16 sm:h-12 md:h-16 border-2 sm:border-4 border-white border-t-transparent rounded-full mx-auto mb-3 sm:mb-6"></div>
                  <p className="text-base sm:text-xl font-medium mb-2 sm:mb-4">
                    {currentPhase === 'front' ? 'Scanning Front Side' : 'Scanning Back Side'}
                  </p>
                  
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
              <CreditCard className="w-12 h-12 sm:w-16 md:w-20 sm:h-16 md:h-20 text-blue-500 mx-auto mb-3 sm:mb-6" />
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-6 text-black">Ready to Scan Card</h2>
              <p className="text-sm sm:text-base lg:text-lg text-gray-600 mb-4 sm:mb-8 max-w-2xl mx-auto px-2">
                Place the front side of your card in the camera view and click start. We'll capture 6 frames for analysis.
              </p>
              <button
                onClick={startFrontSideDetection}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 sm:px-10 py-3 sm:py-4 rounded-lg font-medium text-base sm:text-xl transition-colors flex items-center mx-auto"
              >
                <Camera className="w-4 h-4 sm:w-6 sm:h-6 mr-2 sm:mr-3" />
                Start Front Scan
              </button>
            </div>
          )}

          {currentPhase === 'flip-card' && (
            <div className="text-center">
              <RotateCcw className="w-12 h-12 sm:w-16 md:w-20 sm:h-16 md:h-20 text-green-500 mx-auto mb-3 sm:mb-6" />
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-6 text-green-600">Front Side Complete!</h2>
              <p className="text-sm sm:text-base lg:text-lg text-gray-600 mb-4 sm:mb-8 max-w-2xl mx-auto px-2">
                Please flip your card to show the back side and click the button below to scan the back.
              </p>
              {countdown > 0 && (
                <div className="mb-4 sm:mb-6">
                  <div className="text-2xl sm:text-4xl font-bold text-blue-600 mb-2">{countdown}</div>
                  <p className="text-sm sm:text-base text-gray-600">Auto-starting back side scan...</p>
                </div>
              )}
              <button
                onClick={startBackSideDetection}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 sm:px-10 py-3 sm:py-4 rounded-lg font-medium text-base sm:text-xl transition-colors flex items-center mx-auto"
              >
                <Camera className="w-4 h-4 sm:w-6 sm:h-6 mr-2 sm:mr-3" />
                Start Back Side Scan
              </button>
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
            </div>
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${detectionActive ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
              <span className="font-medium">{detectionActive ? 'Processing...' : 'Ready'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardDetectionApp;