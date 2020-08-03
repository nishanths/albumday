import { RequestHandler } from "express"
import { postJSONTask, TasksClient } from "./cloud-tasks"
import { env } from "./env"
import { RedisClient, logRedisError } from "./redis"
import { accountKeysPrefix, Account } from "./account"

type DailyEmailTask = {
	accountKey: string
}

export const cronDailyEmailHandler = (redis: RedisClient, tasks: TasksClient, tasksSecret: string): RequestHandler => (req, res) => {
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
		}
		if (account.connection === undefined) {
		}
		// TODO
		res.status(200).end()
	})
}
