import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Meeting } from "../../types";
import { API_URL } from "../../config/api";
import { Calendar } from "lucide-react";

interface CreateMeetingFormProps {
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Meeting;
}

export const CreateMeetingForm: React.FC<CreateMeetingFormProps> = ({
  onClose,
  onSuccess,
  initialData,
}) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    startTime: "",
    endTime: "",
    participants: [] as string[],
    location: "",
  });

  // Populate when editing
  useEffect(() => {
    if (initialData) {
      const startDate = new Date(initialData.startTime);
      const endDate = new Date(initialData.endTime);

      setFormData({
        title: initialData.title,
        description: initialData.description || "",
        date: startDate.toISOString().split("T")[0],
        startTime: startDate.toISOString().split("T")[1].slice(0, 5),
        endTime: endDate.toISOString().split("T")[1].slice(0, 5),
        participants: initialData.participants.map((p) => p.userId),
        location: initialData.location || "",
      });
    }
  }, [initialData]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setError(null);

      if (!formData.date || !formData.startTime || !formData.endTime) {
        setError("Please fill in all required fields including date and time.");
        return;
      }

      const startDateTime = new Date(
        `${formData.date}T${formData.startTime}:00`
      );
      const endDateTime = new Date(`${formData.date}T${formData.endTime}:00`);

      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        setError("Invalid date or time format.");
        return;
      }

      if (endDateTime <= startDateTime) {
        setError("End time must be after start time.");
        return;
      }

      const isEditing = !!initialData;
      const url = isEditing
        ? `${API_URL}/meetings/${initialData.id}`
        : `${API_URL}/meetings`;

      const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem(
            "business_nexus_token"
          )}`,
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          location: formData.location,
          participants: formData.participants,
          ...(isEditing ? {} : { organizerId: user?.id }),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create meeting");
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create meeting."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm w-full max-w-lg p-6 overflow-y-auto max-h-[90vh]">
        {/* Heading */}
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-blue-500" />
          {initialData ? "Edit Meeting" : "Create New Meeting"}
        </h2>

        {/* Error */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Meeting Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="e.g. Project Kickoff"
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
              placeholder="Optional agenda or notes"
              className="w-full border border-gray-200 rounded-2xl px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
              className="w-full border border-gray-200 rounded-2xl px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          {/* Start & End */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Start Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
                required
                className="w-full border border-gray-200 rounded-2xl px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                End Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                name="endTime"
                value={formData.endTime}
                onChange={handleChange}
                required
                className="w-full border border-gray-200 rounded-2xl px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Location
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="Office, Zoom, Google Meet..."
              className="w-full border border-gray-200 rounded-2xl px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-2xl border border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 rounded-2xl bg-blue-500 text-white hover:bg-blue-600 transition"
            >
              {isLoading
                ? "Saving..."
                : initialData
                ? "Update Meeting"
                : "Create Meeting"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
