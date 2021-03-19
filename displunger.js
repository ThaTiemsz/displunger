const express = require('express')
const superagent = require('superagent')
const fs = require('fs')

const app = express()

const assetHost = 'https://canary.discord.com/assets/'
const port = 3000


//Main Attraction
app.get('/launch/:build', async function(req, res){
  try{
    let build;
    try{
      build = await superagent.get(`https://builds.discord.sale/api/builds/${req.params.build}/raw`)
    } catch(e){
      console.log(e)
      res.status(400).send('Build not found.')
    }
    //pick the right app html template for build
    let index;
    switch(build.body.rootScripts.length){
      case 4:
        index = fs.readFileSync('./app/modern.txt', 'utf-8')
        break;
      case 3:
        index = fs.readFileSync('./app/old.txt', 'utf-8')
        break;
      default:
        res.status(400).send(`Unsupported Build Format (${build.body.rootScripts.length})`)
        break;
    }
    //inject the old script and stylesheet
    //we need to do some different things for older builds
    index = index.replace(/\$STYLE/g, build.body.stylesheet)
    index = index.replace(/\$BUILDID/g, build.body.buildNumber)
    index = index.replace(/\$GLOBALENV/, JSON.stringify(build.body.globalEnvs))
    if(build.body.rootScripts.length == 4){ //modern client style with 4 scripts
      index = index.replace(/\$LOADER/, build.body.rootScripts[0])
      index = index.replace(/\$CLASSES/, build.body.rootScripts[1])
      index = index.replace(/\$WEBPACK/, build.body.rootScripts[2])
      index = index.replace(/\$APP/, build.body.rootScripts[3])
    } else if(build.body.rootScripts.length == 3){ //old client style with 3 scripts
      index = index.replace(/\$LOADER/, build.body.rootScripts[0])
      index = index.replace(/\$CLASSES/, build.body.rootScripts[1])
      index = index.replace(/\$APP/, build.body.rootScripts[2])
    }
    console.log(build.body.rootScripts[3])
    res.setHeader('Content-Type', 'text/html')
    res.send(index)
  } catch(e){
    console.log(e)
    res.status(400).send('Failed to load build.')
  }
})

//Asset proxy
//proxies all requests under /assets/* to canary.discord.com
app.get('/assets/:asset', async function(req, res){
  try{
    const site = await superagent.get(`${assetHost}${req.params.asset}`)
    //we need to return diff types for some of them
    res.setHeader('Content-Type', site.headers['content-type'])
    if(req.params.asset.endsWith('css')){ return res.send(site.text); }
    return res.send(site.body);
  } catch(e){
    res.status(400).send('Not Found.')
  }
})

app.listen(port, () => {
  console.log(`[Displunger] Build Viewer Live`)
})