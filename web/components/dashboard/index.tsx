import React from "react"
import { RouteComponentProps } from "react-router"
import { withRouter, Link } from "react-router-dom"
import { Helmet } from "react-helmet"
import classNames from "classnames"
import { Feed, BirthdayData } from "../feed"
import { Settings } from "../settings"
import { assertExhaustive } from "../../shared"
import { Account, connectionComplete } from "../../api"
import { NProgressType } from "../../types"
import Toastify, { ToastHandle } from "toastify-js"
import { defaultToastOptions, colors, cookieBorkedNavPath, AppName } from "../../util"

export type DashboardProps = RouteComponentProps & {
	nProgress: NProgressType
	email: string
	onLogout?: () => void
}

type Pane = "feed" | "settings"

type State = {
	account: Account | null
	birthdayData: BirthdayData | null
}

const paneToTitle = (p: Pane): string => {
	switch (p) {
		case "feed":
			return "Birthday Feed"
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
			birthdayData: null,
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
				console.error("unknown path " + this.props.location.pathname + "; using fallback")
				return "feed"
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
							window.location.assign(cookieBorkedNavPath)
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
			<title>{paneToTitle(this.pane())} / {AppName}</title>
			<body className="DashboardBody" />
		</Helmet>

		const nav = <nav className="nav">
			<div className={classNames("nav-item", { "active": this.pane() === "feed" })} title={"switch to " + paneToTitle("feed")}>
				<Link to="/feed">birthdays</Link>
			</div>
			<div className={classNames("nav-item", { "active": this.pane() === "settings" })} title={"switch to " + paneToTitle("settings")}>
				<Link to="/settings">settings</Link>
			</div>
		</nav>

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
						location={this.props.location}
						history={this.props.history}
						onBirthdayData={d => {
							this.setState({ birthdayData: d })
						}}
						birthdayData={this.state.birthdayData}
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
						invalidateBirthdayData={() => {
							this.setState({ birthdayData: null })
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
