export const sendResponse = (res, statusCode, params) => {
    return res.status(statusCode).json({
      data: params.data ? params?.data : null,
      meta: params.meta ? params?.meta : null,
      error: params.error ? params?.error : null,
    });
  };
  