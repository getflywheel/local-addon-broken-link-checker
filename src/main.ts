import * as LocalMain from "@getflywheel/local/main";

export default function (context) {
	const { electron } = context;
	const { ipcMain } = electron;

	ipcMain.on("store-broken-links", (event, siteId, brokenLinks) => {
		LocalMain.SiteData.updateSite(siteId, {
			id: siteId,
			brokenLinks,
		});
	});

	ipcMain.on("get-total-posts", async (event, replyChannel, siteId, prefix) => {
		event.reply(replyChannel, await getTotalPosts(siteId, prefix));
	});

	ipcMain.on("get-table-prefix", async (event, replyChannel, siteId) => {
		event.reply(replyChannel, await getTablePrefix(siteId));
	});
}

async function getTotalPosts(siteId, prefix) {
	const site = LocalMain.SiteData.getSite(siteId);

	let numberOfPostsDbCall = await LocalMain.getServiceContainer().cradle.siteDatabase.exec(
		site,
		[
			"local",
			"--batch",
			"--skip-column-names",
			"-e",
			"SELECT COUNT(ID) FROM " + prefix + "posts WHERE post_status = 'publish'",
		]
	).catch((error) => {
		LocalMain.getServiceContainer().cradle.localLogger.log(
			"info",
			"STARTDEBUG encountered this error when calling DB: " + error
		);
	});

	// then((data) => {
	// 	LocalMain.getServiceContainer().cradle.localLogger.log(
	// 		"info",
	// 		"STARTDEBUG Hey here is some data from the db call: " + data
	// 	);
	// })
	

	LocalMain.getServiceContainer().cradle.localLogger.log(
		"info",
		`test in getTotalPosts(): ${numberOfPostsDbCall}`
	);

	return numberOfPostsDbCall;
}

async function getTablePrefix(siteId) {
	const site = LocalMain.SiteData.getSite(siteId);

	let wpPrefixCall = await LocalMain.getServiceContainer().cradle.siteDatabase.getTablePrefix(site).catch((error) => {
		LocalMain.getServiceContainer().cradle.localLogger.log(
			"info",
			"Encountered this error when getting table prefix: " + error
		);
	});

	return wpPrefixCall;
}