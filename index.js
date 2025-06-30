import express from "express"; // Express web server
import request from "request"; // "Request" library for HTTP requests
import cors from "cors";
import querystring from "querystring";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Load environment variables
dotenv.config();

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Environment variables from .env file
const client_id = process.env.CLIENT_ID; // Your app's client ID
const client_secret = process.env.CLIENT_SECRET; // Your app's secret
const redirect_uri = process.env.REDIRECT_URI; // The URI you will send your user to after auth
const port = process.env.PORT || 3000;

// initialize express server
// and set up cors and cookieParser middleware
const app = express();

app
  .use(express.static(__dirname + "/public"))
  .use(cors())
  .use(cookieParser());

//   Init auth page
app.get("/", function (req, res) {
  console.log("Hello World");
  res.sendFile("/index.html");
});

app.get("/start", function (req, res) {
  const state = process.env.STATE;
  res.cookie("monday_auth_state", state);

  res.redirect(
    "https://auth.monday.com/oauth2/authorize?" +
      querystring.stringify({
        client_id: client_id,
        redirect_uri: redirect_uri + "/oauth/callback",
        state: state,
        scopes: "me:read boards:read",
      })
  );
});

app.get("/oauth/callback", function (req, res) {
  // upon callback, your app first checks state parameter
  // if state is valid, we make a new request for access and refresh tokens
  const code = req.query.code || null;
  const state = req.query.state || null;
  const storedState = req.cookies ? req.cookies["monday_auth_state"] : null;

  if (state === null || state !== storedState) {
    res.redirect(
      "/finish?" +
        querystring.stringify({
          error: "state_does_not_match",
        })
    );
  } else {
    res.clearCookie("monday_auth_state");
    const authRequest = {
      url: "https://auth.monday.com/oauth2/token",
      form: {
        redirect_uri: redirect_uri + "/oauth/callback",
        client_id: client_id,
        client_secret: client_secret,
        code: code,
      },
    };

    // POST auth.monday.com/oauth2/token
    request.post(authRequest, function (error, response, body) {
      if (!error && response.statusCode === 200) {
        const jsonBody = JSON.parse(body);
        const accessToken = jsonBody.access_token || null;
        const refreshToken = jsonBody.refresh_token || null;
        const tokenType = jsonBody.token_type || null;
        const scope = jsonBody.scope || null;

        res.redirect(
          "/finish?" +
            querystring.stringify({
              status: "success",
              access_token: accessToken,
              refresh_token: refreshToken,
              token_type: tokenType,
              scope: scope,
            })
        );
      } else {
        res.redirect(
          "/finish?" +
            querystring.stringify({
              status: "failure",
            })
        );
      }
    });
  }
});

app.get("/finish", function (req, res) {
  res.sendFile("/finish.html", { root: __dirname + "/public" });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
