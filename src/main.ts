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

	ipcMain.on("get-total-posts", async (event, replyChannel, siteId) => {
		event.reply(replyChannel, await getTotalPosts(siteId));
	});
}

async function getTotalPosts(siteId) {
	const site = LocalMain.SiteData.getSite(siteId);

	let numberOfPostsDbCall = await LocalMain.getServiceContainer().cradle.siteDatabase.exec(
		site,
		[
			"local",
			"--batch",
			"--skip-column-names",
			"-e",
			"SELECT COUNT(ID) FROM wp_posts WHERE post_status = 'publish'",
		]
	);
	// .then((data) => {
	// 	LocalMain.getServiceContainer().cradle.localLogger.log(
	// 		"info",
	// 		"Hey here is some data from the db call: " + data
	// 	);
	// })
	// .catch((error) => {
	// 	LocalMain.getServiceContainer().cradle.localLogger.log(
	// 		"info",
	// 		"encountered this error when calling DB: " + error
	// 	);
	// });

	LocalMain.getServiceContainer().cradle.localLogger.log(
		"info",
		`test in getTotalPosts(): ${numberOfPostsDbCall}`
	);

	return numberOfPostsDbCall;
}
