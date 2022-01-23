import { flush } from './common/helpers';
import client from './common/testClient';

before(async () => {
    await client.redis.connect();
    await flush();
});

after(async () => {
    await client.redis.disconnect();
});