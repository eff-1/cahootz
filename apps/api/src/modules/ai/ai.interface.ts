/**
 * AI Study Assistant Interface (Release 2)
 *
 * This module is excluded from MVP scope per D-007.
 * Defined here as an empty, documented interface to reserve architectural boundaries.
 *
 * Key components planned for R2 (see FEATURE_SPECIFICATIONS.md Chapter 09):
 * - LlmProvider abstraction (chat, embed, moderate)
 * - Document ingestion & pgvector embeddings
 * - Course-grounded RAG with strict visibility access filters
 */

export interface ILlmProvider {
  chat(messages: Array<{ role: string; content: string }>): Promise<string>;
  embed(text: string): Promise<number[]>;
}

export interface IAiStudyService {
  askCourseQuestion(courseId: string, question: string, userId: string): Promise<{ answer: string; citations: string[] }>;
}
