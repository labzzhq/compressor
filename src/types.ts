import type { LifeCycleType } from 'elysia'
import type {
  BrotliOptions as brotli_options,
  ZlibOptions as zlib_options,
} from 'node:zlib'

export type compression_encoding = 'br' | 'deflate' | 'gzip'

export type compression_options = {
  /**
   * The options use for brotli compression.
   *
   * @see https://nodejs.org/api/zlib.html#compressor-options
   */
  brotli_options?: brotli_options

  /**
   * The options use for gzip or deflate compression.
   *
   * @see https://nodejs.org/api/zlib.html#class-options
   */
  zlib_options?: zlib_options

  /**
   * The encodings to use.
   *
   * By default, we prioritize compression using
   * 1. br
   * 2. gzip
   * 3. deflate
   * If an unsupported encoding is received or if the 'accept-encoding' header is missing,
   * it will not compress the payload.
   *
   * You can change that by passing an array of compression tokens to the encodings option
   * example: `encodings: ['gzip', 'deflate']`
   */
  encodings?: compression_encoding[]

  /**
   * You can disable the compression by using `x-no-compression` header in request
   *
   * By default, we will not compress the payload if the 'x-no-compression' header is present
   *
   * @default true
   */
  disable_by_header?: boolean

  /**
   * The minimum byte size for a response to be compressed.
   *
   * Defaults to 1024.
   * @default 1024
   */
  threshold?: number

  /**
   * Whether to compress the stream data or not.
   * This generally refers to Server-Sent-Events
   *
   * @link https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events
   * Defaults to `false`
   * @default false
   */
  compress_stream: boolean
}

export type life_cycle_options = {
  /**
   * By default, hook and schema is scope to current instance only not global.
   * Hook type is to specify the scope of hook whether is should be encapsulated or global.
   *
   * Elysia hook type are as the following:
   * local - apply to only current instance and descendant only
   * scoped - apply to parent, current instance and descendants
   * global - apply to all instance that apply the plugin (all parents, current, and descendants)
   *
   * @default 'scoped'
   * @see https://elysiajs.com/essential/scope.html#hook-type
   */
  as?: LifeCycleType
}

export type cache_options = {
  /**
   * The time-to-live in seconds for the cache.
   *
   * @default 86400 (24 hours)
   */
  ttl?: number
}

export type ElysiaCompressionOptions = compression_options &
  life_cycle_options &
  cache_options
