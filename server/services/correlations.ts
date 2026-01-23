import { storage } from "../storage";
import type { ServiceCorrelation, InsertServiceCorrelation, Task } from "@shared/schema";

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  description?: string;
  attendees?: Array<{ email: string; name?: string }>;
}

interface EmailThread {
  id: string;
  subject: string;
  snippet: string;
  from: string;
  to?: string[];
  date: string;
}

export class CorrelationService {
  private extractKeywords(text: string): string[] {
    if (!text) return [];
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 're', 'fwd']);
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));
  }

  private extractEmails(text: string): string[] {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    return (text.match(emailRegex) || []).map(e => e.toLowerCase());
  }

  private calculateKeywordOverlap(keywords1: string[], keywords2: string[]): number {
    if (keywords1.length === 0 || keywords2.length === 0) return 0;
    const set1 = new Set(keywords1);
    const matching = keywords2.filter(k => set1.has(k)).length;
    return Math.round((matching / Math.max(keywords1.length, keywords2.length)) * 100);
  }

  private isWithinTimeWindow(date1: Date, date2: Date, windowHours: number = 48): boolean {
    const diffMs = Math.abs(date1.getTime() - date2.getTime());
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours <= windowHours;
  }

  async findRelatedEmails(
    userId: string, 
    event: CalendarEvent, 
    emails: EmailThread[]
  ): Promise<Array<{ email: EmailThread; score: number; reason: string }>> {
    const results: Array<{ email: EmailThread; score: number; reason: string }> = [];
    const eventKeywords = this.extractKeywords(event.title + ' ' + (event.description || ''));
    const eventDate = new Date(event.start);
    const attendeeEmails = new Set(event.attendees?.map(a => a.email.toLowerCase()) || []);

    for (const email of emails) {
      let score = 0;
      const reasons: string[] = [];

      const senderEmail = this.extractEmails(email.from)[0];
      if (senderEmail && attendeeEmails.has(senderEmail)) {
        score += 40;
        reasons.push('attendee_match');
      }

      const emailKeywords = this.extractKeywords(email.subject + ' ' + email.snippet);
      const keywordScore = this.calculateKeywordOverlap(eventKeywords, emailKeywords);
      if (keywordScore > 20) {
        score += Math.min(keywordScore, 40);
        reasons.push('subject_match');
      }

      const emailDate = new Date(email.date);
      if (this.isWithinTimeWindow(eventDate, emailDate, 72)) {
        score += 20;
        reasons.push('time_proximity');
      }

      if (score >= 30) {
        results.push({ email, score, reason: reasons.join(',') });
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, 5);
  }

  async findRelatedTasks(
    userId: string,
    event: CalendarEvent,
    tasks: Task[]
  ): Promise<Array<{ task: Task; score: number; reason: string }>> {
    const results: Array<{ task: Task; score: number; reason: string }> = [];
    const eventKeywords = this.extractKeywords(event.title + ' ' + (event.description || ''));
    const eventDate = new Date(event.start);

    for (const task of tasks) {
      let score = 0;
      const reasons: string[] = [];

      const taskKeywords = this.extractKeywords(task.title + ' ' + (task.description || ''));
      const keywordScore = this.calculateKeywordOverlap(eventKeywords, taskKeywords);
      if (keywordScore > 15) {
        score += Math.min(keywordScore, 50);
        reasons.push('title_match');
      }

      if (task.dueDate) {
        const dueDate = new Date(task.dueDate);
        if (this.isWithinTimeWindow(eventDate, dueDate, 24)) {
          score += 30;
          reasons.push('due_date_proximity');
        }
      }

      if (score >= 25) {
        results.push({ task, score, reason: reasons.join(',') });
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, 5);
  }

  async getOrComputeCorrelations(
    userId: string,
    event: CalendarEvent,
    emails: EmailThread[],
    tasks: Task[]
  ): Promise<{
    emails: Array<{ email: EmailThread; score: number; reason: string }>;
    tasks: Array<{ task: Task; score: number; reason: string }>;
  }> {
    const existing = await storage.getCorrelationsForEvent(userId, event.id);
    
    if (existing.length === 0 || this.shouldRefreshCorrelations(existing)) {
      const relatedEmails = await this.findRelatedEmails(userId, event, emails);
      const relatedTasks = await this.findRelatedTasks(userId, event, tasks);

      await storage.deleteCorrelationsForEvent(userId, event.id);

      const correlations: InsertServiceCorrelation[] = [];

      for (const { email, score, reason } of relatedEmails) {
        correlations.push({
          userId,
          primaryType: 'calendar_event',
          primaryId: event.id,
          primaryTitle: event.title,
          primaryDate: new Date(event.start),
          relatedType: 'email',
          relatedId: email.id,
          relatedTitle: email.subject,
          correlationScore: score,
          correlationReason: reason,
          metadata: { from: email.from, snippet: email.snippet },
        });
      }

      for (const { task, score, reason } of relatedTasks) {
        correlations.push({
          userId,
          primaryType: 'calendar_event',
          primaryId: event.id,
          primaryTitle: event.title,
          primaryDate: new Date(event.start),
          relatedType: 'task',
          relatedId: String(task.id),
          relatedTitle: task.title,
          correlationScore: score,
          correlationReason: reason,
          metadata: { priority: task.priority, dueDate: task.dueDate },
        });
      }

      if (correlations.length > 0) {
        await storage.saveCorrelations(correlations);
      }

      return { emails: relatedEmails, tasks: relatedTasks };
    }

    const emailCorrelations = existing.filter(c => c.relatedType === 'email');
    const taskCorrelations = existing.filter(c => c.relatedType === 'task');

    return {
      emails: emailCorrelations.map(c => ({
        email: {
          id: c.relatedId,
          subject: c.relatedTitle || '',
          snippet: (c.metadata as any)?.snippet || '',
          from: (c.metadata as any)?.from || '',
          date: c.createdAt?.toISOString() || '',
        },
        score: c.correlationScore || 0,
        reason: c.correlationReason || '',
      })),
      tasks: taskCorrelations.map(c => ({
        task: {
          id: parseInt(c.relatedId),
          title: c.relatedTitle || '',
          priority: (c.metadata as any)?.priority || 'medium',
          dueDate: (c.metadata as any)?.dueDate,
        } as Task,
        score: c.correlationScore || 0,
        reason: c.correlationReason || '',
      })),
    };
  }

  private shouldRefreshCorrelations(correlations: ServiceCorrelation[]): boolean {
    if (correlations.length === 0) return true;
    const oldestUpdate = correlations.reduce((oldest, c) => {
      const updated = c.updatedAt ? new Date(c.updatedAt) : new Date(0);
      return updated < oldest ? updated : oldest;
    }, new Date());
    const hoursSinceUpdate = (Date.now() - oldestUpdate.getTime()) / (1000 * 60 * 60);
    return hoursSinceUpdate > 4;
  }
}

export const correlationService = new CorrelationService();
