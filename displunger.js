const express = require('express')
const superagent = require('superagent')
const fs = require('fs')

const app = express()

const assetHost = 'https://canary.discord.com/assets/'
const port = 3000

app.get('/app', async function(req, res){
  try{
    let build;
    try{
      const build = await superagent.get(`https://builds.discord.sale/api/builds/${req.query.build}/raw`)
    } catch(e){
      console.log(e)
      res.status(400).send('Build not found.')
    }
    //pick the right app html template for build
    let index;
    switch(build.body.rootScripts.length){
      case 4:
        index = fs.readFileSync('./app/2021.txt', 'utf-8')
        break;
      case 3:
        index = fs.readFileSync('./app/2018.txt', 'utf-8')
        break;
      default:
        res.status(400).send('Unsupported Build Format')
        break;
    }
    //we need to do some different things for older builds
    index = index.replace(/\$STYLE/g, build.body.stylesheet)
    index = index.replace(/\$BUILDID/g, build.body.buildNumber)
    index = index.replace(/\$GLOBALENV/, JSON.stringify(build.body.globalEnvs))
    if(build.body.rootScripts.length == 4){
      index = index.replace(/\$LOADER/, build.body.rootScripts[0])
      index = index.replace(/\$CLASSES/, build.body.rootScripts[1])
      index = index.replace(/\$WEBPACK/, build.body.rootScripts[2])
      index = index.replace(/\$APP/, build.body.rootScripts[3])
    } else if(build.body.rootScripts.length == 3){
      index = index.replace(/\$LOADER/, build.body.rootScripts[0])
      index = index.replace(/\$CLASSES/, build.body.rootScripts[1])
      index = index.replace(/\$WEBPACK/, '')
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

app.get('/assets/:asset', async function(req, res){
  try{
    const site = await superagent.get(`${assetHost}${req.params.asset}`)
    if(req.params.asset.endsWith('css')){
      res.setHeader('Content-Type', 'text/css')
      res.send(site.text)
    } else if(req.params.asset.endsWith('svg')){
      res.setHeader('Content-Type', 'image/svg+xml')
      res.send(site.body)
    } else {
      res.setHeader('Content-Type', 'text/plain')
      res.send(site.body)
    }
  } catch(e){
    res.status(400).send('Not Found.')
  }
})

app.listen(port, () => {
  console.log(`[Displunger] Build Viewer live @ http://localhost:${port}/app?build=<build id>`)
})
