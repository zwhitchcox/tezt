import uuid from 'uuid/v4'
import chalk from 'chalk';


type TVoidFunc = () => void
export interface IBlock {
  children: TItem[]
  afters: TVoidFunc[]
  befores: TVoidFunc[]
  beforeEaches: TVoidFunc[]
  afterEaches: TVoidFunc[]
  containsOnly: boolean
}

export class Block implements IBlock {
  onlys = []
  children = []
  afters = []
  befores = []
  beforeEaches = []
  afterEaches = []
  containsOnly = false
}

export interface IItem {
  id: string
  name: string
  location: ILocation
  skip: boolean
  only: boolean
}

export class Item implements IItem {
  constructor(public name) {}
  id = new uuid()
  location = getLocation()
  skip = false
  only = false
}

export interface IDescribe extends IItem {}
export class Describe extends Item implements IDescribe {
  constructor(public name) {
    super(name)
  }
  block = new Block
}

export interface ITest extends IItem {
  fn: TVoidFunc
}
export class Test extends Item implements ITest {
  constructor(public name, public fn) {
    super(name)
  }
}

type TItem = ITest | IDescribe

interface IAdd {
  (name:string, fn: TVoidFunc, id?: string): void,
  skip: TSkip,
  only: TOnly,
}

type TSkip = (name:string, fn: TVoidFunc) => void
type TOnly = (name: string, fn: TVoidFunc) => void


export interface ITezt extends Block {
  containsOnly: boolean
  curBlock?: IBlock
  curAncestors: string[]
  test: IAdd
  describe: IAdd
  skip: TSkip
  only: TOnly
  skipLocations: string[]
  onlyLocations: string[]
  inOnly: boolean
}

export class Tezt extends Block implements ITezt {
  curAncestors = []
  block = new Block
  curBlock
  skipLocations = []
  onlyLocations = []
  inOnly = false
  containsOnly = false


  constructor() {
    super()
    this.curAncestors.push(this)
    this.curBlock = this.block
  }

  public test = (() => {
    const test = (name, fn) => {
      const test = new Test(name, fn)
      this.curBlock.children.push(test)
      if (this.inOnly) {
        for (const ancestor of this.curAncestors){
          ancestor.block.containsOnly = true
        }
        test.only = true
      }
      return test
    }
    test.skip = (name?, fn?) => {
      const prevInOnly = this.inOnly
      this.inOnly = false
      test(name, fn).skip = true
      this.inOnly = prevInOnly
    }
    test.only = (name, fn) => {
      const prevInOnly = this.inOnly
      this.inOnly = true
      const _only = test(name, fn)
      _only.only = true
      this.inOnly = prevInOnly
    }

    return test
  })()

  public describe = (() => {
    const describe = (name, fn) => {
      const describe = new Describe(name)
      const prevBlock = this.curBlock
      prevBlock.children.push(describe)
      this.curBlock = describe.block
      this.curAncestors.push(describe)
      fn()
      this.curAncestors.pop()
      this.curBlock = prevBlock
      return describe
    }

    describe.only = (name, fn) => {
      const prevInOnly = this.inOnly
      this.inOnly = true
      describe(name, fn).only = true
      this.inOnly = prevInOnly
    }
    describe.skip = (name, fn) =>{
      const prevInOnly = this.inOnly
      this.inOnly = false
      describe(name, fn).skip = true
      this.inOnly = prevInOnly
    }
    return describe
  })()

  public run = async () => {
    return await runTests(this.curBlock)
  }

  public only = () => {
    this.onlyLocations.push(getLocation())
  }

  public skip = () => {
    this.skipLocations.push(getLocation())
  }

  public before     = fn => this.curBlock.befores.push(fn)
  public beforeEach = fn => this.curBlock.beforeEaches.push(fn)
  public after      = fn => this.curBlock.afters.push(fn)
  public afterEach  = fn => this.curBlock.afterEaches.push(fn)
}


export interface ILocation {
  filepath: string
  lineno: string
}

export class Location implements ILocation {
  constructor(public filepath, public lineno) {}
}

export function getLocation(depth = 3): ILocation {
  const {stack} = new Error()
  const lines = stack.split('\n')
  const fileLine = lines[depth]
  const filepath = /\(([^:]+):/.exec(fileLine)[1]
  const lineno = /:(\d+):/.exec(fileLine)[1]
  return {
    filepath,
    lineno,
  }
}


interface IStats {
  passed: number
  totalTests: number
  failed: string[]
  totalRun: number
  depth: number
}

export class Stats implements IStats {
  passed = 0
  failed = []
  totalRun = 0
  depth = 0
  totalTests = 0
}

export function outputResults (stats) {
  const { passed, totalRun, totalTests, failed } = stats
  console.log(chalk.cyanBright(`${passed} / ${totalRun} passed`))
  console.log(chalk.cyan(`${totalTests - totalRun} skipped`))
  failed.forEach(name => console.log(chalk.red(`FAILED: ${name}`)))
}



export async function runTests(block: IBlock, stats: IStats = new Stats, depth = 0, inskip = false) {
  const {children, beforeEaches, afterEaches, befores, afters, containsOnly} = block
  depth++
  try {
    if (containsOnly) {
      for (const before of befores) {
        await before()
      }
    }
    for (const item of children) {
      if (item instanceof Describe) {
        const skip = (inskip || (containsOnly && !item.block.containsOnly))
        !skip && console.log(chalk.cyan(`${"#".repeat(depth)} ${item.name}`))
        await runTests(item.block, stats, depth, skip)
        !skip && console.log()
      } else if (item instanceof Test) {
        stats.totalTests++
        try {
          if ((!item.only) && (containsOnly || inskip || item.skip)) continue
          console.log(chalk.magenta(`${"#".repeat(depth)} Running ${item.name}`))
          for (const beforeEach of beforeEaches) {
            await beforeEach()
          }
          await item.fn()
          for (const afterEach of afterEaches) {
            await afterEach()
          }
          stats.passed++
          console.log(chalk.green(`PASSED ✓ ${item.name}\n`))
        } catch (e) {
          stats.failed.push(item.name)
          console.error(chalk.red(e.stack))
          console.error(item.name, chalk.red('FAILED :('))
        }
        stats.totalRun++
      }
    }
    if (containsOnly) {
      for (const after of afters) {
        await after()
      }
    }
  } catch (e) {
    console.error(e)
  }
  return stats
}