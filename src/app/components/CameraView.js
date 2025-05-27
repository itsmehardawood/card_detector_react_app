import React from 'react';
import { CheckCircle, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Eye } from 'lucide-react';

const CameraView = ({ 
  videoRef, 
  canvasRef, 
  currentPhase, 
  countdown, 
  detectionActive, 
  validationState, 
  frontScanState, 
  isProcessing 
}) => {
  const getMovementIcon = () => {
    switch(validationState.movementState) {
      case 'MOVE_UP':
        return <ArrowUp className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400 animate-bounce drop-shadow-lg" />;
      case 'MOVE_DOWN':
        return <ArrowDown className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400 animate-bounce drop-shadow-lg" />;
      case 'MOVE_LEFT':
        return <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400 animate-pulse drop-shadow-lg" />;
      case 'MOVE_RIGHT':
        return <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400 animate-pulse drop-shadow-lg" />;
      default:
        return <Eye className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400 animate-pulse drop-shadow-lg" />;
    }
  };

  const getInstructionText = () => {
    if (currentPhase === 'validation') {
      return validationState.movementMessage || 'Position your card correctly';
    }
    return 'Place card within frame';
  };

  const getStatusColor = () => {
    if (currentPhase === 'validation') {
      if (validationState.physicalCard) {
        return 'from-green-700 to-green-800 border-green-400';
      }
      return 'from-slate-700 to-blue-900 border-blue-400';
    }
    return 'from-gray-600 to-gray-700 border-gray-400';
  };

  return (
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
        
        {/* Card Detection Border Overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative">
            <div 
              className="rounded-xl"
              style={{
                width: 'clamp(250px, 70vw, 350px)',
                height: 'clamp(150px, 42vw, 200px)',
                transition: 'border-color 0.3s ease'
              }}
            >
              {/* Corner indicators */}
              <div className="absolute -top-6 -left-1 sm:-left-2 w-4 h-4 sm:w-6 md:w-8 sm:h-6 md:h-8 border-l-2 sm:border-l-4 border-t-2 sm:border-t-4 border-white rounded-tl-lg"></div>
              <div className="absolute -top-6 -right-1 sm:-right-2 w-4 h-4 sm:w-6 md:w-8 sm:h-6 md:h-8 border-r-2 sm:border-r-4 border-t-2 sm:border-t-4 border-white rounded-tr-lg"></div>
              <div className="absolute -bottom-4 -left-1 sm:-left-2 w-4 h-4 sm:w-6 md:w-8 sm:h-6 md:h-8 border-l-2 sm:border-l-4 border-b-2 sm:border-b-4 border-white rounded-bl-lg"></div>
              <div className="absolute -bottom-4 -right-1 sm:-right-2 w-4 h-4 sm:w-6 md:w-8 sm:h-6 md:h-8 border-r-2 sm:border-r-4 border-b-2 sm:border-b-4 border-white rounded-br-lg"></div>
            </div>
          </div>
        </div>

        {/* Enhanced Instruction Box */}
        <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 z-10 max-w-[90%]">
          <div className={`bg-gradient-to-r ${getStatusColor()} backdrop-blur-sm border-2 rounded-xl px-3 sm:px-4 py-2 sm:py-3 shadow-2xl`}>
            {/* Main row with icon, text, and success icon */}
            <div className="flex items-center justify-center gap-2 sm:gap-3">
              {/* Status Icon */}
              <div className="flex-shrink-0">
                {currentPhase === 'validation' ? (
                  getMovementIcon()
                ) : (
                  <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-white drop-shadow-lg" />
                )}
              </div>
              
              {/* Instruction Text - Compact */}
              <div className="flex-1 text-center">
                <p className="text-white text-xs sm:text-sm font-semibold tracking-wide drop-shadow-lg leading-tight">
                  {getInstructionText()}
                </p>
                
                {/* Inline status indicators for validation */}
                {currentPhase === 'validation' && (
                  <div className="flex items-center justify-center gap-3 mt-1">
                    <div className="flex items-center gap-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${validationState.physicalCard ? 'bg-green-300 animate-pulse' : 'bg-gray-300'}`}></div>
                      <span className="text-xs text-gray-200">Card</span>
                    </div>
                    
                    {/* Inline loading indicator */}
                    {!validationState.validationComplete && (
                      <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Success Icon */}
              {currentPhase === 'validation' && validationState.physicalCard && (
                <div className="flex-shrink-0">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-300 animate-pulse drop-shadow-lg" />
                </div>
              )}
            </div>
            
            {/* Compact Progress Bar for Validation */}
            {currentPhase === 'validation' && (
              <div className="mt-2 w-full bg-white bg-opacity-20 rounded-full h-1">
                <div 
                  className={`h-1 rounded-full transition-all duration-500 ${
                    validationState.physicalCard ? 'bg-green-300 w-full' : 'bg-blue-300 w-1/3 animate-pulse'
                  }`}
                ></div>
              </div>
            )}
          </div>
          
          {/* Subtle glow effect */}
          <div className={`absolute inset-0 bg-gradient-to-r ${getStatusColor()} rounded-xl blur-lg opacity-30 -z-10`}></div>
        </div>

        {/* Countdown Overlay */}
        {(currentPhase === 'front-countdown' || currentPhase === 'back-countdown') && countdown > 0 && (
          <div className="absolute inset-0  bg-opacity-60 flex flex-col items-center justify-center text-white">
            <div className=" bg-opacity-90 rounded-2xl p-6 sm:p-10 text-center mx-4 ">
              <div className="text-6xl sm:text-8xl font-bold mb-4 animate-pulse text-blue-200 drop-shadow-lg">
                {countdown}
              </div>
              <p className="text-xl sm:text-2xl font-semibold mb-2 text-blue-100">
                {currentPhase === 'front-countdown' ? 'Preparing Front Side Scan' : 'Preparing Back Side Scan'}
              </p>
              <p className="text-sm sm:text-base text-blue-200">
                Position your card in the frame
              </p>
            </div>
          </div>
        )}
        
        {/* Detection Overlay */}
        {detectionActive && (
          <div className="absolute inset-0 bg-opacity-60 flex flex-col items-center justify-center text-white">
            <div className=" bg-opacity-90 rounded-2xl p-6 sm:p-10 text-center mx-4   ">
              <div className="animate-spin w-12 h-12 sm:w-16 sm:h-16 border-4 border-white border-t-transparent rounded-full mx-auto mb-6 drop-shadow-lg"></div>
              <p className="text-xl sm:text-2xl font-semibold mb-4 text-green-100">
                {currentPhase === 'front' ? 'Scanning Front Side' : 'Scanning Back Side'}
              </p>
              
              {isProcessing && (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
                  <p className="text-green-300 text-sm sm:text-base font-medium">
                    Processing Frame...
                  </p>
                  <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CameraView;