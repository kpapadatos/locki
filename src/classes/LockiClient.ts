import EventEmitter from 'events';
import { createClient } from 'redis';
import { extendXS } from '../lua/extendXS';
import { lockXS } from '../lua/lockXS';
import { releaseXS } from '../lua/releaseXS';
import AtomicSession, { IRedisLockSessionOptions, RedisLockSessionFn } from './AtomicSession';

export class LockiClient extends EventEmitter {
    public static create(options?: Parameters<typeof createClient>[0]) {
        return new LockiClient(options);
    }
    public readonly redis;
    private constructor(options?: Parameters<typeof createClient>[0]) {
        super();

        const redisOptions = { scripts: { lockXS, extendXS, releaseXS } }

        Object.assign(redisOptions, options);

        this.redis = createClient(redisOptions);

        // This is required to enable auto-reconnect
        this.redis.on('error', (e: Error) => this.emit('redis-client-error', e));
    }
    public async connect() {
        return await this.redis.connect();
    }
    public on(event: RedisLockClientEvent, cb: () => any) {
        return super.on(event, cb);
    }
    public async withLocks<T>(fn: RedisLockSessionFn<T>, options: Partial<IRedisLockSessionOptions>) {
        const defaultOptions: IRedisLockSessionOptions = {
            renewIntervalMs: 2e3,
            ttlMs: 30e3,
            client: this,
            exclusive: [],
            shared: []
        }

        return await AtomicSession.start(fn, { ...defaultOptions, ...options });
    }
}

export enum RedisLockClientEvent {
    Error = 'redis-client-error'
}
