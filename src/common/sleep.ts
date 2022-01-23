import moment from 'moment';

export async function sleep(ms: number) {
    return await new Promise(resolve => setTimeout(resolve, ms));
}

export async function sleepFor(...args: Parameters<typeof moment.duration>) {
    const ms = moment.duration(...args).asMilliseconds();
    return await sleep(ms);
}