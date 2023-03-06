/**
 * Partial source code from https://gitlab.com/derpystuff/displunger
 */
/**
 * Copyright (c) 2022 NurMarvin (Marvin Witt)
 * Licensed under the Open Software License version 3.0
 * Partial source code from https://github.com/NurMarvin/discord-proxy
 */
import fastify from "fastify";

import fastifyCors from "@fastify/cors";
import fastifyHttpProxy from "@fastify/http-proxy";
import fs from "fs/promises";
import minimist from "minimist";

// handle cli arguments
const args = minimist(process.argv.slice(2), {
  alias: {
    port: "p",
    host: "h",
    science: "s",
    js: "j",
    css: "c",
    api: "a",
  },
  boolean: true,
});
const port = args.port ? parseInt(args.port) : 3000;
const science = args.science ?? false;
const jsFiles = (
  args.js?.includes(",")
    ? args.js.split(",")
    : args.js
)?.map(file => !file.includes(".js") ? `${file}.js` : file);
const cssFile = args.css && !args.css.includes(".css") ? `${args.css}.css` : args.css;
const apiVersion = args.api ?? 9;

const canonicalUrl = new URL(args.host ?? `http://127.0.0.1:${port}`);
const premadeEnv = {
  API_ENDPOINT: `//${canonicalUrl.host}/api`,
  API_VERSION: apiVersion,
  WEBAPP_ENDPOINT: "//canary.discord.com",
  GATEWAY_ENDPOINT: "wss://gateway.discord.gg",
  CDN_HOST: "cdn.discordapp.com",
  ASSET_ENDPOINT: "https://canary.discord.com",
  MEDIA_PROXY_ENDPOINT: "https://media.discordapp.net",
  WIDGET_ENDPOINT: "//canary.discord.com/widget",
  INVITE_HOST: "discord.gg",
  GUILD_TEMPLATE_HOST: "discord.new",
  GIFT_CODE_HOST: "discord.gift",
  RELEASE_CHANNEL: "canary",
  MARKETING_ENDPOINT: "//canary.discord.com",
  BRAINTREE_KEY: "production_5st77rrc_49pp2rp4phym7387",
  STRIPE_KEY: "pk_live_CUQtlpQUF0vufWpnpUmQvcdi",
  NETWORKING_ENDPOINT: "//router.discordapp.net",
  RTC_LATENCY_ENDPOINT: "//latency.discord.media/rtc",
  ACTIVITY_APPLICATION_HOST: "discordsays.com",
  PROJECT_ENV: "production",
  REMOTE_AUTH_ENDPOINT: "//remote-auth-gateway.discord.gg",
  SENTRY_TAGS: {"buildId":"7ea92cf","buildType":"normal"},
  MIGRATION_SOURCE_ORIGIN: "https://canary.discordapp.com",
  MIGRATION_DESTINATION_ORIGIN: "https://canary.discord.com",
  HTML_TIMESTAMP: Date.now(),
  ALGOLIA_KEY: "aca0d7082e4e63af5ba5917d5e96bed0",
  PUBLIC_PATH: "/assets/"
};

const app = fastify();

app.register(fastifyCors, {
  origin: "*",
});

function getBuildFromArgs() {
  if (!jsFiles || !cssFile) return null;
  console.log("[Displunger] Launching from CLI arguments...")
  return {
    rootScripts: jsFiles,
    css: cssFile,
    buildNumber: "custom",
    GLOBAL_ENV: {},
  };
}

async function fetchBuildFromDsale(buildId) {
  try {
    const res = await fetch(`https://api.discord.sale/builds/${buildId}`);
    if (!build.ok) return null;

    const build = await res.json();
    console.log("[Displunger] Launching from Discord.sale API...", buildId)
    return {
      rootScripts: build.files.rootScripts.map(script => `${script}.js`),
      css: `${build.files.css[0]}.css`,
      buildNumber: build.number,
      GLOBAL_ENV: build.GLOBAL_ENV,
    };
  } catch (e) {
    return null;
  }
}

