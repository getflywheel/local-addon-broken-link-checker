import * as Local from "@getflywheel/local";
import LocalMain, { SiteData } from "@getflywheel/local/main";

export default function (context) {
	const { electron } = context;
	const { ipcMain } = electron;

	// Demo of new API usage:
	// let siteId = Local.Site['id'];
	// const site = LocalMain.SiteData.getSite(siteId);

	// let numberOfPosts = LocalMain.getServiceContainer().cradle.wpCli.run(site, [
	// 	'post',
	// 	'list',
	// 	'--format=count' 
	//  ]);

	// console.log(numberOfPosts);

	ipcMain.on('store-broken-links', (event, siteId, brokenLinks) => {
		SiteData.updateSite(siteId, {
			id: siteId,
			brokenLinks,
		});
	});
}
