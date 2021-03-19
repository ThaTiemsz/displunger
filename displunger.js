const express = require('express');
const superagent = require('superagent');
const fs = require('fs');

const app = express();

const assetHost = 'https://canary.discord.com/assets/';
const port = 3000;

//quick launch for latest version
app.get('/launch', async function(req, res){
  const latest = await superagent.get(`https://builds.discord.sale/builds/feed/json`);
  res.redirect(`/launch/${latest.body.items[0].id}`);
})

//Main Attraction
app.get('/launch/:build', async function(req, res){
  try{
    let build;
    try{
      build = await superagent.get(`https://builds.discord.sale/api/builds/${req.params.build}/raw`); //Fetch the build data
    } catch(e){
      res.status(400).send('Build not found.');
    };
    //pick the right app html template for build and inject scripts
    let index;
    switch(build.body.rootScripts.length){
      case 4:
        index = fs.readFileSync('./app/modern.txt', 'utf-8');
        index = index.replace(/\$LOADER/, build.body.rootScripts[0]);
        index = index.replace(/\$CLASSES/, build.body.rootScripts[1]);
        index = index.replace(/\$WEBPACK/, build.body.rootScripts[2]);
        index = index.replace(/\$APP/, build.body.rootScripts[3]);
        break;
      case 3:
        index = fs.readFileSync('./app/old.txt', 'utf-8');
        index = index.replace(/\$LOADER/, build.body.rootScripts[0]);
        index = index.replace(/\$CLASSES/, build.body.rootScripts[1]);
        index = index.replace(/\$APP/, build.body.rootScripts[2]);
        break;
      default:
        return res.status(400).send(`Unsupported Build Format (${build.body.rootScripts.length})`);
        break;
    };
    //inject the stylesheet and other data
    index = index.replace(/\$STYLE/g, build.body.stylesheet);
    index = index.replace(/\$BUILDID/g, build.body.buildNumber);
    if(!build.body.globalEnvs.API_ENDPOINT){
      const premadeEnv = {
        API_ENDPOINT: '//discord.com/api',
        WEBAPP_ENDPOINT: '//discord.com',
        CDN_HOST: 'cdn.discordapp.com',
        ASSET_ENDPOINT: 'https://discord.com',
        MEDIA_PROXY_ENDPOINT: 'https://media.discordapp.net',
        WIDGET_ENDPOINT: '//discord.com/widget',
        INVITE_HOST: 'discord.gg',
        GUILD_TEMPLATE_HOST: 'discord.new',
        GIFT_CODE_HOST: 'discord.gift',
        RELEASE_CHANNEL: 'stable',
        MARKETING_ENDPOINT: '//discord.com',
        BRAINTREE_KEY: 'production_5st77rrc_49pp2rp4phym7387',
        STRIPE_KEY: 'pk_live_CUQtlpQUF0vufWpnpUmQvcdi',
        NETWORKING_ENDPOINT: '//router.discordapp.net',
        RTC_LATENCY_ENDPOINT: '//latency.discord.media/rtc',
        ACTIVITY_APPLICATION_HOST: 'discordsays.com',
        PROJECT_ENV: 'production',
        REMOTE_AUTH_ENDPOINT: '//remote-auth-gateway.discord.gg',
        SENTRY_TAGS: {"buildId":"7ea92cf","buildType":"normal"},
        MIGRATION_SOURCE_ORIGIN: 'https://discordapp.com',
        MIGRATION_DESTINATION_ORIGIN: 'https://discord.com',
        HTML_TIMESTAMP: Date.now(),
        ALGOLIA_KEY: 'aca0d7082e4e63af5ba5917d5e96bed0',
      }
      index = index.replace(/\$GLOBALENV/, JSON.stringify(premadeEnv));
    } else {
      index = index.replace(/\$GLOBALENV/, JSON.stringify(build.body.globalEnvs));
    };
    //send the app
    res.setHeader('Content-Type', 'text/html');
    return res.send(index);
  } catch(e){
    console.log(e);
    return res.status(400).send('Failed to load build.');
  }
})

//proxies all requests under /assets/*
app.get('/assets/:asset', async function(req, res){
  //return res.redirect(`${assetHost}${req.params.asset}`)   For the smart people, get a browser addon like CORS Anywhere and uncomment this line to redirect instead of proxying assets
  try{
    const site = await superagent.get(`${assetHost}${req.params.asset}`);
    res.setHeader('Content-Type', site.headers['content-type']);
    if(req.params.asset.endsWith('css')){ return res.send(site.text); };
    return res.send(site.body);
  } catch(e){
    res.status(400).send('Not Found.');
  };
})

app.get('*', async function(req, res){
  return res.status(404).send('displunger | Visit /launch/&lt;build hash&gt; to launch a build.');
})

app.listen(port, () => {
  console.log(`[Displunger] displunger ready.`);
  console.log(`[Displunger] Launch a build via \x1b[36m\x1b[4mhttp://localhost:${port}/launch/<build hash>\x1b[0m`);
});