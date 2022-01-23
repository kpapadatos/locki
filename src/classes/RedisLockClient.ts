import EventEmitter from 'events';
import { createClient } from 'redis';
import { extendXS } from '../lua/extendXS';
import { lockXS } from '../lua/lockXS';
import { releaseXS } from '../lua/releaseXS';
import RedisLockSession, { IRedisLockSessionOptions, RedisLockSessionFn } from './RedisLockSession';

export class RedisLockClient extends EventEmitter {
    public static create(options?: Parameters<typeof createClient>) {
        return new RedisLockClient(options);
    }
    public readonly redis;
    private constructor(options?: Parameters<typeof createClient>) {
        super();

        this.redis = createClient({
            scripts: { lockXS, extendXS, releaseXS },
            ...options
        });

        // This is required to enable auto-reconnect
        this.redis.on('error', (e: Error) => this.emit('redis-client-error', e));
    }
    public on(event: RedisLockClientEvent, cb: () => any) {
        return super.on(event, cb);
    }
    public async withLock<T>(fn: RedisLockSessionFn<T>, options: Partial<IRedisLockSessionOptions>) {
        const defaultOptions: IRedisLockSessionOptions = {
            renewIntervalMs: 2e3,
            ttlMs: 30e3,
            client: this,
            exclusive: [],
            shared: []
        }

        return await RedisLockSession.start(fn, { ...defaultOptions, ...options });
    }
}

export enum RedisLockClientEvent {
    Error = 'redis-client-error'
}
