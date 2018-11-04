const AWS = require("aws-sdk");

const { spawn } = require("child_process");

const { getFederatedCredentials } = require("./federated");
const { promptSelectRole } = require("./promptSelectRole");
const { makeRoleArn } = require("./makeRoleArn");
const { getRoleCredentials } = require("./getRoleCredentials");

const assumeRole = async opts => {
  const command = opts.cmd;
  let roleArn = opts.roleArn;
  let roleName = opts.roleName;
  let accountId = opts.accountId;
  const federated = opts.federated;
  const args = opts.args || [];

  if (federated) {
    console.log("Requesting federated login...");
    await getFederatedCredentials();
    console.log("Using", AWS.config.credentials.accessKeyId);
  }

  if (!roleName || !accountId) {
    roleArn = await promptSelectRole();
    if (!roleArn) {
      throw new Error(
        `Error: We could not automatically discover a list of assumable roles. You must specify either a --role-arn, or both --role-name and --account-id when running this command`
      );
    }
  }

  if (roleArn) {
    const arnParts = /^arn:aws:iam::(\d{12}):role\/(\w+)$/.exec(roleArn);
    accountId = arnParts[1];
    roleName = arnParts[2];
  } else {
    roleArn = makeRoleArn(opts);
  }

  const credentials = await getRoleCredentials({ roleArn });
  const env = Object.assign({}, process.env, {
    AWS_ACCESS_KEY_ID: credentials.AccessKeyId,
    AWS_SECRET_ACCESS_KEY: credentials.SecretAccessKey,
    AWS_SESSION_TOKEN: credentials.SessionToken,
  });

  // Cleanup stale env variables
  delete env.AWS_PROFILE;
  delete env.AWS_REGION;
  delete env.AWS_DEFAULT_REGION;

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
exports.assumeRole = assumeRole;
