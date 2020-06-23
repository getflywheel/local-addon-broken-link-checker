import React, { Component, Fragment, useEffect } from "react";
import { ipcRenderer, remote } from "electron";
import os from "os"; // This will help determine Mac vs Windows
import ipcAsync from "./ipcAsync";
const {
	SiteChecker,
	HtmlUrlChecker,
	UrlChecker,
} = require("broken-link-checker");

import { TableListMultiDisplay, ProgressBar, PrimaryButton, Title, Tooltip, Banner, Text } from "@getflywheel/local-components";

export default class BrokenLinkChecker extends Component {
	constructor(props) {
		super(props);

		this.state = {
			brokenLinks: this.fetchBrokenLinks(),
			resultsOnScreen: this.ifBrokenLinksFetched(),
			firstRunComplete: false,
			brokenLinksFound: false,
			siteStatus: null,
			siteRootUrl: null,
			siteId: null,
			tablePrefix: null,
			scanInProgress: false,
			numberPostsFound: 0,
			numberBrokenLinksFound: 0,
			totalSitePosts: null,
			getTotalSitePostsInProgress: false,
		};

		this.checkLinks = this.checkLinks.bind(this);
		this.updateSiteState = this.updateSiteState.bind(this);
	}

	componentDidMount() {
		let routeChildrenProps = this.props.routeChildrenProps;
		let siteStatus = routeChildrenProps.siteStatus;
		let site = routeChildrenProps.site;
		let siteDomain = site.domain;
		let localVersionNumber = site.localVersion;
		let localVersionName = "Local";

		if (localVersionNumber.includes("beta")) {
			localVersionName = "Local Beta";
		}

		let siteId = routeChildrenProps.site.id;

		// TODO: Add checking to see if site is running with HTTP or HTTPS. Right now HTTP is assumed
		//let possibleSecureHttpStatus = site.services.nginx.ports.HTTP;
		//let otherPossibleSecureHttpStatus = site.services.nginx.role;

		//let siteUrl = "http://" + siteDomain;

		this.updateSiteId(siteId);
		this.updateSiteState(siteStatus);

		console.log("about to call the process");
		ipcAsync("fork-process", "waffles").then((result) => {
			console.log("Received response with this data", result);
		});
		
	}

	componentDidUpdate() {
		let routeChildrenProps = this.props.routeChildrenProps;
		let siteStatus = routeChildrenProps.siteStatus;

		if (siteStatus !== this.state.siteStatus) {
			this.updateSiteState(siteStatus);
		}
	}

	legacyPluginDataDetected(){
		// If the broken links array exists in siteData
		if(this.state.hasOwnProperty('brokenLinks')) {
			// If there is any data in the array
			if(this.state.brokenLinks.length) {
				// Return true if the originURI field is not found in the first element
				// Can add more checks to this if statement for future array changes
				if ( !this.state.brokenLinks[0].hasOwnProperty('originURI') || !this.state.brokenLinks[0].hasOwnProperty('dateAdded') ) {
					return true;
				}
			}
		}

		return false;
	}

	addBrokenLink(statusCode, linkURL, linkText, originURL, originURI, wpPostId) {
		let newBrokenLink = {
			dateAdded: Date.now(),
			statusCode: statusCode,
			linkURL: linkURL,
			linkText: linkText,
			originURL: originURL,
			originURI: originURI,
			wpPostId: wpPostId,
		};

		this.updateResultsOnScreen(true);

		this.setState(
			(prevState) => ({
				brokenLinks: [...prevState.brokenLinks, newBrokenLink],
			}),
			this.syncBrokenLinks
		);
	}

	clearBrokenLinks() {
		this.setState({ brokenLinks: [] }, this.syncBrokenLinks);
	}

	syncBrokenLinks() {
		ipcRenderer.send(
			"store-broken-links",
			this.state.siteId,
			this.state.brokenLinks
		);
	}

	fetchBrokenLinks() {
		const brokenLinks = this.props.routeChildrenProps.site.brokenLinks;

		if (!brokenLinks) {
			return [];
		}

		return brokenLinks;
	}

	ifBrokenLinksFetched() {
		const brokenLinks = this.props.routeChildrenProps.site.brokenLinks;

		if (!brokenLinks || brokenLinks.length < 1) {
			return false;
		}

		return true;
	}

