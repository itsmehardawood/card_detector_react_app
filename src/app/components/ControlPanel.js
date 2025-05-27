import React from 'react';
import { Camera, CheckCircle, RotateCcw, Shield, Square } from 'lucide-react';
import DetectionResults from './DetectionResults';

const ControlPanel = ({ 
  currentPhase, 
  onStartValidation, 
  onStartFrontScan, 
  onStartBackScan, 
  onStop,
  onReset, 
  onStartOver,
  validationState, 
  frontScanState, 
  countdown, 
  errorMessage, 
  finalOcrResults,
  detectionActive,
  isProcessing
}) => {
  // Helper function to determine if stop button should be shown
  const shouldShowStopButton = () => {
    return currentPhase === 'validation' || 
           currentPhase === 'front-countdown' || 
           currentPhase === 'front' || 
           currentPhase === 'back-countdown' || 
           currentPhase === 'back' ||
           detectionActive ||
           isProcessing;
  };

  const renderPhaseContent = () => {
    switch (currentPhase) {
      case 'idle':
        return (
          <div className="text-center">
            <Shield className="w-12 h-12 sm:w-16 md:w-20 sm:h-16 md:h-20 text-blue-500 mx-auto mb-3 sm:mb-6" />
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-6 text-black">Ready to Validate Card</h2>
            <p className="text-sm sm:text-base lg:text-lg text-gray-600 mb-4 sm:mb-8 max-w-2xl mx-auto px-2">
              First, we will validate your card to ensure it is properly positioned and recognized as a physical card.
            </p>
            <button
              onClick={onStartValidation}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 sm:px-10 py-3 sm:py-4 rounded-lg font-medium text-base sm:text-xl transition-colors flex items-center mx-auto"
            >
              <Shield className="w-4 h-4 sm:w-6 sm:h-6 mr-2 sm:mr-3" />
              Start Card Validation
            </button>
          </div>
        );

      case 'validation':
        return (
          <div className="text-center">
            <div className="w-12 h-12 sm:w-16 md:w-20 sm:h-16 md:h-20 text-blue-500 mx-auto mb-3 sm:mb-6 flex items-center justify-center">
              <Shield className="w-full h-full" />
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-6 text-blue-600">Validating Card</h2>
            
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

            {shouldShowStopButton() && (
              <button
                onClick={onStop}
                className="bg-red-600 hover:bg-red-700 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-lg font-medium transition-colors flex items-center mx-auto mt-4"
              >
                <Square className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Stop Validation
              </button>
            )}
          </div>
        );

      case 'ready-for-front':
        return (
          <div className="text-center">
            <CheckCircle className="w-12 h-12 sm:w-16 md:w-20 sm:h-16 md:h-20 text-green-500 mx-auto mb-3 sm:mb-6" />
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-6 text-green-600">Validation Complete!</h2>
            <p className="text-sm sm:text-base lg:text-lg text-gray-600 mb-4 sm:mb-8 max-w-2xl mx-auto px-2">
              Physical card detected successfully. Click the button below to start scanning the front side of your card.
            </p>
            <button
              onClick={onStartFrontScan}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 sm:px-10 py-3 sm:py-4 rounded-lg font-medium text-base sm:text-xl transition-colors flex items-center mx-auto"
            >
              <Camera className="w-4 h-4 sm:w-6 sm:h-6 mr-2 sm:mr-3" />
              Start Front Side Scan
            </button>
          </div>
        );

      case 'front-countdown':
        return (
          <div className="text-center">
            <div className="w-12 h-12 sm:w-16 md:w-20 sm:h-16 md:h-20 text-blue-500 mx-auto mb-3 sm:mb-6 flex items-center justify-center">
              <Camera className="w-full h-full" />
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-6 text-blue-600">Get Ready!</h2>
            <p className="text-sm sm:text-base lg:text-lg text-gray-600 mb-4 sm:mb-8 max-w-2xl mx-auto px-2">
              Front side scanning will begin in <span className="font-bold text-blue-600">{countdown}</span> seconds. Make sure your card is positioned in the frame.
            </p>
            
            {shouldShowStopButton() && (
              <button
                onClick={onStop}
                className="bg-red-600 hover:bg-red-700 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-lg font-medium transition-colors flex items-center mx-auto"
              >
                <Square className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Stop Countdown
              </button>
            )}
          </div>
        );

      case 'front':
        return (
          <div className="text-center">
            <div className="w-12 h-12 sm:w-16 md:w-20 sm:h-16 md:h-20 text-blue-500 mx-auto mb-3 sm:mb-6 flex items-center justify-center">
              <Camera className="w-full h-full" />
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-6 text-blue-600">Scanning Front Side</h2>
            <p className="text-sm sm:text-base lg:text-lg text-gray-600 mb-4 sm:mb-8 max-w-2xl mx-auto px-2">
              Please ensure the chip is clearly visible. We need both 6 frames and chip detection to proceed.
            </p>
            
            {shouldShowStopButton() && (
              <button
                onClick={onStop}
                className="bg-red-600 hover:bg-red-700 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-lg font-medium transition-colors flex items-center mx-auto"
              >
                <Square className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Stop Scanning
              </button>
            )}
          </div>
        );

      case 'ready-for-back':
        return (
          <div className="text-center">
            <RotateCcw className="w-12 h-12 sm:w-16 md:w-20 sm:h-16 md:h-20 text-green-500 mx-auto mb-3 sm:mb-6" />
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-6 text-green-600">Front Side Complete!</h2>
            <p className="text-sm sm:text-base lg:text-lg text-gray-600 mb-4 sm:mb-8 max-w-2xl mx-auto px-2">
              Chip detected and sufficient frames captured! Please flip your card to show the back side and click the button below to scan the back.
            </p>
            <button
              onClick={onStartBackScan}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 sm:px-10 py-3 sm:py-4 rounded-lg font-medium text-base sm:text-xl transition-colors flex items-center mx-auto"
            >
              <Camera className="w-4 h-4 sm:w-6 sm:h-6 mr-2 sm:mr-3" />
              Start Back Side Scan
            </button>
          </div>
        );

      case 'back-countdown':
        return (
          <div className="text-center">
            <div className="w-12 h-12 sm:w-16 md:w-20 sm:h-16 md:h-20 text-purple-500 mx-auto mb-3 sm:mb-6 flex items-center justify-center">
              <Camera className="w-full h-full" />
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-6 text-purple-600">Get Ready!</h2>
            <p className="text-sm sm:text-base lg:text-lg text-gray-600 mb-4 sm:mb-8 max-w-2xl mx-auto px-2">
              Back side scanning will begin in <span className="font-bold text-purple-600">{countdown}</span> seconds. Make sure your card is positioned in the frame.
            </p>
            
            {shouldShowStopButton() && (
              <button
                onClick={onStop}
                className="bg-red-600 hover:bg-red-700 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-lg font-medium transition-colors flex items-center mx-auto"
              >
                <Square className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Stop Countdown
              </button>
            )}
          </div>
        );

      case 'back':
        return (
          <div className="text-center">
            <div className="w-12 h-12 sm:w-16 md:w-20 sm:h-16 md:h-20 text-purple-500 mx-auto mb-3 sm:mb-6 flex items-center justify-center">
              <Camera className="w-full h-full" />
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-6 text-purple-600">Scanning Back Side</h2>
            <p className="text-sm sm:text-base lg:text-lg text-gray-600 mb-4 sm:mb-8 max-w-2xl mx-auto px-2">
              Please keep the card steady while we capture the back side information.
            </p>
            
            {shouldShowStopButton() && (
              <button
                onClick={onStop}
                className="bg-red-600 hover:bg-red-700 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-lg font-medium transition-colors flex items-center mx-auto"
              >
                <Square className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Stop Scanning
              </button>
            )}
          </div>
        );

      case 'results':
        return <DetectionResults finalOcrResults={finalOcrResults} onReset={onReset} />;

      case 'error':
        return (
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
                onClick={onReset}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base"
              >
                Try Again
              </button>
              <button
                onClick={onStartOver}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base"
              >
                Start Over
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 sm:p-8">
      {renderPhaseContent()}
    </div>
  );
};

export default ControlPanel;