import { randomBytes } from 'crypto';
import { sleep } from '../common/sleep';
import { LockiClient } from './LockiClient';

export default class AtomicSession<T> {
    public static async start<T>(
        fn: RedisLockSessionFn<T>,
        options: IRedisLockSessionOptions
    ) {
        const session = new AtomicSession(fn, options);

        return await session.resolve();
    }
    private isLockOwned = false;
    private readonly secret = randomBytes(16).toString('hex');
    private constructor(
        private fn: RedisLockSessionFn<T>,
        private options: IRedisLockSessionOptions
    ) { }
    private async resolve() {
        try {
            await this.acquireLock();
            return await Promise.race([
                this.startTtlRenewLoop(),
                this.fn(() => this.isLockOwned)
            ])
        } finally {
            this.endSession();
        }
    }
    private endSession() {
        this.isLockOwned = false;
        this.releaseLock();
        this.options.endCallback?.();
    }
    private async startTtlRenewLoop() {
        while (this.isLockOwned) {
            try {
                await this.renewLock();
                await sleep(this.options.renewIntervalMs);
            } catch (error) {
                this.endSession();
                throw error;
            }
        }
    }
    private async acquireLock() {
        const result = await this.options.client.redis.lockXS({
            ttlMs: this.options.ttlMs.toString(),
            exclusive: this.options.exclusive,
            shared: this.options.shared,
            secret: this.secret
        });

        if (result !== 1) {
            throw new AcquireLockError();
        } else {
            this.isLockOwned = true;
        }
    }
    private async renewLock() {
        const result = await this.options.client.redis.extendXS({
            ttlMs: this.options.ttlMs.toString(),
            exclusive: this.options.exclusive,
            shared: this.options.shared,
            secret: this.secret
        });

        if (result !== 1) {
            this.isLockOwned = false;
            throw new ExtendLockError();
        }
    }
    private releaseLock() {
        this.isLockOwned = false;
        this.options.client.redis.releaseXS({
            exclusive: this.options.exclusive,
            shared: this.options.shared,
            secret: this.secret
        });
    }
}

export type RedisLockSessionFn<T> = (isLockOwned: () => boolean) => Promise<T>;
export class AcquireLockError extends Error { }
export class ExtendLockError extends Error { }

export interface IRedisLockSessionOptions {
    /** How often to renew lock ttl. Default: 2e3 */
    renewIntervalMs: number;
    /** Lock ttl. Default: 30e3 */
    ttlMs: number;
    /** 
     * Will be called if the session ended, either due to 
     * an error, or normally.
     */
    endCallback?: CallableFunction;
    client: LockiClient;
    exclusive: string[];
    shared: string[];
}