import { defineScript } from 'redis';
import formatLockKeys from '../common/formatLockKeys';
import { LUA_SPLIT_DEF } from './LUA_SPLIT_DEF';

export const releaseXS = defineScript({
    NUMBER_OF_KEYS: 0,
    SCRIPT: `
        ${LUA_SPLIT_DEF}
        
        local secret = ARGV[1]

        for i, key in ipairs(ARGV) do
            if i > 1 then
                local shards = split(key, "_")
                local exclusivity = shards[1]

                if exclusivity == "x" then
                    if redis.call("get", key) == secret then
                        redis.pcall("del", key)
                    end
                else
                    redis.pcall("del", key .. "_" .. secret)
                end
            end
        end

        return 0
    `,
    transformArguments({
        exclusive,
        shared,
        secret
    }: {
        exclusive: string[];
        shared: string[];
        secret: string
    }) {
        return [secret, ...formatLockKeys({ exclusive, shared })];
    },
    transformReply(reply) {
        return reply;
    }
})