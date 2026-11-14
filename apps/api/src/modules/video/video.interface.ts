/**
 * Voice & Video Interface (Release 3)
 *
 * This module is excluded from MVP scope per D-004 & D-007.
 * Defined here as an empty, documented interface to reserve architectural boundaries.
 *
 * Principles (see SYSTEM_ARCHITECTURE.md Chapter 10 & 12):
 * - No random video matching (CONFIRMED)
 * - Only inside accepted Study Together sessions
 * - Camera off by default, explicit consent
 * - WebRTC P2P with TURN relay fallback
 * - No recording by default
 */

export interface IVideoSignalingService {
  createSessionRoom(sessionId: string): Promise<{ roomId: string }>;
  handleIceCandidate(sessionId: string, userId: string, candidate: unknown): Promise<void>;
}
