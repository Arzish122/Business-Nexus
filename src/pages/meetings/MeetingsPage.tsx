import React, { useState, useEffect } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useAuth } from "../../context/AuthContext";
import { Meeting, User } from "../../types";
import { Button } from "../../components/ui/Button";
import {
  Plus,
  Calendar as CalendarIcon,
  AlertCircle,
} from "lucide-react";
import { CreateMeetingForm } from "../../components/meetings/CreateMeetingForm";
import { MeetingDetailsModal } from "../../components/meetings/MeetingDetailsModal";
import { API_URL } from "../../config/api";

const localizer = momentLocalizer(moment);

export const MeetingsPage: React.FC = () => {
  const {  } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [participants, setParticipants] = useState<User[]>([]);
  const [error, setError] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);

  const fetchMeetings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/meetings`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem(
            "business_nexus_token"
          )}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch meetings");
      }

      const data = await response.json();
      const mappedMeetings = data.map((meeting: any) => ({
        ...meeting,
        id: meeting._id || meeting.id,
      }));
      setMeetings(mappedMeetings);
    } catch (error) {
      console.error("Error fetching meetings:", error);
      setError("Failed to load meetings. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  const calendarEvents = meetings.map((meeting) => ({
    id: meeting.id,
    title: meeting.title,
    start: new Date(meeting.startTime),
    end: new Date(meeting.endTime),
    resource: meeting,
  }));

  const handleSelectEvent = async (event: any) => {
    const meeting = event.resource;
    setSelectedMeeting(meeting);

    try {
      const participantIds = meeting.participants.map((p: any) => p.userId);
      const participantPromises = participantIds.map((id: string) =>
        fetch(`${API_URL}/users/${id}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem(
              "business_nexus_token"
            )}`,
          },
        }).then((res) => res.json())
      );

      const participantData = await Promise.all(participantPromises);
      setParticipants(participantData);
    } catch (error) {
      console.error("Error fetching participants:", error);
    }
  };

  const handleCreateMeetingSuccess = () => {
    fetchMeetings();
  };

  const handleEditMeetingSuccess = () => {
    setShowEditModal(false);
    setSelectedMeeting(null);
    fetchMeetings();
  };

  const handleDeleteMeeting = async () => {
    if (!selectedMeeting) return;

    try {
      const response = await fetch(`${API_URL}/meetings/${selectedMeeting.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem(
            "business_nexus_token"
          )}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete meeting");
      }

      setSelectedMeeting(null);
      fetchMeetings();
    } catch (error) {
      console.error("Error deleting meeting:", error);
      setError("Failed to delete meeting. Please try again.");
    }
  };

  const handleUpdateMeetingStatus = async (
    status: "accepted" | "rejected" | "cancelled"
  ) => {
    if (!selectedMeeting) return;

    try {
      let endpoint = "";
      let method = "PATCH";
      let body = null;

      if (status === "accepted") {
        endpoint = `${API_URL}/meetings/${selectedMeeting.id}/accept`;
      } else if (status === "rejected") {
        endpoint = `${API_URL}/meetings/${selectedMeeting.id}/reject`;
      } else {
        endpoint = `${API_URL}/meetings/${selectedMeeting.id}/status`;
        body = JSON.stringify({ status });
      }

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem(
            "business_nexus_token"
          )}`,
        },
        ...(body && { body }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 409) {
          const conflictMessage = errorData.conflicts
            ? `${errorData.message}\n\nConflicting meetings:\n${errorData.conflicts
                .map(
                  (c: any) =>
                    `• ${c.title} (${new Date(
                      c.startTime
                    ).toLocaleString()} - ${new Date(
                      c.endTime
                    ).toLocaleString()})`
                )
                .join("\n")}`
            : errorData.message;
          setError(conflictMessage);
          return;
        }
        throw new Error(errorData.message || "Failed to update meeting status");
      }

      setSelectedMeeting(null);
      fetchMeetings();
    } catch (error) {
      console.error("Error updating meeting status:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      if (!errorMessage.includes("conflict")) {
        setError("Failed to update meeting status. Please try again.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent flex items-center gap-3">
            <CalendarIcon size={40} /> Meetings
          </h1>
          <p className="text-gray-600 mt-2 text-lg">
            Schedule, manage, and track your meetings
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          leftIcon={<Plus size={18} />}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg transition-all duration-300"
        >
          Schedule Meeting
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="animate-slide-in bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg flex items-start mb-6 shadow-md">
          <AlertCircle size={18} className="mr-2 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Calendar */}
      {isLoading ? (
        <div className="flex justify-center items-center h-[600px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white/70 backdrop-blur-lg rounded-3xl shadow-xl p-6 border border-gray-200">
          <div className="h-[650px] rounded-xl overflow-hidden">
            <Calendar
              localizer={localizer}
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              onSelectEvent={handleSelectEvent}
              views={["month", "week", "day", "agenda"]}
              defaultView="month"
              defaultDate={new Date()}
              popup
              className="rbc-tw"
            />
          </div>
        </div>
      )}

      {/* Create Meeting Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 transition-all">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Schedule New Meeting
            </h2>
            <CreateMeetingForm
              onClose={() => setShowCreateModal(false)}
              onSuccess={handleCreateMeetingSuccess}
            />
          </div>
        </div>
      )}

      {/* Meeting Details Modal */}
      {selectedMeeting && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 transition-all">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl max-h-[85vh] overflow-y-auto">
            <MeetingDetailsModal
              meeting={selectedMeeting}
              onClose={() => setSelectedMeeting(null)}
              onEdit={() => setShowEditModal(true)}
              onDelete={handleDeleteMeeting}
              onStatusUpdate={handleUpdateMeetingStatus}
              participants={participants}
            />
          </div>
        </div>
      )}

      {/* Edit Meeting Modal */}
      {showEditModal && selectedMeeting && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 transition-all">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Edit Meeting
            </h2>
            <CreateMeetingForm
              onClose={() => setShowEditModal(false)}
              onSuccess={handleEditMeetingSuccess}
              initialData={selectedMeeting}
            />
          </div>
        </div>
      )}

      {/* 👉 Calendar style overrides (no logic changes) */}
      <style>{`
        /* Scope to this page only via .rbc-tw wrapper */
        .rbc-tw .rbc-calendar {
          font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji";
          color: #111827; /* gray-900 */
        }

        /* Toolbar */
        .rbc-tw .rbc-toolbar {
          padding: 0.75rem 0.5rem;
          margin-bottom: 0.75rem;
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          border-bottom: 1px solid #e5e7eb; /* gray-200 */
        }
        .rbc-tw .rbc-toolbar .rbc-toolbar-label {
          font-weight: 700;
          font-size: 1.1rem;
          color: #111827;
        }
        .rbc-tw .rbc-btn-group > button {
          border: 1px solid #e5e7eb;
          background: #ffffff;
          color: #374151; /* gray-700 */
          padding: 0.4rem 0.7rem;
          border-radius: 0.6rem;
          transition: transform .08s ease, background .2s ease, color .2s ease, border-color .2s ease, box-shadow .2s ease;
          box-shadow: 0 1px 1px rgba(17,24,39,0.04);
        }
        .rbc-tw .rbc-btn-group > button:hover {
          background: #f9fafb; /* gray-50 */
          border-color: #d1d5db; /* gray-300 */
          transform: translateY(-1px);
        }
        .rbc-tw .rbc-btn-group > button.rbc-active,
        .rbc-tw .rbc-btn-group > button:active {
          background: #111827; /* gray-900 */
          color: #ffffff;
          border-color: #111827;
          box-shadow: 0 6px 14px rgba(17,24,39,0.18);
        }

        /* Month header row */
        .rbc-tw .rbc-month-view .rbc-header {
          background: #fafafa; /* gray-50 */
          color: #374151; /* gray-700 */
          font-weight: 600;
          padding: 0.6rem 0.25rem;
          border-bottom: 1px solid #e5e7eb;
        }

        /* Month grid */
        .rbc-tw .rbc-month-row + .rbc-month-row {
          border-top: 1px solid #e5e7eb;
        }
        .rbc-tw .rbc-day-bg + .rbc-day-bg {
          border-left: 1px solid #f3f4f6; /* gray-100 */
        }
        .rbc-tw .rbc-date-cell {
          padding: 0.35rem 0.4rem;
          font-weight: 600;
          color: #111827; /* gray-900 */
        }
        .rbc-tw .rbc-off-range {
          color: #9ca3af; /* gray-400 */
          font-weight: 500;
        }
        .rbc-tw .rbc-off-range-bg {
          background: #fafafa; /* gray-50 */
        }

        /* Today highlight */
        .rbc-tw .rbc-today {
          background: #f3f4f6; /* gray-100 */
          position: relative;
        }
        .rbc-tw .rbc-today::after {
          content: "";
          position: absolute;
          inset: 0;
          border: 1px solid #111827; /* gray-900 */
          opacity: 0.08;
          pointer-events: none;
          border-radius: 4px;
        }

        /* Hover on day cells */
        .rbc-tw .rbc-month-view .rbc-day-bg:hover {
          background: #f9fafb;
        }

        /* Events (month & time views) */
        .rbc-tw .rbc-event,
        .rbc-tw .rbc-day-slot .rbc-background-event {
          background: #10b981; /* emerald-500 */
          border: none;
          color: #ffffff;
          border-radius: 10px;
          padding: 4px 8px;
          box-shadow: 0 6px 14px rgba(16,185,129,0.25);
          transition: transform .06s ease, box-shadow .2s ease, background .2s ease;
        }
        .rbc-tw .rbc-event:hover,
        .rbc-tw .rbc-day-slot .rbc-background-event:hover {
          background: #059669; /* emerald-600 */
          transform: translateY(-1px);
          box-shadow: 0 10px 18px rgba(5,150,105,0.25);
        }
        .rbc-tw .rbc-event-content {
          font-weight: 600;
          letter-spacing: 0.1px;
        }

        /* Week/Day time grid */
        .rbc-tw .rbc-time-view {
          border-color: #e5e7eb;
        }
        .rbc-tw .rbc-time-header {
          border-bottom: 1px solid #e5e7eb;
          background: #fafafa;
        }
        .rbc-tw .rbc-time-header .rbc-header {
          border-left: 1px solid #e5e7eb;
          color: #374151;
          font-weight: 600;
          background: transparent;
        }
        .rbc-tw .rbc-time-content {
          border-top: 1px solid #e5e7eb;
        }
        .rbc-tw .rbc-timeslot-group {
          border-color: #f3f4f6; /* gray-100 */
        }
        .rbc-tw .rbc-time-slot {
          border-top: 1px dotted #eef2f7;
        }
        .rbc-tw .rbc-current-time-indicator {
          background-color: #ef4444; /* red-500 */
          height: 2px;
        }

        /* Agenda view */
        .rbc-tw .rbc-agenda-view {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          overflow: hidden;
        }
        .rbc-tw .rbc-agenda-table {
          border: none;
        }
        .rbc-tw .rbc-agenda-view table.rbc-agenda-table thead > tr > th {
          background: #fafafa;
          color: #374151;
          font-weight: 700;
          border-bottom: 1px solid #e5e7eb;
          padding: 0.75rem;
        }
        .rbc-tw .rbc-agenda-view table.rbc-agenda-table tbody > tr > td {
          border-top: 1px solid #f3f4f6;
          padding: 0.7rem 0.75rem;
        }
        .rbc-tw .rbc-agenda-time-cell {
          color: #111827;
          font-weight: 600;
        }
        .rbc-tw .rbc-agenda-date-cell {
          color: #374151;
          font-weight: 600;
        }

        /* Selection & focus states */
        .rbc-tw .rbc-selected-cell {
          background: #ecfeff; /* cyan-50 */
        }
        .rbc-tw .rbc-slot-selection {
          background: rgba(16,185,129,0.12); /* emerald selection */
          border: 1px solid rgba(16,185,129,0.35);
        }
      `}</style>
    </div>
  );
};
