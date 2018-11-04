const AWS = require("aws-sdk");

const flatten = list =>
  list.reduce((a, b) => a.concat(Array.isArray(b) ? flatten(b) : b), []);

const onlyCustomerManagedPoliciesFilter = policyArn =>
  /^arn:aws:iam::\d{12}:policy/.test(policyArn);

const onlyAssumableRolesStatementFilter = statement =>
  statement.Effect === "Allow" &&
  (statement.Action === "sts:AssumeRole" ||
    statement.Action.includes("sts:AssumeRole"));

const resourceDoesNotcontainWildcards = resource =>
  resource.indexOf("*") === -1;

const filterCustomerUniquePolicyARNs = ({ policiesARNs }) => {
  console.log({ policiesARNs });

  const policiesList = flatten(policiesARNs)
    .map(p => p.PolicyArn)
    .filter(onlyCustomerManagedPoliciesFilter);

  const uniquePolicies = [...new Set(policiesList)];
  return uniquePolicies;
};

const getPolicyDocument = ({ iam }) => async policyARN => {
  const { Policy: policy } = await iam
    .getPolicy({
      PolicyArn: policyARN,
    })
    .promise();
  const versionId = policy.DefaultVersionId;

  const { PolicyVersion: policyVersion } = await iam
    .getPolicyVersion({
      PolicyArn: policyARN,
      VersionId: versionId,
    })
    .promise();

  const doc = JSON.parse(decodeURIComponent(policyVersion.Document));
  return doc;
};

const getCallerRoleName = async () => {
  const sts = new AWS.STS({});
  const callerIdentity = await sts.getCallerIdentity({}).promise();
  const callerArn = callerIdentity.Arn;

  const tokens = /arn:aws:sts::\d{12}:assumed-role\/(.*)\/.*/i.exec(callerArn);
  const roleName = tokens[1];
  return roleName;
};

const listAssumableRoles = async () => {
  const iam = new AWS.IAM({});
  const currentRoleName = await getCallerRoleName();

  console.log("Current role is:", currentRoleName);

  const allRolePolicies = await iam
    .listAttachedRolePolicies({ RoleName: currentRoleName })
    .promise();

  const policiesARNs = [...allRolePolicies.AttachedPolicies];
  const uniquePoliciesARNs = filterCustomerUniquePolicyARNs({ policiesARNs });

  console.log({ uniquePoliciesARNs });

  const documents = await Promise.all(
    uniquePoliciesARNs.map(getPolicyDocument({ iam }))
  );

  console.log({ documents });

  const statements = flatten(documents.map(d => d.Statement));

  console.log({ statements });

  const rolesARNs = flatten(
    statements
      .filter(onlyAssumableRolesStatementFilter)
      .map(s => s.Resource)
      .filter(resourceDoesNotcontainWildcards)
  );

  const uniqueRolesARNs = [...new Set(rolesARNs)];

  console.log({ uniqueRolesARNs });

  const rolesInfo = uniqueRolesARNs
    .map(arn => {
      const tokens = /arn:aws:iam::(\d{12}):role\/(.*)/i.exec(arn);

      if (tokens == null) {
        console.log("Invalid role definition:", arn);
        return false;
      }

      return {
        accountId: Number(tokens[1]),
        roleName: tokens[2],
      };
    })
    .filter(Boolean);

  console.log({ rolesInfo });
  return rolesInfo;
};

module.exports = { listAssumableRoles };
