/**
 * Tests for spoiler-safe notification service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sendSpoilerSafeNotification, verifyResultsToken } from '../spoiler-safe-notifications.js';
import * as emailQueue from '../email-queue.js';
import * as twilio from '../../config/twilio.js';
import { supabaseAdmin } from '../../config/supabase.js';

vi.mock('../email-queue.js');
vi.mock('../../config/twilio.js');
vi.mock('../../config/supabase.js');

describe('Spoiler-Safe Notifications', () => {
  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    display_name: 'Test Player',
    phone: '+12345678900',
  };

  const mockEpisode = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    number: 5,
    season_id: '123e4567-e89b-12d3-a456-426614174002',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendSpoilerSafeNotification', () => {
    it('should send email when email_results is enabled', async () => {
      // Mock notification preferences
      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { email_results: true, sms_results: false, push_results: false },
              error: null,
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { token: 'mock-token-123' },
              error: null,
            }),
          }),
        }),
      } as any);

      vi.mocked(emailQueue.enqueueEmail).mockResolvedValue('email-id-123');

      await sendSpoilerSafeNotification(mockUser, mockEpisode);

      expect(emailQueue.enqueueEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockUser.email,
          subject: expect.stringContaining('Episode 5'),
          type: 'normal',
        })
      );
    });

    it('should send SMS when sms_results is enabled and user has phone', async () => {
      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { email_results: false, sms_results: true, push_results: false },
              error: null,
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { token: 'mock-token-123' },
              error: null,
            }),
          }),
        }),
      } as any);

      vi.mocked(twilio.sendSMS).mockResolvedValue({ sid: 'sms-123', success: true });

      await sendSpoilerSafeNotification(mockUser, mockEpisode);

      expect(twilio.sendSMS).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockUser.phone,
          text: expect.stringContaining('Episode 5 results are ready'),
        })
      );
    });

    it('should not send SMS if user has no phone number', async () => {
      const userWithoutPhone = { ...mockUser, phone: null };

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { email_results: false, sms_results: true, push_results: false },
              error: null,
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { token: 'mock-token-123' },
              error: null,
            }),
          }),
        }),
      } as any);

      await sendSpoilerSafeNotification(userWithoutPhone, mockEpisode);

      expect(twilio.sendSMS).not.toHaveBeenCalled();
    });

    it('should generate results token for user+episode', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null });

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' }, // Not found
            }),
          }),
        }),
        insert: mockInsert,
      } as any);

      vi.mocked(emailQueue.enqueueEmail).mockResolvedValue('email-id-123');

      await sendSpoilerSafeNotification(mockUser, mockEpisode);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUser.id,
          episode_id: mockEpisode.id,
          token: expect.any(String),
          expires_at: expect.any(String),
        })
      );
    });
  });

  describe('verifyResultsToken', () => {
    it('should return valid token data when token is valid', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                user_id: mockUser.id,
                episode_id: mockEpisode.id,
                expires_at: futureDate.toISOString(),
                used_at: null,
              },
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      } as any);

      const result = await verifyResultsToken('valid-token-123');

      expect(result.valid).toBe(true);
      expect(result.userId).toBe(mockUser.id);
      expect(result.episodeId).toBe(mockEpisode.id);
    });

    it('should return invalid when token is expired', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                user_id: mockUser.id,
                episode_id: mockEpisode.id,
                expires_at: pastDate.toISOString(),
                used_at: null,
              },
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await verifyResultsToken('expired-token-123');

      expect(result.valid).toBe(false);
    });

    it('should return invalid when token does not exist', async () => {
      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' },
            }),
          }),
        }),
      } as any);

      const result = await verifyResultsToken('nonexistent-token');

      expect(result.valid).toBe(false);
    });

    it('should mark token as used on first verification', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                user_id: mockUser.id,
                episode_id: mockEpisode.id,
                expires_at: futureDate.toISOString(),
                used_at: null,
              },
              error: null,
            }),
          }),
        }),
        update: mockUpdate,
      } as any);

      await verifyResultsToken('new-token-123');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          used_at: expect.any(String),
        })
      );
    });

    it('should not update token if already used', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const usedDate = new Date();

      const mockUpdate = vi.fn();

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                user_id: mockUser.id,
                episode_id: mockEpisode.id,
                expires_at: futureDate.toISOString(),
                used_at: usedDate.toISOString(),
              },
              error: null,
            }),
          }),
        }),
        update: mockUpdate,
      } as any);

      await verifyResultsToken('used-token-123');

      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });
});
