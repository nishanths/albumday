import React from "react"
import * as ReactDOM from "react-dom"
import { BrowserRouter, Route, Switch, Redirect } from "react-router-dom"
import { Bootstrap, Service } from "shared/types"
import { appHistory } from "./history"
import { TransitionGroup, CSSTransition } from "react-transition-group"
import { Root } from "./components/root"
import { Start } from "./components/start"
import { Feed } from "./components/feed"
import { Configure } from "./components/configure"
import { ToastProvider } from "react-toast-notifications"

declare var bootstrap: Bootstrap

const tree = <BrowserRouter>
	<ToastProvider>
		<Route exact path="/">
			{bootstrap.loggedIn ? <Redirect to="/feed" /> : <Root />}
		</Route>
		<Route exact path="/start">
			{bootstrap.loggedIn ? <Redirect to="/feed" /> : <Start />}
		</Route>
		<Route exact path="/feed">
			{bootstrap.loggedIn ? <Feed /> : <Redirect to="/" />}
		</Route>
		<Route exact path="/configure">
			{bootstrap.loggedIn ? <Configure /> : <Redirect to="/" />}
		</Route>
	</ToastProvider>
</BrowserRouter>


ReactDOM.render(tree, document.querySelector("#mount"))
