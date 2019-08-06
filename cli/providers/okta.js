// source:
// https://developers.google.com/identity/protocols/OAuth2WebServer

const fetch = require("node-fetch");
const qs = require("querystring");
const { getRedirectURL } = require("../serverOnce");

const endpoints = {
  auth: "https://digitalattitude.okta.com/oauth2/v1/authorize",
  token: "https://digitalattitude.okta.com/oauth2/v1/token",
};
const scope = ["openid", "email"];
const nonce = Math.random();
const state = "assumerole-flow";

const getAuthUrl = ({ clientId }) => {
  const redirectUrl = getRedirectURL();
  const query = qs.stringify({
    scope: scope.join(" "),
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUrl,
    nonce,
    state,
  });
  const url = `${endpoints.auth}?${query}`;
  return url;
};

const getAccessToken = async ({
  code,
  redirectUrl,
  clientId,
  clientSecret,
}) => {
  const body = {
    code,
    redirect_uri: redirectUrl,
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
  };

  const result = await fetch.default(endpoints.token, {
    method: "POST",
    headers: new fetch.Headers({
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
    }),
    body: qs.stringify(body),
  });

  const response = await result.json();
  const { id_token } = response;

  console.log("response", response);

  return id_token;
};

module.exports = {
  getAuthUrl,
  getAccessToken,
};
