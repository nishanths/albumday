export type Bootstrap = {
	loggedIn: boolean
}

export const services = ["spotify", "scrobble"] as const

export type Service = typeof services[number]
