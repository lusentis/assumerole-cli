const AWS = require("aws-sdk");
const { getAccountAlias } = require("./account");
const { makeRoleArn } = require("./makeRoleArn");
const { debug } = require("./promptSelectRole");

const getAccountAliases = async ({ roles }) => {
  const sts = new AWS.STS({});
  const aliasesMap = {};
  const unassumableRoles = [];
  debug("original account", AWS.config.credentials.accessKeyId);

  await Promise.all(
    roles.map(async role => {
      const { accountId, roleName, roleArn: inputRoleArn } = role;
      const roleArn = inputRoleArn || makeRoleArn({ accountId, roleName });
      let credentials;

      try {
        const response = await sts
          .assumeRole({
            RoleArn: roleArn,
            DurationSeconds: 900,
            RoleSessionName: "assumerole-cli-temp",
          })
          .promise();
        credentials = response.Credentials;
      } catch (e) {
        debug("Cannot assume role", roleArn, e.message);
        unassumableRoles.push(role);
        return;
      }

      try {
        const iam = new AWS.IAM({
          accessKeyId: credentials.AccessKeyId,
          secretAccessKey: credentials.SecretAccessKey,
          sessionToken: credentials.SessionToken,
        });
        const alias = await getAccountAlias({ iam });
        aliasesMap[accountId] = alias;
      } catch (e) {
        debug(
          roleArn,
          "has no access to iam:ListAccountAliases, cannot determine account alias"
        );
        if (!aliasesMap[accountId]) {
          // do not override if we were able to detect this using
          // another roleName
          aliasesMap[accountId] = "unknown";
        }
      }
    })
  );
  return { aliasesMap, unassumableRoles };
};

module.exports.getAccountAliases = getAccountAliases;
