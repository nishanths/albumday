import { Env } from "./env"
import sg from "@sendgrid/mail"
import helpers from "@sendgrid/helpers/classes"
import client from "@sendgrid/client/src/response"
import { assertExhaustive } from "shared"

export function newEmail(env: Env, apiKey?: string): EmailClient {
	switch (env) {
		case "prod":
			if (apiKey === undefined) {
				throw "api key required for prod env"
			}
			sg.setApiKey(apiKey)
			return sg
		case "dev":
			return new LoggingEmailClient()
		default:
			assertExhaustive(env)
	}
}

export interface EmailClient {
	send(data: sg.MailDataRequired, isMultiple?: boolean): Promise<[client.ClientResponse, {}]>;
}

class LoggingEmailClient implements EmailClient {
	send(data: sg.MailDataRequired): Promise<[client.ClientResponse, {}]> {
		console.log("email: to: %s", JSON.stringify(data.to))
		console.log("email: subject: %s", data.subject)
		console.log("email: content text: %s", data.text)
		console.log("email: content html: %s", data.html)
		return Promise.resolve([{ statusCode: 200 } as client.ClientResponse, {}])
	}
}

export const defaultFromEmail = { name: "birthdays.littleroot.org", email: "hardworkingbot@gmail.com" }
