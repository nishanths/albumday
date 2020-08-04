import React from "react"
import { RouteComponentProps } from "react-router"
import { withRouter, Link } from "react-router-dom"
import { Helmet } from "react-helmet"
import classNames from "classnames"
import { Feed } from "../feed"
import { Settings } from "../settings"
import { assertExhaustive, Account, connectionComplete } from "shared"
import { NProgressType } from "../../types"
import Toastify from "toastify-js"
import { defaultToastOptions, colors } from "../../shared"

export type DashboardProps = RouteComponentProps & {
	nProgress: NProgressType
	email: string
	onLogout?: () => void
}

type Pane = "feed" | "settings"

type State = {
	account: Account | null
}

const paneToTitle = (p: Pane): string => {
	switch (p) {
		case "feed":
			return "Feed"
		case "settings":
			return "Settings"
		default:
			assertExhaustive(p)
	}
}

class DashboardComponent extends React.Component<DashboardProps, State> {
	private readonly abort = new AbortController()

	constructor(props: DashboardProps) {
		super(props)
		this.state = {
			account: null,
		}
	}

	private pane(): Pane {
		switch (this.props.location.pathname) {
			case "/feed":
			case "/feed/":
				return "feed"
			case "/settings":
			case "/settings/":
				return "settings"
			default:
				throw "unknown path " + this.props.location.pathname
		}
	}

	async componentDidMount() {
		try {
			this.requestStart()
			const rsp = await fetch("/api/v1/account?account=" + encodeURIComponent(this.props.email!), { signal: this.abort.signal })
			switch (rsp.status) {
				case 200:
					const account = await rsp.json() as Account
					this.setState({ account })
					break
				case 401:
				case 403:
					// cookie expired or malicious request?
					Toastify({
						...defaultToastOptions,
						text: "Cookie appears to be b0rked. Please reload.",
						backgroundColor: colors.brightRed,
						duration: -1,
					}).showToast()
					break
				default:
					Toastify({
						...defaultToastOptions,
						text: "Failed to load account. Please try reloading the page.",
						backgroundColor: colors.brightRed,
						duration: -1,
					}).showToast()
					break
			}
		} catch (e) {
			console.error(e)
			Toastify({
				...defaultToastOptions,
				text: "Failed to load account. Please try reloading the page.",
				backgroundColor: colors.brightRed,
				duration: -1,
			}).showToast()
		} finally {
			this.requestDone()
		}
	}

	componentWillUnmount() {
		this.abort.abort()
		this.props.nProgress.done()
	}

	private requestStart() {
		this.props.nProgress.start()
	}

	private requestDone() {
		this.props.nProgress.done()
	}

	render() {
		const helmet = <Helmet>
			<html className="Dashboard" />
			<title>Albumday / {paneToTitle(this.pane())}</title>
			<body className="Dashboard" />
		</Helmet>

		const nav = <div className="nav">
			<div className={classNames("nav-item", { "active": this.pane() === "feed" })} title="Switch to Feed">
				<Link to="/feed">Feed</Link>
			</div>
			<div className={classNames("nav-item", { "active": this.pane() === "settings" })} title="Switch to Settings">
				<Link to="/settings">Settings</Link>
			</div>
		</div>

		const pane = this.state.account !== null &&
			<div className="pane">
				{this.pane() === "feed" ?
					<Feed
						account={this.state.account}
						email={this.props.email}
						onAccountChange={(account) => {
							this.setState({ account })
						}}
						nProgress={this.props.nProgress}
					/> :
					<Settings
						account={this.state.account}
						email={this.props.email}
						onAccountChange={(account) => {
							this.setState({ account })
						}}
						onLogout={() => {
							this.props.onLogout?.()
						}}
					/>
				}
			</div>

		return <div className="Dashboard">
			{helmet}
			{nav}
			{pane}
		</div>
	}
}

export const Dashboard = withRouter(DashboardComponent)
