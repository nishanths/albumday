import React from "react"
import { scrobbleBaseURL, Connection } from "shared"
import Toastify, { ToastHandle, ToastOptions } from "toastify-js"
import { defaultToastOptions, colors } from "../../shared"
import { NProgressType } from "../../types"

type State = {
	submitting: boolean
	username: string
	error: string | null
}

export type ScrobbleProps = {
	onBack: () => void
	nProgress: NProgressType
	onConnectionChange: (c: Connection) => void
}

const defaultError = "Something unexpectedly went wrong. Please try again."

export class Scrobble extends React.Component<ScrobbleProps, State> {
	private usernameRef: HTMLInputElement | null = null
	private readonly abort = new AbortController()
	private toast: ToastHandle | null = null

	constructor(props: ScrobbleProps) {
		super(props)
		this.state = {
			submitting: false,
			username: "",
			error: null
		}
	}

	private async onUsernameSubmit() {
		if (this.state.submitting) {
			return
		}
		const username = this.usernameRef!.value.trim()
		if (username === "") {
			Toastify({
				...defaultToastOptions,
				text: "Please enter a username.",
				backgroundColor: colors.yellow,
				duration: 1000,
			}).showToast()
			return
		}


		try {
			this.submittingStart()
			const r = await fetch("/connect/scrobble?username=" + encodeURIComponent(username), {
				method: "POST",
				signal: this.abort.signal,
			})

			this.submittingDone()
			switch (r.status) {
				case 200:
					this.toast?.hideToast()
					// don't use this.toast, because this toast should be preserved
					// after unmount
					Toastify({
						...defaultToastOptions,
						text: "Successfully connected!",
					}).showToast()
					this.props.onConnectionChange({
						service: "scrobble",
						username,
						error: null,
					})
					break
				case 401:
					this.showNewToast({
						...defaultToastOptions,
						text: "Cookie appears to be b0rked. Please reload the page.",
						backgroundColor: colors.brightRed,
						duration: -1,
						onClick: () => {
							window.location.assign("/start")
						},
					})
					break
				case 404:
					this.showNewToast({
						...defaultToastOptions,
						text: "Profile not found.",
						backgroundColor: colors.yellow,
					})
					this.usernameRef!.focus()
					this.usernameRef!.setSelectionRange(0, this.usernameRef!.value.length)
					break
				case 409:
					this.showNewToast({
						...defaultToastOptions,
						text: "Profile appears to be private. Change to public and try again.",
						backgroundColor: colors.yellow,
					})
					this.usernameRef!.focus()
					this.usernameRef!.setSelectionRange(0, this.usernameRef!.value.length)
					break
				default:
					this.showNewToast({
						...defaultToastOptions,
						text: "Failed to connect with Apple Music. Please try again.",
						backgroundColor: colors.brightRed,
					})
					break
			}
		} catch (e) {
			console.error(e)
			this.showNewToast({
				...defaultToastOptions,
				text: "Failed to connect with Apple Music. Please try again.",
				backgroundColor: colors.brightRed,
			})
			this.submittingDone()
		}
	}

	componentDidMount() {
		this.usernameRef!.focus()
	}

	componentWillUnmount() {
		this.abort.abort()
		this.toast?.hideToast()
		this.props.nProgress.done()
	}

	private showNewToast(o: ToastOptions) {
		this.toast?.hideToast()
		this.toast = Toastify(o)
		this.toast.showToast()
	}

	private submittingStart() {
		this.setState({ submitting: true })
		this.props.nProgress.start()
	}

	private submittingDone() {
		this.setState({ submitting: false })
		this.props.nProgress.done()
	}

	render() {
		return <div className="Scrobble">
			<div className="logo"></div>
			<div className="input-container">
				<form onSubmit={e => { e.preventDefault(); this.onUsernameSubmit() }}>
					<input
						value={this.state.username} onChange={e => {
							this.setState({ username: e.target.value })
							this.toast?.hideToast()
						}}
						type="text"
						placeholder={"scrobble username"}
						disabled={this.state.submitting}
						autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false"
						ref={r => { this.usernameRef = r }}
					/>
					<div className="instruction">
						Connecting to Apple Music uses a <a href={scrobbleBaseURL} target="_blank">scrobble</a> profile. Enter your scrobble username.
					</div>
				</form>
				<div className="back-button">
					<p><a href="" onClick={e => { e.preventDefault(); this.onUsernameSubmit() }}>Continue</a></p>
					<p><a href="" onClick={e => { e.preventDefault(); this.props.onBack() }}>Return to service select</a></p>
				</div>
			</div>
		</div>
	}
}
