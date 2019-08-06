const AWS = require("aws-sdk");
const opn = require("opn");
const debug = require("debug")("federated");

const configLoader = require("./config");
const serverOnce = require("./serverOnce");
const { getAccountAlias } = require("./account");
const { print } = require("./theme");

const getWebAccessTokenStep = ({ authorizationUrl }) => {
  console.log(
    print.title(
      `\nOpen your browser at this URL, to complete authentication:\n${print.label.reset.white.underline(
        authorizationUrl
      )}\n`
    )
  );
  return opn(authorizationUrl, { wait: false });
};

const getCredentials = async ({ idToken, config }) => {
  const loginMapKey = `cognito-idp.${config.cognito.region}.amazonaws.com/${
    config.cognito.userPoolId
  }`;

  const cognitoParams = {
    IdentityPoolId: config.cognito.identityPoolId,
    Logins: {
      [loginMapKey]: idToken,
    },
  };

  debug("federated.getCredentials(): cognito Params", cognitoParams);

  const cognito = new AWS.CognitoIdentityCredentials(cognitoParams);
  await cognito.getPromise();

  AWS.config.credentials = cognito;
  const { accessKeyId, secretAccessKey, sessionToken } = cognito;

  return { accessKeyId, secretAccessKey, sessionToken };
};

const waitForResponseStep = async ({ config }) => {
  const { code } = await serverOnce();
  const exchangeRequestParams = {
    code,
    clientId: config.cognito.appClientId,
    authDomain: config.cognito.authDomain,
    redirectUrl: serverOnce.getRedirectURL(),
  };

  const idToken = await config.providers.cognito.getAccessToken(
    exchangeRequestParams
  );

  return { idToken };
};

const getCredentialsStep = async ({ config, idToken }) => {
  const credentials = await getCredentials({ config, idToken });

  const alias = await getAccountAlias({});
  console.log(print.heading("Welcome to", alias));

  return credentials;
};

let cache;
const useCache = async ({ authorizationUrl, config }) => {
  if (cache) {
    return cache;
  }

  cache = await Promise.resolve()
    .then(() => getWebAccessTokenStep({ authorizationUrl }))
    .then(() => waitForResponseStep({ config }));
  return cache;
};

const getFederatedCredentials = async () => {
  const config = configLoader.load();

  AWS.config.region = config.cognito.region;

  const authorizationUrl = config.providers.cognito.getAuthUrl({
    clientId: config.cognito.appClientId,
    authDomain: config.cognito.authDomain,
  });

  await Promise.resolve()
    .then(() => useCache({ authorizationUrl, config }))
    .then(({ idToken }) => getCredentialsStep({ config, idToken }));
};

module.exports = { getFederatedCredentials };
