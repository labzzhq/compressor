# compressor

[![Codacy Badge](https://api.codacy.com/project/badge/Grade/f2e8239df3cf4b5dbdd0797a60e51070)](https://app.codacy.com/gh/labzzhq/compressor?utm_source=github.com&utm_medium=referral&utm_content=labzzhq/compressor&utm_campaign=Badge_Grade)


The `compressor` library provides robust compression capabilities for the [Elysia Server](https://elysiajs.com/essential/handler.html#response) and [BunnyHop](https://github.com/labzzhq/bunnyhop) frameworks. It supports `gzip`, `deflate`, and `brotli` compression algorithms.

**Note**: Brotli Compression is only available and supported by Bun v1.1.8 or higher.

`compressor` is a fork of [`compressor`](https://github.com/vermaysha/compressor) by [@vermaysha](https://github.com/vermaysha) with some improvements.

## Installation

To install the `compressor` library, use the following command:
```bash
npm install @labzzhq/compressor
```


## Usage

The `compressor` plugin automatically compresses every response sent by the Elysia or BunnyHop server. It is particularly effective for responses in the form of JSON objects, text, and streams (such as Server-Sent Events).

### Supported Encodings

The following encoding tokens are supported, in order of priority:

1. `br`
2. `gzip`
3. `deflate`

If an unsupported encoding is received or if the `'accept-encoding'` header is missing, the payload will not be compressed.

The plugin determines whether a payload should be compressed based on its `content-type`. If no content type is present, it defaults to `text/plain`. Responses in the form of an object are automatically detected as `application/json`.

### Performance Optimization

To enhance performance, caching compressed responses can significantly reduce server load. By setting an appropriate `TTL` (time to live), you can ensure that frequently accessed data is served quickly without repeatedly compressing the same content. The `compressor` library stores data in-memory, so it is advisable to set sensible defaults to avoid excessive memory usage.

### Global Hook

The global compression hook is enabled by default. To disable it, pass the option `{ as: 'scoped' }`. For more details, refer to the [Elysia Scope documentation](https://elysiajs.com/essential/scope.html).

```typescript
import { Elysia } from 'elysia';
import { compression } from 'compressor';

const app = new Elysia()
  .use(
    compression({
      as: 'scoped',
    }),
  )
  .get('/', () => ({ hello: 'world' }));
```


## Compression Options

### Threshold

The minimum byte size for a response to be compressed. The default value is `1024` bytes.

```typescript
const app = new Elysia().use(
  compression({
    threshold: 2048,
  }),
);
```


### Disable Compression by Header

You can selectively disable response compression by using the `x-no-compression` header in the request. This option can be disabled by setting `disableByHeader: true`. The default value is `false`.


```typescript
const app = new Elysia().use(
  compression({
    disableByHeader: true,
  }),
);
```


### Brotli and Zlib Options

You can fine-tune compression by setting the `brotliOptions` and `zlibOptions` properties. These properties are passed directly to native Node.js `zlib` methods. Refer to the [Node.js zlib documentation](https://nodejs.org/api/zlib.html) for more details.

```typescript
const app = new Elysia().use(
  compression({
    brotliOptions: {
      params: {
        [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
        [zlib.constants.BROTLI_PARAM_QUALITY]: 4,
      },
    },
    zlibOptions: {
      level: 6,
    },
  }),
);
```


### Customize Encoding Priority

By default, `compressor` prioritizes compression as described in the [Usage](#usage) section. You can change this by passing an array of compression tokens to the `encodings` option:

```typescript
const app = new Elysia().use(
  compression({
    TTL: 3600, // Cache TTL of 1 hour
  }),
);
```


### Cache TTL

Specify a time-to-live (TTL) for cache entries to define how long compressed responses should be cached. The TTL is specified in seconds and defaults to `86400` (24 hours).

```typescript
const app = new Elysia().use(
  compression({
    encodings: ['deflate', 'gzip'],
  }),
);
```


### Cache Server-Sent Events

By default, `compressor` does not compress responses in Server-Sent Events. To enable compression for Server-Sent Events, set the `compressStream` option to `true`.

```typescript
const app = new Elysia().use(
  compression({
    compressStream: true,
  }),
);
```

## License

This plugin is licensed under the [MIT License](LICENSE).
