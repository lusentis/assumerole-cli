const AWS = require("aws-sdk");
const debug = require("debug")("assumerole");
const fetch = require("node-fetch").default;

const IPv4_ENDPOINT = "https://ip4.seeip.org";

const getRoleCredentials = async ({ roleArn, restrictIp = true }) => {
  const assumeRoleParams = {
    RoleArn: roleArn,
    RoleSessionName: "assumerole-cli",
    DurationSeconds: 3600,
  };

  if (restrictIp) {
    let ip = await fetch(IPv4_ENDPOINT).then(b => b.text());
    ip = ip.trim().replace(/[^\d.]+/g, "");

    const policy = {
      // The following policy defines permissions boundaries for this assumed role.
      // This Policy property behaves in a weird way, so we cannot specify Deny as effect
      // when also setting a Condition (will always Deny to anyone regardless).
      // A permission is granted only if it is Allow-ed by *both* role policies and
      // assumeRole Policy:
      // https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_temp_control-access_assumerole.html
      // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/STS.html#assumeRole-property
      Version: "2012-10-17",
      Statement: [
        {
          Condition: {
            IpAddressIfExists: {
              "aws:SourceIp": [`${ip}/32`],
            },
          },
          Action: "*",
          Resource: "*",
          Effect: "Allow",
        },
      ],
    };

    debug("Policy IP restriction", JSON.stringify(policy, null, 2));
    assumeRoleParams.Policy = JSON.stringify(policy);
  }

  debug("Calling .assumeRole()", JSON.stringify(assumeRoleParams, null, 2));

  const sts = new AWS.STS({});
  const response = await sts.assumeRole(assumeRoleParams).promise();

  // Credentials.AccessKeyId,Credentials.SecretAccessKey,Credentials.SessionToken
  const credentials = response.Credentials;
  return credentials;
};

module.exports = { getRoleCredentials };
