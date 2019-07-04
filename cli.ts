#!/usr/bin/env node

import fs from 'fs-extra'
import chokidar from 'chokidar'
import chalk from 'chalk';
import {getConfig} from './config'
import { outputResults } from './output';

process.env.TEZT = "cli"
process.env.FORCE_COLOR = process.env.FORCE_COLOR || "1"
async function main() {
  if (!config.watch) {
    const allTestFiles = await getAllTestFiles(config.projectRoot)
    for (const file of allTestFiles) {
      await import('source-map-support/register')
      await import(file)
      const stats = await (global as any).$$tezt.run()
      outputResults(stats)
    }
    return
  }

  const requireKeep = Object.keys(require.cache)
  chokidar
    .watch(config.projectRoot, {
      ignored: config.ignoreRegExp,
      ignoreInitial: true,
    })
    .on('change', async changedPath => {
      if (config.fileRegExp.test(changedPath)) {
        await import(changedPath)
        const stats = await (global as any).$$tezt.run()
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

let config;
(async () => {
  try {
    config = await getConfig()
    await main()
  } catch(e) {
    console.error(e)
  }
})()
