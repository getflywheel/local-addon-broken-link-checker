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
		// LocalMain.getServiceContainer().cradle.localLogger.log(
		// 	"info",
		// 	"Get-total-posts was heard in main.ts"
		// );

		event.reply(replyChannel, await getTotalPosts(siteId));
	});
}

async function getTotalPosts(siteId) {
	// LocalMain.getServiceContainer().cradle.localLogger.log(
	// 	"info",
	// 	"getTotalPosts Async function was called in main.ts"
	// );

	const site = LocalMain.SiteData.getSite(siteId);

	let numberOfPostsDbCall = await LocalMain.getServiceContainer().cradle.wpCli.run(
		site,
		["post", "list", "--format=count"]
	);

	return numberOfPostsDbCall;
}
