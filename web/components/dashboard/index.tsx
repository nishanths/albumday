import React from "react"
import { RouteComponentProps } from "react-router"
import { withRouter, Link } from "react-router-dom"
import { Helmet } from "react-helmet"
import classNames from "classnames"
import { Feed } from "../feed"
import { Settings } from "../settings"
import { assertExhaustive, Account, connectionComplete } from "shared"
import { NProgressType } from "../../types"
import Toastify, { ToastHandle } from "toastify-js"
import { defaultToastOptions, colors } from "../../shared"

export type DashboardProps = RouteComponentProps & {
	nProgress: NProgressType
	email: string
	onLogout?: () => void
}

type Pane = "birthdays" | "settings"

type State = {
	account: Account | null
}

const paneToTitle = (p: Pane): string => {
	switch (p) {
		case "birthdays":
			return "birthdays"
		case "settings":
			return "settings"
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
			case "/birthdays":
			case "/birthdays/":
				return "birthdays"
			case "/settings":
			case "/settings/":
				return "settings"
			default:
				console.error("unknown path " + this.props.location.pathname + "; using fallback")
				return "birthdays"
		}
	}

	componentDidMount() {
		this.fetchAccount()
	}

	componentDidUpdate(prevProps: DashboardProps) {
		if (prevProps.email === this.props.email) {
			return
		}
		this.fetchAccount()
	}

	private async fetchAccount() {
		try {
			this.requestStart()
			const rsp = await fetch("/api/v1/account", { signal: this.abort.signal })
			this.requestDone()
			switch (rsp.status) {
				case 200:
					const account = await rsp.json() as Account
					this.setState({ account })
					break
				case 401:
					Toastify({
						...defaultToastOptions,
						text: "Cookie appears to be b0rked. Please reload the page.",
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
						text: "Failed to load account. Please reload the page.",
						backgroundColor: colors.brightRed,
						duration: -1,
					}).showToast()
					break
			}
		} catch (e) {
			console.error(e)
			this.requestDone()
			Toastify({
				...defaultToastOptions,
				text: "Failed to load account. Please reload the page.",
				backgroundColor: colors.brightRed,
				duration: -1,
			}).showToast()
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
			<html className="DashboardHTML" />
			<title>album birthdays / {paneToTitle(this.pane())}</title>
			<body className="DashboardBody" />
		</Helmet>

		const nav = <div className="nav">
			<div className={classNames("nav-item", { "active": this.pane() === "birthdays" })} title="switch to birthdays">
				<Link to="/birthdays">birthdays</Link>
			</div>
			<div className={classNames("nav-item", { "active": this.pane() === "settings" })} title="switch to settings">
				<Link to="/settings">settings</Link>
			</div>
		</div>

		const pane = this.state.account !== null &&
			<div className="pane">
				{this.pane() === "birthdays" ?
					<Feed
						account={this.state.account}
						email={this.props.email}
						onAccountChange={(account) => {
							this.setState({ account })
						}}
						nProgress={this.props.nProgress}
						location={this.props.location}
						history={this.props.history}
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
						nProgress={this.props.nProgress}
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
