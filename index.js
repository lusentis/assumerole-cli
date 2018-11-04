#!/usr/bin/env node

const yargs = require("yargs");
const debug = require("debug")("assumerole");

// const { version } = require("./package.json");
const { openEditor } = require("./cli/config");
const { assumeRole } = require("./cli/assumeRole");
const { print } = require("./cli/theme");

const printError = e => {
  if (e.message === "Missing credentials in config") {
    console.error(
      print.error(
        `\nMissing AWS credentials.\n\nFor AssumeRole to work you need to specify AWS Credentials, for example by running 'aws configure', by exporting an AWS_PROFILE environment variable, or by setting AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.\nAny credentials provider supported by the NodeJS aws-sdk can be used with this tool.\nIf you want to use federated login to AWS, try to pass the --federated flag.\n\nRead more: https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/setting-credentials-node.html\n`
      )
    );
    return;
  }

  console.error(e);
};

const defaultShellCommand = () => process.env.SHELL;

const argv = yargs
  .command("configure", "Creates an empty configuration file", args => {
    args.option("overwrite", {
      alias: "o",
      type: "boolean",
      default: "false",
      global: false,
    });
  })

  .command("", "Assumes a role")
  .option("federated", {
    type: "boolean",
    alias: "f",
    description: "Use federated login instead of static credentials",
  })
  .option("cmd", {
    type: "string",
    alias: "c",
    description: "Execute <cmd> using the default shell",
    default: defaultShellCommand(),
  })
  .option(
    "role-arn",
    { type: "string", alias: "r", description: "ARN of the Role to Assume" }
    //    /^arn:aws:iam::\d{12}:role\/\w+$/i
  )
  .option(
    "role-name",
    {
      type: "string",
      alias: "n",
      implies: "account-id",
      conflicts: ["role-arn"],
      description: "Name of the Role to assume",
    }
    // /^\w+$/i
  )
  .option(
    "account-id",
    {
      type: "string",
      alias: "a",
      implies: "role-name",
      conflicts: ["role-arn"],
      description:
        "Account ID where Role is defined (mandatory if you specify --role-name)",
    }
    // /^\d{12}$/
  ).argv;

const help = () => {
  console.log("");
  console.log("  Examples:");
  console.log("");
  console.log("    $ assumerole --federated");
  console.log(
    "    $ assumerole --federated --account-id 00000000000 --role-name MyRole"
  );
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
};

debug(argv);

if (!argv.cmd) {
  argv.cmd = process.env.SHELL;
}

if (argv.help) {
  help();
  process.exit(0);
}

if (argv._.includes("configure")) {
  openEditor({
    overwrite: Boolean(argv.overwrite),
  })
    .then(() => {
      process.exit(0);
    })
    .catch(e => {
      printError(e);
      process.exit(1);
    });
}

if (argv._.includes("assumerole") || argv._.length === 0) {
  assumeRole(argv).catch(e => {
    printError(e);
    process.exit(1);
  });
}
