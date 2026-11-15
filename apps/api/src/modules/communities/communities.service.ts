import { uuidv7 } from '../../../../../packages/shared/src/index.ts';
import { AppError } from '../../common/errors/app-error.ts';
import { DomainEventBus } from '../../common/events/domain-events.ts';
import { type AuthenticatedUser } from '../../common/guards/jwt-auth.guard.ts';
import { Policy } from '../../common/policy/policy.ts';
import { type InstitutionsService } from '../institutions/institutions.service.ts';
import { type ModerationService } from '../moderation/moderation.service.ts';
import { type StudentsService } from '../students/students.service.ts';

export interface CourseCommunityEntity {
  id: string;
  institutionId: string;
  courseId: string;
  name: string;
  memberUserIds: Set<string>;
  createdAt: Date;
}

export interface CommunityPostEntity {
  id: string;
  communityId: string;
  institutionId: string;
  courseId: string;
  authorId: string;
  title: string;
  body: string;
  tags: string[];
  acceptedAnswerId: string | null;
  isRemoved: boolean;
  createdAt: Date;
}

export interface CommunityAnswerEntity {
  id: string;
  postId: string;
  authorId: string;
  body: string;
  isAccepted: boolean;
  isRemoved: boolean;
  createdAt: Date;
}

export class CommunitiesService {
  private readonly communitiesByCourse = new Map<string, CourseCommunityEntity>(); // courseId -> community
  private readonly posts = new Map<string, CommunityPostEntity>();
  private readonly answersByPost = new Map<string, CommunityAnswerEntity[]>();

  private readonly institutionsService: InstitutionsService;
  private readonly studentsService: StudentsService;
  private readonly moderationService: ModerationService;
  private readonly eventBus: DomainEventBus;

  constructor(
    institutionsService: InstitutionsService,
    studentsService: StudentsService,
    moderationService: ModerationService,
    eventBus: DomainEventBus
  ) {
    this.institutionsService = institutionsService;
    this.studentsService = studentsService;
    this.moderationService = moderationService;
    this.eventBus = eventBus;

    // Auto-join students to course communities when `student.enrolled` domain event fires
    this.eventBus.subscribe<{
      userId: string;
      institutionId: string;
      courseIds: string[];
    }>('student.enrolled', (payload) => {
      for (const courseId of payload.courseIds) {
        this.autoJoinCourseCommunity(payload.userId, courseId);
      }
    });
  }

  autoJoinCourseCommunity(userId: string, courseId: string): CourseCommunityEntity {
    const course = this.institutionsService.getCourse(courseId);
    if (!course) {
      throw AppError.notFound('Course not found.');
    }

    let community = this.communitiesByCourse.get(courseId);
    if (!community) {
      community = {
        id: uuidv7(),
        institutionId: course.institutionId,
        courseId: course.id,
        name: `${course.code} — ${course.title}`,
        memberUserIds: new Set<string>(),
        createdAt: new Date(),
      };
      this.communitiesByCourse.set(courseId, community);
    }

    community.memberUserIds.add(userId);
    return community;
  }

  getCommunityForCourse(userId: string, courseId: string): CourseCommunityEntity {
    const profile = this.studentsService.getOwnProfile(userId);
    const community = this.communitiesByCourse.get(courseId);
    if (!community) {
      throw AppError.notFound('Course community not found.');
    }
    if (community.institutionId !== profile.institutionId) {
      throw AppError.forbidden('Cross-institution community access is not permitted.');
    }
    return community;
  }

  createPost(
    authorId: string,
    input: {
      courseId: string;
      title: string;
      body: string;
      tags?: string[];
    },
    now: Date = new Date()
  ): CommunityPostEntity {
    if (!input.courseId) {
      throw AppError.validationFailed('A course tag (courseId) is required for all community posts.');
    }
    if (this.moderationService.isUserRestrictedOrSuspended(authorId, now)) {
      throw AppError.forbidden('Your account is currently restricted from posting.');
    }

    const community = this.getCommunityForCourse(authorId, input.courseId);
    if (!community.memberUserIds.has(authorId)) {
      throw AppError.forbidden('You must be enrolled in this course to post in its community.');
    }

    const title = input.title.trim();
    const body = input.body.trim();
    if (title.length < 5 || title.length > 200) {
      throw AppError.validationFailed('Post title must be between 5 and 200 characters.');
    }
    if (body.length < 10 || body.length > 5000) {
      throw AppError.validationFailed('Post body must be between 10 and 5000 characters.');
    }

    const post: CommunityPostEntity = {
      id: uuidv7(),
      communityId: community.id,
      institutionId: community.institutionId,
      courseId: input.courseId,
      authorId,
      title,
      body,
      tags: input.tags ?? ['Q&A'],
      acceptedAnswerId: null,
      isRemoved: false,
      createdAt: now,
    };

    this.posts.set(post.id, post);
    this.answersByPost.set(post.id, []);
    return post;
  }

  createAnswer(
    authorId: string,
    postId: string,
    bodyText: string,
    now: Date = new Date()
  ): CommunityAnswerEntity {
    if (this.moderationService.isUserRestrictedOrSuspended(authorId, now)) {
      throw AppError.forbidden('Your account is currently restricted from answering.');
    }

    const post = this.posts.get(postId);
    if (!post || post.isRemoved) {
      throw AppError.notFound('Community post not found.');
    }

    const community = this.getCommunityForCourse(authorId, post.courseId);
    if (!community.memberUserIds.has(authorId)) {
      throw AppError.forbidden('You must be a member of this course community to answer.');
    }

    const answer: CommunityAnswerEntity = {
      id: uuidv7(),
      postId: post.id,
      authorId,
      body: bodyText.trim(),
      isAccepted: false,
      isRemoved: false,
      createdAt: now,
    };

    const list = this.answersByPost.get(post.id)!;
    list.push(answer);
    return answer;
  }

  markAcceptedAnswer(
    actorUserId: string,
    postId: string,
    answerId: string
  ): CommunityPostEntity {
    const post = this.posts.get(postId);
    if (!post || post.isRemoved) {
      throw AppError.notFound('Post not found.');
    }
    if (post.authorId !== actorUserId) {
      throw AppError.forbidden('Only the question author can mark an accepted answer.');
    }

    const answers = this.answersByPost.get(postId) ?? [];
    const target = answers.find((a) => a.id === answerId && !a.isRemoved);
    if (!target) {
      throw AppError.notFound('Answer not found.');
    }

    for (const ans of answers) {
      ans.isAccepted = ans.id === answerId;
    }
    post.acceptedAnswerId = answerId;
    return post;
  }

  removePostByModerator(
    moderator: AuthenticatedUser,
    postId: string,
    reason: string
  ): CommunityPostEntity {
    Policy.assertStaffWithMfa(moderator);
    const post = this.posts.get(postId);
    if (!post) {
      throw AppError.notFound('Post not found.');
    }
    post.isRemoved = true;
    this.moderationService.recordAudit({
      actorId: moderator.id,
      actorRole: moderator.role,
      action: 'community.post_removed',
      targetType: 'POST',
      targetId: postId,
      metadata: { reason },
    });
    return post;
  }
}

