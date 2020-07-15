import React from "react"
import * as ReactDOM from "react-dom"
import { BrowserRouter as Router, Route, Switch } from "react-router-dom"
import { Bootstrap, Service } from "shared/types"
import { ServicePicker, SpotifyLogin } from "./components/service-picker"
import { TransitionGroup, CSSTransition } from "react-transition-group"

declare var bootstrap: Bootstrap

// spotify or scrobble

// step 2 of 3
// login with spotify
// enter scrobble username

// step 3 of 3
// enter email to receive notifications

class Homepage extends React.Component {
	constructor(props: {}) {
		super(props)
	}

	render() {
		return <div className="Homepage">
			<div className="hero">
				<p>Receive notifications on the birthdays of your favorite albums.</p>
			</div>
		</div>
	}
}

class Login extends React.Component<{}, { service: Service | undefined }> {
	constructor(props: {}) {
		super(props)
		this.state = {
			service: undefined,
		}
	}

	render() {
		return <div className="Login">
			<TransitionGroup>
				{this.state.service === undefined &&
					<CSSTransition key={"service picker"} timeout={500} classNames="service">
						<ServicePicker onPick={(service) => this.setState({ service })} />
					</CSSTransition>
				}
				{this.state.service !== undefined &&
					<CSSTransition key={"spotify login"} timeout={500} classNames="login">
						<SpotifyLogin />
					</CSSTransition>
				}
			</TransitionGroup>
		</div>
	}
}

const root = <Router>
	<Route exact path="/">
		{!bootstrap.loggedIn ? <Homepage /> : <>already logged in</>}
	</Route>
</Router>


ReactDOM.render(root, document.querySelector("#mount"))
