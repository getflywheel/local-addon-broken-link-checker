import BrokenLinkChecker from './BrokenLinkChecker';
import path from "path";
import { matchPath } from 'react-router';

export default function (context) {
	const { React, hooks } = context;
	const { Route } = context.ReactRouter;
	const stylesheetPath = path.resolve(__dirname, "../style.css");

	hooks.addContent("stylesheets", () => (
		<link
			rel="stylesheet"
			key="brokenlinkcheck-addon-stylesheet"
			href={stylesheetPath}
		/>
	));

	// Create the route/page of content that will be displayed when the menu option is clicked
	hooks.addContent('routesSiteInfo', () => <Route key="broken-link-checker" path="/site-info/:siteID/brokenlinkchecker"
		render={(props) => <BrokenLinkChecker {...props} />} />);


	// Add menu option within the site menu bar
	hooks.addFilter("siteInfoMoreMenu", function (menu, site) {
		menu.push({
			label: "Broken Link Checker",
			enabled: true,
			click: () => {
				context.events.send('goToRoute', `/site-info/${site.id}/brokenlinkchecker`);
			}
		});
		// TODO: replace 'true' for enabled with something else like this that works:
		// enabled: !this.context.ReactRouter.isActive(`/site-info/${site.id}/brokenlinkchecker`),


		return menu;
	});
}
