const AWS = require("aws-sdk");
const opn = require("opn");

const configLoader = require("./config");
const serverOnce = require("./serverOnce");
const { getAccountAlias } = require("./account");
const { print } = require("./theme");

const getProvider = () => {
  const config = configLoader.load();
  return config.oauth2.provider || "google";
};

const getLoginMapKey = provider => {
  switch (provider) {
    case "google":
      return "accounts.google.com";
    default:
      return "digitalattitude.okta.com";
  }
};

const getCredentials = async ({ idToken, config }) => {
  const provider = getProvider();
  const loginMapKey = getLoginMapKey(provider);

  const cognitoParams = {
    IdentityPoolId: config.cognito.identityPoolId,
    Logins: {
      [loginMapKey]: idToken,
    },
  };

  console.log("----> cognito Params", cognitoParams);

  const cognito = new AWS.CognitoIdentityCredentials(cognitoParams);
  await cognito.getPromise();

  AWS.config.credentials = cognito;
  const { accessKeyId, secretAccessKey, sessionToken } = cognito;

  return { accessKeyId, secretAccessKey, sessionToken };
};

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

const waitForResponseStep = async ({ config }) => {
  const { code } = await serverOnce();
  const exchangeRequestParams = {
    code,
    clientId: config.oauth2.id,
    clientSecret: config.oauth2.secret,
    redirectUrl: serverOnce.getRedirectURL(),
  };

  const provider = getProvider();
  const idToken = await config.providers[provider].getAccessToken(
    exchangeRequestParams,
    config.cognito.authDomain
  );

  return { idToken };
};

const getCredentialsStep = async ({ config, idToken }) => {
  const credentials = await getCredentials({ idToken, config });

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

  const provider = getProvider();
  const authorizationUrl = config.providers[provider].getAuthUrl({
    clientId: config.cognito.appClientId,
    authDomain: config.cognito.authDomain,
  });

  await Promise.resolve()
    .then(() => useCache({ authorizationUrl, config }))
    .then(({ idToken }) => getCredentialsStep({ config, idToken }));
};

module.exports = { getFederatedCredentials };