async function fetchBuildFromGithub(buildId) {
  try {
    const builds = await fetch("https://raw.githack.com/Discord-Build-Logger/Builds/main/builds.json").then(r => r.json());
    const { path } = builds[buildId];

    const res = await fetch(`https://raw.githack.com/Discord-Build-Logger/Builds/main/${path}/${buildId}.json`);
    if (!res.ok) return null;

    const build = await res.json();
    console.log("[Displunger] Launching from Discord-Build-Logger repo...", buildId)
    return {
      rootScripts: build.scripts.slice(0, 4).map(script => script.slice(8)),
      css: cssFile,
      buildNumber: buildId,
      GLOBAL_ENV: build.GLOBAL_ENV,
    };
  } catch (e) {
    return null;
  }
}

async function fetchBuildData(res, buildId) {
  const build = getBuildFromArgs() ?? await fetchBuildFromDsale(buildId) ?? await fetchBuildFromGithub(buildId);
  if (build) {
    return build;
  } else {
    res.status(400).send("Build not found.");
  }
}

async function loadBuild(req, res) {
  try {
    const build = await fetchBuildData(res, req.params.build);
    if (!build) return;

    const { rootScripts, css, buildNumber, GLOBAL_ENV } = build;

    // pick the right app html template for build and inject scripts
    let body;

    switch (rootScripts.length) {
      case 4:
        body = await fs.readFile("./app/modern.html", "utf-8");
        body = body
          .replace("$LOADER", rootScripts[0])
          .replace("$CLASSES", rootScripts[1])
          .replace("$WEBPACK", rootScripts[2])
          .replace("$APP", rootScripts[3]);
        break;
      case 3:
        body = await fs.readFile("./app/old.html", "utf-8");
        body = body
          .replace("$LOADER", rootScripts[0])
          .replace("$CLASSES", rootScripts[1])
          .replace("$APP", rootScripts[2]);
        break;
      default:
        return res
          .status(400)
          .send(`Unsupported Build Format (${rootScripts.length})`);
    };

    // inject the stylesheet and other data
    body = body
      .replaceAll("$STYLE", css)
      .replaceAll("$BUILDID", buildNumber);

    // inject the global env
    const environment = GLOBAL_ENV.API_ENDPOINT ? GLOBAL_ENV : premadeEnv;
    if (science === true)
      environment["RELEASE_CHANNEL"] = "staging";

    body = body.replace("$GLOBALENV", JSON.stringify(environment));

    // send the app
    res.type("text/html").send(body);
  } catch (e) {
    console.log(e);
    res.status(400).send("Failed to load build.");
  }
}

// quick launch for latest version
app.get("/launch", async (req, res) => {
  const latest = await fetch(`https://api.discord.sale/builds`).then(r => r.json());
  res.redirect(`/launch/${latest[0].hash}`);
});

// main attraction
app.get("/launch/:build/:endpoint", async (req, res) => {
  await loadBuild(req, res);
});

app.get("/launch/:build", async (req, res) => {
  await loadBuild(req, res);
});

// proxy api requests
app.all("/api/*", async (req, res) => {
  const url = new URL(req.url, "https://canary.discord.com");

  const headers = Object.fromEntries(
    Object.entries(req.headers)
      .filter(([key]) => key !== "referer" && key !== "connection")
      .map(([key, value]) => [
        key,
        key === "host" ? url.host : key === "origin" ? url.origin : value,
      ])
  );

  const response = await fetch(url, {
    method: req.method,
    headers,
    body: req.body ? JSON.stringify(req.body) : undefined,
  });

  res
    .status(response.status)
    .headers(response.headers)
    .type(response.headers.get("content-type"))
    .send(await response.text());
});

app.get("*", async (req, res) => {
  res.send("displunger | Visit /launch/<build hash> to launch a build.");
});

// proxy assets
app.register(fastifyHttpProxy, {
  upstream: "https://canary.discord.com",
  prefix: "/assets",
  rewritePrefix: "/assets",
});

app.listen({ port, host: canonicalUrl.hostname }, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }

  if (science === true)
    console.log("[Displunger] displunger ready with science.")
  else
    console.log(`[Displunger] displunger ready.`);

  console.log(`[Displunger] Launch a build via \x1b[36m\x1b[4m${canonicalUrl}launch/<build hash>\x1b[0m`);
});