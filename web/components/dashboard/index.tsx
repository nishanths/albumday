import React from "react"
import { RouteComponentProps } from "react-router"
import { withRouter, Link } from "react-router-dom"
import { Helmet } from "react-helmet"
import { Modal } from "react-responsive-modal"
import classNames from "classnames"
import { Feed } from "../feed"
import { Settings } from "../settings"
import { assertExhaustive } from "shared"

type DashboardProps = RouteComponentProps & {
}

const panes = ["feed", "settings"] as const

type Pane = typeof panes[number]

type State = {
}

class DashboardComponent extends React.Component<DashboardProps> {
	constructor(props: DashboardProps) {
		super(props)
		this.state = {
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
				throw "unknown pane " + this.props.location.pathname
		}
	}

	render() {
		return <div className="Dashboard">
			<Helmet>
				<html className="Dashboard" />
				<title>albumday / {this.pane()}</title>
				<body className="Dashboard" />
			</Helmet>

			<div className="nav">
				<div className={classNames("nav-item", { "active": this.pane() === "feed" })} title="switch to feed">
					<Link to="/feed">Feed</Link>
				</div>
				<div className={classNames("nav-item", { "active": this.pane() === "settings" })} title="switch to settings">
					<Link to="/settings">Settings</Link>
				</div>
			</div>

			<div className="pane">
				{
					(() => {
						const p = this.pane()
						switch (p) {
							case "feed":
								return <Feed />
							case "settings":
								return <Settings />
							default:
								assertExhaustive(p)
						}
					})()
				}
			</div>
		</div>
	}
}

export const Dashboard = withRouter(DashboardComponent)
