#!/usr/bin/env node

const yargs = require("yargs");
const debug = require("debug")("assumerole");

// const { version } = require("./package.json");
const { openEditor } = require("./cli/config");
const { assumeRole } = require("./cli/assumeRole");
const { print } = require("./cli/theme");
const defaultShellCommand = require("./cli/defaultShellCommand");

const printError = e => {
  if (e.message === "Missing credentials in config") {
    console.error(print.error(`Could not obtain AWS credentials.`));
    return;
  }

  console.error(e);
};

const argv = yargs
  .command("configure", "Creates an empty configuration file", args => {
    args.option("overwrite", {
      alias: "o",
      type: "boolean",
      default: "false",
      global: false,
    });
  })

  .command(
    "",
    "Requests signin via federated identities and list assumable role(s)"
  )
  .option("cmd", {
    type: "string",
    alias: "c",
    description: "Execute <cmd> using the default shell",
    default: defaultShellCommand(),
  })
  .option(
    "role-arn",
    {
      type: "string",
      alias: "r",
      description: "ARN of the Role to Assume",
      default: process.env.ASSUMEROLE_ROLE_ARN,
    }
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
  )
  .option("restrict-ip", {
    type: "boolean",
    alias: "i",
    default: true,
    description:
      "Restricts all permissions to the current IP Address (may break some services)",
  }).argv;

const help = () => {
  console.log("");
  console.log("  Examples:");
  console.log("");
  console.log("    $ assumerole");
  console.log("    $ assumerole --account-id 00000000000 --role-name MyRole");
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
  argv.cmd = defaultShellCommand();
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
  return;
}

// default command:
assumeRole(argv).catch(e => {
  printError(e);
  process.exit(1);
});
