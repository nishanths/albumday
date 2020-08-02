import { RequestHandler } from "express"
import { defaultFromEmail, EmailClient } from "./email"
import XKCDPassword from "xkcd-password"
import { okStatus } from "shared"
import { RedisClient } from "redis"
import { validate as validateEmail } from "email-validator"

const passphraseKey = (email: string) => `:passphrase:${email}`
const passphraseExpirySeconds = 5 * 24 * 60 * 60

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

	redis.set(passphraseKey(email), passphrase, "EX", passphraseExpirySeconds, async (err, reply) => {
		if (err) {
			console.error(`set passphrase: ${err.name}: ${err.message}`)
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
	redis.get(passphraseKey(email), (err, reply) => {
		if (err) {
			console.error(`get passphrase: ${err.name}: ${err.message}`)
			res.status(500).end()
			return
		}
		if (reply === null) {
			res.status(403).send("passphrase expired").end()
			return
		}
		if (reply !== passphrase) {
			res.status(403).send("bad passphrase").end()
			return
		}
		// TODO set cookie
		res.status(200).end()
	})
}

const generatePassphrase = async () => {
	const words = await new XKCDPassword().generate()
	return words.join("-")
}

const passphraseEmailSubject = "Passphrase for birthdays.littleroot.org"

const passphraseEmailText = ({ email, passphrase }: { email: string, passphrase: string }) => `Hi,

Someone has requested a passphrase for ${email} to log in to
https://birthdays.littleroot.org. The passphrase is:

  ${passphrase}

Enter this passphrase to log in. You do not need to remember this passphrase for
the future. You will receive a new passphrase the next time you log in.
`