	testSiteRootUrlVariantsAndUpdate = (siteDomain) => {
		return new Promise((resolve, reject) => {
			let workingUrlFound = false;

			// TODO: Handle self-signed certificates more securely, like https://stackoverflow.com/questions/20433287/node-js-request-cert-has-expired#answer-29397100
			process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
	
			let options = new Object();
			options.cacheResponses = false;
			options.rateLimit = 500; // Give the local website time to start, so we avoid the 500 errors
			let workingUrl = null;
	
			let isUrlBrokenChecker = new UrlChecker(options, {
				link: (result, customData) => {
					// If we get a 200 success on the URL, we use it and stop checking variants of the root URL
					if (!result.broken) {
						workingUrl = result.url.original;
	
						this.setState(prevState => ({
							siteRootUrl: workingUrl
						}));
	
						// In case the first root URL variant is the winner, dequeue the later options
						isUrlBrokenChecker.dequeue(1);
						isUrlBrokenChecker.dequeue(2);
	
						workingUrlFound = true;
					}
				},
				end: () => {
					// If a proper working root URL is not found, make sure it's null so we can render a warning notice
					if (!workingUrlFound) {
						this.setState(prevState => ({
							siteRootUrl: null
						}));
						reject(Error("Root URL not found"));
					} else {
						resolve(workingUrl);
					}
				}
			});
			isUrlBrokenChecker.enqueue("http://" + siteDomain + "/");
			isUrlBrokenChecker.enqueue("https://" + siteDomain + "/");
		});
	};

	updateTotalSitePosts = (prefix) => {
		return new Promise((resolve, reject) => {
			this.setState((prevState) => ({
				getTotalSitePostsInProgress: true,
			}));

			ipcAsync("get-total-posts", this.state.siteId, prefix).then((result) => {
				this.setState((prevState) => ({
					totalSitePosts: parseInt(result),
					getTotalSitePostsInProgress: false,
				}));
				resolve(parseInt(result));
			}).catch((err) => reject("updateTotalSitePosts Error: " + err));
		});
	};

	updateTablePrefix = () => {
		return new Promise((resolve, reject) => {
			ipcAsync("get-table-prefix", this.state.siteId).then((result) => {
				this.setState((prevState) => ({
					tablePrefix: result,
				}));
				resolve(result);
			}).catch((err) => reject("updateTablePrefix Error: " + err));
		});
	};

	updateSiteState(newStatus) {
		this.setState((prevState) => ({
			siteStatus: newStatus,
		}));
	}

	updateSiteId(siteId) {
		this.setState((prevState) => ({
			siteId: siteId,
		}));
	}

	updateResultsOnScreen(boolean) {
		this.setState((prevState) => ({
			resultsOnScreen: boolean,
		}));
	}

	updateBrokenLinksFound(boolean) {
		this.setState((prevState) => ({
			brokenLinksFound: boolean,
		}));
	}

	incrementNumberBrokenLinksFound() {
		this.setState((prevState) => ({
			numberBrokenLinksFound: prevState.numberBrokenLinksFound + 1,
		}));
	}

	clearNumberBrokenLinksFound() {
		this.setState((prevState) => ({
			numberBrokenLinksFound: 0,
		}));
	}

	updateFirstRunComplete(boolean) {
		this.setState((prevState) => ({
			firstRunComplete: boolean,
		}));
	}

	updateScanInProgress(boolean) {
		this.setState((prevState) => ({
			scanInProgress: boolean,
		}));
	}

	incrementNumberPostsFound() {
		this.setState((prevState) => ({
			numberPostsFound: prevState.numberPostsFound + 1,
		}));
	}

	clearNumberPostsFound() {
		this.setState((prevState) => ({
			numberPostsFound: 0,
		}));
	}

