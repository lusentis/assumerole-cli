const getBrowserSwitchRoleUrl = ({ accountLabel, roleName, accountId }) => {
  const displayName = accountLabel
    ? `${roleName} @ ${accountLabel}`
    : `${roleName} @ ${accountId}`;

  return `https://signin.aws.amazon.com/switchrole?account=${accountId}&roleName=${roleName}&displayName=${encodeURIComponent(
    displayName
  )}`;
};

module.exports = { getBrowserSwitchRoleUrl };
