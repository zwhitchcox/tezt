import chalk from 'chalk';
import uuid from 'uuid/v4'
import 'source-map-support/register'

const isNode = typeof window === "undefined"
if (process.env.TEZT) {
  (global as any).$$teztRunTests = async () => {
    await tezt()
    reset()
  }
}
const IN_JEST = process.env.JEST_WORKER_ID
if (!isNode && !IN_JEST) {
  (window as any).global = (window as any)
  (window as any).process = {argv: []}
}
const IN_MOCHA = !IN_JEST && typeof global.it !== "undefined"
const IN_MOCHA_OR_JEST = IN_JEST || IN_MOCHA



let totalTests = 0
let curOnlys = []
let curItems = []
let curAfters = []
let curBefores = []
let curBeforeEaches = []
let curAfterEaches = []
let curAncestors = []
let containsOnlys = {}
let hasRun = false
let passed = 0
let totalRun = 0
let depth = 0
let failed = []

export function reset() {
  totalTests = 0
  curOnlys = []
  curItems = []
  curAfters = []
  curBefores = []
  curBeforeEaches = []
  curAfterEaches = []
  curAncestors = []
  containsOnlys = {}
  hasRun = false
  passed = 0
  totalRun = 0
  depth = 0
  failed = []
}

export const test:any = IN_MOCHA ? global.it : IN_JEST ? global.test : teztTest
function teztTest(name, fn, id?: string) {
  totalTests++
  id = id || uuid()
  const test = {
    name,
    fn,
    id,
    type: 'test',
  }
  curItems.push(test)
}

if (!IN_MOCHA_OR_JEST) {
  test.skip = (name?, fn?) => totalTests++
  test.only = (name, fn) => {
    const id = uuid()
    for (const ancestor of curAncestors) {
      containsOnlys[ancestor] = true
    }
    curOnlys.push(id)
    test(name, fn, id)
  }
}

export const describe:any = IN_MOCHA_OR_JEST ? global.describe : teztDescribe
function teztDescribe(name, fn, id?) {
  id = id || uuid()
  const onlys = []
  const items = []
  const befores = []
  const afters = []
  const beforeEaches = []
  const afterEaches = []
  const describe = {
    name,
    id,
    onlys,
    items,
    afters,
    befores,
    beforeEaches,
    afterEaches,
    type: "describe",
  }
  curItems.push(describe)

  const prevCurItems = curItems
  const prevOnlys = curOnlys
  const prevBefores = curBefores
  const prevAfters = curAfters
  const prevBeforeEaches = curBeforeEaches
  const prevAfterEaches = curAfterEaches
  curOnlys = onlys
  curItems = items
  curBefores = befores
  curAfters = afters
  curBeforeEaches = beforeEaches
  curAfterEaches = afterEaches

  curAncestors.push(id)
  fn()
  curAncestors.pop()
  curItems = prevCurItems
  curOnlys = prevOnlys
  curBefores = prevBefores
  curAfters = prevAfters
  curAfterEaches = prevAfterEaches
  curBeforeEaches = prevBeforeEaches
}

if (!IN_MOCHA_OR_JEST) {
  describe.only = (name, fn) => {
    const id = uuid()
    for (const ancestor of curAncestors) {
      containsOnlys[ancestor] = true
    }
    curOnlys.push(id)
    describe(name, fn, id)
  }
  describe.skip = (name?, fn?) => {}
}

export async function runTests(items, onlys, curBeforeEaches, curAfterEaches) {
  depth++
  const siblingContainsOnly = items.some(item => containsOnlys[item.id])
  for (const item of items) {
    if (item.type === "describe") {
      if ((siblingContainsOnly || onlys.length) && !onlys.includes(item.id) && !containsOnlys[item.id]) continue
      console.log(chalk.cyan(`${"#".repeat(depth)} ${item.name.toUpperCase()}`))
      for (const before of item.befores) {
        await before()
      }
      await runTests(item.items, item.onlys, item.beforeEaches, item.afterEaches)
      for (const after of item.afters) {
        await after()
      }
      console.log()
    } else if (item.type === "test") {
      if (!onlys.includes(item.id) && (siblingContainsOnly || onlys.length)) continue
      try {
        console.log(chalk.magenta(`${"#".repeat(depth)} Running ${item.name}`))
        for (const beforeEach of curBeforeEaches) {
          await beforeEach()
        }
        await item.fn()
        for (const afterEach of curAfterEaches) {
          await afterEach()
        }
        passed++
        console.log(chalk.green(`PASSED ✓ ${item.name}\n`))
      } catch (e) {
        failed.push(item.name)
        console.error(chalk.red(e.stack))
        console.error(item.name, chalk.red('FAILED :('))
      }
      totalRun++
    }
  }
  depth--
}

export const after = IN_MOCHA ? (global as any).after :
  IN_JEST ? (global as any).afterAll : teztAfter
function teztAfter (fn) {
  curAfters.push(fn)
}
export const before = IN_MOCHA ? (global as any).before :
  IN_JEST ? (global as any).beforeAll : teztBefore
function teztBefore(fn) {
  curBefores.push(fn)
}

export const beforeEach = IN_MOCHA ? (global as any).before :
  IN_JEST ? (global as any).beforeEach : teztBeforeEach
function teztBeforeEach(fn) {
  curBeforeEaches.push(fn)
}

export const afterEach = IN_MOCHA ? (global as any).after :
  IN_JEST ? (global as any).afterEach : teztAfterEach
function teztAfterEach(fn) {
  curAfterEaches.push(fn)
}

export const log = (...args) => {
  const err = new Error()
  const fileNameRegex = /\(.*\)/g
  const match = fileNameRegex.exec(err.stack.split('\n')[2])
  console.log(chalk.cyan(match[0].slice(1, match[0].length - 1)))
  console.log(...args)
}

process.on('beforeExit', async () => {
  if (!hasRun && !IN_MOCHA_OR_JEST) {
    hasRun = true
    await tezt()
  }
})

export async function tezt() {
  try {
    for (const before of curBefores) {
      await before()
    }
    await runTests(curItems, curOnlys, curBeforeEaches, curAfterEaches)
    for (const after of curAfters) {
      await after()
    }
    console.log(chalk.cyanBright(`${passed} / ${totalRun} passed`))
    console.log(chalk.cyan(`${totalTests - totalRun} skipped`))
    failed.forEach(name => console.log(chalk.red(`FAILED: ${name}`)))
  } catch (e) {
    console.log(e)
  }
}