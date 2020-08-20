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
	render() {
		const helmet = <Helmet>
			<html className="RootHTML" />
			<title>{AppName}</title>
			<body className="RootBody" />
		</Helmet>

		return <div className="Root">
			{helmet}
			<Link to="/"><div title="[Icon: Birthday by Flatart from the Noun Project]" className="logo" role="img" alt="App logo"></div></Link>
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
			<div className="works-with">
				Works with
				<div className="services">
					<span title="Spotify" role="img" alt="Spotify logo" className="service-img spotify"></span>
					<span className="sep">/</span>
					<span title="Apple Music" role="img" alt="Apple Music logo" className="service-img scrobble"></span>
				</div>
			</div>
			<div className="faq">
				<div className="q">How others are using <span className="emph">{AppName}</span></div>
				<div className="a">“Rediscover forgotten albums periodically… ”</div>
				<div className="a">“ …Celebrate by listening to a song on its birthday”</div>
			</div>
			<div className="footer-links">
				<a href="/email-preview" target="_blank">Preview notification email</a>
				<span className="sep">&nbsp;&nbsp;/&nbsp;</span>
				<a className="terms" href="/privacy-policy">Terms</a>
			</div>
		</div>
	}
}

export const Root = withRouter(RootComponent)
