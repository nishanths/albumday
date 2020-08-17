export function assertExhaustive(value: never, message?: string): never {
	if (message === undefined) {
		message = "unexpected value: " + value
	}
	throw new Error(message);
}

export function assert(cond: boolean, message = "assertion failed"): asserts cond {
	if (!cond) {
		throw new Error(message)
	}
}

export type OmitStrict<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

// https://github.com/microsoft/TypeScript/issues/27024
export type TypeEq<T, S> =
	[T] extends [S] ? (
		[S] extends [T] ? true : false
	) : false

export function assertType<_T extends true>() { }
export function assertNotType<_T extends false>() { }

export function pick<T, K extends keyof T>(obj: T, ...keys: K[]): Pick<T, K> {
	const ret = {} as Pick<T, K>
	keys.forEach(k => {
		ret[k] = obj[k]
	})
	return ret
}

export function omit<T, K extends keyof T>(obj: T, ...keys: K[]): Omit<T, K> {
	const ret = {} as Omit<T, K>
	const omitKeys = new Set(keys)

	for (const k in obj) {
		const key = k as unknown as K
		if (omitKeys.has(key)) {
			continue
		}
		const presentKey = key as unknown as Exclude<keyof T, K>
		ret[presentKey] = obj[presentKey]
	}

	return ret
}
