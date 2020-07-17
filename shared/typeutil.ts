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
