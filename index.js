#!/usr/bin/env node

const program = require("commander");
const AWS = require("aws-sdk");

const { spawn } = require("child_process");

const { version } = require("./package.json");
const { openEditor } = require("./cli/config");

const makeRoleArn = ({ roleName, accountId }) =>
  `arn:aws:iam::${accountId}:role/${roleName}`;

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

const execute = async command => {
  let roleArn = program.roleArn;
  let roleName = program.roleName;
  let accountId = program.accountId;
  const args = program.args || [];

  if (!roleArn) {
    if (!roleName || !accountId) {
      throw new Error(
        `Error: You must specify either a --role-arn, or both --role-name and --account-id when running this command`
      );
    }
    roleArn = makeRoleArn(program);
  } else {
    const arnParts = /^arn:aws:iam::(\d{12}):role\/(\w+)$/.exec(roleArn);
    accountId = arnParts[1];
    roleName = arnParts[2];
  }

  const credentials = await getRoleCredentials({ roleArn });
  const env = Object.assign({}, process.env, {
    AWS_ACCESS_KEY_ID: credentials.AccessKeyId,
    AWS_SECRET_ACCESS_KEY: credentials.SecretAccessKey,
    AWS_SESSION_TOKEN: credentials.SessionToken,
  });
  delete env.AWS_PROFILE;

  console.warn(`Welcome, ${roleName} at ${accountId}!`);
  console.warn(`Running command: $ ${command} ${args.join(" ")}`);

  const child = spawn(command, args, {
    env,
    stdio: "inherit",
    shell: process.env.SHELL,
  });

  child.on("exit", code => {
    process.exit(code);
  });
};

const printError = e => {
  if (e.message === "Missing credentials in config") {
    console.error(
      `Missing credentials. For AssumeRole to work you need to specify AWS Credentials, for example by running 'aws --configure', by exporting an AWS_PROFILE environment variable, or by setting AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.\nAny credentials provider supported by the NodeJS aws-sdk can be used with this tool. Read more: https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/setting-credentials-node.html`
    );
    return;
  }

  console.error(e.message);
};

const defaultShellCommand = () => process.env.SHELL;

program.version(version);

// configure command
program
  .command("configure")
  .description("Creates an empty configuration file")
  .option("-o, --overwrite", "replaces the existing configuration file")
  .action(opts =>
    openEditor({
      overwrite: Boolean(opts.overwrite),
    }).catch(e => {
      printError(e);
      process.exit(1);
    })
  );

// assumerole (default) command
program
  .command("assumerole")
  .description("Assumes the specified role")
  .option(
    "-c, --cmd <cmd>",
    "Execute <cmd> using the default shell",
    defaultShellCommand()
  )
  .option(
    "-r, --role-arn <arn:aws:iam::000000000000:role/YourRoleName>",
    "ARN of the Role to Assume",
    /^arn:aws:iam::\d{12}:role\/\w+$/i
  )
  .option("-n, --role-name <RoleName>", "Name of the Role to assume", /^\w+$/i)
  .option(
    "-a, --account-id <AccountId>",
    "Account ID where Role is defined (mandatory if you specify --role-name)",
    /^\d{12}$/
  )
  .action(() =>
    execute(program.cmd).catch(e => {
      printError(e);
      process.exit(1);
    })
  );

program.on("--help", function() {
  console.log("");
  console.log("  Examples:");
  console.log("");
  console.log("    $ assumerole --account-id 00000000000 --role-name MyRole");
  console.log(
    "    $ assumerole --role-arn arn:aws:iam::00000000000:role/MyRole"
  );
  console.log(
    "    $ assumerole --role-arn arn:aws:iam::00000000000:role/MyRole -c aws s3 ls"
  );
  console.log(
    "    $ assumerole --role-arn arn:aws:iam::00000000000:role/MyRole -c bash -- --version"
  );
  console.log("");
});

program.parse(process.argv);

if (!program.cmd) {
  program.cmd = process.env.SHELL;
}
