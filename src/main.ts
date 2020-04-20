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

	// Temporarily returning a string of post titles for debug purposes

	// let numberOfPostsDbCall = await LocalMain.getServiceContainer().cradle.wpCli.run(
	// 	site,
	// 	["post", "list", "--format=count"]
	// );

	// This only returns "Hello World" because that's the one post the command finds
	// let numberOfPostsDbCall = await LocalMain.getServiceContainer().cradle.wpCli.run(
	// 	site,
	// 	["post", "list", "--field=post_title", "--format=json"]
	// );

	let numberOfPostsDbCall = await LocalMain.getServiceContainer()
		.cradle.siteDatabase.exec(site, [
			"local",
			"--batch",
			"--skip-column-names",
			"-e",
			"SELECT COUNT(ID) FROM wp_posts WHERE post_status = 'publish'",
		])
		.then((data) => {
			LocalMain.getServiceContainer().cradle.localLogger.log(
				"info",
				"Hey here is some data from the db call: " + data
			);
		})
		.catch((error) => {
			LocalMain.getServiceContainer().cradle.localLogger.log(
				"info",
				"encountered this error when calling DB: " + error
			);
		});

	// LocalMain.getServiceContainer().cradle.localLogger.log(
	// 	"info",
	// 	`test in getTotalPosts(): ${numberOfPostsDbCall}`,
	// );
	LocalMain.getServiceContainer().cradle.localLogger.log(
		"info",
		"test in getTotalPosts():" + numberOfPostsDbCall
	);

	// This could not connect
	// let numberOfPostsDbCall = await LocalMain.getServiceContainer().cradle.wpCli.run(
	// 	site,
	// 	["db", "query", "'SELECT COUNT(ID) FROM local.wp_posts WHERE post_status = publish'", "--dbuser=root", "--dbpass=root"]
	// ).catch((error) => {
	// 	LocalMain.getServiceContainer().cradle.localLogger.log(
	// 		"info",
	// 		"encountered this error when calling DB: " + error
	// 	);
	// });

	return numberOfPostsDbCall;
}
