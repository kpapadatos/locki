import { defineScript } from 'redis';
import formatLockKeys from '../common/formatLockKeys';
import { LUA_SPLIT_DEF } from './LUA_SPLIT_DEF';

export const lockXS = defineScript({
    NUMBER_OF_KEYS: 0,
    SCRIPT: `
        ${LUA_SPLIT_DEF}

        local secret = ARGV[1]
        local ttl = ARGV[2]

        for i, key in ipairs(ARGV) do
            if i > 2 then
                local shards = split(key, "_")
                local exclusivity = shards[1]
                local value = shards[2]

                if redis.call("exists", "x_" .. value) == 1 then
                    return 0
                end

                if exclusivity == "x" then
                    if #redis.call("scan", "0", "match", "s_" .. value .. "_*")[2] ~= 0 then
                        return 0
                    end
                end
            end
        end

        for i, key in ipairs(ARGV) do
            if i > 2 then
                local shards = split(key, "_")
                local exclusivity = shards[1]

                if exclusivity == "x" then
                    redis.call("set", key, secret, "PX", ttl)
                else
                    redis.call("set", key .. "_" .. secret, "1", "PX", ttl)
                end
            end
        end

        return 1
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