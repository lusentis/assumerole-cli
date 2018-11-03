const AWS = require("aws-sdk");

const getAccountInfo = async () => {
  const iam = new AWS.IAM({});
  const info = await iam.getAccountSummary().promise();
  console.log({ info });
  return info;
};

const getAccountAlias = async () => {
  const iam = new AWS.IAM({});
  const info = await iam.listAccountAliases().promise();
  const alias = info.AccountAliases[0];
  return alias;
};

module.exports = { getAccountInfo, getAccountAlias };
