// source:
// https://developers.google.com/identity/protocols/OAuth2WebServer

const fetch = require("node-fetch");
const qs = require("querystring");
const { getRedirectURL } = require("../serverOnce");

const endpoints = {
  auth: "https://accounts.google.com/o/oauth2/v2/auth",
  token: "https://www.googleapis.com/oauth2/v4/token",
};
const scope = ["https://www.googleapis.com/auth/userinfo.email"];

const getAuthUrl = ({ clientId }) => {
  const redirectUrl = getRedirectURL();
  const query = qs.stringify({
    scope: scope.join(" "),
    access_type: "offline",
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUrl,
  });
  const url = `${endpoints.auth}?${query}`;
  return url;
};

const getAccessToken = async ({
  code,
  clientId,
  clientSecret,
  redirectUrl,
}) => {
  const body = {
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUrl,
    grant_type: "authorization_code",
  };

  const result = await fetch.default(endpoints.token, {
    method: "POST",
    headers: new fetch.Headers({
      "Content-type": "application/json",
      Accept: "application/json",
    }),
    body: JSON.stringify(body),
  });

  const response = await result.json();
  const { id_token } = response;

  return id_token;
};

module.exports = {
  getAuthUrl,
  getAccessToken,
};
