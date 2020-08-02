module "xkcd-password" {
	declare class XKCDPassword {
		constructor(): this
		generate(options?: Options): Promise<string[]>
	}
	export = XKCDPassword
	export type Options = {
		numWords?: number
	}
}
