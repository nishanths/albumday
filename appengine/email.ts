import { Env } from "./env"
import sg from "@sendgrid/mail"
import helpers from "@sendgrid/helpers/classes"
import client from "@sendgrid/client/src/response"
import { assertExhaustive } from "shared"

export let emailc: EmailClient

export function initializeEmail(env: Env, apiKey?: string) {
	switch (env) {
		case "prod":
			if (apiKey === undefined) {
				throw "api key required for prod env"
			}
			sg.setApiKey(apiKey)
			emailc = sg
			break
		case "dev":
			emailc = new LoggingEmailClient()
			break
		default:
			assertExhaustive(env)
	}
}

interface EmailClient {
	send(data: sg.MailDataRequired, isMultiple?: boolean): Promise<[client.ClientResponse, {}]>;
}

class LoggingEmailClient implements EmailClient {
	send(data: sg.MailDataRequired): Promise<[client.ClientResponse, {}]> {
		console.log("email: to: %s", JSON.stringify(data.to))
		console.log("email: subject: %s", data.subject)
		console.log("email: content text: %s", data.text)
		console.log("email: content html: %s", data.html)
		return Promise.resolve([{} as client.ClientResponse, {}])
	}
}
