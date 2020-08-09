const nano = Math.pow(10, 9) as unknown as bigint

export const secondsToNano = (s: bigint) => s * nano
