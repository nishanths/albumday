import React from "react"
import { Helmet } from "react-helmet"
import { Link, withRouter } from "react-router-dom"
import { RouteComponentProps } from "react-router"
import { AppName, supportEmail } from "../../util"
import { reverse } from "../../shared"
import { NProgressType } from "../../types"

export type RootProps = RouteComponentProps & {
	nProgress: NProgressType
	loggedIn: boolean
}

export class RootComponent extends React.Component<RootProps> {
	render() {
		const helmet = <Helmet>
			<html className="RootHTML" />
			<title>{AppName}</title>
			<body className="RootBody" />
		</Helmet>

		return <div className="Root" role="main">
			{helmet}
			<Link to="/"><div title="[Icon: Birthday by Flatart from thenounproject.com]" className="logo" role="img" alt="App logo"></div></Link>
			<section className="app-name">
				album birthdays<span className="emph">!</span>
			</section>
			<section className="app-desc">
				Be reminded on the release date anniversaries for titles in your
				music library.
			</section>
			<section className="get-started">
				<button onClick={() => this.props.history.push(!this.props.loggedIn ? "/start" : "/feed")}>{!this.props.loggedIn ? "Get Started" : "See your feed"}</button>
			</section>
			<section className="hero">
				<img src="/static/img/birthdays-hero.png" />
			</section>
			<section className="preview">
				<a href="/email-preview" target="_blank">Preview sample email</a>
				<span className="sep">&nbsp;&nbsp;&middot;&nbsp;&nbsp;</span>
				<a href="/static/img/web-app-screenshot.png" target="_blank">App screenshots</a>
			</section>
			<section className="works-with">
				Works with
				<div className="services" role="list">
					<span role="listitem" title="Spotify" alt="Spotify logo" className="service-img spotify"></span>
					<span className="sep">/</span>
					<span role="listitem" title="Apple Music" alt="Apple Music logo" className="service-img scrobble"></span>
				</div>
			</section>
			<section className="faq">
				<div className="q">How others are using <span className="emph">{AppName}</span></div>
				<div className="a">“Rediscover forgotten songs periodically… ”</div>
				<div className="a">“ …Celebrate by listening to an album on its birthday”</div>
			</section>
			<section className="footer-links">
				<a className="terms" href={"mailto:" + supportEmail}>Email support</a>
				<span className="sep">&nbsp;&nbsp;&middot;&nbsp;&nbsp;</span>
				<a className="terms" href="/terms">Terms</a>
			</section>
		</div>
	}
}

export const Root = withRouter(RootComponent)
