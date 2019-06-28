import expect from 'expect'
import { test, describe, before, after, afterEach, beforeEach } from './tezt'

test('this is my test', () => {
  expect('hello').toBe('hello')
})

test.skip(`this test won't be run`, () => {
  throw new Error('This is never thrown')
})

describe('I can describe a group of tests', () => {
  before(() => {
    console.log('this is run before all tests in this describe block')
  })

  after(() => {
    console.log('this is run after all tests in this describe block')
  })

  test.skip('this test won\'t run', () => {
    console.log('this is never output')
  })


  test('this is the only test that will run unless there are another only\'s in the block', () => {
    throw new Error('This error will be thrown, but the rest of the tests will still run')
  })

  test(`this test won't be run, because it didn't specify only`, () => {
    console.log('this is not run')
  })

  describe('I can nest as many describes as I want', () => {
    test('and they can include as many', () => {
      console.log('tests as they want')
    })
  })
})

describe('You can also run beforeEach and afterEach test', () => {
  beforeEach(() => {
    console.log('this will output before each test')
  })
  afterEach(() => {
    console.log('this will output after each test')
  })
  for (let i = 0; i < 5; i++) {
    test(`test ${i}`, () => {})
  }

})

// describe.only('describes can also contain only\'s, but then the previous describe and previous tests would not run', () => {
//   test('onlys exclude every describe or test on their same nest level that don\'t include onlys', () => {})
// })

test('I can also run asynchonous tests', async () => {
  await new Promise((res, rej) => {
    expect('the test will not return until the promise has resolved').toBeTruthy()
    res()
  })
})