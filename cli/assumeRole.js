const AWS = require("aws-sdk");
const debug = require("debug")("assumerole");

const { spawn } = require("child_process");
const os = require("os");

const { getFederatedCredentials } = require("./federated");
const { promptSelectRole } = require("./promptSelectRole");
const { makeRoleArn } = require("./makeRoleArn");
const { getRoleCredentials } = require("./getRoleCredentials");
const { getBrowserSwitchRoleUrl } = require("./getBrowserSwitchRoleUrl");
const { print } = require("./theme");
const defaultShellCommand = require("./defaultShellCommand");
const { getAccountAliases } = require("./getAccountAliases");

const assumeRole = async opts => {
  const command = opts.cmd;
  let roleArn = opts.roleArn;
  let roleName = opts.roleName;
  let accountId = opts.accountId;
  let restrictIp = opts.restrictIp;
  let accountLabel = "";
  const federated = opts.federated;
  const args = opts._ || [];

  if (federated) {
    debug("Requesting federated login...");
    await getFederatedCredentials();
    debug("Using", AWS.config.credentials.accessKeyId);
  }

  if (!(roleName && accountId) && !roleArn) {
    ({ roleArn, accountLabel } = await promptSelectRole());
    if (!roleArn) {
      throw new Error(
        `Error: We could not automatically discover a list of assumable roles. You must specify either a --role-arn, or both --role-name and --account-id when running this command`
      );
    }
  } else {
    debug("Automatically selected role", roleArn);
    const accountAliasObj = await getAccountAliases({
      roles: [{ roleArn, accountId: "current" }],
    });

    debug("Alias for this account", accountAliasObj.aliasesMap.current);
    accountLabel = accountAliasObj.aliasesMap.current;
  }

  if (roleArn) {
    const arnParts = /^arn:aws:iam::(\d{12}):role\/(.+)$/.exec(roleArn);
    accountId = arnParts[1];
    roleName = arnParts[2];
  } else {
    roleArn = makeRoleArn(opts);
  }

  let credentials;

  try {
    credentials = await getRoleCredentials({ roleArn, restrictIp });
  } catch (e) {
    if (e.message === "Access denied") {
      console.error(
        print.error(
          `${
            e.message
          }: This role (${roleArn}) cannot be assumed, check the role's trust relationship`
        )
      );
      process.exit(4);
    }
    throw e;
  }

  const makeRPrompt = () =>
    (process.env.RPROMPT || "") + `${accountLabel ? accountLabel : accountId}`;

  const env = Object.assign({}, process.env, {
    AWS_ACCESS_KEY_ID: credentials.AccessKeyId,
    AWS_SECRET_ACCESS_KEY: credentials.SecretAccessKey,
    AWS_SESSION_TOKEN: credentials.SessionToken,
    RPROMPT: makeRPrompt(), // right prompt for ZSH
  });

  // Cleanup stale env variables
  delete env.AWS_PROFILE;

  const browserSwitchRoleUrl = getBrowserSwitchRoleUrl({
    accountLabel,
    roleName,
    accountId,
  });

  console.log("");
  console.log(
    print.title(
      `Welcome, ${print.label(roleName)} at ${print.label(accountLabel)}!`
    )
  );
  console.log(
    `You can also assume this role in the AWS Console: ${print.title.reset.underline(
      browserSwitchRoleUrl
    )}`
  );
  console.log("");
  console.log(print.title(`Running command: $ ${command} ${args.join(" ")}`));
  console.log(print.title(`Use CTRL-D or CTRL-C to terminate.`));
  console.log("");

  const shell = os.platform() === "win32" ? false : process.env.SHELL;
  const isShell = command === defaultShellCommand();

  const launch = () => {
    const child = spawn(command, args, {
      env,
      stdio: "inherit",
      shell,
    });

    child.on("exit", code => {
      if (isShell && code === 0) {
        console.log(
          print.title(
            `Respawning shell (${command} ${args}). Use 'exit 1' to terminate.`
          )
        );
        return launch();
      }

      console.log(print.title(`Child process terminated.`));
      process.exit(code);
    });
  };

  launch();
};

exports.assumeRole = assumeRole;
