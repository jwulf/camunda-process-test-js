#!/usr/bin/env node

import { Command } from 'commander'

import { configInit } from './config-init'

const program = new Command()

program
	.name('@camunda8/process-test')
	.description('Camunda Process Test CLI')
	.version('1.6.0')

program
	.command('config:init')
	.description('Initialize Camunda process test configuration')
	.option('--dry-run', 'Output changes to console without writing files')
	.option('--jest', 'Force Jest configuration generation')
	.action(configInit)

program.parse()
