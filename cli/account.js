const AWS = require("aws-sdk");
const debug = require("debug")("assumerole");

const getAccountInfo = async () => {
  const iam = new AWS.IAM({});
  const info = await iam.getAccountSummary().promise();
  debug({ info });
  return info;
};

const getAccountAlias = async ({ iam }) => {
  if (!iam) {
    iam = new AWS.IAM({});
  }
  const info = await iam.listAccountAliases().promise();
  const alias = info.AccountAliases[0];
  return alias;
};

module.exports = { getAccountInfo, getAccountAlias };
