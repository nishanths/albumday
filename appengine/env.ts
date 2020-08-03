export type Env = "prod" | "dev"

export function env(): Env {
	if (process.env.NODE_ENV === "production") {
		return "prod"
	}
	return "dev"
}

export const devPort = 8080

export function devBaseURL(): string {
	return `http://localhost:${8080}`
}
