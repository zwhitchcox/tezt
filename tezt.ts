import chalk from 'chalk';
import uuid from 'uuid/v4'
import 'source-map-support/register'


let curOnlys = []
let curItems = []
let curAfters = []
let curBefores = []
let curBeforeEaches = []
let curAfterEaches = []
let curAncestors = []

const IN_MOCHA = typeof global.it !== "undefined" && typeof global.test ==="undefined" && process.argv.some(name => /mocha/.test(name))
const IN_JEST = typeof global.test !== "undefined" && !IN_MOCHA
const IN_MOCHA_OR_JEST = IN_JEST || IN_MOCHA

export const test:any = IN_MOCHA ? global.it : IN_JEST ? global.test : teztTest
function teztTest(name, fn, id?: string) {
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
  test.skip = (name?, fn?) => {}
  test.only = (name, fn) => {
    const id = uuid()
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
  fn()
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
    curOnlys.push(id)
    describe(name, fn, id)
  }
  describe.skip = (name?, fn?) => {}
}

let depth = 0
const failed = []
export async function runTests(items, onlys, curBeforeEaches, curAfterEaches, curBefores, inOnly = false) {
  depth++
  let runAfters = false
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item.type === "describe") {
      console.log(chalk.cyan(`${"#".repeat(depth)} ${item.name.toUpperCase()}`))
      curBefores.push(...item.befores)
      if (await runTests(item.items, item.onlys, item.beforeEaches, item.afterEaches, curBefores, (onlys.length && !onlys.includes(item.id)))) {
        runAfters = true
      }
    } else if (item.type === "test") {
      if (inOnly && onlys.length && !onlys.includes(item.id)) continue
      runAfters = true
      for (let i = 0; i < item.befores.length; i++) {
        try {
          await item.befores[i]()
        } catch (e) {
          console.error(e)
        }
      }
      try {
        while (curBefores.length) { // lazily run befores and afters, in case of deep nesting onlys
          await (curBefores.shift())()
        }
        for (const beforeEach of curBeforeEaches) {
          await beforeEach()
        }
        console.log(chalk.magenta(`${"#".repeat(depth)} Running ${item.name}`))
        await item.fn()
        for (const afterEach of curAfterEaches) {
          await afterEach()
        }
        passed++
        console.log(chalk.green(`PASSED ✓ ${item.name}`))
      } catch (e) {
        failed.push(item.name)
        console.error(chalk.red(e.stack))
        console.error(item.name, chalk.red('FAILED :('))
      }
      total++
    }
  }
    while (curAfters.length) {
      await (curAfters.shift())()
    }
  depth++
  return runAfters
}

export const after = IN_MOCHA ? (global as any).after : IN_JEST ? (global as any).afterAll : teztAfter
function teztAfter (fn) {
  curAfters.push(fn)
}
export const before = IN_MOCHA ? (global as any).before : IN_JEST ? (global as any).beforeAll : teztBefore
function teztBefore(fn) {
  curBefores.push(fn)
}

export const beforeEach = IN_MOCHA ? (global as any).before : IN_JEST ? (global as any).beforeEach : teztBeforeEach
function teztBeforeEach(fn) {
  curBeforeEaches.push(fn)
}

export const afterEach = IN_MOCHA ? (global as any).after : IN_JEST ? (global as any).afterEach : teztAfterEach
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

let hasRun = false
let passed = 0
let total = 0
process.on('beforeExit', async () => {
  if (!hasRun && !IN_MOCHA_OR_JEST) {
    hasRun = true
    if (await runTests(curItems, curOnlys, curBeforeEaches, curAfterEaches, curBefores, true)) {
      for (const after of curAfters) {
        await after()
      }
    }
    console.log(chalk.cyanBright(`${passed} / ${total} passed`))
    failed.forEach(name => console.log(chalk.red(`${name} FAILED`)))
  }
})