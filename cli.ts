import fs from 'fs-extra'
import path from 'path'
import uuid from 'uuid/v4'
import { tezt, reset } from './tezt'
import chokidar from 'chokidar'
import chalk from 'chalk';
import('ts-node/register')

const watchers = {}
async function main() {
  if (!config.watch) {
    const allTestFiles = await getAllTestFiles(projectRoot)
    for (const file of allTestFiles) {
      require(file)
    }
    return
  }

  const requireKeep = Object.keys(require.cache)
  chokidar
    .watch(projectRoot, {
      ignored: config.ignoreRegExp,
      ignoreInitial: true,
    })
    .on('change', async changedPath => {
      process.env.TEZT = "true"
      if (config.fileRegExp.test(changedPath)) {
        await import(changedPath)
        await (global as any).$$teztRunTests()
        reset()
      }
    })
    .on('ready', () => {
      console.log(chalk.cyan('Watching for changes...'))
    })

  function reset() {
    for (const key in require.cache) {
      if (!requireKeep.includes(key)) {
        delete require.cache[key]
      }
    }
  }
}

async function getAllTestFiles(dir) {
  const files = []
  await (async function getFilesRecursive(dir) {
    const sources = await fs.readdir(dir)
    await Promise.all(
      sources  // N+1
        .map(async source => {
          if (config.ignoreRegExp.test(source)) return
          const absPath = `${dir}/${source}`
          if ((await fs.lstat(absPath)).isDirectory()) {
            await getFilesRecursive(absPath)
          } else {
            if (config.fileRegExp.test(absPath)) {
              files.push(absPath)
            }
          }
        })
    )
  })(dir)
  return files
}

            // const possibleSrcPath = sources.find(srcPath => {
            //   return config.extensions.find(ext => {
            //     return srcPath.replace(path.extname(srcPath), ext) === source
            //   })
            // })
            // const srcFile = possibleSrcPath ? `${dir}/${possibleSrcPath}` : null
            // if (config.fileRegExp.test(absPath)) {
            //   item.files.push({
            //     srcFile,
            //     testFile: absPath,
            //   })
            // }
async function getConfig() {
  const defaultConfig = {
    extensions: [".test.js", ".test.ts"],
    ignoreRegExp:  /((^|[\/\\])\..)|node_modules|dist|build/,
  }
  const userConfig = await getUserConfig()
  if (userConfig) {
    if (typeof userConfig.fileRegExp === "string") {
      userConfig.fileRegExp = new RegExp(`^.*${userConfig.extensions.join("|")}$`)
    }
    if (typeof userConfig.ignoreRegExp === "string") {
      userConfig.ignoreRegExp = new RegExp(userConfig.ignoreRegExp)
    }
  }

  const config =  {
    ...defaultConfig,
    ...userConfig
  }
  if (config.fileRegExp)
    console.warn(`You're not meant to make your own fileRegExp`)

  config.fileRegExp = new RegExp(`^.*${config.extensions.join("|")}$`)

  if (process.argv.slice(2).some(arg => ['-w', '--watch'].includes(arg))) {
    config.watch = true
  }

  return config
}

async function getUserConfig() {
  const teztConfigPath = path.join(projectRoot, 'tezt.config.js')
  const hasTeztConfigPath = await fs.exists(teztConfigPath)
  if (hasTeztConfigPath) {
    return require(teztConfigPath)
  }
  const packageJsonPath = path.join(projectRoot, 'package.json')
  const hasPackageJson = await fs.exists(packageJsonPath)
  if (hasPackageJson) {
    const packageJson = fs.readJson(packageJsonPath)
    return packageJson.tezt
  }
}

async function getProjectRoot() {
  let curPath = process.cwd()
  while (curPath.length > 1) {
    const packageJsonPath = path.join(curPath, 'package.json')
    const hasPackageJson = await fs.exists(packageJsonPath)
    if (hasPackageJson) return projectRoot = curPath
    curPath = path.resolve(curPath, '..')
  }
}

let projectRoot, config;
(async () => {
  try {
    await getProjectRoot()
    config = await getConfig()
    await main()
  } catch(e) {
    console.error(e)
  }
})()

async function waitForEnvVar(name, val) {

}