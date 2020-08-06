import React from "react"
import { supportEmail, Account, Service, assertExhaustive, connectionComplete, Connection, scrobbleBaseURL } from "shared"
import { colors, defaultToastOptions } from "../../shared"
import { NProgressType } from "../../types"
import { Link } from "react-router-dom"
import Toastify from "toastify-js"

export type SettingsProps = {
	account: Account
	email: string
	onAccountChange: (a: Account) => void
	onLogout: () => void
	nProgress: NProgressType
}

function displayService(s: Service): string {
	switch (s) {
		case "spotify": return "Spotify"
		case "scrobble": return "Apple Music"
		default: assertExhaustive(s)
	}
}

const deleteAccountConfirm = `Deleting your account will delete account information from our servers. ` +
`It will also stop any album birthday emails you may be receiving. ` +
`You may still receive important account-related emails after deleting your account.

You may register again with the same email address in the future.

Proceed to delete your account?
`

export class Settings extends React.Component<SettingsProps> {
	private readonly abort = new AbortController()

	constructor(props: SettingsProps) {
		super(props)
	}

	private async onDeleteAccount() {
		const ok = window.confirm(deleteAccountConfirm)
		if (!ok) {
			Toastify({
				...defaultToastOptions,
				text: "Canceled account deletion.",
				backgroundColor: colors.yellow,
			}).showToast()
			return
		}

		try {
			this.requestStart()
			const r = await fetch("/api/v1/account", {
				method: "DELETE",
				signal: this.abort.signal,
			})
			this.requestEnd()
			switch (r.status) {
				case 200:
					Toastify({
						...defaultToastOptions,
						text: "Successfully deleted account. Logging out.",
						duration: -1,
					}).showToast()
					setTimeout(() => {
						window.location.assign("/")
					}, 2000)
					break
				case 401:
				case 403:
					// cookie expired or malicious request?
					Toastify({
						...defaultToastOptions,
						text: "Cookie appears to be b0rked. Please log out and try again.",
						backgroundColor: colors.brightRed,
						duration: -1,
						onClick: () => {
							window.location.assign("/start")
						},
					}).showToast()
					break
				default:
					Toastify({
						...defaultToastOptions,
						text: `Failed to delete account. Please try again or contact “${supportEmail}”.`,
						backgroundColor: colors.brightRed,
						duration: 8000,
					}).showToast()
					break
			}
		} catch (e) {
			console.error(e)
			this.requestEnd()
		}
	}

	private setEmailNotifications(on: boolean) {
	}

	private onConnectionUnlink() {
	}

	private linkedWithText(): JSX.Element {
		const conn = this.props.account.connection!
		switch (conn.service) {
		case "spotify":
			return <>Linked with Spotify</>
		case "scrobble":
			return <>Linked with Apple Music, using scrobble profile <a className="connection-external-link" href={scrobbleBaseURL + "/u/" + conn.username} target="_blank">{conn.username}</a></>
		default:
			assertExhaustive(conn)
		}
	}

	private requestStart() {
		this.props.nProgress.start()
	}

	private requestEnd() {
		this.props.nProgress.done()
	}

	componentWillUnmount() {
		this.abort.abort()
	}

	render() {
		const account =  <li>
			<strong>Account</strong>: Logged in as {this.props.email} — <a href="/logout">log out</a>, <a href="" onClick={e => { e.preventDefault(); this.onDeleteAccount() }}> delete account.</a>
		</li>

		const emailNotifications = this.props.account.settings.emailsEnabled ?
			<li><strong>Birthday email notifications</strong>: Enabled. A daily email will be sent with album birthday info — <a href="" onClick={e => { e.preventDefault(); this.setEmailNotifications(false) }}>turn off.</a></li> :
			<li><strong>Birthday email notifications</strong>: Disabled — <a href="" onClick={e => { e.preventDefault(); this.setEmailNotifications(true) }}>turn on.</a></li>

		const musicService = connectionComplete(this.props.account) ?
			<li><strong>Music service</strong>: {this.linkedWithText()} — <a href="" onClick={e => { e.preventDefault(); this.onConnectionUnlink() }}>unlink.</a></li> :
			<li><strong>Music service</strong>: Not linked — <Link to="/birthdays">set up.</Link></li>

		return <div className="Settings">
			<ul>
				{account}
				{emailNotifications}
				{musicService}
			</ul>
		</div>
	}
}
