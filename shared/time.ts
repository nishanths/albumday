const nano = BigInt(Math.pow(10, 9))

export const secondsToNano = (s: bigint) => s * nano
