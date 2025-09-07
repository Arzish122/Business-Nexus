import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Video } from "lucide-react";

interface CreateVideoCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCallCreated: (roomId: string) => void;
}

export const CreateVideoCallModal: React.FC<CreateVideoCallModalProps> = ({
  isOpen,
  onClose,
  onCallCreated,
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    scheduledTime: "",
    maxParticipants: 10,
    isPublic: false,
    allowChat: true,
    allowScreenShare: true,
    muteOnJoin: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("business_nexus_token");
      if (!token) throw new Error("Authentication failed. Please log in again.");

      const response = await fetch(`${API_URL}/api/video-calls`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          scheduledTime: formData.scheduledTime || undefined,
          settings: {
            allowChat: formData.allowChat,
            allowScreenShare: formData.allowScreenShare,
            muteOnJoin: formData.muteOnJoin,
          },
        }),
      });

      if (!response.ok) throw new Error("Failed to create video call");

      const data = await response.json();
      const roomId = data?.videoCall?.roomId;

      if (!roomId) throw new Error("Room ID missing from server response.");

      onCallCreated(roomId);
      onClose();
      setFormData({
        title: "",
        description: "",
        scheduledTime: "",
        maxParticipants: 10,
        isPublic: false,
        allowChat: true,
        allowScreenShare: true,
        muteOnJoin: false,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create video call");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm w-full max-w-lg p-6 overflow-y-auto max-h-[90vh]">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Video className="w-6 h-6 text-blue-500" /> Create New Video Call
        </h2>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="Enter call title"
              className="w-full border border-gray-200 rounded-2xl px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              placeholder="Optional description"
              className="w-full border border-gray-200 rounded-2xl px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          {/* Scheduled Time & Max Participants */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Scheduled Time
              </label>
              <input
                type="datetime-local"
                name="scheduledTime"
                value={formData.scheduledTime}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded-2xl px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Max Participants
              </label>
              <select
                name="maxParticipants"
                value={formData.maxParticipants}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded-2xl px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              >
                {[2, 4, 6, 8, 10, 15, 20].map((n) => (
                  <option key={n} value={n}>
                    {n} participants
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Call Settings */}
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Call Settings</h3>
            {[
              { id: "isPublic", label: "Public call (anyone with link can join)" },
              { id: "allowChat", label: "Allow chat during call" },
              { id: "allowScreenShare", label: "Allow screen sharing" },
              { id: "muteOnJoin", label: "Mute participants on join" },
            ].map((setting) => (
              <div key={setting.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={setting.id}
                  name={setting.id}
                  checked={(formData as any)[setting.id]}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-500 border-gray-300 rounded cursor-pointer"
                />
                <label htmlFor={setting.id} className="text-sm text-gray-700">
                  {setting.label}
                </label>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-2xl border border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 rounded-2xl bg-blue-500 text-white hover:bg-blue-600 transition"
              disabled={loading}
            >
              {loading ? "Creating..." : "Create Call"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
