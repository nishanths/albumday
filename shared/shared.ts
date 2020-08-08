export const scrobbleBaseURL = "https://scrobble.littleroot.org"
export const scrobbleAPIBaseURL = "https://selective-scrobble.appspot.com/api/v1"

export const supportEmail = "littlerootorg@gmail.com"

export class MapDefault<K, V, B> {
	private readonly backingStore: Map<K, B> = new Map()

	constructor(
		private readonly def: () => V,
		private readonly m: Map<K, V> = new Map()
	) { }

	getOrDefault(k: K): V {
		const v = this.m.get(k)
		if (v === undefined) {
			return this.def()
		}
		return v
	}

	has(k: K): boolean {
		return this.m.has(k)
	}

	set(k: K, value: V, backingObject: B): this {
		this.m.set(k, value)
		this.backingStore.set(k, backingObject)
		return this
	}

	insertionKey(k: K) {
		return this.backingStore.get(k)
	}

	entries() {
		return this.m.entries()
	}

	backingStoreEntries() {
		return this.backingStore.entries()
	}
}
