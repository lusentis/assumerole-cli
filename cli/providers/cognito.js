// source:
// https://developers.google.com/identity/protocols/OAuth2WebServer

const fetch = require("node-fetch");
const qs = require("querystring");
const debug = require("debug")("cognito");

const { getRedirectURL } = require("../serverOnce");

const getEndpoints = ({ authDomain }) => {
  const endpoints = {
    auth: `https://${authDomain}/oauth2/authorize`,
    token: `https://${authDomain}/oauth2/token`,
  };
  return endpoints;
};

const scope = ["openid", "email"];
const state = "assumerole-flow";

const getAuthUrl = ({ clientId, authDomain }) => {
  const endpoints = getEndpoints({ authDomain });
  const redirectUrl = getRedirectURL();
  const query = qs.stringify({
    scope: scope.join(" "),
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUrl,
    state,
  });

  const url = `${endpoints.auth}?${query}`;
  return url;
};

const getAccessToken = async ({ code, redirectUrl, clientId, authDomain }) => {
  const endpoints = getEndpoints({ authDomain });
  const body = {
    code,
    redirect_uri: redirectUrl,
    grant_type: "authorization_code",
    client_id: clientId,
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

  debug("response from token endpoint", response);

  return id_token;
};

module.exports = {
  getAuthUrl,
  getAccessToken,
};
