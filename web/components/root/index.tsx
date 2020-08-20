import React from "react"
import { Helmet } from "react-helmet"
import { Link, withRouter } from "react-router-dom"
import { RouteComponentProps } from "react-router"
import { AppName } from "../../util"
import { reverse } from "../../shared"
import { NProgressType } from "../../types"

export type RootProps = RouteComponentProps & {
	nProgress: NProgressType
}

export class RootComponent extends React.Component<RootProps> {
	componentDidMount() {
		this.requestStart()
		setTimeout(() => {
			this.requestEnd()
		}, 250)
	}

	private requestStart() {
		this.props.nProgress.start()
	}

	private requestEnd() {
		this.props.nProgress.done()
	}

	render() {
		const helmet = <Helmet>
			<html className="RootHTML" />
			<title>{AppName}</title>
			<body className="RootBody" />
		</Helmet>

		return <div className="Root">
			{helmet}
			<Link to="/"><div className="logo" role="img" alt="App logo"></div></Link>
			<div className="app-name">
				album birthdays<span className="emph">!</span>
			</div>
			<div className="app-desc">
				Be notified on the release date anniversaries of titles in your
				music library.
			</div>
			<div className="get-started">
				<button onClick={() => this.props.history.push("/start")}>Sign In</button>
			</div>
		</div>
	}
}

// FAQ
// Works with
// Privacy

export const Root = withRouter(RootComponent)
