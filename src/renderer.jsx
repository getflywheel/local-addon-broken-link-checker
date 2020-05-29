import BrokenLinkChecker from "./BrokenLinkChecker";
import path from "path";
import { ipcRenderer } from "electron";
import { matchPath } from "react-router";

export default function(context) {
	const { React, hooks } = context;
	const { Route } = context.ReactRouter;
	const stylesheetPath = path.resolve("file://", __dirname, "./style.BrokenLinkChecker.css");

	hooks.addContent("stylesheets", () => (
		<link
			rel="stylesheet"
			key="brokenlinkcheck-addon-stylesheet"
			href={stylesheetPath}
		/>
	));

	// Create the route/page of content that will be displayed when the menu option is clicked
	hooks.addContent("routesSiteInfo", ({ routeChildrenProps }) => (
		<Route
			key="local-addon-broken-link-checker"
			path="/main/site-info/:siteID/brokenlinkchecker"
			render={props => (
				<BrokenLinkChecker
					{...props}
					routeChildrenProps={routeChildrenProps}
				/>
			)}
		/>
	));

	// Add menu option within the site menu bar
	hooks.addFilter("siteInfoMoreMenu", function(menu, site) {
		menu.push({
			label: "Check Links",
			enabled: true,
			click: () => {
				context.events.send(
					"goToRoute",
					`/main/site-info/${site.id}/brokenlinkchecker`
				);
			}
		});
		// TODO: replace 'true' for enabled with something else like this that works:
		// enabled: !this.context.ReactRouter.isActive(`/site-info/${site.id}/brokenlinkchecker`),

		return menu;
	});
}
