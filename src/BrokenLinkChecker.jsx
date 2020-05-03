import React, { Component, Fragment, useEffect } from "react";
import { ipcRenderer, remote } from "electron";
import os from "os"; // This will help determine Mac vs Windows
import ipcAsync from "./ipcAsync";
const {
	SiteChecker,
	HtmlUrlChecker,
	UrlChecker,
} = require("broken-link-checker");
import { TableListMultiDisplay, ProgressBar, PrimaryButton } from "@getflywheel/local-components";

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
	}

	componentDidUpdate() {
		let routeChildrenProps = this.props.routeChildrenProps;
		let siteStatus = routeChildrenProps.siteStatus;

		if (siteStatus !== this.state.siteStatus) {
			this.updateSiteState(siteStatus);
		}
	}

	addBrokenLink(statusCode, linkURL, linkText, originURL, wpPostId) {
		let newBrokenLink = {
			statusCode: statusCode,
			linkURL: linkURL,
			linkText: linkText,
			originURL: originURL,
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

	// updateTotalSitePosts() {
	// 	this.setState((prevState) => ({
	// 		getTotalSitePostsInProgress: true,
	// 	}));

	// 	setTimeout(() => {
	// 		ipcAsync("get-total-posts", this.state.siteId).then((result) => {
	// 			this.setState((prevState) => ({
	// 				totalSitePosts: parseInt(result),
	// 				getTotalSitePostsInProgress: false,
	// 			}));
	// 		});
	// 	}, 3000);
	// }

	updateTotalSitePosts = () => {
		return new Promise((resolve, reject) => {
			this.setState((prevState) => ({
				getTotalSitePostsInProgress: true,
			}));

			ipcAsync("get-total-posts", this.state.siteId).then((result) => {
				this.setState((prevState) => ({
					totalSitePosts: parseInt(result),
					getTotalSitePostsInProgress: false,
				}));
				resolve(true);
			});
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

	updateNumberBrokenLinksFound() {
		this.setState((prevState) => ({
			numberBrokenLinksFound: prevState.numberBrokenLinksFound + 1,
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
				this.state.getTotalSitePostsInProgress === false &&
				this.state.totalSitePosts === null
			) {
	
				this.updateTotalSitePosts().then(() => {
					// Start site tasks
					let routeChildrenProps = this.props.routeChildrenProps;
					let siteStatus = routeChildrenProps.siteStatus;

					if (
						this.state.resultsOnScreen &&
						String(this.state.siteStatus) !== "halted" &&
						this.state.siteStatus != null
					) {
						// Clear the existing broken links on screen if some have been rendered already
						this.clearBrokenLinks();
						this.checkLinks(rootUrl);
						this.updateScanInProgress(true);
					} else if (
						String(this.state.siteStatus) !== "halted" &&
						this.state.siteStatus != null
					) {
						this.checkLinks(rootUrl);
						this.updateScanInProgress(true);
					} else {
						this.updateSiteState(siteStatus);
					}
				});
			}
		});		
	};

	checkLinks(siteURL) {
		let siteChecker = new SiteChecker(null, {
			html: (tree, robots, response, pageUrl, customData) => {
				// This code is used to increment the number of WP posts we traverse in our scan
				if (this.findWpPostIdInMarkup(tree)) {
					this.incrementNumberPostsFound();
				}
			},
			link: (result, customData) => {
				if (result.broken) {
					let brokenLinkScanResults = {
						statusCode: String(result.http.response.statusCode),
						linkURL: String(result.url.original),
						linkText: String(result.html.text),
						originURL: String(result.base.original),
					};

					let singlePageChecker = new HtmlUrlChecker(null, {
						html: (tree, robots, response, pageUrl, customData) => {
							// TODO: Make this code continue to drill down until an exact match for the 'body' tag is found, just in case a custom template has modified the usual page structure
							let stringOfBodyClasses =
								tree.childNodes[1].childNodes[2].attrMap.class;

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

							if (wpPostId !== null) {
								this.addBrokenLink(
									customData["statusCode"],
									customData["linkURL"],
									customData["linkText"],
									customData["originURL"],
									wpPostId
								);
							}
						}
					});
					singlePageChecker.enqueue(
						brokenLinkScanResults["originURL"],
						brokenLinkScanResults
					);

					this.updateBrokenLinksFound(true);
					this.updateNumberBrokenLinksFound();
				}
			},
			end: (result, customData) => {
				// At last the first run is done, so we update the state
				this.updateFirstRunComplete(true);
				this.updateScanInProgress(false);

				if (
					this.state.brokenLinks === null ||
					this.state.brokenLinks.length === 0
				) {
					this.updateBrokenLinksFound(false);
				}
			},
		});
		siteChecker.enqueue(siteURL);
	}

	findWpPostIdInMarkup(tree) {
		// TODO: Make this code continue to drill down until an exact match for the 'body' tag is found, just in case a custom template has modified the usual page structure
		let stringOfBodyClasses =
			tree.childNodes[1].childNodes[2].attrMap.class;

		// TODO: Also make note of special classes like .home
		let findPostId = stringOfBodyClasses.match(/(^|\s)postid-(\d+)(\s|$)/);

		let findPageId = stringOfBodyClasses.match(/(^|\s)page-id-(\d+)(\s|$)/);

		let wpPostId = null;
		if (findPostId) {
			wpPostId = findPostId[2];
		} else if (findPageId) {
			wpPostId = findPageId[2];
		}

		return wpPostId;
	}

	truncate(str, n){
		if (str.length > n) {
			return str.substr(0, n-1) + '...';
		} else {
			return str;
		}
	  };

	renderProgressBarElements() {
		let progressCompletedPercentage = 0;

		if (
			this.state.totalSitePosts !== null &&
			this.state.getTotalSitePostsInProgress !== true
		) {

			progressCompletedPercentage = parseInt(
				(parseInt(this.state.numberPostsFound) /
					parseInt(this.state.totalSitePosts)) *
					100
			);
		}

		if (this.state.scanInProgress) {
			return (
				<div>
					<p style={{ textAlign: "center" }}>Searching for Links</p>
					<p style={{ textAlign: "center" }}>
						Broken Links <b>{this.state.numberBrokenLinksFound}</b>
					</p>
					<ProgressBar progress={progressCompletedPercentage} />
				</div>
			);
		} else {
			return null;
		}
	}

	render() {
		let message = "";
		if (this.state.siteStatus === "halted") {
			message = "Please start the site before running a link scan.";
		} else if (
			this.state.firstRunComplete &&
			!this.state.brokenLinksFound
		) {
			message = "No broken links found.";
		}

		if (
			this.state.scanInProgress &&
			this.state.siteRootUrl == null
		) {
			message += " There was a problem checking the website's homepage.";
		}

		let startButtonText = "Start Scan";
		if (this.state.resultsOnScreen) {
			startButtonText = "Re-Run Scan";
		}

		let scanProgressMessage = this.state.scanInProgress
			? "Scan is in progress."
			: "Scan is not running.";

		return (
			<div
				style={{ flex: "1", overflowY: "auto" }}
				className="brokenLinkCheckWrap"
			>
				<p>{message}</p>

				<p>{scanProgressMessage}</p>

				<TableListMultiDisplay
					header={
						<>
							<strong style={{ width: "10%" }}>Status</strong>
							<strong style={{ width: "35%" }}>Origin URL</strong>
							<strong style={{ width: "30%" }}>Link URL</strong>
							<strong style={{ width: "15%" }}>Link Text</strong>
							<strong style={{ width: "10%" }}>Post ID</strong>
						</>
					}
					repeatingContent={(item, index, updateItem) => (
						<>
							<div>
								{item.statusCode}
							</div>

							<div>
								<a href={item.originURL}>{this.truncate(item.originURL, 35)}</a>
							</div>

							<div>
								<a href={item.linkURL}>{this.truncate(item.linkURL, 35)}</a>
							</div>

							<div>
								<p>{item.linkText}</p>
							</div>

							<div>
								{item.wpPostId}{" "}
								{item.wpPostId != null ? "(" : ""}
								<a
									href={
										this.state.siteRootUrl +
										"/wp-admin/post.php?post=" +
										item.wpPostId +
										"&action=edit"
									}
								>
									{item.wpPostId != null ? "Edit" : ""}
								</a>
								{item.wpPostId != null ? ")" : ""}
							</div>
						</>
					)}
					itemTemplate={{}}
					data={this.state.brokenLinks}
				/>

				{this.renderProgressBarElements()}

				<PrimaryButton onClick={this.startScan} style={{ marginTop: 15, marginLeft: "auto", marginRight: 10, marginBottom: 10, display: "block" }}>{startButtonText}</PrimaryButton>

			</div>
		);
	}
}
