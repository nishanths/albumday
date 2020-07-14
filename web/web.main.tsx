import React from "react"
import * as ReactDOM from "react-dom"
import { BrowserRouter as Router, Route, Switch } from "react-router-dom"
import { Bootstrap, Service } from "shared/types"
import { ServicePicker, SpotifyLogin } from "./components/service-picker"

declare var bootstrap: Bootstrap

// spotify or scrobble

// step 2 of 3
// login with spotify
// enter scrobble username

// step 3 of 3
// enter email to receive notifications


class Login extends React.Component<{}, { service: Service | undefined }> {
	constructor(props: {}) {
		super(props)
		this.state = {
			service: undefined,
		}
	}

	render() {
		return <div className="Login">
			{this.state.service === undefined ?
				<ServicePicker onPick={(service) => this.setState({ service })} /> :
				<SpotifyLogin />
			}
		</div>
	}
}

const root = <Router>
	<Route exact path="/">
		{!bootstrap.loggedIn ? <Login/> : <>already logged in</>}
	</Route>
</Router>


ReactDOM.render(root, document.querySelector("#mount"))
