import { randomBytes } from 'crypto';
import client from './testClient';

const { redis } = client;

export async function flush() {
    await redis.flushAll();
}

export async function getXTTL(key: string) {
    return await redis.ttl(buildXKey(key));
}

export async function getSTTL(key: string, secret: string) {
    return await redis.ttl(buildSKey(key, secret));
}

export async function getXKey(key: string) {
    return await redis.get(buildXKey(key));
}

export async function getSKey(key: string, secret: string) {
    return await redis.get(buildSKey(key, secret));
}

export function buildXKey(key: string) {
    return `x_${key}`;
}

export function buildSKey(key: string, secret: string) {
    return `s_${key}_${secret}`;
}

export async function lockX(str: string, secret?: string) {
    return await redis.lockXS({
        ttlMs: '1000',
        secret: secret || randStr(),
        exclusive: [str],
        shared: []
    })
}

export async function lockS(str: string, secret?: string) {
    return await redis.lockXS({
        ttlMs: '1000',
        secret: secret || randStr(),
        exclusive: [],
        shared: [str]
    })
}

export function randStr() {
    return randomBytes(16).toString('hex');
}