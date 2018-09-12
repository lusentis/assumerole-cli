# `assumerole-cli`

![npm version](https://img.shields.io/npm/v/assumerole-cli.svg)

## Install

```bash
npm install -g assumerole-cli
```

## Usage

Make sure that you have valid AWS credentials and that you can assume the target role with those credentials.

```bash
# Specify an ARN:
assumerole --role-arn arn:aws:iam::00000000000:role/MyRole

# Specify Account Id and Role Name:
assumerole --account-id 00000000000 --role-name MyRole

# Specify an command:
assumerole --role-arn arn:aws:iam::00000000000:role/MyRole -c aws s3 ls

# Specify an command with --arguments:
assumerole --role-arn arn:aws:iam::00000000000:role/MyRole -c bash -- --version
```

An optional `-c <command>` can be provided.
By default, `assumerole` will spawn a new shell (defaulting to `$SHELL`).

See `assumerole --help` for full usage instructions.

## License

MIT
