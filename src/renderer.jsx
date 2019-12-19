import path from "path";

export default function(context) {
	const { React, hooks } = context;
	const stylesheetPath = path.resolve(__dirname, "../style.css");

	hooks.addContent("stylesheets", () => (
		<link
			rel="stylesheet"
			key="brokenlinkcheck-addon-stylesheet"
			href={stylesheetPath}
		/>
	));

	hooks.addFilter("siteInfoMoreMenu", function(menu, site) {
		menu.push({
			label: "Broken Link Checker",
			enabled: true,
			click: () => {}
		});

		//enabled: !this.context.router.isActive(`/site-info/${site.id}/brokenlinkcheck`)

		return menu;
	});
}
