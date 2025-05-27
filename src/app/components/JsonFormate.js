import React from 'react';

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

export default JsonResponseViewer;