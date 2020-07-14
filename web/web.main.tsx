import React from "react"
import * as ReactDOM from "react-dom"
import { BrowserRouter as Router, Route, Switch } from "react-router-dom"
import { Bootstrap } from "shared/types"

declare var bootstrap: Bootstrap

const root = <Router>
	<Route exact path="/">
		{bootstrap.loggedIn ? <>log in</> : <>already logged in</>}
	</Route>
</Router>


ReactDOM.render(root, document.querySelector("#mount"))