	startScan = () => {

		let routeChildrenProps = this.props.routeChildrenProps;
		let site = routeChildrenProps.site;
		let siteDomain = site.domain;

		this.testSiteRootUrlVariantsAndUpdate(siteDomain).then((rootUrl) => {

			// Update total site posts count
			if (
				this.state.getTotalSitePostsInProgress === false
			) {

				this.updateTablePrefix().then((prefix) => {
					this.updateTotalSitePosts(prefix).then((totalSitePosts) => {
	
						// Start site tasks
						let routeChildrenProps = this.props.routeChildrenProps;
						let siteStatus = routeChildrenProps.siteStatus;
	
						if (
							(this.state.resultsOnScreen || !this.state.brokenLinksFound) &&
							String(this.state.siteStatus) !== "halted" &&
							this.state.siteStatus != null
						) {
	
							// Clear the existing broken links on screen if some have been rendered already
							this.clearBrokenLinks();
							this.clearNumberPostsFound();
							this.clearNumberBrokenLinksFound();
							this.checkLinks(this.state.siteRootUrl);
							this.updateScanInProgress(true);
						} else if (
							String(this.state.siteStatus) !== "halted" &&
							this.state.siteStatus != null
						) {	
							this.checkLinks(this.state.siteRootUrl);
							this.updateScanInProgress(true);
						} else {	
							this.updateSiteState(siteStatus);
						}
					}).catch((err) => console.log("Errer getting total site posts: " + err));
				});			
			}
		}).catch((err) => {
			// Finding root URL failed
			console.log("Could not find root URL");
			let routeChildrenProps = this.props.routeChildrenProps;
			let siteStatus = routeChildrenProps.siteStatus;
			this.updateSiteState(siteStatus);
		});		
	};

	checkLinks(siteURL) {

		// fork another process
		// const process = fork('./processes/checkLinks.jsx');
		// const dummyPayload = "waffles";
		// process.send({ dummyPayload });   // listen for messages from forked process
		// process.on('message', (message) => {
		//   console.log(`They indeed received the ${message.dummyPayload}`);
		// });

		// --------------------------------------------------

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
	}

	findWpPostIdInMarkup(tree) {
		let stringOfBodyClasses = '';

		tree.childNodes.forEach(function(item,key){
			if(item.nodeName === "html"){
				item.childNodes.forEach(function(item,key){
					if(item.nodeName === "body"){
						stringOfBodyClasses = item.attrMap.class;
					}
				})
			}
		});

		// TODO: Also make note of special classes like .home
		let findPostId = stringOfBodyClasses.match(
			/(^|\s)postid-(\d+)(\s|$)/
		);

		let findPageId = stringOfBodyClasses.match(
			/(^|\s)page-id-(\d+)(\s|$)/
		);

		let wpPostId = null;
		if (findPostId) {
			wpPostId = findPostId[2];
		} else if (findPageId) {
			wpPostId = findPageId[2];
		}

		return wpPostId;
	}

	renderHeader() {
		let buttonText = "Start Scan";
		let messageLeftOfActionButtonText = "Last updated " + this.renderLastUpdatedTimestamp();

		if(this.renderLastUpdatedTimestamp() === ''){
			messageLeftOfActionButtonText = "";
		}

		if (this.state.scanInProgress){
			buttonText = "Scanning";
			messageLeftOfActionButtonText = "";
		}

		return (<div>
				<Banner style={{backgroundColor: "#fff"}} icon={false} buttonText={buttonText} buttonOnClick={this.state.scanInProgress ?
                  {} : 
                  this.startScan}>
				<div style={{ flex: "1", display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: "0 10px" }}>
				<Title size="s" style={{marginTop: 14, marginBottom: 14}}>{ (this.state.scanInProgress && this.state.numberBrokenLinksFound != null) ? (<span>Broken Links <strong>{this.state.numberBrokenLinksFound}</strong></span>) : (<span>Link Checker</span>) }</Title>

					<Text size="caption">{messageLeftOfActionButtonText}</Text>
				</div>
			</Banner>
			{this.renderProgressBarElements()}
		</div>);
	}

	renderProgressBarElements() {
		let progressCompletedPercentage = 0;

		if (
			this.state.totalSitePosts !== null &&
			this.state.getTotalSitePostsInProgress !== true &&
			this.state.scanInProgress
		) {

			progressCompletedPercentage = parseInt(
				(parseInt(this.state.numberPostsFound) /
					parseInt(this.state.totalSitePosts)) *
					100
			);
		} else if (
			this.state.totalSitePosts !== null &&
			this.state.getTotalSitePostsInProgress !== true &&
			!this.state.scanInProgress &&
			this.state.resultsOnScreen
		) {
			progressCompletedPercentage = 100;
		}

		// Round percentage up to nearest integer just in case it's a decimal
		progressCompletedPercentage = Math.ceil(progressCompletedPercentage);
		progressCompletedPercentage = (progressCompletedPercentage == 0 ? 1 : progressCompletedPercentage);

		if (this.state.scanInProgress) {
			return (
					<ProgressBar progress={progressCompletedPercentage} />
			);
		} else if (this.state.firstRunComplete && this.state.resultsOnScreen) {
			return (
					<ProgressBar progress={progressCompletedPercentage} />
			);
		} else {
			return null;
		}
	}

