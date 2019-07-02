import fs from 'fs-extra'
import path from 'path'

let projectRoot;
export async function getConfig() {
  projectRoot = await getProjectRoot()
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

  config.projectRoot = projectRoot

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

