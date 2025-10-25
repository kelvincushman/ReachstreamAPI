---
name: nodejs-expert
description: Use for Node.js development, async patterns, performance optimization, and debugging. Invoke when working with Node.js runtime, event loop, streams, or Node.js-specific APIs.
---

# Node.js Expert Skill

## Overview

This skill provides expertise in Node.js development, including async/await patterns, event loop understanding, performance optimization, and Node.js best practices.

## Quick Start

### Create a Basic Node.js Server

```javascript
import http from 'http';

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello World\n');
});

server.listen(3000, () => {
  console.log('Server running at http://localhost:3000/');
});
```

## Core Workflows

### Workflow 1: Async/Await Pattern Implementation

When implementing async operations:

1. Always use `async/await` instead of callbacks
2. Wrap in try/catch for error handling
3. Use Promise.all() for parallel operations

```javascript
async function fetchMultipleResources() {
  try {
    const [users, posts, comments] = await Promise.all([
      fetchUsers(),
      fetchPosts(),
      fetchComments()
    ]);
    
    return { users, posts, comments };
  } catch (error) {
    console.error('Failed to fetch resources:', error);
    throw error;
  }
}
```

### Workflow 2: Stream Processing for Large Data

For processing large files or data:

```javascript
import fs from 'fs';
import { Transform } from 'stream';

const processLargeFile = (inputPath, outputPath) => {
  const readStream = fs.createReadStream(inputPath);
  const writeStream = fs.createWriteStream(outputPath);
  
  const transformStream = new Transform({
    transform(chunk, encoding, callback) {
      const processed = chunk.toString().toUpperCase();
      callback(null, processed);
    }
  });
  
  readStream
    .pipe(transformStream)
    .pipe(writeStream)
    .on('finish', () => console.log('Processing complete'))
    .on('error', (error) => console.error('Stream error:', error));
};
```

### Workflow 3: Event Loop Optimization

Understanding and optimizing the event loop:

```javascript
// Avoid blocking the event loop
import { Worker } from 'worker_threads';

function runCPUIntensiveTask(data) {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./cpu-worker.js', {
      workerData: data
    });
    
    worker.on('message', resolve);
    worker.on('error', reject);
  });
}

// Use setImmediate for deferring execution
setImmediate(() => {
  console.log('Executed in check phase');
});
```

## Best Practices

### Error Handling

Always handle unhandled rejections and uncaught exceptions:

```javascript
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});
```

### Memory Management

Avoid memory leaks:

```javascript
// Bad: Unbounded cache
let cache = {};

// Good: LRU cache with size limit
class LRUCache {
  constructor(maxSize = 100) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }
  
  set(key, value) {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }
  
  get(key) {
    return this.cache.get(key);
  }
}
```

### Environment Variables

```javascript
import dotenv from 'dotenv';
dotenv.config();

const config = {
  port: process.env.PORT || 3000,
  dbUrl: process.env.DATABASE_URL,
  nodeEnv: process.env.NODE_ENV || 'development'
};

// Validate required variables
const required = ['DATABASE_URL'];
required.forEach((varName) => {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
});
```

## Common Patterns

### Pattern 1: Graceful Shutdown

```javascript
const server = app.listen(3000);

process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
```

### Pattern 2: Clustering for Multi-Core

```javascript
import cluster from 'cluster';
import os from 'os';

if (cluster.isPrimary) {
  const numCPUs = os.cpus().length;
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  
  cluster.on('exit', (worker) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork();
  });
} else {
  // Worker process
  import('./app.js');
}
```

## Troubleshooting

### High Memory Usage

Check for memory leaks:

```bash
node --inspect app.js
# Then use Chrome DevTools to profile memory
```

### Slow Performance

Profile CPU usage:

```bash
node --prof app.js
node --prof-process isolate-*.log > processed.txt
```

## Testing

For testing Node.js code, see [TESTING.md](TESTING.md).

## Reference

For complete Node.js API reference, see [REFERENCE.md](REFERENCE.md).

