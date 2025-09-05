import React from "react";

const DetectionResults = ({ finalOcrResults, onReset }) => {
  if (!finalOcrResults) return null;

  const {
    final_ocr,
    confidence,
    physical_card,
    chip,
    bank_logo,
    magstrip,
    signstrip,
    hologram,
    symmetry,
  } = finalOcrResults;

  return (
    <div className="bg-white rounded-lg shadow-lg p-1 sm:p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl sm:text-3xl font-bold text-center my-4 sm:my-7 text-green-600">
        Card Security Scan Successful
      </h2>

      {/* Final OCR Results */}
      {final_ocr && (
        <div className="mb-6 p-3 sm:p-4 bg-green-50 border text-black border-green-200 rounded-lg">
          <h3 className="text-base sm:text-lg font-semibold mb-3 text-green-700">
            Scanning and Detection Results
          </h3>
          <div className="grid gap-3">
            {final_ocr.cardholder_name && (
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 bg-white rounded border gap-2">
                <span className="font-medium text-sm sm:text-base">
                  Cardholder Name
                </span>
                <div className="text-left sm:text-right">
                  <div className="font-mono text-sm sm:text-base">
                    {final_ocr.cardholder_name.value}
                  </div>
                  {/* <div className="text-xs sm:text-sm text-gray-500">
                    Confidence: {Math.round(final_ocr.cardholder_name.confidence * 100)}%
                  </div> */}
                </div>
              </div>
            )}

            {final_ocr.card_number && (
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 bg-white rounded border gap-2">
                <span className="font-medium text-sm sm:text-base">
                  Card Number
                </span>
                <div className="text-left sm:text-right">
                  <div className="font-mono text-sm sm:text-base">
                    {final_ocr.card_number.value}
                  </div>
                  {/* <div className="text-xs sm:text-sm text-gray-500">
                    Confidence: {Math.round(final_ocr.card_number.confidence * 100)}%
                  </div> */}
                </div>
              </div>
            )}

            {final_ocr.expiry_date && (
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 bg-white rounded border gap-2">
                <span className="font-medium text-sm sm:text-base">
                  Expiry Date
                </span>
                <div className="text-left sm:text-right">
                  <div className="font-mono text-sm sm:text-base">
                    {final_ocr.expiry_date.value}
                  </div>
                  {/* <div className="text-xs sm:text-sm text-gray-500">
                    Confidence: {Math.round(final_ocr.expiry_date.confidence * 100)}%
                  </div> */}
                </div>
              </div>
            )}

            {final_ocr.bank_name && (
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 bg-white rounded border gap-2">
                <span className="font-medium text-sm sm:text-base">
                  Bank Name
                </span>
                <div className="text-left sm:text-right">
                  <div className="font-mono text-sm sm:text-base">
                    {final_ocr.bank_name.value}
                  </div>
                  {/* <div className="text-xs sm:text-sm text-gray-500">
                    Confidence: {Math.round(final_ocr.bank_name.confidence * 100)}%
                  </div> */}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    

      {/* Raw JSON Response Viewer */}

      {/* <JsonResponseViewer data={finalOcrResults} />  */}

      {/* <div className="text-center my-4">
        <button
          onClick={onReset}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base"
        >
          Start New Detection
        </button>
      </div> */}

      
    </div>
  );
};

export default DetectionResults;
