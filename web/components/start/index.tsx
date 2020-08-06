import React from "react"
import { Helmet } from "react-helmet"
import { validate as validateEmail } from "email-validator"
import { Link, withRouter } from "react-router-dom"
import { RouteComponentProps } from "react-router";
import { NProgressType } from "../../types"
import { CSSTransition } from "react-transition-group"
import { Temporal } from "proposal-temporal"
import Toastify, { ToastHandle, Options as ToastOptions } from "toastify-js"
import { defaultToastOptions, colors } from "../../shared"

type State = {
	submitting: boolean // submitting in progress for email or for passphrase
	submittedEmail: string // successfully submitted email
	error: string | undefined
	email: string
	passphrase: string
	formTransition: boolean // https://stackoverflow.com/a/50166499/3309046
}

const defaultError = "Something unexpectedly went wrong. Please try again."
const invalidEmailError = "Please enter a valid email."
const invalidPassphraseError = "That passphrase is expired, has been used already, or is incorrect. Click to start over."

type StartProps = RouteComponentProps & {
	nProgress: NProgressType
	onLogin?: (email: string) => void
}

class StartComponent extends React.Component<StartProps, State> {
	private emailRef: HTMLInputElement | null = null
	private passphraseRef: HTMLInputElement | null = null
	private readonly abort = new AbortController()
	private toast: ToastHandle | null = null

	constructor(props: StartProps) {
		super(props)
		this.state = {
			submitting: false,
			submittedEmail: "",
			error: undefined,
			email: "",
			passphrase: "",
			formTransition: false,
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
		} catch (e) {
			console.error(e)
			this.submittingDone()
			this.setState({ error: defaultError })
		}
	}

	private async onPassphraseSubmit() {
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
		p.set("timeZone", Temporal.now.timeZone().name)

		try {
			this.submittingStart()
			const r = await fetch("/api/v1/login?" + p.toString(), {
				method: "POST",
				signal: this.abort.signal,
			})
			switch (r.status) {
				case 200:
					this.submittingDone()
					this.props.onLogin?.(this.state.submittedEmail)
					this.props.history.push("/birthdays")
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
		} catch (e) {
			console.error(e)
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

		this.setState({ formTransition: true })
	}

	componentWillUnmount() {
		this.abort.abort()
		this.toast?.hideToast()
		this.submittingDone()
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

		this.toast?.hideToast()
		if (error !== undefined) {
			const extraOptions: Partial<ToastOptions> = error === invalidPassphraseError ? {
				onClick: () => { this.onStartOver() },
				duration: -1,
			} : {}
			this.toast = Toastify({
				...defaultToastOptions,
				text: error,
				backgroundColor: colors.brightRed,
				duration: 5000,
				...extraOptions,
			})
			this.toast.showToast()
		}

		return <div className="Start">
			<Helmet>
				<html className="StartHTML" />
				<title>album birthdays / register or login</title>
				<body className="StartBody" />
			</Helmet>

			<div className="heading">
				<div className="name"><Link to="/">album <span className="bold">birthdays</span></Link></div>
			</div>

			<CSSTransition in={this.state.formTransition} addEndListener={(node, done) => { node.addEventListener("transitionend", done, false) }} timeout={750} classNames="form-transition">
				<div className="form">
					{submittedEmail === "" ?
						<>
							<div className="step">Log in or register</div>
							<form onSubmit={e => { e.preventDefault(); this.onEmailSubmit() }}>
								<input
									value={email} onChange={e => { this.setState({ email: e.target.value, error: undefined }) }}
									type="text"
									disabled={submitting}
									autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false"
									ref={r => { this.emailRef = r }}
								/>
							</form>
							<div className={"instruction"}>
								{<>
									<p>Enter your email address.</p>
									<p><Link to="/">Return to home page</Link></p>
								</>}
							</div>
						</> :
						<>
							<div className="step">Log in or register</div>
							<form onSubmit={e => { e.preventDefault(); this.onPassphraseSubmit() }}>
								<input
									value={passphrase} onChange={e => { this.setState({ passphrase: e.target.value, error: undefined }) }}
									type="password"
									disabled={submitting}
									autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false"
									ref={r => { this.passphraseRef = r }}
								/>
							</form>
							<div className={"instruction"}>
								{<>
									<p>A passphrase was sent to {submittedEmail}. Enter the passphrase to continue.</p>
									<p><a href="" onClick={e => { e.preventDefault(); this.onDifferentEmail() }}>Use a different email</a></p>
								</>}
							</div>
						</>}
				</div>
			</CSSTransition>
		</div>
	}
}

export const Start = withRouter(StartComponent)
