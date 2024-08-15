/* eslint-disable */
if ('Bun' in globalThis) {
  throw new Error('❌ Use Node.js to run this test!')
}

import { compression } from 'compressor'

if (typeof compression !== 'function') {
  throw new Error('❌ ESM Node.js failed')
}

console.log('✅ ESM Node.js works!')
