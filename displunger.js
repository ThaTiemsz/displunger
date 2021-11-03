const express = require('express');
const superagent = require('superagent');
const fs = require('fs');
const { env } = require('process');

const app = express();

const assetHost = 'https://canary.discord.com/assets/';
const port = 3000;

var science = false

//handle process arguments
const processArgs = process.argv.slice(2);
if(processArgs.includes('-science')){
  science = true
}

async function loadBuild(req, res){
  try{
    let build;
    try{
      build = await superagent.get(`https://api.discord.sale/builds/${req.params.build}`); //Fetch the build data
    } catch(e){
      res.status(400).send('Build not found.');
    };
    //pick the right app html template for build and inject scripts
    let index;

    const rootScripts = build.body.files.rootScripts.map(script => script + ".js")

    switch(build.body.files.rootScripts.length){
      case 4:
        index = fs.readFileSync('./app/modern.txt', 'utf-8');
        index = index.replace(/\$LOADER/, rootScripts[0]);
        index = index.replace(/\$CLASSES/, rootScripts[1]);
        index = index.replace(/\$WEBPACK/, rootScripts[2]);
        index = index.replace(/\$APP/, rootScripts[3]);
        break;
      case 3:
        index = fs.readFileSync('./app/old.txt', 'utf-8');
        index = index.replace(/\$LOADER/, rootScripts[0]);
        index = index.replace(/\$CLASSES/, rootScripts[1]);
        index = index.replace(/\$APP/, rootScripts[2]);
        break;
      default:
        return res.status(400).send(`Unsupported Build Format (${rootScripts.length})`);
        break;
    };
    //inject the stylesheet and other data
    index = index.replace(/\$STYLE/g, build.body.files.css[0] + ".css");
    index = index.replace(/\$BUILDID/g, build.body.number);
    if(!build.body.GLOBAL_ENV.API_ENDPOINT){
      var premadeEnv = {
        API_ENDPOINT: '//discord.com/api',
        WEBAPP_ENDPOINT: '//discord.com',
        GATEWAY_ENDPOINT: 'wss://gateway.discord.gg',
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
      if(science == true){
        premadeEnv['RELEASE_CHANNEL'] = "staging"
      }
      index = index.replace(/\$GLOBALENV/, JSON.stringify(premadeEnv));
    } else {
      environment = build.body.GLOBAL_ENV
      if(science == true){
        environment['RELEASE_CHANNEL'] = "staging"
      }
      index = index.replace(/\$GLOBALENV/, JSON.stringify(environment));
    };
    //send the app
    res.setHeader('Content-Type', 'text/html');
    return res.send(index);
  } catch(e){
    console.log(e);
    return res.status(400).send('Failed to load build.');
  }
}


//quick launch for latest version
app.get('/launch', async function(req, res){
  const latest = await superagent.get(`https://api.discord.sale/builds`);
  res.redirect(`/launch/${latest.body[0].hash}`);
})

//Main Attraction
app.get('/launch/:build/:endpoint', async function(req, res){
  loadBuild(req, res)
})

app.get('/launch/:build', async function(req, res){
  loadBuild(req, res)
})

//proxies all requests under /assets/*
app.get('/assets/:asset', async function(req, res){
  //return res.redirect(`${assetHost}${req.params.asset}`)   For the smart people, get a browser addon like CORS Anywhere and uncomment this line to redirect instead of proxying assets
  try{
    const site = await superagent.get(`${assetHost}${req.params.asset}`);
    res.setHeader('Content-Type', site.headers['content-type']);
    if(req.params.asset.endsWith('css')){ return res.send(site.text); };
    //fix for old builds
    if(req.params.asset.endsWith('js')){
      body = site.body
      return res.send(body.toString().replace(/r\[t.type\].push/g, 'r[t.type]?.push'))
    }
    return res.send(site.body);
  } catch(e){
    //console.log(e)  -  Uncomment for debugging
    res.status(404).send('Not Found.');
  };
})

app.get('*', async function(req, res){
  return res.status(404).send('displunger | Visit /launch/&lt;build hash&gt; to launch a build.');
})

app.listen(port, () => {
  if(science == true){
    console.log('[Displunger] displunger ready with science.')
  } else {
    console.log(`[Displunger] displunger ready.`);
  }
  console.log(`[Displunger] Launch a build via \x1b[36m\x1b[4mhttp://localhost:${port}/launch/<build hash>\x1b[0m`);
});