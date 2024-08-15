import { describe, expect, it } from 'bun:test'
import { compression_stream } from '../src/compression-stream'
import zlib from 'node:zlib'
import { response_short } from './setup'

describe('compression_stream', () => {
  it('should create a compression stream', () => {
    const stream = compression_stream('br')
    expect(stream).toBeDefined()
    expect(stream.readable).toBeDefined()
    expect(stream.writable).toBeDefined()
  })

  it('compresses data using br encoding and verifies output', async () => {
    // Sample data to compress
    const test_data = new TextEncoder().encode(response_short)

    // Create a compression stream with Brotli encoding
    const { readable, writable } = compression_stream('br')

    // Use the WritableStream to write the test data
    const writer = writable.getWriter()
    await writer.write(test_data)
    await writer.close()

    // Read from the ReadableStream and collect the compressed data
    const reader = readable.getReader()
    let compressed_data = new Uint8Array()
    let done = false
    while (!done) {
      const { value, done: stream_done } = await reader.read()
      if (value) {
        // This example simply concatenates chunks; for larger data, consider a more efficient method
        compressed_data = new Uint8Array([...compressed_data, ...value])
      }
      done = stream_done
    }

    // Verify the compressed data
    // Expect the compressed data to exist and be different from the original
    expect(compressed_data.byteLength).toBeGreaterThan(0)
    expect(compressed_data).not.toEqual(test_data)

    // Further verification could include decompressing `compressed_data` and comparing with `test_data`
    // and checking that the decompressed data matches the original.

    // Verify that the decompressed data matches the original
    const decompressed_data = new TextDecoder().decode(
      zlib.brotliDecompressSync(compressed_data),
    )
    expect(decompressed_data).toEqual(response_short)
  })

  it('compresses data using gzip encoding and verifies output', async () => {
    // Sample data to compress
    const test_data = new TextEncoder().encode(response_short)

    // Create a compression stream with Brotli encoding
    const { readable, writable } = compression_stream('gzip')

    // Use the WritableStream to write the test data
    const writer = writable.getWriter()
    await writer.write(test_data)
    await writer.close()

    // Read from the ReadableStream and collect the compressed data
    const reader = readable.getReader()
    let compressed_data = new Uint8Array()
    let done = false
    while (!done) {
      const { value, done: stream_done } = await reader.read()
      if (value) {
        // This example simply concatenates chunks; for larger data, consider a more efficient method
        compressed_data = new Uint8Array([...compressed_data, ...value])
      }
      done = stream_done
    }

    // Verify the compressed data
    // Expect the compressed data to exist and be different from the original
    expect(compressed_data.byteLength).toBeGreaterThan(0)
    expect(compressed_data).not.toEqual(test_data)

    // Further verification could include decompressing `compressed_data` and comparing with `test_data`
    // and checking that the decompressed data matches the original.

    // Verify that the decompressed data matches the original
    const decompressed_data = new TextDecoder().decode(
      zlib.gunzipSync(compressed_data),
    )
    expect(decompressed_data).toEqual(response_short)
  })

  it('compresses data using deflate encoding and verifies output', async () => {
    // Sample data to compress
    const test_data = new TextEncoder().encode(response_short)

    // Create a compression stream with Brotli encoding
    const { readable, writable } = compression_stream('deflate')

    // Use the WritableStream to write the test data
    const writer = writable.getWriter()
    await writer.write(test_data)
    await writer.close()

    // Read from the ReadableStream and collect the compressed data
    const reader = readable.getReader()
    let compressed_data = new Uint8Array()
    let done = false
    while (!done) {
      const { value, done: stream_done } = await reader.read()
      if (value) {
        // This example simply concatenates chunks; for larger data, consider a more efficient method
        compressed_data = new Uint8Array([...compressed_data, ...value])
      }
      done = stream_done
    }

    // Verify the compressed data
    // Expect the compressed data to exist and be different from the original
    expect(compressed_data.byteLength).toBeGreaterThan(0)
    expect(compressed_data).not.toEqual(test_data)

    // Further verification could include decompressing `compressed_data` and comparing with `test_data`
    // and checking that the decompressed data matches the original.

    // Verify that the decompressed data matches the original
    const decompressed_data = new TextDecoder().decode(
      zlib.inflateSync(compressed_data),
    )
    expect(decompressed_data).toEqual(response_short)
  })

  it(`Don't compress when algorithm is invalid`, async () => {
    // Sample data to compress
    const test_data = new TextEncoder().encode(response_short)

    // Create a compression stream with invalid encoding
    const { readable, writable } = compression_stream('' as any)

    // Use the WritableStream to write the test data
    const writer = writable.getWriter()
    await writer.write(test_data)
    await writer.close()

    // Read from the ReadableStream and collect the compressed data
    const reader = readable.getReader()
    let compressed_data = new Uint8Array()
    let done = false
    while (!done) {
      const { value, done: stream_done } = await reader.read()
      if (value) {
        // This example simply concatenates chunks; for larger data, consider a more efficient method
        compressed_data = new Uint8Array([...compressed_data, ...value])
      }
      done = stream_done
    }

    // Verify the compressed data
    // Expect the compressed data to exist and be different from the original
    expect(compressed_data.byteLength).toBeGreaterThan(0)
    expect(compressed_data).toEqual(test_data)
  })
})