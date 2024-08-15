import zlib from 'node:zlib'
import { Transform, TransformCallback } from 'stream'
import type { compression_encoding, compression_options } from './types'

/**
 * Creates a compression stream based on the specified encoding and options.
 *
 * @param {CompressionEncoding} encoding - The compression encoding to use.
 * @param {CompressionOptions} [options] - The compression options.
 * @returns {{ readable: ReadableStream<Uint8Array>, writable: WritableStream<Uint8Array> }} The compression stream.
 */
export const compression_stream = (
  encoding: compression_encoding,
  options?: compression_options,
): { readable: ReadableStream<Uint8Array>, writable: WritableStream<Uint8Array> } => {
  const handler = get_compression_handler(encoding, options)

  const readable = new ReadableStream<Uint8Array>({
    /**
     * Starts the stream and sets up event listeners for 'data' and 'end' events.
     *
     * @param {ReadableStreamDefaultController<Uint8Array>} controller - The controller object for the readable stream.
     */
    start(controller: ReadableStreamDefaultController<Uint8Array>) {
      handler.on('data', (chunk: Uint8Array) => controller.enqueue(chunk))
      handler.once('end', () => controller.close())
    },
  })

  const writable = new WritableStream<Uint8Array>({
    /**
     * Writes a chunk of data to the writable stream.
     *
     * @param {Uint8Array} chunk - The chunk of data to write.
     * @returns {Promise<void>}
     */
    write: (chunk: Uint8Array): Promise<void> => handler.write(chunk) as any,

    /**
     * Closes the writable stream.
     *
     * @returns {Promise<void>}
     */
    close: (): Promise<void> => handler.end() as any,
  })

  return {
    readable,
    writable,
  }
}

/**
 * Returns the appropriate compression handler based on the encoding and options.
 *
 * @param {compression_encoding} encoding - The compression encoding to use.
 * @param {compression_options} [options] - The compression options.
 * @returns {Transform} The compression handler.
 */
const get_compression_handler = (
  encoding: compression_encoding,
  options?: compression_options,
): Transform => {
  const zlib_options: zlib.ZlibOptions = {
    level: 6,
    ...options?.zlib_options,
  }

  const brotli_options: zlib.BrotliOptions = {
    params: {
      [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
      [zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_DEFAULT_QUALITY,
    },
    ...options?.brotli_options,
  }

  switch (encoding) {
    case 'br':
      return zlib.createBrotliCompress(brotli_options)
    case 'gzip':
      return zlib.createGzip(zlib_options)
    case 'deflate':
      return zlib.createDeflate(zlib_options)
    default:
      return new Transform({
        /**
         * Transforms the given chunk of data and calls the callback with the transformed data.
         *
         * @param {any} chunk - The chunk of data to be transformed.
         * @param {any} _ - Unused parameter.
         * @param {TransformCallback} callback - The callback function to be called with the transformed data.
         * @return {void}
         */
        transform(chunk: any, _: any, callback: TransformCallback): void {
          callback(null, chunk)
        },
      })
  }
}