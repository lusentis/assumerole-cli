const chalk = require("chalk");
const print = {
  error: chalk.bold.red,
  warning: chalk.yellow,
  dim: chalk.gray.dim,
  label: chalk.cyan,
  number: chalk.white.italic,
  title: chalk.white.bold,
  heading: chalk.yellowBright.bold,
};

module.exports = { print };
