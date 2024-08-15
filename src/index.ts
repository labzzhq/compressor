import { Effect } from 'effect'
import { compression, ICompressionMiddlewareOptions } from './main'

/**
 * @module compression
 * @description This module exports compression-related functionality.
 */

/**
 * Re-export all types from the types module.
 */
export * from './types'

/**
 * Re-export all functionality from the compression-stream module.
 */
export * from './compression-stream'

/**
 * Export the main compression function as the default export.
 */
export default compression

/**
 * Named export of the compression function.
 */
export { compression }

/**
 * An Effect that represents the compression operation.
 * This is a placeholder and should be implemented with actual Effect logic.
 */
export const compressionEffect = Effect.succeed(compression)

// Export the type to resolve the error
export type { ICompressionMiddlewareOptions }
