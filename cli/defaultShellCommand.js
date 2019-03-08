const os = require("os");
const defaultShellCommand = () => {
  if (os.platform() === "win32") {
    return "C:\\Program Files\\Git\\git-bash.exe";
  }
  return process.env.SHELL;
};

module.exports = defaultShellCommand;
