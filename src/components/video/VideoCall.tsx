// src/components/video/VideoCall.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useVideoCall } from '../../context/VideoCallContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { VideoCallControls } from './VideoCallControls';
import { ParticipantGrid } from './ParticipantGrid';

interface VideoCallProps {
  roomId: string;
  onLeave: () => void;
}

export const VideoCall: React.FC<VideoCallProps> = ({ roomId, onLeave }) => {
  const {  } = useAuth();
  const {
    localStream,
    participants,
    isInCall,
    joinRoom,
    leaveRoom,
    isAudioEnabled,
    isVideoEnabled,
    toggleAudio,
    toggleVideo,
  } = useVideoCall();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (roomId && !isInCall && !isJoining) {
      handleJoinRoom();
    }
  }, [roomId]);

  const handleJoinRoom = async () => {
    try {
      setIsJoining(true);
      setError('');
      await joinRoom(roomId);
    } catch (err) {
      setError('Failed to join video call.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveRoom = () => {
    leaveRoom();
    onLeave();
  };

  // Error
  if (error)
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-red-50 z-50 p-4">
        <div className="text-red-600 text-center mb-4">
          <p className="text-lg font-bold">Connection Error</p>
          <p className="text-sm">{error}</p>
        </div>
        <div className="flex space-x-3">
          <Button onClick={handleJoinRoom} disabled={isJoining}>
            {isJoining ? 'Retrying...' : 'Try Again'}
          </Button>
          <Button variant="outline" onClick={onLeave}>
            Back to Video Calls
          </Button>
        </div>
      </div>
    );

  // Joining loader
  if (isJoining)
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-indigo-50 z-50 p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mb-4"></div>
        <p className="text-gray-600 text-lg">Joining video call...</p>
      </div>
    );

  if (!isInCall) return null; // Already handled in VideoCallRoom

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-indigo-100 px-6 py-3 flex items-center justify-between shadow">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-gray-900 font-semibold text-lg">
            Video Call - Room <span className="font-mono">{roomId}</span>
          </span>
          <span className="text-gray-600 text-sm">({participants.size + 1} participants)</span>
        </div>
        <Button
          variant="outline"
          onClick={handleLeaveRoom}
          className="text-red-500 border-red-500 hover:bg-red-500 hover:text-white"
        >
          Leave Call
        </Button>
      </div>

      {/* Video Grid */}
      <div className="flex-1 p-4 overflow-hidden bg-white">
        <div
          className="h-full grid gap-4 rounded-xl"
          style={{
            gridTemplateColumns:
              participants.size === 0
                ? '1fr'
                : participants.size === 1
                ? '1fr 1fr'
                : participants.size <= 4
                ? 'repeat(2, 1fr)'
                : 'repeat(3, 1fr)',
            gridTemplateRows:
              participants.size <= 2
                ? '1fr'
                : participants.size <= 4
                ? 'repeat(2, 1fr)'
                : 'repeat(3, 1fr)',
          }}
        >
          {/* Local Video */}
          <div className="relative bg-gray-100 rounded-xl overflow-hidden border border-gray-300">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2 bg-white bg-opacity-70 text-gray-900 px-2 py-1 rounded text-sm font-medium">
              You {!isVideoEnabled && '(Video Off)'}
            </div>
          </div>

          {/* Remote Participants */}
          <ParticipantGrid participants={Array.from(participants.values())} />
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-100 px-4 py-3 border-t border-gray-300 shadow-inner">
        <VideoCallControls
          isAudioEnabled={isAudioEnabled}
          isVideoEnabled={isVideoEnabled}
          onToggleAudio={toggleAudio}
          onToggleVideo={toggleVideo}
          onLeaveCall={handleLeaveRoom}
        />
      </div>
    </div>
  );
};
