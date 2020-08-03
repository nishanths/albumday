import React from "react"
import * as ReactDOM from "react-dom"
import { BrowserRouter, Route, Switch, Redirect } from "react-router-dom"
import { Bootstrap, Service } from "shared/types"
import { Root } from "./components/root"
import { Start } from "./components/start"
import { Dashboard } from "./components/dashboard"
import { ToastProvider } from "react-toast-notifications"
import type { NProgressType } from "./types"

declare const bootstrap: Bootstrap
declare const NProgress: NProgressType

// configure NProgress globally
NProgress.configure({ showSpinner: true, minimum: 0.1, trickleSpeed: 150, speed: 500 })

const tree = <BrowserRouter>
	<ToastProvider>
		<Route exact path="/">
			<Root />
		</Route>
		<Route exact path="/start">
			<Start nProgress={NProgress} />
		</Route>
		<Route exact path={["/feed", "/settings"]}>
			<Dashboard />
		</Route>
	</ToastProvider>
</BrowserRouter>


ReactDOM.render(tree, document.querySelector("#mount"))
