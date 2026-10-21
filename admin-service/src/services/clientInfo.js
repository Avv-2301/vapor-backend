const getClientInfo = (userAgent = "") => {
  const ua = String(userAgent);
  const match = (pattern) => ua.match(pattern)?.[1] || "";

  let browserName = "Unknown";
  let browserVersion = "";
  const browsers = [
    ["Microsoft Edge", /Edg\/([\d.]+)/],
    ["Opera", /(?:OPR|Opera)\/([\d.]+)/],
    ["Google Chrome", /(?:Chrome|CriOS)\/([\d.]+)/],
    ["Mozilla Firefox", /(?:Firefox|FxiOS)\/([\d.]+)/],
    ["Safari", /Version\/([\d.]+).*Safari/],
  ];
  for (const [name, pattern] of browsers) {
    browserVersion = match(pattern);
    if (browserVersion) {
      browserName = name;
      break;
    }
  }

  let deviceType = "desktop";
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) {
    deviceType = "tablet";
  } else if (/Mobile|iPhone|iPod|Android/i.test(ua)) {
    deviceType = "mobile";
  }

  return { browserName, browserVersion, deviceType };
};

module.exports = { getClientInfo };
