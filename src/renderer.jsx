import fs from 'fs-extra';
import BrokenLinkChecker from './BrokenLinkChecker';
import path from 'path';
import { Provider } from 'react-redux';
import { store } from './renderer/store/store';

export default function (context) {
	const { React, hooks } = context;
	const stylesheetPath = path.resolve(__dirname, '../style.css');

	const packageJSON = fs.readJsonSync(path.join(__dirname, '../package.json'));
	const addonName = packageJSON.productName;
	const addonID = packageJSON.slug;

	hooks.addContent('stylesheets', () => (
		<link
			rel="stylesheet"
			key="brokenlinkcheck-addon-stylesheet"
			href={stylesheetPath}
		/>
	));

	// Add menu option within the site menu bar
	hooks.addFilter('siteInfoToolsItem', (menu, { routeChildrenProps }) => {
		menu.push({
			path: `/${addonID}`,
			menuItem: `${addonName}`,
			render: () => (
				<Provider store={store}>
					<BrokenLinkChecker
						routeChildrenProps={routeChildrenProps}
					/>
				</Provider>
			),
		});

		return menu;
	});
}
