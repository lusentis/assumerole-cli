const AWS = require("aws-sdk");
const opn = require("opn");

const configLoader = require("./config");
const serverOnce = require("./serverOnce");
const { getAccountAlias } = require("./account");
const { print } = require("./theme");

const getCredentials = async ({ idToken, config }) => {
  const cognito = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: config.cognito.identityPoolId,
    Logins: {
      "accounts.google.com": idToken,
    },
  });
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

  const idToken = await config.providers.google.getAccessToken(
    exchangeRequestParams
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

  const domainHintParam = config.domainHint ? "&hd=" + config.domainHint : "";
  const authorizationUrl =
    config.providers.google.getAuthUrl({
      clientId: config.oauth2.id,
    }) + domainHintParam;

  await Promise.resolve()
    .then(() => useCache({ authorizationUrl, config }))
    .then(({ idToken }) => getCredentialsStep({ config, idToken }));
};

module.exports = { getFederatedCredentials };
