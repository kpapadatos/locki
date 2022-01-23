import { assert, expect } from 'chai';
import { randomBytes } from 'crypto';
import { sleep } from '../src/common/sleep';
import { RedisLockClient } from '../src/main';

describe('lockxs', () => {
    const { redis } = RedisLockClient.create();

    before(async () => {
        await redis.connect();
    });

    it('should lock', async () => {
        const ttlMs = 1000;
        const exclusive = [randStr()];
        const shared = [randStr(), randStr()];
        const secret = randStr();

        const result = await redis.lockXS({
            ttlMs: ttlMs.toString(),
            secret, exclusive, shared
        });

        assert.equal(result, 1);

        assert.equal(await getXKey(exclusive[0]), secret);
        assert.equal(await getSKey(shared[0], secret), '1');
        assert.equal(await getSKey(shared[1], secret), '1');

        assert.equal(0, await lockX(exclusive[0]));
        assert.equal(0, await lockS(exclusive[0]));
        assert.equal(1, await lockS(shared[0]));
        assert.equal(0, await lockX(shared[0]));
        assert.equal(1, await lockX(randStr()));

        await sleep(ttlMs);

        assert.equal(await getXKey(exclusive[0]), null);
        assert.equal(await getSKey(shared[0], secret), null);
        assert.equal(await getSKey(shared[1], secret), null);

        assert.equal(1, await lockX(shared[0]));
    });

    it('it should extend', async () => {
        const ttlMs = 1000;
        const exclusive = [randStr()];
        const shared = [randStr(), randStr()];
        const secret = randStr();

        assert.equal(1, await redis.lockXS({
            ttlMs: ttlMs.toString(),
            secret, exclusive, shared
        }));

        expect(await getXTTL(exclusive[0])).eq(1);
        expect(await getSTTL(shared[0], secret)).eq(1);
        expect(await getSTTL(shared[0], secret)).eq(1);

        assert.equal(1, await redis.extendXS({
            ttlMs: '10000',
            secret, exclusive, shared
        }));

        expect(await getXTTL(exclusive[0])).eq(10);
        expect(await getSTTL(shared[0], secret)).eq(10);
        expect(await getSTTL(shared[0], secret)).eq(10);
    });

    it('it should release', async () => {
        const ttlMs = 1000;
        const exclusive = [randStr()];
        const shared = [randStr(), randStr()];
        const secret = randStr();

        assert.equal(1, await redis.lockXS({
            ttlMs: ttlMs.toString(),
            secret, exclusive, shared
        }));

        assert.equal(await getXKey(exclusive[0]), secret);
        assert.equal(await getSKey(shared[0], secret), '1');
        assert.equal(await getSKey(shared[1], secret), '1');

        assert.equal(0, await redis.releaseXS({ secret: randStr(), exclusive, shared }));

        assert.equal(await getXKey(exclusive[0]), secret);
        assert.equal(await getSKey(shared[0], secret), '1');
        assert.equal(await getSKey(shared[1], secret), '1');

        assert.equal(0, await redis.releaseXS({ secret, exclusive, shared }));

        assert.equal(await getXKey(exclusive[0]), null);
        assert.equal(await getSKey(shared[0], secret), null);
        assert.equal(await getSKey(shared[1], secret), null);
    });

    it('should release with the right secret', async () => {
        const ttlMs = 1000;
        const secretA = randStr();
        const secretB = randStr();
        const sharedKey = randStr();

        assert.equal(1, await redis.lockXS({
            ttlMs: ttlMs.toString(),
            secret: secretA, exclusive: [], shared: [sharedKey]
        }));

        assert.equal(1, await redis.lockXS({
            ttlMs: ttlMs.toString(),
            secret: secretB, exclusive: [], shared: [sharedKey]
        }));

        assert.equal(0, await redis.releaseXS({ secret: secretA, exclusive: [], shared: [sharedKey] }));

        assert.equal(await getSKey(sharedKey, secretA), null);
        assert.equal(await getSKey(sharedKey, secretB), '1');

        assert.equal(0, await redis.releaseXS({ secret: secretB, exclusive: [], shared: [sharedKey] }));

        assert.equal(await getSKey(sharedKey, secretA), null);
        assert.equal(await getSKey(sharedKey, secretB), null);
    });

    async function getXTTL(key: string) {
        return await redis.ttl(buildXKey(key));
    }

    async function getSTTL(key: string, secret: string) {
        return await redis.ttl(buildSKey(key, secret));
    }

    async function getXKey(key: string) {
        return await redis.get(buildXKey(key));
    }

    async function getSKey(key: string, secret: string) {
        return await redis.get(buildSKey(key, secret));
    }

    function buildXKey(key: string) {
        return `x_${key}`;
    }

    function buildSKey(key: string, secret: string) {
        return `s_${key}_${secret}`;
    }

    async function lockX(str: string, secret?: string) {
        return await redis.lockXS({
            ttlMs: '1000',
            secret: secret || randStr(),
            exclusive: [str],
            shared: []
        })
    }

    async function lockS(str: string, secret?: string) {
        return await redis.lockXS({
            ttlMs: '1000',
            secret: secret || randStr(),
            exclusive: [],
            shared: [str]
        })
    }

    function randStr() {
        return randomBytes(16).toString('hex');
    }
})