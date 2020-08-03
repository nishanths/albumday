import { RequestHandler } from "express"
import { postJSONTask, TasksClient } from "./cloud-tasks"
import { env } from "./env"
import { RedisClient, logRedisError } from "./redis"
import { accountKeysPrefix, Account, emailFromAccountKey } from "./account"

type DailyEmailTask = {
	accountKey: string
}

export const cronDailyEmailHandler = (redis: RedisClient, tasks: TasksClient, tasksSecret: string): RequestHandler => (req, res) => {
	// NOTE: redis.io/commands/keys says: "Redis running on an entry level laptop can
	// scan a 1 million key database in 40 milliseconds."
	redis.KEYS(accountKeysPrefix, async (err, keys) => {
		if (err) {
			logRedisError(err, "account KEYS")
			res.status(500).send("failed to gather account KEYS").end()
			return
		}

		const promises: Promise<void>[] = []

		keys.forEach((k) => {
			const payload = { accountKey: k }
			promises.push(postJSONTask(env(), tasks, "/internal/task/daily-email", payload, tasksSecret))
		})

		try {
			await Promise.all(promises)
		} catch (e) {
			console.error("failed to POST JSON task", e) // only log
		}

		res.status(200).end()
	})
}

export const taskDailyEmailHandler  = (redis: RedisClient): RequestHandler => (req, res) => {
	const task = req.body as DailyEmailTask
	const email = emailFromAccountKey(task.accountKey)

	redis.GET(task.accountKey, (err, reply) => {
		if (err) {
			logRedisError(err, "GET account: " + task.accountKey)
			res.status(500).end()
			return
		}
		if (reply === null) {
			// account no longer exists in the time between cron and task. perhaps
			// it was deleted?
			console.error("missing account " + task.accountKey)
			res.status(200).end()
			return
		}

		const account = JSON.parse(reply) as Account

		if (!account.settings.emailsEnabled) {
			console.info("skipping account " + email + ": emails not enabled")
			res.status(204).end()
			return
		}
		if (account.connection === undefined) {
			console.info("skipping account " + email + ": connection undefined")
			res.status(204).end()
			return
		}

		// TODO
		res.status(200).end()
	})
}
