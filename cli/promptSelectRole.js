const debug = require("debug")("assumerole");
exports.debug = debug;

const rl = require("readline").createInterface(process.stdin, process.stdout);

const { listAssumableRoles } = require("./listAssumableRoles");
const { makeRoleArn } = require("./makeRoleArn");
const { print } = require("./theme");
const { getAccountAliases } = require("./getAccountAliases");

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
