import React from "react";
import Documents from "../../components/documents/Documents";

export const DocumentsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white px-6 py-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          📂 Documents
        </h1>
        <p className="mt-2 text-gray-600">
          Manage, upload, and organize all your important files in one place.
        </p>
      </div>

      {/* Content Card */}
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 transition hover:shadow-xl">
          <Documents />
        </div>
      </div>
    </div>
  );
};
