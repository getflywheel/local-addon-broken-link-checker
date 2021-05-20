import BrokenLinkChecker from './BrokenLinkChecker';
import path from 'path';
import { Provider } from 'react-redux';
import { store } from './renderer/store/store';

export default function (context) {
	const { React, hooks } = context;
	const stylesheetPath = path.resolve(__dirname, '../style.css');

	hooks.addContent('stylesheets', () => (
		<link
			rel="stylesheet"
			key="brokenlinkcheck-addon-stylesheet"
			href={stylesheetPath}
		/>
	));

	// Create the route/page of content that will be displayed when the menu option is clicked
	hooks.addContent('brokenLinkChecker', ({ props, routeChildrenProps }) => (
		<Provider store={store}>
			<BrokenLinkChecker
				{...props}
				routeChildrenProps={routeChildrenProps}
			/>
		</Provider>
	));
}
