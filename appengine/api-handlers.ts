import { RequestHandler } from "express"
import { defaultFromEmail, EmailClient } from "./email"
import { okStatus } from "shared"
import { env } from "./env"
import { RedisClient, logRedisError, updateEntity } from "./redis"
import { validate as validateEmail } from "email-validator"
import { cookieNameIdentity, IdentityCookie, cookieValidityIdentityMs, currentEmail } from "./cookie"
import { Account, accountKey, zeroAccount } from "./account"
import { passphraseExpirySeconds, passphraseKey, generatePassphrase } from "./passphrase"

export const passphraseHandler = (redis: RedisClient, emailc: EmailClient): RequestHandler => async (req, res) => {
	const email = req.query["email"]
	if (email === undefined || typeof email !== "string" || email === "") {
		res.status(400).end()
		return
	}

	const isValid = validateEmail(email)
	if (!isValid) {
		res.status(400).end()
		return
	}

	const passphrase = await generatePassphrase()

	redis.SET(passphraseKey(email), passphrase, "EX", passphraseExpirySeconds, async (err) => {
		if (err) {
			logRedisError(err, "set passphrase")
			res.status(500).end()
			return
		}

		const emailText = passphraseEmailText({ email, passphrase })
		const [rsp,] = await emailc.send({
			to: email,
			from: defaultFromEmail,
			subject: passphraseEmailSubject,
			text: emailText,
		})
		if (!okStatus(rsp.statusCode)) {
			console.error("send passphrase email: bad status: %d %s", rsp.statusCode, rsp.toString())
			res.status(500).end()
			return
		}
		res.status(200).end()
	})
}

export const loginHandler = (redis: RedisClient): RequestHandler => async (req, res) => {
	const email = req.query["email"]
	if (email === undefined || typeof email !== "string" || email === "") {
		res.status(400).end()
		return
	}
	const passphrase = req.query["passphrase"]
	if (passphrase === undefined || typeof passphrase !== "string" || passphrase === "") {
		res.status(400).end()
		return
	}
	const timeZone = req.query["timeZone"]
	if (timeZone === undefined || typeof timeZone !== "string" || timeZone === "") {
		res.status(400).end()
		return
	}

	redis.GET(passphraseKey(email), async (err, reply) => {
		if (err) {
			logRedisError(err, "get passphrase: " + passphraseKey(email))
			res.status(500).end()
			return
		}
		if (reply === null) {
			res.status(403).send("passphrase expired").end()
			return
		}
		if (env() !== "dev" && reply !== passphrase) {
			res.status(403).send("bad passphrase").end()
			return
		}

		// invalidate the passphrase
		redis.DEL(passphraseKey(email), () => {
			if (err) {
				// only log
				logRedisError(err, "delete passphrase: " + passphraseKey(email))
			}
		})

		// ensure account is initialized
		const account = await zeroAccount(timeZone)
		redis.SETNX(accountKey(email), JSON.stringify(account), (err) => {
			if (err) {
				logRedisError(err, "initialize account")
				res.status(500).end()
				return
			}
		})

		// TODO: update timeZone on every login

		const cookie: IdentityCookie = { email: email }
		res.cookie(cookieNameIdentity, JSON.stringify(cookie), { maxAge: cookieValidityIdentityMs, httpOnly: true, signed: true })
		res.status(200).end()
	})
}

const passphraseEmailSubject = "Login code for album birthdays"

const passphraseEmailText = ({ email, passphrase }: { email: string, passphrase: string }) => `Hi,

Someone has requested a login code for ${email} to log in to album birthdays
(https://album.casa). The code is below.

${passphrase}

Enter this code to log in.
`

export const accountHandler = (redis: RedisClient): RequestHandler => async (req, res) => {
	const wantAccount = req.query["account"]
	if (wantAccount === undefined || typeof wantAccount !== "string" || wantAccount === "") {
		res.status(400).end()
		return
	}

	const email = currentEmail(req)
	if (email === null) {
		// TODO: also support API key header
		res.status(401).end()
		return
	}

	if (email !== wantAccount) {
		res.status(403).end()
		return
	}

	redis.GET(accountKey(wantAccount), (err, reply) => {
		if (err) {
			logRedisError(err, "get account: " + wantAccount)
			res.status(500).end()
			return
		}
		if (reply === null) {
			// should never happen
			console.error("unexpected null reply for account: " + wantAccount)
			res.status(500).end()
			return
		}

		let account: Account
		try {
			account = JSON.parse(reply) as Account
		} catch {
			console.error("failed to JSON-parse account reply: " + wantAccount)
			res.status(500).end()
			return
		}

		// blank out API key
		// TODO: stop doing this after supporting API keys fully
		account.apiKey = ""

		res.status(200).contentType("application/json").send(account).end()
	})
}

export const deleteAccountHandler = (redis: RedisClient): RequestHandler => async (req, res) => {
	const email = currentEmail(req)
	if (email === null) {
		// TODO: also support API key header
		res.status(401).send("missing credentials").end()
		return
	}

	redis.DEL(passphraseKey(email), err => {
		if (err) {
			// only log
			logRedisError(err, "delete passphrase: " + email)
		}
	})

	redis.DEL(accountKey(email), err => {
		if (err) {
			logRedisError(err, "delete account: " + email)
			res.status(500).send("failed to delete account").end()
			return
		}
		res.clearCookie(cookieNameIdentity)
		res.status(200).send("deleted account").end()
	})
}

export const deleteAccountConnectionHandler = (redis: RedisClient): RequestHandler => async (req, res) => {
	const email = currentEmail(req)
	if (email === null) {
		// TODO: also support API key header
		res.status(401).send("missing credentials").end()
		return
	}

	try {
		await updateEntity<Account>(redis, accountKey(email), a => {
			return {
				...a,
				connection: null,
			}
		})
		res.status(200).end()
	} catch {
		res.status(500).end()
	}
}

export const setEmailNotificationsHandler = (redis: RedisClient): RequestHandler => async (req, res) => {
	const email = currentEmail(req)
	if (email === null) {
		// TODO: also support API key header
		res.status(401).send("missing credentials").end()
		return
	}

	const body = req.body as Buffer
	const newValue = JSON.parse(body.toString("utf-8"))

	if (typeof newValue !== "boolean") {
		res.status(400).end()
		return
	}

	try {
		await updateEntity<Account>(redis, accountKey(email), a => {
			return {
				...a,
				settings: {
					...a.settings,
					emailsEnabled: newValue,
				}
			}
		})
		res.status(200).end()
	} catch {
		res.status(500).end()
	}
}
