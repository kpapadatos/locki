import { expect } from 'chai';
import { sleep } from '../src/common/sleep';
import { AcquireLockError, ExtendLockError, IRedisLockSessionOptions } from '../src/main';
import { defer } from './common/defer';
import { flush, getXKey, randStr } from './common/helpers';
import client from './common/testClient';

describe('session', () => {
    beforeEach(async () => await flush());

    it('should reject subsequent parallel mutators', async () => {
        const rA: Resource = { s: [randStr(), randStr()], x: [randStr()], v: -1 };
        const newValue = 0;

        const m0 = mutate(rA, newValue);

        await sleep(10);

        expect(await getXKey(rA.x[0]));

        const m1 = mutate(rA, 1);
        const m2 = mutate(rA, 2);

        expect(await m1.mutator).instanceOf(AcquireLockError);
        expect(await m2.mutator).instanceOf(AcquireLockError);

        await sleep(50);
        expect(await mutate(rA, 3).mutator).instanceOf(AcquireLockError);

        await sleep(100);

        expect(rA.v).eq(newValue);

        m0.deferred.resolve();
        await m0.mutator;
    });

    it('should fail if extension fails', async () => {
        const initialValue = -1;
        const rA: Resource = { s: [randStr(), randStr()], x: [randStr()], v: initialValue };
        const newValue = 0;

        const m0 = mutate(rA, newValue, {
            renewIntervalMs: 5
        });

        await sleep(10);

        expect(await getXKey(rA.x[0]));

        await flush();

        expect(await getXKey(rA.x[0])).eq(null);

        expect(await m0.mutator).instanceOf(ExtendLockError);

        const opResult = m0.deferred.promise.catch(e => e);
        expect(await opResult).instanceOf(Error);

        await sleep(10);

        expect(rA.v).eq(initialValue);
    });

    function mutate(r: Resource, v: number = r.v, options?: Partial<IRedisLockSessionOptions>) {
        const deferred = defer();
        const mutator = client.withLock(async (isLockOwned) => {
            await sleep(100);

            if (!isLockOwned()) {
                return deferred.reject(new Error());
            }

            r.v = v;

            await deferred.promise;
        }, {
            shared: r.s,
            exclusive: r.x,
            ...options
        }).catch(e => e);

        return { mutator, deferred };
    }
});

type Resource = { x: string[]; s: string[]; v: number; }