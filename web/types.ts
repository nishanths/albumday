export type NProgressType = {
	start(): void
	done(): void
	configure(opts: { [k: string]: any }): void
}
