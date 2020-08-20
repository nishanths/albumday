import React from "react"
import { Account, Service, connectionComplete, Connection } from "../../api"
import { colors, defaultToastOptions, scrobbleBaseURL, supportEmail, cookieBorkedNavPath } from "../../util"
import { assertExhaustive } from "../../shared"
import { NProgressType } from "../../types"
import { Link } from "react-router-dom"
import Toastify, { ToastHandle } from "toastify-js"

export type SettingsProps = {
	account: Account
	email: string
	onAccountChange: (a: Account) => void
	onLogout: () => void
	nProgress: NProgressType
	invalidateBirthdayData: () => void
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

	private readonly connectionToast: ToastHandle = Toastify({
		...defaultToastOptions,
		gravity: "bottom",
		backgroundColor: colors.yellow,
		duration: -1,
		text: "You must set up a music service to receive album birthday notifications.",
		onClick: () => {
			this.showingConnectionToast = false
			this.connectionToast.hideToast()
		},
	})
	private showingConnectionToast = false // doable because duration: -1 for associated toast

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
						text: "Successfully deleted account. Logging you out…",
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
						text: "Cookie appears to be b0rked. Please reload the page.",
						backgroundColor: colors.brightRed,
						duration: -1,
						onClick: () => {
							window.location.assign(cookieBorkedNavPath)
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

	private async setEmailNotifications(on: boolean) {
		try {
			this.requestStart()
			const r = await fetch("/api/v1/account/email-notifications", {
				method: "PUT",
				signal: this.abort.signal,
				headers: {
					"content-type": "application/json",
				},
				body: JSON.stringify(on),
			})
			this.requestEnd()
			switch (r.status) {
				case 200:
					Toastify({
						...defaultToastOptions,
						text: "Updated!",
					}).showToast()
					this.props.onAccountChange({
						...this.props.account,
						settings: {
							...this.props.account.settings,
							emailsEnabled: on,
						},
					})
					break
				case 401:
				case 403:
					// cookie expired or malicious request?
					Toastify({
						...defaultToastOptions,
						text: "Cookie appears to be b0rked. Please reload the page.",
						backgroundColor: colors.brightRed,
						duration: -1,
						onClick: () => {
							window.location.assign(cookieBorkedNavPath)
						},
					}).showToast()
					break
				default:
					Toastify({
						...defaultToastOptions,
						text: `Failed to update. Please try again.`,
						backgroundColor: colors.brightRed,
					}).showToast()
					break
			}
		} catch (e) {
			console.error(e)
			this.requestEnd()
		}
	}

	private async onConnectionUnlink() {
		try {
			this.requestStart()
			const r = await fetch("/api/v1/account/connection", {
				method: "DELETE",
				signal: this.abort.signal,
			})
			this.requestEnd()
			switch (r.status) {
				case 200:
					// no toast here -- it's too noisy with other toasts at the same
					// time.
					//
					// Toastify({
					// 	...defaultToastOptions,
					// 	text: "Unlinked music service.",
					// }).showToast()
					this.props.invalidateBirthdayData()
					this.props.onAccountChange({
						...this.props.account,
						connection: null,
					})
					break
				case 401:
				case 403:
					// cookie expired or malicious request?
					Toastify({
						...defaultToastOptions,
						text: "Cookie appears to be b0rked. Please reload the page.",
						backgroundColor: colors.brightRed,
						duration: -1,
						onClick: () => {
							window.location.assign(cookieBorkedNavPath)
						},
					}).showToast()
					break
				default:
					Toastify({
						...defaultToastOptions,
						text: `Failed to update. Please try again.`,
						backgroundColor: colors.brightRed,
					}).showToast()
					break
			}
		} catch (e) {
			console.error(e)
			this.requestEnd()
		}
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
		if (this.showingConnectionToast) {
			this.connectionToast.hideToast()
		}
	}

	render() {
		if (this.props.account !== null && !connectionComplete(this.props.account)) {
			if (!this.showingConnectionToast) {
				this.showingConnectionToast = true
				this.connectionToast.showToast()
			}
		} else if (this.showingConnectionToast) {
			this.showingConnectionToast = false
			this.connectionToast.hideToast()
		}

		const account = <li>
			<strong>Account</strong>: Logged in as {this.props.email} — <a href="/logout">log out</a>, <a href="" role="button" onClick={e => { e.preventDefault(); this.onDeleteAccount() }}> delete account.</a>
		</li>

		const previewEmail = <>&nbsp;&nbsp;<a className="preview-email" href="/email-preview" target="_blank">(see example email)</a>.</>

		const emailNotifications = this.props.account.settings.emailsEnabled ?
			<li>
				<strong>Birthday email notifications</strong>:
				Enabled. Emails will be sent on the release date anniversaries of titles in your library —&nbsp;
				<a href="" role="button" onClick={e => { e.preventDefault(); this.setEmailNotifications(false) }}>
					turn off
				</a>
				{previewEmail}
			</li> :
			<li>
				<strong>Birthday email notifications</strong>:
				Disabled —&nbsp;
				<a href="" role="button" onClick={e => { e.preventDefault(); this.setEmailNotifications(true) }}>
					turn on
				</a>
				{previewEmail}
			</li>

		const musicService = connectionComplete(this.props.account) ?
			<li><strong>Music service</strong>: {this.linkedWithText()} — <a href="" role="button" onClick={e => { e.preventDefault(); this.onConnectionUnlink() }}>unlink.</a></li> :
			<li><strong>Music service</strong>: Not linked — <Link to="/feed">set up.</Link></li>

		return <div className="Settings">
			<ul>
				{account}
				{emailNotifications}
				{musicService}
			</ul>
		</div>
	}
}
