import React from "react";
import { Mic, MicOff, Video, VideoOff, PhoneOff } from "lucide-react";

interface VideoCallControlsProps {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onLeaveCall: () => void;
}

export const VideoCallControls: React.FC<VideoCallControlsProps> = ({
  isAudioEnabled,
  isVideoEnabled,
  onToggleAudio,
  onToggleVideo,
  onLeaveCall,
}) => {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-4 w-[95%] max-w-3xl">
      {/* Controls */}
      <div className="flex items-center justify-center space-x-8 bg-white/20 backdrop-blur-xl border border-white/30 px-8 py-5 rounded-full shadow-2xl">
        {/* Mic */}
        <button
          onClick={onToggleAudio}
          className={`w-14 h-14 flex items-center justify-center rounded-full text-white transition-all duration-300 shadow-lg
            ${
              isAudioEnabled
                ? "bg-blue-500 hover:bg-blue-600"
                : "bg-red-500 hover:bg-red-600"
            }`}
          title={isAudioEnabled ? "Mute microphone" : "Unmute microphone"}
        >
          {isAudioEnabled ? <Mic size={24} /> : <MicOff size={24} />}
        </button>

        {/* Camera */}
        <button
          onClick={onToggleVideo}
          className={`w-14 h-14 flex items-center justify-center rounded-full text-white transition-all duration-300 shadow-lg
            ${
              isVideoEnabled
                ? "bg-blue-500 hover:bg-blue-600"
                : "bg-red-500 hover:bg-red-600"
            }`}
          title={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
        >
          {isVideoEnabled ? <Video size={24} /> : <VideoOff size={24} />}
        </button>

        {/* Leave Call */}
        <button
          onClick={onLeaveCall}
          className="w-14 h-14 flex items-center justify-center rounded-full bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 transition-all duration-300 shadow-lg scale-105 hover:scale-110"
          title="Leave call"
        >
          <PhoneOff size={26} />
        </button>
      </div>

      {/* Status */}
      <div className="flex items-center justify-center space-x-8 text-sm text-gray-200">
        <div className="flex items-center space-x-2">
          <span
            className={`w-3 h-3 rounded-full ${
              isAudioEnabled ? "bg-green-400" : "bg-red-500"
            }`}
          ></span>
          <span>{isAudioEnabled ? "Mic On" : "Mic Off"}</span>
        </div>
        <div className="flex items-center space-x-2">
          <span
            className={`w-3 h-3 rounded-full ${
              isVideoEnabled ? "bg-green-400" : "bg-red-500"
            }`}
          ></span>
          <span>{isVideoEnabled ? "Camera On" : "Camera Off"}</span>
        </div>
      </div>
    </div>
  );
};
