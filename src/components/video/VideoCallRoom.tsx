import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { VideoCall } from './VideoCall';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';

interface VideoCallData {
  _id: string;
  roomId: string;
  title: string;
  description?: string;
  organizer: { _id: string; name: string; email: string };
  participants: Array<{ _id: string; name: string; email: string; joinedAt?: Date }>;
  scheduledTime?: Date;
  startTime?: Date;
  endTime?: Date;
  status: 'scheduled' | 'active' | 'ended';
  maxParticipants: number;
  isPublic: boolean;
  settings: { allowChat: boolean; allowScreenShare: boolean; muteOnJoin: boolean };
}

export const VideoCallRoom: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [callData, setCallData] = useState<VideoCallData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasJoined, setHasJoined] = useState(false);

  useEffect(() => {
    if (!roomId) {
      setError('Invalid room ID');
      setLoading(false);
      return;
    }
    fetchCallData();
  }, [roomId]);

  const fetchCallData = async () => {
    try {
      const token = localStorage.getItem('business_nexus_token');
      const res = await fetch(`http://localhost:5000/api/video-calls/${roomId}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed to fetch call data');
      const data = await res.json();
      setCallData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load call data');
    } finally {
      setLoading(false);
    }
  };

  const joinCall = async () => {
    if (!callData || !user) return;
    try {
      const token = localStorage.getItem('business_nexus_token');
      const res = await fetch(`http://localhost:5000/api/video-calls/${roomId}/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed to join call');
      setHasJoined(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join call');
    }
  };

  const leaveCall = async () => {
    if (!callData || !user) return;
    try {
      const token = localStorage.getItem('business_nexus_token');
      await fetch(`http://localhost:5000/api/video-calls/${roomId}/leave`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
    } catch {}
    setHasJoined(false);
    navigate('/video-calls');
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-700 text-lg font-medium">Loading call...</p>
        </div>
      </div>
    );

  if (error || !callData)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 max-w-md text-center">
          <h3 className="font-bold text-lg text-red-600 mb-2">Error</h3>
          <p className="text-gray-700 mb-4">{error || 'Call not found'}</p>
          <Button onClick={() => navigate('/video-calls')} variant="primary" className="w-full">
            Back to Video Calls
          </Button>
        </div>
      </div>
    );

  if (!hasJoined)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-lg border border-gray-200">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-semibold text-gray-800 mb-2">{callData.title}</h1>
            {callData.description && <p className="text-gray-500 mb-4">{callData.description}</p>}
            <div className="text-gray-600 text-sm space-y-1">
              <p>
                <strong>Organizer:</strong> {callData.organizer.name}
              </p>
              <p>
                <strong>Participants:</strong> {callData.participants.length}/{callData.maxParticipants}
              </p>
              {callData.scheduledTime && (
                <p>
                  <strong>Scheduled:</strong> {new Date(callData.scheduledTime).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {callData.status === 'ended' ? (
              <>
                <p className="text-red-500 text-center font-medium">This call has ended.</p>
                <Button onClick={() => navigate('/video-calls')} variant="secondary" className="w-full">
                  Back to Video Calls
                </Button>
              </>
            ) : callData.participants.length >= callData.maxParticipants ? (
              <>
                <p className="text-yellow-500 text-center font-medium">This call is full.</p>
                <Button onClick={() => navigate('/video-calls')} variant="secondary" className="w-full">
                  Back to Video Calls
                </Button>
              </>
            ) : (
              <>
                <Button onClick={joinCall} variant="primary" className="w-full">
                  Join Call
                </Button>
                <Button onClick={() => navigate('/video-calls')} variant="secondary" className="w-full">
                  Cancel
                </Button>
              </>
            )}
          </div>

          <div className="mt-8 pt-4 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Call Settings</h3>
            <div className="flex flex-col gap-2">
              <span
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  callData.settings.allowChat ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}
              >
                Chat: {callData.settings.allowChat ? 'Enabled' : 'Disabled'}
              </span>
              <span
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  callData.settings.allowScreenShare ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}
              >
                Screen Share: {callData.settings.allowScreenShare ? 'Enabled' : 'Disabled'}
              </span>
              <span
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  callData.settings.muteOnJoin ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}
              >
                Mute on Join: {callData.settings.muteOnJoin ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>
      </div>
    );

  return (
    <div className="h-screen bg-gray-50">
      <VideoCall roomId={roomId!} onLeave={leaveCall} />
    </div>
  );
};
