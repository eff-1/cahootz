import {
  RATE_LIMITS,
  uuidv7,
} from '../../../../../packages/shared/src/index.ts';
import { AppError } from '../../common/errors/app-error.ts';
import { DomainEventBus } from '../../common/events/domain-events.ts';
import { type DiscoveryService } from '../discovery/discovery.service.ts';
import { type IdentityService } from '../identity/identity.service.ts';
import { type ModerationService } from '../moderation/moderation.service.ts';
import { type StudentsService } from '../students/students.service.ts';
import { type StudySessionsService } from '../study-sessions/study-sessions.service.ts';

export interface DirectMessageEntity {
  id: string;
  conversationKey: string;
  seq: number;
  senderId: string;
  recipientId: string;
  body: string;
  clientMessageId: string;
  isRemovedByModeration: boolean;
  createdAt: Date;
}

export class MessagingService {
  private readonly messagesByConversation = new Map<string, DirectMessageEntity[]>();
  private readonly messagesById = new Map<string, DirectMessageEntity>();
  private readonly clientMessageIndex = new Map<string, DirectMessageEntity>(); // `${convKey}:${senderId}:${clientMessageId}`

  private readonly identityService: IdentityService;
  private readonly studentsService: StudentsService;
  private readonly discoveryService: DiscoveryService;
  private readonly studySessionsService: StudySessionsService;
  private readonly moderationService: ModerationService;
  private readonly eventBus: DomainEventBus;

  constructor(
    identityService: IdentityService,
    studentsService: StudentsService,
    discoveryService: DiscoveryService,
    studySessionsService: StudySessionsService,
    moderationService: ModerationService,
    eventBus: DomainEventBus
  ) {
    this.identityService = identityService;
    this.studentsService = studentsService;
    this.discoveryService = discoveryService;
    this.studySessionsService = studySessionsService;
    this.moderationService = moderationService;
    this.eventBus = eventBus;
  }

  static getConversationKey(userA: string, userB: string): string {
    return userA < userB ? `${userA}:${userB}` : `${userB}:${userA}`;
  }

  /**
   * Sends a 1:1 text message.
   * Enforces:
   * 1. Moderation restriction check
   * 2. Symmetric block check
   * 3. Institution boundary check
   * 4. Under-18 Minor Protection (Rule 22 & Chapter 12): NO DMs to/from under-18 accounts
   *    unless they have an accepted study invitation or shared study session!
   * 5. Adult academic context check: accepted invitation, shared session, or shared enrolled course
   * 6. Rate limit (`30 messages / minute / conversation`)
   * 7. Persistence before broadcast + monotonic sequence `seq` + `clientMessageId` idempotency
   */
  async sendMessage(
    senderId: string,
    input: {
      recipientId: string;
      body: string;
      clientMessageId: string;
    },
    now: Date = new Date()
  ): Promise<DirectMessageEntity> {
    if (senderId === input.recipientId) {
      throw AppError.validationFailed('Cannot send a direct message to yourself.');
    }

    if (this.moderationService.isUserRestrictedOrSuspended(senderId, now)) {
      throw AppError.forbidden('Your account is currently restricted from sending messages.');
    }

    if (this.studentsService.isBlockedBetween(senderId, input.recipientId)) {
      throw AppError.forbidden('Cannot send message to this user.');
    }

    const senderProfile = this.studentsService.getOwnProfile(senderId);
    const recipientProfile = this.studentsService.findProfile(input.recipientId);
    if (!recipientProfile) {
      throw AppError.notFound('Recipient not found.');
    }

    if (senderProfile.institutionId !== recipientProfile.institutionId) {
      throw AppError.forbidden('Cross-institution direct messaging is not permitted.');
    }

    const senderInfo = this.identityService.getPublicInfo(senderId);
    const recipientInfo = this.identityService.getPublicInfo(input.recipientId);
    if (!senderInfo || !recipientInfo) {
      throw AppError.notFound('User not found.');
    }

    const hasSessionConnection =
      this.discoveryService.hasAcceptedInvitationBetween(senderId, input.recipientId) ||
      this.studySessionsService.hasSharedSessionBetween(senderId, input.recipientId);

    // Rule 22: Under-18 restricted mode — no DMs from/to non-session contacts
    if ((senderInfo.isRestricted || recipientInfo.isRestricted) && !hasSessionConnection) {
      throw AppError.forbidden(
        'Under-18 protection: Direct messages are only allowed between confirmed study-session partners.'
      );
    }

    // Charter #7: Academically scoped social — adult DMs require session connection or shared course
    if (!hasSessionConnection) {
      const senderCourses = new Set(this.studentsService.getEnrolledCourseIds(senderId));
      const recipientCourses = this.studentsService.getEnrolledCourseIds(input.recipientId);
      const hasSharedCourse = recipientCourses.some((c) => senderCourses.has(c));
      if (!hasSharedCourse) {
        throw AppError.forbidden(
          'Direct messages require an accepted study invitation, shared session, or shared enrolled course.'
        );
      }
    }

    const convKey = MessagingService.getConversationKey(senderId, input.recipientId);
    const idemKey = `${convKey}:${senderId}:${input.clientMessageId}`;
    const existing = this.clientMessageIndex.get(idemKey);
    if (existing) {
      return existing;
    }

    const body = input.body.trim();
    if (body.length < 1 || body.length > 2000) {
      throw AppError.validationFailed('Message body must be between 1 and 2000 characters.');
    }

    // Rate limit check (`RATE_LIMITS.MESSAGES_PER_MINUTE = 30`)
    const list = this.messagesByConversation.get(convKey) ?? [];
    const oneMinuteAgo = new Date(now.getTime() - 60_000);
    const recentCount = list.filter(
      (m) => m.senderId === senderId && m.createdAt >= oneMinuteAgo
    ).length;
    if (recentCount >= RATE_LIMITS.MESSAGES_PER_MINUTE) {
      throw AppError.rateLimited(
        `Message rate limit (${RATE_LIMITS.MESSAGES_PER_MINUTE} per minute) exceeded.`
      );
    }

    // Persist BEFORE broadcast
    const message: DirectMessageEntity = {
      id: uuidv7(),
      conversationKey: convKey,
      seq: list.length + 1,
      senderId,
      recipientId: input.recipientId,
      body,
      clientMessageId: input.clientMessageId,
      isRemovedByModeration: false,
      createdAt: now,
    };

    list.push(message);
    this.messagesByConversation.set(convKey, list);
    this.messagesById.set(message.id, message);
    this.clientMessageIndex.set(idemKey, message);

    await this.eventBus.publish('message.created', {
      messageId: message.id,
      conversationKey: convKey,
      seq: message.seq,
      senderId,
      recipientId: input.recipientId,
    });

    return message;
  }

  listMessages(actorUserId: string, otherUserId: string): DirectMessageEntity[] {
    const convKey = MessagingService.getConversationKey(actorUserId, otherUserId);
    const list = this.messagesByConversation.get(convKey) ?? [];
    return list.filter((m) => !m.isRemovedByModeration);
  }

  /**
   * Security Rule 17: Uploads are disabled in MVP unless virus scanning hook is enabled.
   */
  uploadAttachment(): never {
    throw AppError.forbidden(
      'File attachments in direct messages are disabled in MVP (virus scanning hook not enabled).'
    );
  }
}

