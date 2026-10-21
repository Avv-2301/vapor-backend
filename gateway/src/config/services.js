module.exports = {
  userService: process.env.USER_SERVICE_URL || "http://localhost:4001",
  adminService: process.env.ADMIN_SERVICE_URL || "http://localhost:4005",
};
