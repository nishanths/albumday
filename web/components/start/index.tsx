import React from "react"
import { Helmet } from "react-helmet"
import { ToastConsumer, ToastConsumerContext } from "react-toast-notifications"
import { validate as validateEmail } from "email-validator"
import { Link, withRouter } from "react-router-dom"
import { RouteComponentProps } from "react-router";
import { NProgressType } from "../../types"

type State = {
	submitting: boolean // submitting in progress for email or for passphrase
	submittedEmail: string // successfully submitted email
	error: JSX.Element | undefined
	email: string
	passphrase: string
}

const defaultError = <p className="error">Something went wrong. Try again.</p>
const invalidEmailError = <p className="error">Please enter a valid email.</p>

type StartProps = RouteComponentProps & {
	nProgress: NProgressType
}

class StartComponent extends React.Component<StartProps, State> {
	private emailRef: HTMLInputElement | null = null
	private passphraseRef: HTMLInputElement | null = null
	private abort: AbortController = new AbortController()

	constructor(props: StartProps) {
		super(props)
		this.state = {
			submitting: false,
			submittedEmail: "",
			error: undefined,
			email: "",
			passphrase: "",
		}
	}

	private async onEmailSubmit() {
		if (this.state.submitting) {
			return
		}
		const email = this.emailRef!.value.trim()
		if (email === "") {
			return
		}

		if (!validateEmail(email)) {
			this.setState({
				error: invalidEmailError,
			})
			this.emailRef!.focus()
			return
		}

		this.setState({ error: undefined })

		try {
			this.submittingStart()
			const r = await fetch("/api/v1/passphrase?email=" + encodeURIComponent(email), {
				method: "POST",
				signal: this.abort.signal,
			})
			switch (r.status) {
				case 200:
					this.submittingDone() // submitting/disabled input needs to be updated before focusing on passphraseRef
					this.setState({ submittedEmail: email }, () => {
						this.passphraseRef!.focus()
					})
					break
				case 400:
					this.submittingDone()
					this.setState({ error: invalidEmailError })
					break
				default:
					this.submittingDone()
					this.setState({ error: defaultError })
					break
			}
		} catch {
			this.submittingDone()
			this.setState({ error: defaultError })
		}
	}

	private async onPassphraseSubmit() {
		const invalidPassphraseError = <>
			<p className="error">That passphrase has expired or is incorrect.&nbsp;&nbsp;<a href="" onClick={e => { e.preventDefault(); this.onStartOver() }}>Start over?</a></p>
		</>

		if (this.state.submitting) {
			return
		}
		const passphrase = this.passphraseRef!.value.trim()
		if (passphrase === "") {
			return
		}

		const p = new URLSearchParams()
		p.set("email", this.state.submittedEmail)
		p.set("passphrase", passphrase)

		try {
			this.submittingStart()
			const r = await fetch("/api/v1/login?" + p.toString(), {
				method: "POST",
				signal: this.abort.signal,
			})
			switch (r.status) {
				case 200:
					this.submittingDone()
					this.props.history.push("/feed")
					break
				case 403:
					this.submittingDone()
					this.setState({ error: invalidPassphraseError })
					break
				default:
					this.submittingDone()
					this.setState({ error: defaultError })
					break
			}
		} catch {
			this.submittingDone()
			this.setState({ error: defaultError })
		}
	}

	private submittingStart() {
		this.setState({ submitting: true })
		this.props.nProgress.start()
	}

	private submittingDone() {
		this.setState({ submitting: false })
		this.props.nProgress.done()
	}

	componentDidMount() {
		this.emailRef!.focus()
	}

	componentWillUnmount() {
		this.abort.abort()
	}

	private onStartOver() {
		this.setState({ error: undefined, submittedEmail: "", passphrase: "" }, () => {
			this.emailRef!.setSelectionRange(0, this.emailRef!.value.length)
			this.emailRef!.focus()
		})
	}

	private onDifferentEmail() {
		this.setState({ error: undefined, submittedEmail: "", passphrase: "" }, () => {
			this.emailRef!.setSelectionRange(0, this.emailRef!.value.length)
			this.emailRef!.focus()
		})
	}

	render() {
		const { submittedEmail, error, email, passphrase, submitting } = this.state

		return <div className="Start">
			<Helmet>
				<html className="Start" />
				<title>albumday / register or login</title>
				<body className="Start" />
			</Helmet>

			<div className="heading">
				<span className="name"><Link to="/">albumday</Link> / </span>
				<span className="start">register or login</span>
			</div>

			<div className="form">
				{submittedEmail === "" ?
					<>
						<div className="step">Step 1 of 2</div>
						<form onSubmit={e => { e.preventDefault(); this.onEmailSubmit() }}>
							<input
								value={email} onChange={e => { this.setState({ email: e.target.value, error: undefined }) }}
								type="text" id="email"
								disabled={submitting}
								autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false"
								ref={r => { this.emailRef = r }}
							/>
						</form>
						<div className={"instruction"}>
							{error !== undefined ? error :
								<><p>Enter your email address.</p></>}
						</div>
					</> :
					<>
						<div className="step">Step 2 of 2</div>
						<form onSubmit={e => { e.preventDefault(); this.onPassphraseSubmit() }}>
							<input
								value={passphrase} onChange={e => { this.setState({ passphrase: e.target.value, error: undefined }) }}
								type="password" id="password"
								disabled={submitting}
								autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false"
								ref={r => { this.passphraseRef = r }}
							/>
						</form>
						<div className={"instruction"}>
							{error !== undefined ? error :
								<>
									<p>A passphrase was sent to {submittedEmail}. Enter the passphrase to continue.</p>
									<p>(Or, <a href="" onClick={e => { e.preventDefault(); this.onDifferentEmail() }}>go back</a> to use a different email.)</p>
								</>}
						</div>
					</>}
			</div>
		</div>
	}
}

export const Start = withRouter(StartComponent)
