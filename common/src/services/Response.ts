

export function successResponseData(res: any, data: any, code = 1, message?: string, extras?: Record<string, any>) {
  const response: any = {
    data,
    meta: { code, message },
  };

  if (extras) {
    Object.assign(response.meta, extras);
  }

  return res.send(response);
}

export function successResponseWithData(
  res: any,
  data: any,
  message: string,
  statusCode: number,
  extras: Record<string, any> = {}
) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    ...extras,
  });
}

/**
 * Success response without data
 */
export function successResponseWithoutData(
  res: any,
  message: string,
  code = 1
) {
  return res.send({
    meta: { code, message },
  });
}

/**
 * Error response without data
 */
export function errorResponseWithoutData(
  res: any,
  message: string,
  code = 0
) {
  return res.send({
    data: null,
    meta: { code, message },
  });
}

/**
 * Error response with custom code
 */
export function errorResponseData(
  res: any,
  message: string,
  code: number
) {
  return res.status(200).send({
    meta: { code, message },
  });
}

/**
 * Validation error response
 */
export function validationErrorResponseData(
  res: any,
  message: string,
  code: number
) {
  return res.status(200).send({
    meta: { code, message },
  });
}
