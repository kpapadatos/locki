import { defineScript } from 'redis';
import formatLockKeys from '../common/formatLockKeys';
import { LUA_SPLIT_DEF } from './LUA_SPLIT_DEF';

export const extendXS = defineScript({
    NUMBER_OF_KEYS: 0,
    SCRIPT: `
        ${LUA_SPLIT_DEF}

        local secret = ARGV[1]
        local ttl = ARGV[2]
        local success = 1

        for i, key in ipairs(ARGV) do
            if i > 2 then
                local shards = split(key, "_")
                local exclusivity = shards[1]

                if exclusivity == "x" then
                    if redis.call("get", key) == secret then
                        redis.call("set", key, secret, "PX", ttl)
                    else
                        success = 0
                    end
                else
                    if redis.call("get", key .. "_" .. secret) == "1" then
                        redis.call("set", key .. "_" .. secret, "1", "PX", ttl)
                    else
                        success = 0
                    end
                end
            end
        end

        return success
    `,
    transformArguments({
        ttlMs,
        exclusive,
        shared,
        secret
    }: {
        ttlMs: string;
        exclusive: string[];
        shared: string[];
        secret: string
    }) {
        return [secret, ttlMs, ...formatLockKeys({ exclusive, shared })];
    },
    transformReply(reply) {
        return reply;
    }
})