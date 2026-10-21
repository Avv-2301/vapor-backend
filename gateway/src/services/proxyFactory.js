const { createProxyMiddleware } = require("http-proxy-middleware");
module.exports = (target, prefix = "") => createProxyMiddleware({
  target,
  changeOrigin: true,
  timeout: 60000,
  proxyTimeout: 60000,
  pathRewrite: (path, req) => {
    const url = req.originalUrl;
    return prefix ? (url.slice(prefix.length) || "/") : url;
  },
  on: {
    error: (error, req, res) => {
      if (!res.headersSent) res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ meta: { code: 502, message: "Backend unavailable" } }));
    },
  },
});
