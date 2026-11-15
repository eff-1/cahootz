import { type AuthenticatedUser } from '../../common/guards/jwt-auth.guard.ts';
import {
  type DiscoveryCandidate,
  type DiscoveryQuery,
  type DiscoveryService,
  type StudyInvitationEntity,
  type StudyNowSignal,
} from './discovery.service.ts';

export class DiscoveryController {
  private readonly discoveryService: DiscoveryService;

  constructor(discoveryService: DiscoveryService) {
    this.discoveryService = discoveryService;
  }

  discoverPartners(
    user: AuthenticatedUser,
    query: DiscoveryQuery
  ): { items: DiscoveryCandidate[] } {
    return {
      items: this.discoveryService.discoverPartners(user.id, query),
    };
  }

  setStudyNow(
    user: AuthenticatedUser,
    body: { courseId?: string; goalNote?: string; durationMinutes?: number }
  ): StudyNowSignal {
    return this.discoveryService.setStudyNowSignal(user.id, body);
  }

  clearStudyNow(user: AuthenticatedUser): { cleared: boolean } {
    return this.discoveryService.clearStudyNowSignal(user.id);
  }

  sendInvitation(
    user: AuthenticatedUser,
    body: {
      recipientId: string;
      courseId: string;
      goal: string;
      proposedStartAt?: string;
      durationMinutes?: number;
      mode?: string;
    },
    idempotencyKey?: string
  ): Promise<StudyInvitationEntity> {
    return this.discoveryService.sendInvitation(user.id, {
      recipientId: body.recipientId,
      courseId: body.courseId,
      goal: body.goal,
      proposedStartAt: body.proposedStartAt ? new Date(body.proposedStartAt) : undefined,
      durationMinutes: body.durationMinutes,
      mode: body.mode,
      idempotencyKey,
    });
  }

  acceptInvitation(
    user: AuthenticatedUser,
    invitationId: string
  ): Promise<StudyInvitationEntity> {
    return this.discoveryService.acceptInvitation(user.id, invitationId);
  }

  declineInvitation(
    user: AuthenticatedUser,
    invitationId: string
  ): Promise<StudyInvitationEntity> {
    return this.discoveryService.declineInvitation(user.id, invitationId);
  }

  withdrawInvitation(
    user: AuthenticatedUser,
    invitationId: string
  ): Promise<StudyInvitationEntity> {
    return this.discoveryService.withdrawInvitation(user.id, invitationId);
  }

  listMyInvitations(
    user: AuthenticatedUser,
    direction: 'incoming' | 'outgoing' | 'all' = 'all'
  ): { items: StudyInvitationEntity[] } {
    return {
      items: this.discoveryService.listInvitationsForUser(user.id, direction),
    };
  }
}

