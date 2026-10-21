const redact = (value: any): any => {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, /password|token|secret|apiKey|authorization/i.test(key) ? "[REDACTED]" : redact(item)]));
};

export function createAuditLogger(save: (data: any) => Promise<any>, prefix = "") {
  return (req: any, res: any, next: any) => {
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();
    const started = Date.now();
    let responseCode: number | undefined;
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      if (body?.meta?.code) responseCode = Number(body.meta.code);
      return originalJson(body);
    };
    res.once("finish", () => {
      const endpoint = prefix + req.originalUrl.split("?")[0];
      Promise.resolve().then(() => save({
        userId: req.authUserId || null,
        userRole: req.role || null,
        method: req.method,
        endpoint,
        fullUrl: req.protocol + "://" + req.get("host") + prefix + req.originalUrl,
        requestBody: redact(req.body),
        queryParams: req.query,
        responseStatus: responseCode || res.statusCode,
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.get("user-agent") || null,
        duration: Date.now() - started,
      })).catch((error: any) => console.error("Audit log save failed:", error.message));
    });
    next();
  };
}
