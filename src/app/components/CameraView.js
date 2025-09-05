import React from "react";

const CameraView = ({
  videoRef,
  canvasRef,
  currentPhase,
  countdown,
  detectionActive,
  frontScanState,
  isProcessing,
  showPromptText,
  promptText,
}) => {
  const getPhaseInstructions = () => {
    switch (currentPhase) {
      case "idle":
        return 'Position your card in camera view showing the frontside, avoid dark place and move the camera closer to the card.';
      case "front-countdown":
        return `Get ready to scan front side... ${countdown}`;
      case "front":
        return "Keep front side in the frame. While Processing...";
      case "ready-for-back":
        return 'Turn to the backside and start scanning card';
      case "back-countdown":
        return `Get ready to scan back side... ${countdown}`;
      case "back":
        return "Keep Back side in the frame. While Processing...";
      case "results":
        return "Thank you, your card Scan is completed successfully";
      case "error":
        return "";
      case "max-attempts-reached":
        return "Maximum attempts reached. Please contact support.";
      default:
        return "Thank you, your card Scan is completed successfully";
    }
  };

  // Check if we should show the scanning animation
  const showScanningAnimation = detectionActive && (
    currentPhase === 'front' || 
    currentPhase === 'back'
  );

  // Don't render camera view if we're in results phase
  if (currentPhase === 'results') {
    return (
      <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <svg 
              className="w-12 h-12 text-green-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M5 13l4 4L19 7" 
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-green-600 mb-2">Scan Complete!</h2>
          <p className="text-lg font-medium text-gray-800">
            {getPhaseInstructions()}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
      <div className="relative overflow-hidden">
        {/* Camera Video */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-64 sm:h-80 lg:h-[420px] rounded-lg object-cover"
        />

        {/* Hidden Canvas */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Card Frame (Thinner) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="relative w-3/4 h-3/4">
            {/* 4 Corner Borders (thinner) */}
            <div className="absolute top-0 left-0 w-6 h-1 bg-white" />
            <div className="absolute top-0 left-0 w-1 h-6 bg-white" />
            <div className="absolute top-0 right-0 w-6 h-1 bg-white" />
            <div className="absolute top-0 right-0 w-1 h-6 bg-white" />
            <div className="absolute bottom-0 left-0 w-6 h-1 bg-white" />
            <div className="absolute bottom-0 left-0 w-1 h-6 bg-white" />
            <div className="absolute bottom-0 right-0 w-6 h-1 bg-white" />
            <div className="absolute bottom-0 right-0 w-1 h-6 bg-white" />
          </div>
        </div>

        {/* Scanning Animation - Only for front and back phases */}
        {showScanningAnimation && (
          <>
            {/* Animated scanning lines */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-15">
              <div className="relative w-3/4 h-3/4">
                {/* Main scanning line */}
                <div className="absolute left-0 right-0 h-0.5 bg-green-400 shadow-lg animate-scan-vertical opacity-90"></div>
                
                {/* Secondary scanning line with delay */}
                <div className="absolute left-0 right-0 h-0.5 bg-green-300 shadow-md animate-scan-vertical-delayed opacity-70"></div>
                
                {/* Subtle glow effect */}
                <div className="absolute left-0 right-0 h-1 bg-green-400 blur-sm animate-scan-vertical opacity-50"></div>
              </div>
            </div>

            {/* Scanning grid overlay for extra effect */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-12">
              <div className="relative w-3/4 h-3/4">
                {/* Horizontal grid lines */}
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={`h-${i}`}
                    className="absolute left-0 right-0 h-px bg-green-200 opacity-20"
                    style={{ top: `${(i + 1) * 12.5}%` }}
                  />
                ))}
                {/* Vertical grid lines */}
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={`v-${i}`}
                    className="absolute top-0 bottom-0 w-px bg-green-200 opacity-20"
                    style={{ left: `${(i + 1) * 16.66}%` }}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        {/* Countdown Overlay with Prompt Text */}
        {countdown > 0 && (
          <div className="absolute inset-0 bg-black/30 bg-opacity-70 flex flex-col items-center justify-center rounded-lg z-25">
            {/* Countdown Number */}
            <div className="text-6xl font-bold text-white animate-pulse mb-4">
              {countdown}
            </div>
            
            {/* Prompt Text during countdown */}
            {showPromptText && promptText && (
              <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 mx-4 max-w-md text-center shadow-lg border-2 border-blue-500">
                <div className="text-blue-600 text-lg font-semibold mb-2">
                  📷 Position Your Card
                </div>
                <div className="text-gray-800 text-sm leading-relaxed">
                  {promptText}
                </div>
                <div className="mt-3 text-xs text-gray-600 animate-pulse">
                  Scanning will begin in {countdown} second{countdown !== 1 ? 's' : ''}...
                </div>
              </div>
            )}
          </div>
        )}

        {/* Detection Active Indicator (Top-Right) */}
        {detectionActive && (
          <div className="absolute top-1 right-2 z-30">
            <div className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span>DETECTING</span>
            </div>
          </div>
        )}
      </div>

      {/* Phase Instructions */}
      <div className="mt-4 text-center">
        <p className="text-lg font-medium text-gray-800">
          {getPhaseInstructions()}
        </p>
      </div>

      {/* Custom CSS for scanning animations */}
      <style jsx>{`
        @keyframes scan-vertical {
          0% {
            top: 0%;
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          50% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            top: 100%;
            opacity: 0;
          }
        }

        @keyframes scan-vertical-delayed {
          0% {
            top: 0%;
            opacity: 0;
          }
          20% {
            opacity: 0;
          }
          30% {
            opacity: 0.7;
          }
          70% {
            opacity: 0.7;
          }
          80% {
            opacity: 0;
          }
          100% {
            top: 100%;
            opacity: 0;
          }
        }

        .animate-scan-vertical {
          animation: scan-vertical 3s ease-in-out infinite;
        }

        .animate-scan-vertical-delayed {
          animation: scan-vertical-delayed 3s ease-in-out infinite;
          animation-delay: 0.5s;
        }
      `}</style>
    </div>
  );
};

export default CameraView;