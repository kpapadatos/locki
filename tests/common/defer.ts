export function defer() {
    let resolve: (value?: unknown) => void = () => undefined;
    let reject: (reason?: any) => void = () => undefined;
    const promise = new Promise((res, rej) => { resolve = res; reject = rej; });

    return { resolve, reject, promise };
}