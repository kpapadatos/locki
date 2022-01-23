export default function formatLockKeys({ exclusive, shared }: {
    exclusive: string[];
    shared: string[];
}) {
    return [
        ...exclusive.map(o => `x_${escapeLockKey(o)}`),
        ...shared.map(o => `s_${escapeLockKey(o)}`)
    ];
}

function escapeLockKey(key: string) {
    return key.replace(/[_:]/g, '-');
}
