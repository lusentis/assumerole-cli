const path = require("path");
const fs = require("fs");

const opn = require("opn");
const EDITOR = process.env.EDITOR || "code";

const { print } = require("./theme");

const providers = {
  google: require("./providers/google"),
};

const getDefaultLocation = () =>
  path.resolve(process.env.HOME || "", ".assumerole.json");

const openEditor = async ({ overwrite }) => {
  const configFileLocation = getDefaultLocation();
  const templateLocation = path.join(__dirname, "configTemplate.json");

  if (overwrite || !fs.existsSync(configFileLocation)) {
    const configTemplate = fs.readFileSync(templateLocation);
    fs.writeFileSync(configFileLocation, configTemplate);
  }

  console.log(print.title("Opening file for editing:", configFileLocation));
  opn(configFileLocation, { app: EDITOR });
};

const readFromFile = configFileLocation => {
  let configFileContents;
  let userConfiguration;

  try {
    configFileContents = fs.readFileSync(configFileLocation, "utf-8");
  } catch (e) {
    console.error(
      print.error("Configuration file not found at path", configFileLocation)
    );
    console.error(print.error(`Run "configure" to create a new one.`));
    process.exit(3);
  }

  try {
    userConfiguration = JSON.parse(configFileContents);
  } catch (e) {
    console.error(
      print.error("Fatal error: config file contains invalid JSON")
    );
    process.exit(1);
  }

  return userConfiguration;
};

const load = () => {
  const configPath = getDefaultLocation();
  const userConfiguration = readFromFile(configPath);

  const config = {
    providers,
    ...userConfiguration,
  };
  return config;
};

module.exports = { getDefaultLocation, load, openEditor };
