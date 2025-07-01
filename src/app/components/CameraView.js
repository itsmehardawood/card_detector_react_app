
import React from "react";

const CameraView = ({
  videoRef,
  canvasRef,
  currentPhase,
  countdown,
  detectionActive,
  validationState,
  frontScanState,
  isProcessing,
}) => {
  const getPhaseInstructions = () => {
    switch (currentPhase) {
      case "idle":
        return 'Position your card in camera view showing the frontside, avoid dark place and move the camera closer to the card.';
      case "validation":
        return "Keep your card steady. Validating physical card...";
      case "ready-for-front":
        return 'Position the FRONT side of your card (with chip visible) and click "Scan Front Side"';
      case "front-countdown":
        return `Get ready to scan front side... ${countdown}`;
      case "front":
        return "Keep front side in the frame. While Processing...";
      case "ready-for-back":
        return 'Turn to the backside and start scanning card"';
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

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
      <div className="relative">
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

        {/* Countdown Overlay */}
        {countdown > 0 && (
          <div className="absolute inset-0 bg-opacity-50 flex items-center justify-center rounded-lg z-20">
            <div className="text-6xl font-bold text-white animate-pulse">
              {countdown}
            </div>
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

      
{currentPhase === "validation" && validationState?.movementMessage && (
  <div className="mt-4 text-center">
    <div
      className={`text-white text-sm px-6 py-3 rounded-full shadow-md inline-block
       ${
        validationState.movementMessage === "Physical Card Validated!"
          ? "bg-green-500"
          : validationState.movementMessage === "Validation Failed"
          ? "bg-red-500"
          : "bg-gray-700"
      }`}
    >
      {validationState.movementMessage}
    </div>
  </div>
)}


      

      {/* Phase Instructions */}
      <div className="mt-4 text-center">
        <p className="text-lg font-medium text-gray-800">
          {getPhaseInstructions()}
        </p>
      </div>
    </div>
  );
};

export default CameraView;
