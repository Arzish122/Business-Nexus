import React from "react";
import { User, Meeting } from "../../types";
import { Calendar, Clock, MapPin, Users, X } from "lucide-react";

interface MeetingDetailsModalProps {
  meeting: Meeting;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatusUpdate: (status: "accepted" | "rejected" | "cancelled") => void;
  participants: User[];
}

export const MeetingDetailsModal: React.FC<MeetingDetailsModalProps> = ({
  meeting,
  onClose,
  onEdit,
  onDelete,
  onStatusUpdate,
  participants,
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-lg w-full max-w-lg p-6 overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-2xl font-bold text-gray-900">{meeting.title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
            aria-label="Close"
          >
            <X size={22} />
          </button>
        </div>

        {/* Description */}
        {meeting.description && (
          <p className="text-gray-700 mb-4">{meeting.description}</p>
        )}

        {/* Info Section */}
        <div className="space-y-3 mb-6">
          <div className="flex items-start">
            <Calendar className="w-5 h-5 text-blue-500 mt-0.5 mr-2" />
            <p className="text-gray-900 font-medium">
              {formatDate(meeting.startTime)}
            </p>
          </div>

          <div className="flex items-start">
            <Clock className="w-5 h-5 text-blue-500 mt-0.5 mr-2" />
            <p className="text-gray-900">
              {formatTime(meeting.startTime)} – {formatTime(meeting.endTime)}
            </p>
          </div>

          {meeting.location && (
            <div className="flex items-start">
              <MapPin className="w-5 h-5 text-blue-500 mt-0.5 mr-2" />
              <p className="text-gray-900">{meeting.location}</p>
            </div>
          )}

          <div className="flex items-start">
            <Users className="w-5 h-5 text-blue-500 mt-0.5 mr-2" />
            <div>
              <p className="text-gray-900 font-medium mb-2">Participants</p>
              <div className="space-y-2">
                {participants.length > 0 ? (
                  participants.map((participant) => (
                    <div
                      key={participant.id} // ✅ only id now
                      className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 shadow-sm"
                    >
                      {participant.avatarUrl ? (
                        <img
                          src={participant.avatarUrl}
                          alt={participant.name}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">
                            {participant.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <span className="text-gray-900">{participant.name}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">
                    Loading participants...
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-gray-200 pt-4 space-y-3">
          <div className="flex gap-3">
            <button
              onClick={onEdit}
              className="flex-1 px-4 py-2 rounded-xl border border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100 transition"
            >
              Edit
            </button>
            <button
              onClick={onDelete}
              className="flex-1 px-4 py-2 rounded-xl border border-red-300 bg-red-50 text-red-600 hover:bg-red-100 transition"
            >
              Delete
            </button>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => onStatusUpdate("accepted")}
              className="flex-1 px-4 py-2 rounded-xl bg-green-500 text-white hover:bg-green-600 transition"
            >
              Accept
            </button>
            <button
              onClick={() => onStatusUpdate("rejected")}
              className="flex-1 px-4 py-2 rounded-xl border border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100 transition"
            >
              Decline
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
