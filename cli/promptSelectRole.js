const AWS = require("aws-sdk");
const debug = require("debug")("assumerole");

const rl = require("readline").createInterface(process.stdin, process.stdout);

const { listAssumableRoles } = require("./listAssumableRoles");
const { getAccountAlias } = require("./account");
const { makeRoleArn } = require("./makeRoleArn");
const { print } = require("./theme");

const getAccountAliases = async ({ roles }) => {
  const sts = new AWS.STS({});
  const aliasesMap = {};
  const unassumableRoles = [];

  debug("original account", AWS.config.credentials.accessKeyId);

  await Promise.all(
    roles.map(async role => {
      const { accountId, roleName } = role;
      const roleArn = makeRoleArn({ accountId, roleName });
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

const promptSelectRole = async () => {
  let roles = await listAssumableRoles();
  const { aliasesMap, unassumableRoles } = await getAccountAliases({ roles });

  const makeLabel = role =>
    aliasesMap[role.accountId]
      ? `${aliasesMap[role.accountId]} (${role.accountId})`
      : role.accountId;

  roles = roles.sort((a, b) => b.accountId - a.accountId);

  console.log(print.title("\nAvailable roles in your account:"));
  roles.forEach((role, index) => {
    const alias = makeLabel(role);
    const warning = unassumableRoles.includes(role)
      ? "[this role cannot be assumed]"
      : "";

    const number = index < 10 ? ` ${index}` : `${index}`;
    const msg = `  [${print.number(number)}] ${print.label(
      alias
    )} as ${print.label(role.roleName)} ${print.warning(warning)}`;

    const styleModifier = warning ? print.dim : a => a;
    console.log(styleModifier(msg));
  });

  const selectedIndex = await new Promise(resolve => {
    rl.question(print.title(`\nRole? [0-${roles.length - 1}] `), choice => {
      rl.close();
      resolve(Number(choice));
    });
  });

  const selectedRole = roles[selectedIndex];
  return {
    roleArn: makeRoleArn(selectedRole),
    accountLabel: makeLabel(selectedRole),
  };
};

module.exports = { promptSelectRole };
