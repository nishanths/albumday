import XKCDPassword from "xkcd-password"

export const passphraseKey = (email: string) => `:passphrase:${email}`
export const passphraseExpirySeconds = 5 * 24 * 60 * 60 // 5 days

export const generatePassphrase = async () => {
	const words = await new XKCDPassword().generate()
	return words.join("-")
}
