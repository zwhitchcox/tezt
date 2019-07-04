#!/usr/bin/env node

import chalk from 'chalk';
import glob from 'glob-promise'
import chokidar from 'chokidar'
import uuid from 'uuid/v4'
import { Tezt } from './Tezt';
import {getConfig} from './config'
import { outputResults } from './output';
import ('source-map-support/register')

process.env.TEZT = "cli"
process.env.FORCE_COLOR = process.env.FORCE_COLOR || "1"
async function main() {
  const config = await getConfig()
  if (!config.watch) {
    return await runTests(config)
  }

  let running = false
  chokidar
    .watch([config.watchPatterns, config.testPatterns], {
      ignored: config.ignorePatterns,
      ignoreInitial: false,
    })
    .on('all', async (...args) => {
      if (!running) {
        running = true
        setTimeout(async () => {
          await runTests(config)
          running = false
        }, 500)
      }
    })
    .on('ready', () => {
      console.log(chalk.cyan('Watching for changes...'))
    })
}

async function runTests(config) {
  const allTestFiles = await getAllTestFiles(config)
  const requireKeep = Object.keys(require.cache)
  for (const file of allTestFiles) {
    await import('source-map-support/register')
    await import(config.root + "/" + file)
    const stats = await (global as any).$$tezt.run()
    outputResults(stats)
  }
  reset()
  function reset() {
    ;(global as any).$$tezt = new Tezt
    if(config.watch) {
      resetRequire(requireKeep)
    }
  }
}

function resetRequire(requireKeep) {
  for (const key in require.cache) {
    if (!requireKeep.includes(key)) {
      delete require.cache[key]
    }
  }
}

async function getAllTestFiles(config) {
  const files = await glob(config.testPatterns[0], {
    root: config.root,
    ignore: config.ignorePatterns,
  })

  return files
}

;(async () => {
  try {
    await main()
  } catch(e) {
    console.error(e)
  }
})()

function debounce(func, wait, immediate) {
	var timeout
	return async function(...args) {
		var later = async function() {
			timeout = null
			if (!immediate) await func(...args)
    }
		var callNow = immediate && !timeout
		clearTimeout(timeout)
		timeout = setTimeout(later, wait)
		if (callNow) await func(...args)
	}
}