import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { VideoCallsList } from "../../components/video/VideoCallsList";
import { CreateVideoCallModal } from "../../components/video/CreateVideoCallModal";
import { Plus, Video } from "lucide-react";

export const VideoCallsPage: React.FC = () => {
  const navigate = useNavigate();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleCallCreated = (roomId: string) => {
    setIsCreateModalOpen(false);
    navigate(`/video-call/${roomId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 p-6 flex justify-center items-start">
      <div className="w-full max-w-6xl bg-white shadow-2xl rounded-3xl border border-blue-200 p-8 transition-all duration-300 hover:shadow-3xl">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between md:items-center mb-8 gap-6">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
              <Video size={36} className="text-blue-500" />
              Video Call
            </h1>
            <p className="text-gray-500 text-lg mt-2">
              Start, join, and manage your video calls seamlessly.
            </p>
          </div>

          {/* Create Call Button */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-3 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl shadow-lg transition-all duration-300 text-lg font-semibold"
          >
            <Plus size={22} />
            Create New Call
          </button>
        </div>

        {/* Divider */}
        <div className="border-b border-blue-200 mb-8"></div>

        {/* List of Existing Video Calls */}
        <div className="mt-4">
          <VideoCallsList />
        </div>

        {/* Modal for Creating Calls */}
        <CreateVideoCallModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCallCreated={handleCallCreated}
        />
      </div>
    </div>
  );
};
