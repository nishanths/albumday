export type Bootstrap = {
	loggedIn: boolean
	email: string | null
}

export const services = ["spotify", "scrobble"] as const

export type Service = typeof services[number]
