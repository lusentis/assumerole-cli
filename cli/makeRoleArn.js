const makeRoleArn = ({ roleName, accountId }) =>
  `arn:aws:iam::${accountId}:role/${roleName}`;

module.exports = { makeRoleArn };
