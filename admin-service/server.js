require("dotenv").config();
const app = require("./app");
const { connect } = require("./src/config/dbConnection");
const port = process.env.PORT || 4005;
connect().then(() => app.listen(port, () => console.log("admin-service listening on " + port))).catch(error => {
  console.error("Failed to start admin-service:", error.message);
  process.exitCode = 1;
});
