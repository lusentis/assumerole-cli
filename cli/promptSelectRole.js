const AWS = require("aws-sdk");

const rl = require("readline").createInterface(process.stdin, process.stdout);

const { listAssumableRoles } = require("./listAssumableRoles");
const { getAccountAlias } = require("./account");
const { makeRoleArn } = require("./makeRoleArn");

const getAccountAliases = async ({ roles }) => {
  const sts = new AWS.STS({});
  const aliasesMap = {};

  console.log("master account", AWS.config.credentials.accessKeyId);

  await Promise.all(
    roles.map(async ({ accountId, roleName }) => {
      const roleArn = `arn:aws:iam::${accountId}/${roleName}`;
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
        console.error("Cannot assume role", roleArn, e.message);
        return;
      }

      try {
        const iam = new AWS.IAM({ ...credentials });
        const alias = await getAccountAlias({ iam });
        aliasesMap[accountId] = alias;
      } catch (e) {
        console.error(
          roleArn,
          "has no access to iam:ListAccountAliases, cannot determine account alias"
        );
        return;
      }
    })
  );

  return aliasesMap;
};

const promptSelectRole = async () => {
  const roles = await listAssumableRoles();
  const aliasesMap = await getAccountAliases({ roles });

  console.log("available roles:");
  roles.forEach((role, index) => {
    console.log(`  [${index}] ${role.roleName} on ${role.accountId}`);
  });

  const selectedIndex = await new Promise(resolve => {
    rl.question(`Role? [0-${roles.length - 1}] `, choice =>
      resolve(Number(choice))
    );
  });
  const selectedRole = roles[selectedIndex];

  console.log("selected role", selectedRole);
  return makeRoleArn(selectedRole);
};

module.exports = { promptSelectRole };
