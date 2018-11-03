const path = require("path");
const fs = require("fs");

const configFileLocation = path.resolve(process.env.HOME, ".assumerole.json");
const configFileContents = fs.readFileSync(configFileLocation, "utf-8");
const userConfiguration = JSON.parse(configFileContents);

const providers = {
  google: require("./providers/google"),
};

const config = {
  providers,
  ...userConfiguration,
};

module.exports = config;
