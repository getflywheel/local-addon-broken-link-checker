

async function checkLinks(siteURL) {   

  // let options = new Object();
		// 	options.maxSocketsPerHost = 15;

		// let siteChecker = new SiteChecker(options, {
		// 	html: (tree, robots, response, pageUrl, customData) => {
		// 		// This code is used to increment the number of WP posts we traverse in our scan
		// 		if (this.findWpPostIdInMarkup(tree)) {
		// 			this.incrementNumberPostsFound();
		// 		}
		// 	},
		// 	link: (result, customData) => {
		// 		if (result.broken) {
		// 			let brokenLinkScanResults = {
		// 				statusCode: String(result.http.response.statusCode),
		// 				linkURL: String(result.url.original),
		// 				linkText: String(result.html.text),
		// 				originURL: String(result.base.original),
		// 				originURI: String(result.base.parsed.path),
		// 				resultDump: result
		// 			};

		// 			let singlePageChecker = new HtmlUrlChecker(null, {
		// 				html: (tree, robots, response, pageUrl, customData) => {

		// 					let wpPostId = this.findWpPostIdInMarkup(tree);

		// 					if (wpPostId !== null) {
		// 						this.addBrokenLink(
		// 							customData["statusCode"],
		// 							customData["linkURL"],
		// 							customData["linkText"],
		// 							customData["originURL"],
		// 							customData["originURI"],
		// 							wpPostId
		// 						);

		// 						this.updateBrokenLinksFound(true);
		// 						this.incrementNumberBrokenLinksFound();
		// 					}
		// 				}
		// 			});

		// 			singlePageChecker.enqueue(
		// 				brokenLinkScanResults["originURL"],
		// 				brokenLinkScanResults
		// 			);
		// 		}
		// 	},
		// 	end: (result, customData) => {
		// 		// At last the first run is done, so we update the state
		// 		this.updateFirstRunComplete(true);
		// 		this.updateScanInProgress(false);

		// 		if (
		// 			this.state.brokenLinks === null ||
		// 			this.state.brokenLinks.length === 0
		// 		) {
		// 			this.updateBrokenLinksFound(false);
		// 		}
		// 	},
		// });
		// siteChecker.enqueue(siteURL);

    return "hello";
}

 
// receive message from master process
process.on('message', (m) => {
  console.log('Got message:', m);
  process.send(m);
});

