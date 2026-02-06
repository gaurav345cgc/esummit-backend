const authMiddleware = require('../src/middleware/auth');
const { supabase } = require('../src/services/supabaseClient');

jest.mock('../src/services/supabaseClient', () => {
  const getUser = jest.fn();
  return {
    supabase: {
      auth: {
        getUser,
      },
    },
  };
});

describe('auth middleware', () => {
  it('returns 401 when no Authorization header', async () => {
    const req = { headers: {} };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing Authorization header' });
    expect(next).not.toHaveBeenCalled();
  });

  it('attaches user on valid token', async () => {
    const req = { headers: { authorization: 'Bearer token123' } };
    const res = {};
    const next = jest.fn();

    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    await authMiddleware(req, res, next);

    expect(req.user).toEqual({ id: 'user-1' });
    expect(next).toHaveBeenCalled();
  });
});

