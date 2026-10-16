import React from 'react';
import { SyncedPlayer } from '../components/SyncedPlayer';
import { ChatPanel } from '../components/ChatPanel';
import { TopBar } from '../components/TopBar';

export function RoomPage({
  roomId,
  isHost,
  canControl,
  onToggleControlMode,
  onOpenMediaModal,
  onOpenSettings,
  onLeaveRoom,
  currentMedia,
  onBroadcastSync,
  remoteSyncEvent,
  onRequestSync,
  onVideoEnded,
  floatingReactions,
  messages,
  participants,
  currentUser,
  onSendMessage,
  onSendReaction,
  // Cola y Votaciones
  playlist = [],
  onAddToPlaylist,
  onRemoveFromPlaylist,
  onPlayQueueItem,
  skipVotes = [],
  onVoteSkip,
  enableVoteSkip = true,
  allowGuestAddVideos = true,
}) {
  return (
    <div className="app-layout">
      {/* Barra superior de la sala */}
      <TopBar
        roomId={roomId}
        isHost={isHost}
        canControl={canControl}
        onToggleControlMode={onToggleControlMode}
        onOpenMediaModal={onOpenMediaModal}
        onOpenSettings={onOpenSettings}
        onLeaveRoom={onLeaveRoom}
        currentMediaTitle={currentMedia?.title}
      />

      {/* Área principal: Reproductor + Chat en vivo */}
      <div className="workspace-grid">
        {/* Columna izquierda: Reproductor y burbujas de reacción */}
        <div className="player-wrapper">
          <SyncedPlayer
            media={currentMedia}
            isHost={isHost}
            canControl={canControl}
            onBroadcastSync={onBroadcastSync}
            remoteSyncEvent={remoteSyncEvent}
            onRequestSync={onRequestSync}
            onVideoEnded={onVideoEnded}
          />

          {/* Burbujas flotantes de reacciones */}
          {floatingReactions.map((bubble) => (
            <div
              key={bubble.id}
              className="reaction-bubble"
              style={{
                left: bubble.left,
                bottom: bubble.bottom,
              }}
            >
              {bubble.emoji}
            </div>
          ))}
        </div>

        {/* Columna derecha: Chat, Videos por ver y Participantes */}
        <div className="chat-wrapper">
          <ChatPanel
            messages={messages}
            participants={participants}
            currentUser={currentUser}
            onSendMessage={onSendMessage}
            onSendReaction={onSendReaction}
            playlist={playlist}
            onAddToPlaylist={onAddToPlaylist}
            onRemoveFromPlaylist={onRemoveFromPlaylist}
            onPlayQueueItem={onPlayQueueItem}
            skipVotes={skipVotes}
            onVoteSkip={onVoteSkip}
            enableVoteSkip={enableVoteSkip}
            allowGuestAddVideos={allowGuestAddVideos}
            isHost={isHost}
          />
        </div>
      </div>
    </div>
  );
}
