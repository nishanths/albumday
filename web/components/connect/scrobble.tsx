import React from "react"
import { scrobbleBaseURL, Connection } from "shared"
import Toastify, { ToastHandle, Options as ToastOptions } from "toastify-js"
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
	private toast: ToastHandle | null = null // TODO: gross
	private readonly abort = new AbortController()

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
			return
		}
		this.setState({ error: null })

		try {
			this.submittingStart()
			const r = await fetch("/connect/scrobble?username=" + encodeURIComponent(username), {
				method: "POST",
				signal: this.abort.signal,
			})

			this.submittingDone()
			switch (r.status) {
				case 200:
					// TODO: gross
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
					this.setState({ error: "Cookie appears to be b0rked. Please log out and try again." })
					break
				case 409:
					// TODO
					break
				default:
					this.setState({ error: "Failed to connect with Apple Music. Please try again." })
					break
			}
		} catch (e) {
			console.error(e)
			this.setState({ error: "Failed to connect with Apple Music. Please try again." })
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

	private submittingStart() {
		this.setState({ submitting: true })
		this.props.nProgress.start()
	}

	private submittingDone() {
		this.setState({ submitting: false })
		this.props.nProgress.done()
	}

	render() {
		this.toast?.hideToast()

		if (this.state.error !== null) {
			this.toast = Toastify({
				...defaultToastOptions,
				text: this.state.error,
				backgroundColor: colors.brightRed,
				duration: 5000,
			})
			this.toast.showToast()
		}

		return <div className="Scrobble">
			<div className="logo"></div>
			<div className="input-container">
				<form onSubmit={e => { e.preventDefault(); this.onUsernameSubmit() }}>
					<input
						value={this.state.username} onChange={e => { this.setState({ username: e.target.value, error: null }) }}
						type="text"
						placeholder={"scrobble username"}
						disabled={this.state.submitting}
						autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false"
						ref={r => { this.usernameRef = r }}
					/>
					<div className="instruction">
						Connecting to Apple Music requires a <a href={scrobbleBaseURL} target="_blank">scrobble</a> profile. Enter your scrobble username.
					</div>
				</form>
				<div className="back-button">
					<a href="" onClick={e => { e.preventDefault(); this.props.onBack() }}>Go back</a>
				</div>
			</div>
		</div>
	}
}
