![displunger banner](https://cdn.discordapp.com/attachments/415951527258095616/822453386263265290/displunger.banner.png)

View/run old Discord builds.

## How to use

1. Run `pnpm install` to install the dependencies.
2. Run `node displunger` to launch the web app.
3. Visit `http://localhost:3000/launch/<BUILD HASH>` to view a build.

## Warning

I'd advise you to only run this on phone verified accounts, as Discord might lock you out/force you to verify your phone number due to old API requests.

## CLI Options

### `--port` `-p`

This option will set the port the web app will run on. Defaults to `3000`.

### `--host` `-h`

This option will set the host the web app will run on. Defaults to `http://127.0.0.1:PORT`.

### `--science` `-s`

This option will set the release channel to Staging and enables access to the experiments tab. Defaults to false.

### `--js` `-j`

This option will manually set the root JS scripts in case the build data could not be fetched.

**Usage:**\
`node displunger -j <filename>,<filename>,<filename>,<filename>`\
or\
`node displunger -j <filename> -j <filename> -j <filename> -j <filename>`

### `--css` `-c`

This option will manually set the root CSS file in case the build data could not be fetched.

**Usage:**\
`node displunger -c <filename>`

### `--api` `-a`

This option will manually set the API version in case the build data could not be fetched.


## Old Builds
The oldest build we can currently launch is `21837 (10b6c00342136bb3324d2d694b86050ae915017b)`.
Really old builds (roughly early 2018) have since been unpublished and cannot be loaded anymore.

Many older builds fail to function properly due to breaking changes made on the API.

## Credits
Powered by [Megumin's Discord Build Archive](https://discord.sale) and [Discord Build Logger](https://github.com/Discord-Build-Logger/Builds)
