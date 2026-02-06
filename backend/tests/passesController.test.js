const { buyPass } = require('../src/controllers/passesController');
const { supabase } = require('../src/services/supabaseClient');
const { razorpay } = require('../src/services/razorpay');

jest.mock('../src/services/supabaseClient', () => ({
  supabase: {
    rpc: jest.fn(),
    from: jest.fn(() => ({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn(),
    })),
  },
}));

jest.mock('../src/services/razorpay', () => ({
  razorpay: {
    orders: {
      create: jest.fn(),
    },
  },
}));

describe('buyPass controller', () => {
  it('creates Razorpay order and inserts DB order', async () => {
    const req = {
      user: { id: 'user-1' },
      params: { id: '1' },
      body: { expected_amount: 5000, version: 0 },
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    supabase.rpc.mockResolvedValue({ data: null, error: null });
    require('../src/services/razorpay').razorpay.orders.create.mockResolvedValue({
      id: 'order_123',
      amount: 500000,
      currency: 'INR',
    });
    supabase.from.mockReturnValue({
      insert: jest.fn().mockResolvedValue({ error: null }),
    });

    await buyPass(req, res, next);

    expect(require('../src/services/razorpay').razorpay.orders.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      razorpay_order: {
        id: 'order_123',
        amount: 500000,
        currency: 'INR',
      },
    });
    expect(next).not.toHaveBeenCalled();
  });
});

