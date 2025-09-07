import React from 'react';
import { Participant } from '../../context/VideoCallContext';

interface ParticipantGridProps {
  participants: Participant[];
}

export const ParticipantGrid: React.FC<ParticipantGridProps> = ({
  participants
}) => {
  const getGridClass = (count: number) => {
    if (count === 0) return 'grid-cols-1';
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-2';
    if (count <= 4) return 'grid-cols-2';
    if (count <= 6) return 'grid-cols-3';
    return 'grid-cols-4';
  };

  if (participants.length === 0) {
    return null;
  }

  return (
    <>
      {participants.map((participant) => (
        <ParticipantVideo
          key={participant.id}
          participant={{
            ...participant,
            stream: participant.stream || null
          }}
          isLocal={false}
        />
      ))}
    </>
  );
};

interface ParticipantVideoProps {
  participant: {
    id: string;
    name: string;
    stream: MediaStream | null;
    isAudioEnabled: boolean;
    isVideoEnabled: boolean;
    isLocal?: boolean;
  };
  isLocal: boolean;
}

const ParticipantVideo: React.FC<ParticipantVideoProps> = ({ participant, isLocal }) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);

  return (
    <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
      {/* Video Element */}
      {participant.stream && participant.isVideoEnabled ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal} // Mute local video to prevent echo
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-700">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-gray-400 text-sm">{participant.name}</p>
          </div>
        </div>
      )}

      {/* Participant Info Overlay */}
      <div className="absolute bottom-2 left-2 right-2">
        <div className="bg-black bg-opacity-50 rounded px-2 py-1 flex items-center justify-between">
          <span className="text-white text-sm font-medium truncate">
            {participant.name}
            {isLocal && ' (You)'}
          </span>
          <div className="flex items-center space-x-1 ml-2">
            {/* Audio Indicator */}
            <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
              participant.isAudioEnabled ? 'bg-green-500' : 'bg-red-500'
            }`}>
              {participant.isAudioEnabled ? (
                <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            
            {/* Video Indicator */}
            <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
              participant.isVideoEnabled ? 'bg-green-500' : 'bg-red-500'
            }`}>
              {participant.isVideoEnabled ? (
                <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                </svg>
              ) : (
                <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                  <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                </svg>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Connection Status */}
      {!participant.stream && (
        <div className="absolute top-2 right-2">
          <div className="bg-yellow-500 text-white text-xs px-2 py-1 rounded">
            Connecting...
          </div>
        </div>
      )}
    </div>
  );
};