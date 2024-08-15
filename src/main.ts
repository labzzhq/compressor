import { Elysia, mapResponse } from 'elysia'
import type {
  cache_options,
  compression_encoding,
  compression_options,
  life_cycle_options,
} from './types'
import {
  BrotliOptions as brotli_options,
  ZlibOptions as zlib_options,
  constants,
  brotliCompressSync as brotli_compress_sync,
  gzipSync as gzip_sync,
  deflateSync as deflate_sync,
} from 'node:zlib'
import { compression_stream } from './compression-stream'
import cache_store from './cache'

/**
 * Interface for compression service
 */
interface ICompressionService {
  compress(buffer: ArrayBuffer, encoding: compression_encoding): Buffer;
}

/**
 * Compression service implementation
 */
class CompressionService implements ICompressionService {
  private brotli_options: brotli_options;
  private zlib_options: zlib_options;

  constructor(brotli_options: brotli_options, zlib_options: zlib_options) {
    this.brotli_options = brotli_options;
    this.zlib_options = zlib_options;
  }

  compress(buffer: ArrayBuffer, encoding: compression_encoding): Buffer {
    const compressors = {
      br: (buffer: ArrayBuffer) => brotli_compress_sync(buffer, this.brotli_options),
      gzip: (buffer: ArrayBuffer) => gzip_sync(buffer, this.zlib_options),
      deflate: (buffer: ArrayBuffer) => deflate_sync(buffer, this.zlib_options),
    } as Record<compression_encoding, (buffer: ArrayBuffer) => Buffer>;

    return compressors[encoding](buffer);
  }
}

/**
 * Cache service interface
 */
interface ICacheService {
  get(key: number | bigint): Buffer | undefined;
  set(key: number | bigint, value: Buffer, ttl: number): void;
  has(key: number | bigint): boolean;
}

/**
 * Cache service implementation
 */
class CacheService implements ICacheService {
  private cache = cache_store;

  get(key: number | bigint): Buffer | undefined {
    return this.cache.get(key);
  }

  set(key: number | bigint, value: Buffer, ttl: number): void {
    this.cache.set(key, value, ttl);
  }

  has(key: number | bigint): boolean {
    return this.cache.has(key);
  }
}

/**
 * Interface for compression middleware options
 */
export interface ICompressionMiddlewareOptions extends compression_options, life_cycle_options, cache_options {}

/**
 * Compression middleware factory
 *
 * @param {ICompressionMiddlewareOptions} [options] - Optional compression, caching, and life cycle options.
 * @returns {Elysia} - The Elysia app with compression middleware.
 */
export const compression = (
  options?: ICompressionMiddlewareOptions,
): Elysia => {
  const zlib_options: zlib_options = {
    level: 6,
    ...options?.zlib_options,
  };
  const brotli_options: brotli_options = {
    params: {
      [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_GENERIC,
      [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_DEFAULT_QUALITY,
    },
    ...options?.brotli_options,
  };
  const default_encodings = options?.encodings ?? ['br', 'gzip', 'deflate'];
  const default_compressible_types =
    /^text\/(?!event-stream)|(?:\+|\/)json(?:;|$)|(?:\+|\/)text(?:;|$)|(?:\+|\/)xml(?:;|$)|octet-stream(?:;|$)/u;
  const life_cycle_type = options?.as ?? 'global';
  const threshold = options?.threshold ?? 1024;
  const cache_ttl = options?.ttl ?? 24 * 60 * 60; // 24 hours
  const disable_by_header = options?.disable_by_header ?? true;
  const compress_stream = options?.compress_stream ?? true;

  const compression_service = new CompressionService(brotli_options, zlib_options);
  const cache_service = new CacheService();

  const app = new Elysia({
    name: 'compressor',
    seed: options,
  });

  /**
   * Gets or compresses the response body based on the client's accept-encoding header.
   *
   * @param {compression_encoding} algorithm - The compression algorithm to use.
   * @param {ArrayBuffer} buffer - The buffer to compress.
   * @returns {Buffer} The compressed buffer.
   */
  const get_or_compress = (
    algorithm: compression_encoding,
    buffer: ArrayBuffer,
  ): Buffer => {
    const cache_key = Bun.hash(`${algorithm}:${new TextDecoder().decode(buffer)}}`)
    if (cache_service.has(cache_key)) {
      return cache_service.get(cache_key) as Buffer;
    }

    const compressed_output = compression_service.compress(buffer, algorithm);
    cache_service.set(cache_key, compressed_output, cache_ttl);
    return compressed_output;
  };

  /**
   * Compresses the response body based on the client's accept-encoding header.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Encoding
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Encoding
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Type
   */
  app.mapResponse({ as: life_cycle_type }, async (ctx) => {
    // Disable compression when `x-no-compression` header is set
    if (disable_by_header && ctx.headers['x-no-compression']) {
      return;
    }

    const { set } = ctx;
    const response = ctx.response as any;

    const accept_encodings: string[] =
      ctx.headers['accept-encoding']?.split(', ') ?? [];
    const encodings: string[] = default_encodings.filter((encoding) =>
      accept_encodings.includes(encoding),
    );

    if (encodings.length < 1 && !encodings[0]) {
      return;
    }

    const encoding = encodings[0] as compression_encoding;
    let compressed: Buffer | ReadableStream<Uint8Array>;
    let content_type =
      set.headers['Content-Type'] ?? set.headers['content-type'] ?? '';

    /**
     * Compress ReadableStream Object if stream exists (SSE)
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream
     */
    if (compress_stream && response?.stream instanceof ReadableStream) {
      const stream = response.stream as ReadableStream;
      compressed = stream.pipeThrough(compression_stream(encoding, options));
    } else {
      const res = mapResponse(response, {
        headers: {},
      });
      const res_content_type = res.headers.get('Content-Type');

      content_type = res_content_type ? res_content_type : 'text/plain';

      const buffer = await res.arrayBuffer();
      // Disable compression when buffer size is less than threshold
      if (buffer.byteLength < threshold) {
        return;
      }

      // Disable compression when Content-Type is not compressible
      const is_compressible = default_compressible_types.test(content_type);
      if (!is_compressible) {
        return;
      }

      compressed = get_or_compress(encoding, buffer); // Will try cache first
    }

    /**
     * Send Vary HTTP Header
     *
     * The Vary HTTP response header describes the parts of the request message aside
     * from the method and URL that influenced the content of the response it occurs in.
     * Most often, this is used to create a cache key when content negotiation is in use.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Vary
     */
    const vary = set.headers.Vary ?? set.headers.vary;
    if (vary) {
      const raw_header_value = vary
        ?.split(',')
        .map((v: any) => v.trim().toLowerCase());

      const header_value_array = Array.isArray(raw_header_value)
        ? raw_header_value
        : [raw_header_value];

      // Add accept-encoding header if it doesn't exist
      // and if vary not set to *
      if (!header_value_array.includes('*')) {
        set.headers.Vary = header_value_array
          .concat('accept-encoding')
          .filter((value, index, array) => array.indexOf(value) === index)
          .join(', ');
      }
    } else {
      set.headers.Vary = 'accept-encoding';
    }
    set.headers['Content-Encoding'] = encoding;

    return new Response(compressed, {
      headers: {
        'Content-Type': content_type,
      },
    });
  });
  return app;
};