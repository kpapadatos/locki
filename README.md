<div align="center">
    <img src="https://user-images.githubusercontent.com/3382344/150687699-b75b87ef-e0ed-47a5-9ed7-fd24db135527.png"/><br>
    <img src="https://img.shields.io/badge/coverage-98.73%25-green"/>
    <img src="https://img.shields.io/badge/build-passing-green"/>
</div>

# locki

A redis-backed lock broker that manages groups of shared and/or exclusive locks with atomic lua scripts.

Due to the fact that lua scripts are blocking, you should use a dedicated redis DB for locki.

## Installation:

```sh
npm i @lunarade/locki
```

## Usage

```ts
import { LockiClient } from '@lunarade/locki';

(async () => {
  const client = await LockiClient.create();

  await client.connect();

  const lockOptions = {
      // Shared locks. If we get these, then others can't get exclusivity
      shared: ['example', 'path', 'segments', 'to'],

      // Exclusive locks. If we get these, no-one can get them
      exclusive: ['thing'],

      // How often to renew the lock until the async function resolves. Default: 2e3
      renewIntervalMs: 2e3,

      // Lock TTL to set on every renew. Default: 30e3
      ttlMs: 30e3,

      
      endCallback: () => {
        // Will be called on end, or when the lock can no longer
        // be guaranteed after we get it (e.g. due to network issues)
      }
  };

  await client.withLocks(async (isLockOwned) => {
      // We now own our locks and we can perform asynchronous work

      // ...

      // When it is time to commit our work (e.g. a transaction)
      // we can check if we still have the lock (or we can interrupt
      // earlier using endCallback)
      if (isLockOwned()) {
        // session.commitTransaction();
      }
  }, lockOptions);
})();
```
