export type Env = 'prod' | 'dev'

export function env(): Env {
	if (process.env.NODE_ENV === 'production') {
		return 'prod'
	}
	return 'dev'
}
