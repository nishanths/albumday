import { CloudTasksClient } from '@google-cloud/tasks'
import { Env, devBaseURL } from "./env"
import axios from "axios"
import { RequestHandler } from "express"
import { assertExhaustive } from "shared"

export type TasksClient = ReturnType<typeof newTasksClient>

export function newTasksClient() {
	return new CloudTasksClient()
}

const tasksSecretHeader = "x-tasks-secret"

export const postJSONTask = async (env: Env, client: TasksClient | null, path: string, payload: any, secret: string): Promise<void> => {
	switch (env) {
		case "dev":
			return postJSONTaskDev(path, payload, secret)
		case "prod":
			return postJSONTaskProd(client!, path, payload, secret)
		default:
			assertExhaustive(env)
	}
}

const postJSONTaskProd = async (client: TasksClient, path: string, payload: any, secret: string): Promise<void> => {
	const project = process.env["GOOGLE_CLOUD_PROJECT"]!
	const queue = "default"
	const location = "us-central1"
	const parent = client.queuePath(project, queue, location)

	const task = {
		appEngineHttpRequest: {
			httpMethod: "POST" as const,
			relativeUri: path,
			headers: {
				[tasksSecretHeader]: secret,
			},
			body: JSON.stringify(payload),
		}
	}
	await client.createTask({
		parent,
		task,
	})
}

const postJSONTaskDev = async (path: string, payload: any, secret: string): Promise<void> => {
	const headers = {
		[tasksSecretHeader]: secret,
		"content-type": "application/json",
	}
	await axios.post(devBaseURL() + path, JSON.stringify(payload), { headers })
}

export const requireTasksSecret = (wantSecret: string): RequestHandler => (req, res, next) => {
	const v = req.headers[tasksSecretHeader]
	if (v === wantSecret) {
		next()
		return
	}
	res.status(403).send("bad header").end()
}
