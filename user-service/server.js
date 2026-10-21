require("dotenv").config();
const app = require("./app");
const { connect } = require("./src/config/dbConnection");
const port = process.env.PORT || 4001;
connect()
  .then(() =>
    app.listen(port, () => console.log("user-service listening on " + port))
  )
  .catch((error) => {
    console.error("Failed to start user-service:", error.message);
    process.exitCode = 1;
  });
