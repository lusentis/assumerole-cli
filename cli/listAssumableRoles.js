const AWS = require("aws-sdk");
const { print } = require("./theme");
const debug = require("debug")("assumerole");

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
  debug({ policiesARNs });

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

  console.log(print.heading("You are authenticated as:", currentRoleName));

  const allRolePolicies = await iam
    .listAttachedRolePolicies({ RoleName: currentRoleName })
    .promise();

  const policiesARNs = [...allRolePolicies.AttachedPolicies];
  const uniquePoliciesARNs = filterCustomerUniquePolicyARNs({ policiesARNs });

  debug({ uniquePoliciesARNs });

  const documents = await Promise.all(
    uniquePoliciesARNs.map(getPolicyDocument({ iam }))
  );

  debug({ documents });

  const inlinePolicyNames = await iam
    .listRolePolicies({ RoleName: currentRoleName })
    .promise();

  debug({ inlinePolicyNames });

  const inlineDocuments = await Promise.all(
    inlinePolicyNames.PolicyNames.map(name =>
      iam
        .getRolePolicy({ RoleName: currentRoleName, PolicyName: name })
        .promise()
        .then(result => JSON.parse(decodeURIComponent(result.PolicyDocument)))
    )
  );

  debug({ inlineDocuments });

  const statements = flatten(
    [...documents, ...inlineDocuments].map(d => d.Statement)
  );

  debug({ statements });

  const rolesARNs = flatten(
    statements
      .filter(onlyAssumableRolesStatementFilter)
      .map(s => s.Resource)
      .filter(resourceDoesNotcontainWildcards)
  );

  const uniqueRolesARNs = [...new Set(rolesARNs)];

  debug({ uniqueRolesARNs });

  const rolesInfo = uniqueRolesARNs
    .map(arn => {
      const tokens = /arn:aws:iam::(\d{12}):role\/(.*)/i.exec(arn);

      if (tokens == null) {
        console.error(
          print.warning(
            "One or more policies contain an unusable role definition: %s. This usually happens when the resource contains a wildcard.",
            arn
          )
        );
        return false;
      }

      return {
        accountId: Number(tokens[1]),
        roleName: tokens[2],
      };
    })
    .filter(Boolean);

  debug({ rolesInfo });
  return rolesInfo;
};

module.exports = { listAssumableRoles };
