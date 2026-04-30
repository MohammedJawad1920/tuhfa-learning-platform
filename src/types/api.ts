export type ApiResponse<T> = {
  data: T;
  meta: {
    requestId: string;
    timestamp: string;
    total?: number;
    limit?: number;
    offset?: number;
  };
};

export type ApiError = {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  requestId: string;
  timestamp: string;
};