	renderLastUpdatedTimestamp(){
		if(this.state.hasOwnProperty('brokenLinks')) {
			if(this.state.brokenLinks.length) {
				if (this.state.brokenLinks[0].hasOwnProperty('dateAdded')) {
					let dateData = this.state.brokenLinks[0].dateAdded;
					let dateObject = new Date(dateData);
					
					let day = dateObject.getDate();
					let month = this.getMonthName(dateObject);
					let year = dateObject.getFullYear();
					let amPmTime = this.formatAMPM(dateObject);

					return String(month) + ' ' + String(day) + ', ' + String(year) + ' ' + String(amPmTime);
				}
			}
		}

		return '';
	}

	getMonthName(date){
		let month = new Array();
		month[0] = "January";
		month[1] = "February";
		month[2] = "March";
		month[3] = "April";
		month[4] = "May";
		month[5] = "June";
		month[6] = "July";
		month[7] = "August";
		month[8] = "September";
		month[9] = "October";
		month[10] = "November";
		month[11] = "December";

		return month[date.getMonth()];
	}

	// Thanks to https://stackoverflow.com/questions/8888491/how-do-you-display-javascript-datetime-in-12-hour-am-pm-format#answer-8888498
	formatAMPM(date) {
		var hours = date.getHours();
		var minutes = date.getMinutes();
		var ampm = hours >= 12 ? 'PM' : 'AM';
		hours = hours % 12;
		hours = hours ? hours : 12; // the hour '0' should be '12'
		minutes = minutes < 10 ? '0'+minutes : minutes;
		var strTime = hours + ':' + minutes + ' ' + ampm;
		return strTime;
	}

	renderFooterMessage() {
		let message = "";
		if (this.state.siteStatus === "halted") {
			message = "Please start the site to begin a scan";
		} else if (
			this.state.firstRunComplete &&
			!this.state.brokenLinksFound
		) {
			message = "No broken links found";
		} else if (
			this.state.siteStatus === "running" &&
			!this.state.scanInProgress
		) {
			message = "Scan for broken links"
		}

		if (
			this.state.scanInProgress &&
			this.state.siteRootUrl == null
		) {
			message += " There was a problem checking the website's homepage.";
		}

		if(message !== ""){
		return(<Title size="caption" style={{textAlign:'center'}}>{message}</Title>);
		} else {
			return;
		}
	}

	render() {
		if(this.legacyPluginDataDetected()) {
			this.clearBrokenLinks();
			return(<div></div>);
		} else {
		return (
			<div
				style={{ flex: "1", overflowY: "auto" }}
				className="brokenLinkCheckWrap"
			>

				{this.renderHeader()}

				<TableListMultiDisplay
					header={
						<>
							<strong style={{ width: "10%" }}>Status</strong>
							<strong style={{ width: "20%" }}>Origin URL</strong>
							<strong style={{ width: "30%" }}>Link URL</strong>
							<strong style={{ width: "28%" }}>Link Text</strong>
							<strong style={{ width: "12%" }}></strong>
						</>
					}
					repeatingContent={(item, index, updateItem) => (
						<>
							<div>
								{item.statusCode}
							</div>

							<div className="blcTooltipWrapper">
								<Tooltip content={<div style={{ lineHeight: "1.3em" }}>{item.originURL}</div>}>
									<a href={item.originURL} className="blcTruncate">{item.originURI}</a>
								</Tooltip>
							</div>

							<div className="blcTooltipWrapper">
								<Tooltip content={<div style={{ lineHeight: "1.3em" }}>{item.linkURL}</div>}>
									<a href={item.linkURL} className="blcTruncate">{item.linkURL}</a>
								</Tooltip>
							</div>

							<div style={{ lineHeight: "1.3em" }}>
								<p style={{ flexShrink: 1 }}>{item.linkText}</p>
							</div>

							<div style={{ lineHeight: "1.3em" }}>
								<a
									href={
										this.state.siteRootUrl +
										"wp-admin/post.php?post=" +
										item.wpPostId +
										"&action=edit"
									}
								>
									Fix in Admin
								</a>
							</div>
						</>
					)}
					itemTemplate={{}}
					data={this.state.brokenLinks}
				/>			

				{this.renderFooterMessage()}
			</div>
		);}
	}
}
