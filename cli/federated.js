const AWS = require("aws-sdk");
const opn = require("opn");

const config = require("./config");
const serverOnce = require("./serverOnce");
const { getAccountAlias } = require("./account");

AWS.config.region = config.cognito.region;

const authorizationUrl = config.providers.google.getAuthUrl({
  clientId: config.oauth2.id,
});

const getCredentials = async ({ idToken }) => {
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

const getWebAccessTokenStep = async () => {
  console.log("Open your browser to", authorizationUrl);
  await opn(authorizationUrl, {});
};

const waitForResponseStep = async () => {
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

const getCredentialsStep = async ({ idToken }) => {
  const credentials = await getCredentials({ idToken });

  const alias = await getAccountAlias();
  console.log("Welcome to", alias);

  return credentials;
};

Promise.resolve()
  .then(getWebAccessTokenStep)
  .then(waitForResponseStep)
  .then(getCredentialsStep)
  .then(credentials => console.log("AWS Credentials", credentials))
  .catch(e => console.error(e));
