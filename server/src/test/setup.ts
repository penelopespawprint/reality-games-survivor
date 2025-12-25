// Vitest test setup file
import { vi } from 'vitest';

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.CORS_ORIGIN = 'http://localhost:5173';
process.env.RESEND_API_KEY = 'test-resend-key';
process.env.TWILIO_ACCOUNT_SID = 'test-account-sid';
process.env.TWILIO_AUTH_TOKEN = 'test-auth-token';
process.env.TWILIO_PHONE_NUMBER = '+1234567890';

// Mock Supabase client
vi.mock('../config/supabase.js', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      match: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
    })),
    auth: {
      getUser: vi.fn(),
    },
  },
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      match: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
    })),
    rpc: vi.fn(),
  },
}));

// Mock email service
vi.mock('../config/email.js', () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));

// Mock Twilio
vi.mock('../config/twilio.js', () => ({
  twilioClient: {
    messages: {
      create: vi.fn().mockResolvedValue({ sid: 'test-message-sid' }),
    },
  },
  sendSMS: vi.fn().mockResolvedValue(true),
  formatPhoneNumber: vi.fn((phone) => phone),
}));

// Global test utilities
export const createMockRequest = (overrides = {}) => ({
  headers: {},
  body: {},
  params: {},
  query: {},
  user: null,
  ...overrides,
});

export const createMockResponse = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  return res;
};

export const createMockNext = () => vi.fn();
