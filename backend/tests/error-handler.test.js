jest.mock('../utils/logger', () => ({
  error: jest.fn(),
  warn: jest.fn()
}));

const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const { notFound, errorHandler } = require('../middleware/errorHandler');

function responseMock() {
  return {
    status: jest.fn(function status() { return this; }),
    json: jest.fn(function json() { return this; })
  };
}

describe('standard error handling', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    jest.clearAllMocks();
  });

  test('notFound creates a standardized AppError', () => {
    const next = jest.fn();
    notFound({ method: 'GET', originalUrl: '/missing' }, {}, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      status: 404,
      code: 'NOT_FOUND',
      message: 'Route not found: GET /missing'
    }));
  });

  test('hides internal error details in production', () => {
    process.env.NODE_ENV = 'production';
    const res = responseMock();

    errorHandler(new Error('database exploded'), {
      method: 'GET',
      originalUrl: '/api/private',
      id: 'req-1',
      ip: '127.0.0.1'
    }, res, jest.fn());

    expect(logger.error).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Internal server error',
      code: 'ERROR',
      request_id: 'req-1'
    });
  });

  test('returns safe application errors with request id', () => {
    process.env.NODE_ENV = 'development';
    const res = responseMock();

    errorHandler(new AppError('Forbidden', 403, 'FORBIDDEN'), {
      method: 'POST',
      originalUrl: '/api/admin',
      id: 'req-2',
      ip: '127.0.0.1',
      user: { id: 5 }
    }, res, jest.fn());

    expect(logger.warn).toHaveBeenCalledWith('Forbidden', expect.objectContaining({
      status: 403,
      code: 'FORBIDDEN',
      userId: 5,
      requestId: 'req-2'
    }));
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Forbidden',
      code: 'FORBIDDEN',
      request_id: 'req-2'
    }));
  });
});
