import * as Local from "@getflywheel/local";
import LocalMain, { SiteData } from "@getflywheel/local/main";

export default function (context) {
	const { electron } = context;
	const { ipcMain } = electron;

	ipcMain.on('store-broken-links', (event, siteId, brokenLinks) => {
		SiteData.updateSite(siteId, {
			id: siteId,
			brokenLinks,
		});
	});

	ipcMain.on('get-total-posts', (event, siteId) => {
		const site = LocalMain.SiteData.getSite(siteId);

		let numberOfPostsDbCall = LocalMain.getServiceContainer().cradle.wpCli.run(site, [
			'post',
			'list',
			'--format=count' 
		 ]);

		 numberOfPostsDbCall.then((numberOfPosts) => event.reply('return-total-posts', parseInt(numberOfPosts)));
	});
}
