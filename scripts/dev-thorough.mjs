#!/usr/bin/env node

/**
 * dev:thorough — One-command development environment.
 *
 * Runs concurrently:
 *   1. Vite dev server        (hot-reload UI)
 *   2. TypeScript watcher     (continuous type-checking)
 *   3. Vitest watcher         (tests re-run on save)
 *
 * All outputs are prefixed with coloured labels so you can tell at a glance
 * which process produced each line.  Ctrl-C kills everything cleanly.
 *
 * Usage:
 *   npm run dev:thorough
 */

import { spawn } from 'node:child_process'

// ── Configuration ──────────────────────────────────────────────────────

const processes = [
  {
    label: 'VITE',
    color: '\x1b[36m',  // cyan
    cmd: 'npx',
    args: ['vite', '--clearScreen', 'false'],
  },
  {
    label: 'TSC ',
    color: '\x1b[33m',  // yellow
    cmd: 'npx',
    args: ['tsc', '--noEmit', '--watch', '--preserveWatchOutput'],
  },
  {
    label: 'TEST',
    color: '\x1b[35m',  // magenta
    cmd: 'npx',
    args: ['vitest', '--reporter=verbose'],
  },
]

const RESET = '\x1b[0m'

// ── Launch ─────────────────────────────────────────────────────────────

console.log('\x1b[1m\x1b[32m')
console.log('  ╔══════════════════════════════════════╗')
console.log('  ║   dev:thorough — full DX pipeline    ║')
console.log('  ║                                      ║')
console.log('  ║   [VITE]  Dev server + HMR           ║')
console.log('  ║   [TSC ]  Type-checking watcher      ║')
console.log('  ║   [TEST]  Vitest watcher             ║')
console.log('  ║                                      ║')
console.log('  ║   Ctrl-C to stop all                 ║')
console.log('  ╚══════════════════════════════════════╝')
console.log(RESET)

const children = []

for (const proc of processes) {
  const child = spawn(proc.cmd, proc.args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, FORCE_COLOR: '1' },
    shell: process.platform === 'win32',
  })

  const prefix = `${proc.color}[${proc.label}]${RESET} `

  const pipeLine = (stream) => {
    let buffer = ''
    stream.on('data', (chunk) => {
      buffer += chunk.toString()
      const lines = buffer.split('\n')
      buffer = lines.pop() // keep incomplete last line in buffer
      for (const line of lines) {
        if (line.trim()) {
          console.log(`${prefix}${line}`)
        }
      }
    })
  }

  pipeLine(child.stdout)
  pipeLine(child.stderr)

  child.on('exit', (code) => {
    console.log(`${prefix}exited with code ${code}`)
  })

  children.push(child)
}

// ── Cleanup ────────────────────────────────────────────────────────────

function killAll() {
  console.log(`\n\x1b[1m\x1b[31m  Shutting down all processes...${RESET}\n`)
  for (const child of children) {
    child.kill('SIGTERM')
  }
  // Force-kill after 3 seconds if they haven't exited
  setTimeout(() => {
    for (const child of children) {
      if (!child.killed) child.kill('SIGKILL')
    }
    process.exit(0)
  }, 3000)
}

process.on('SIGINT', killAll)
process.on('SIGTERM', killAll)
