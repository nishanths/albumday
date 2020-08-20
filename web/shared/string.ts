export function quote(s: string): string {
	return JSON.stringify(s)
}

export function trimPrefix(s: string, prefix: string): string {
	if (s.startsWith(prefix)) {
		return s.slice(prefix.length)
	}
	return s
}

export function reverse(s: string): string {
	return [...s].reverse().join("")
}
