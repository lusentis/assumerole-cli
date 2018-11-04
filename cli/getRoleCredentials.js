const AWS = require("aws-sdk");

const getRoleCredentials = async ({ roleArn }) => {
  const sts = new AWS.STS({});
  const response = await sts
    .assumeRole({
      RoleArn: roleArn,
      RoleSessionName: "assumerole-cli",
      DurationSeconds: 3600,
    })
    .promise();

  // Credentials.AccessKeyId,Credentials.SecretAccessKey,Credentials.SessionToken
  const credentials = response.Credentials;
  return credentials;
};

module.exports = { getRoleCredentials };
