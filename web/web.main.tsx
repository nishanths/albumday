import React from "react"
import * as ReactDOM from "react-dom"
import { BrowserRouter, Route, Switch, Redirect } from "react-router-dom"
import { Bootstrap, Service } from "./api"
import { Root } from "./components/root"
import { Start } from "./components/start"
import { Dashboard } from "./components/dashboard"
import type { NProgressType } from "./types"

declare module "react" {
	interface HTMLAttributes<T> extends React.AriaAttributes, React.DOMAttributes<T> {
		alt?: string
	}
}

declare const bootstrap: Bootstrap
declare const NProgress: NProgressType

// configure NProgress globally
NProgress.configure({ showSpinner: true, minimum: 0.1, trickleSpeed: 150, trickleRate: 0.01, speed: 500 })

type MountProps = {
	bootstrap: Bootstrap
}

class Mount extends React.Component<MountProps, { bootstrap: Bootstrap }> {
	constructor(props: MountProps) {
		super(props)
		this.state = {
			bootstrap: props.bootstrap,
		}
	}

	render() {
		return <BrowserRouter>
			<Switch>
				<Route exact path="/">
					<Root nProgress={NProgress} loggedIn={this.state.bootstrap.loggedIn} />
				</Route>

				<Route exact path="/start">
					{this.state.bootstrap.loggedIn ?
						<Redirect to="/feed" /> :
						<Start nProgress={NProgress} onLogin={email => {
							this.setState({
								bootstrap: { loggedIn: true, email },
							})
						}} />
					}
				</Route>

				<Route exact path={["/feed", "/settings"]}>
					<Dashboard nProgress={NProgress} email={this.state.bootstrap.email} onLogout={() => {
						this.setState({
							bootstrap: { loggedIn: false, email: "" },
						})
					}} />
				</Route>
			</Switch>
		</BrowserRouter>
	}
}


ReactDOM.render(<Mount bootstrap={bootstrap} />, document.querySelector("#mount"))
