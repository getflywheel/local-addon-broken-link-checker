import { SiteData } from "@getflywheel/local/main";

export default function (context) {
	const { electron } = context;
	const { ipcMain } = electron;

	ipcMain.on('store-broken-links', (event, siteId, brokenLinks) => {
		SiteData.updateSite(siteId, {
			id: siteId,
			brokenLinks,
		});
	});
}
