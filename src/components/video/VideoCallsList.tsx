import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Video, Users, Calendar, Link as LinkIcon, Trash2 } from "lucide-react";

interface VideoCall {
  _id: string;
  roomId: string;
  title: string;
  description?: string;
  organizer: {
    _id: string;
    name: string;
    email: string;
  };
  participants: Array<{
    _id: string;
    name: string;
    email: string;
    joinedAt?: Date;
  }>;
  scheduledTime?: Date;
  startTime?: Date;
  endTime?: Date;
  status: "scheduled" | "active" | "ended";
  maxParticipants: number;
  isPublic: boolean;
  settings: {
    allowChat: boolean;
    allowScreenShare: boolean;
    muteOnJoin: boolean;
  };
  createdAt: Date;
}

export const VideoCallsList: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [calls, setCalls] = useState<VideoCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCalls();
  }, []);

  const fetchCalls = async () => {
    try {
      const token = localStorage.getItem("business_nexus_token");
      const response = await fetch("http://localhost:5000/api/video-calls", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) throw new Error("Failed to fetch video calls");

      const data = await response.json();
      setCalls(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load video calls");
    } finally {
      setLoading(false);
    }
  };

  const joinCall = (roomId: string) => {
    navigate(`/video-call/${roomId}`);
  };

  const copyCallLink = (roomId: string) => {
    const link = `${window.location.origin}/video-call/${roomId}`;
    navigator.clipboard.writeText(link);
    alert("Call link copied to clipboard!");
  };

  const deleteCall = async (roomId: string) => {
    if (!confirm("Are you sure you want to delete this call?")) return;

    try {
      const token = localStorage.getItem("business_nexus_token");
      const response = await fetch(
        `http://localhost:5000/api/video-calls/${roomId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) throw new Error("Failed to delete call");

      setCalls((prev) => prev.filter((call) => call.roomId !== roomId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete call");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "ended":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Empty State */}
      {calls.length === 0 ? (
        <div className="text-center py-14 bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-200 shadow-sm">
          <Video className="w-14 h-14 mx-auto text-blue-400 mb-3" />
          <h3 className="text-xl font-semibold text-gray-800 mb-1">
            No Video Calls Yet
          </h3>
          <p className="text-gray-500 text-sm">
            Click the{" "}
            <span className="font-semibold text-blue-500">Create Call</span> button above to start one.
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {calls.map((call) => (
            <div
              key={call._id}
              className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                {/* Left: Call Info */}
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Video className="w-5 h-5 text-blue-500" />
                    {call.title}
                  </h3>
                  {call.description && (
                    <p className="text-gray-600 mt-1 text-sm">{call.description}</p>
                  )}

                  <div className="flex flex-wrap gap-4 mt-3 text-gray-500 text-sm">
                    <div className="flex items-center gap-1">
                      <Users size={16} />
                      {call.participants.length}/{call.maxParticipants} joined
                    </div>
                    {call.scheduledTime && (
                      <div className="flex items-center gap-1">
                        <Calendar size={16} />
                        {new Date(call.scheduledTime).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Status Badge */}
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium h-fit ${getStatusColor(
                    call.status
                  )}`}
                >
                  {call.status.charAt(0).toUpperCase() + call.status.slice(1)}
                </span>
              </div>

              {/* Buttons */}
              <div className="flex flex-wrap items-center gap-3 mt-5">
                {call.status !== "ended" && (
                  <button
                    onClick={() => joinCall(call.roomId)}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm shadow-md transition-all"
                  >
                    Join Call
                  </button>
                )}
                <button
                  onClick={() => copyCallLink(call.roomId)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm shadow-sm flex items-center gap-2"
                >
                  <LinkIcon size={16} /> Copy Link
                </button>
                {call.organizer._id === user?.id && (
                  <button
                    onClick={() => deleteCall(call.roomId)}
                    className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl text-sm shadow-sm flex items-center gap-2"
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
