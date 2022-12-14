#!/usr/bin/env node

import { Command } from 'commander'
// import { AIComplete } from './AIComplete'

// interface CommanderOptions {}
;(async () => {
  const program = new Command()

  program.parse(process.argv)

  // const options: CommanderOptions = program.opts()

  // const translator = new AIComplete()

  // await aic.initialize();

  process.exit(0)
})()
