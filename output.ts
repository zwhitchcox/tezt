import chalk from "chalk";
import { BlockStats, TestStats } from './Tezt';

export function outputResults (stats) {
  const { passed, totalRun, failed, skipped } = stats
  outputContent(stats.children)
  const totalTests = passed.length + failed.length + skipped.length
  console.log(chalk.cyanBright(`${passed.length} / ${totalRun} passed`))
  console.log(chalk.cyan(`${totalTests - totalRun} skipped`))
  failed.forEach(({name}) => console.log(chalk.red(`FAILED: ${name}`)))
}

function outputContent(stats) {
  for (const itemStats of stats) {
    if (itemStats instanceof BlockStats) {

      if (itemStats.totalRun) {
        console.log(chalk.cyan(`${"  ".repeat(itemStats.depth)} ${itemStats.name}`))
        outputContent(itemStats.children)
      }
    } else if (itemStats instanceof TestStats) {
      outputTest(itemStats)
    }
  }
}

function outputTest(test) {
  if (test)
  console.log(test)
}