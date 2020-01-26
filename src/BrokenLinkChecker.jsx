import React, { Component, Fragment } from "react";
import { ipcRenderer } from "electron";
const { SiteChecker, HtmlUrlChecker } = require("broken-link-checker");

export default class BrokenLinkChecker extends Component {
    constructor(props) {
        super(props);

        this.state = {
            brokenLinks: [],
            resultsOnScreen: false,
            firstRunComplete: false,
            brokenLinksFound: false,
            siteStatus: null
        };

        this.checkLinks = this.checkLinks.bind(this);
        this.updateSiteState = this.updateSiteState.bind(this);
    }

    addBrokenLink(statusCode, linkURL, linkText, originURL, wpPostId) {
        let newBrokenLink = {
            statusCode: statusCode,
            linkURL: linkURL,
            linkText: linkText,
            originURL: originURL,
            wpPostId: wpPostId
        };

        this.updateResultsOnScreen(true);

        this.setState(prevState => ({
            brokenLinks: [...prevState.brokenLinks, newBrokenLink]
        }));
    }

    clearBrokenLinks() {
        this.setState({ brokenLinks: [] });
    }

    updateSiteState(newStatus) {
        this.setState(prevState => ({
            siteStatus: newStatus
        }));
    }

    updateResultsOnScreen(boolean) {
        this.setState(prevState => ({
            resultsOnScreen: boolean
        }));
    }

    updateBrokenLinksFound(boolean) {
        this.setState(prevState => ({
            brokenLinksFound: boolean
        }));
    }

    updateFirstRunComplete(boolean) {
        this.setState(prevState => ({
            firstRunComplete: boolean
        }));
    }

    startScan = () => {
        let routeChildrenProps = this.props.routeChildrenProps
            .routeChildrenProps;
        let site = routeChildrenProps.site;
        let siteDomain = site.domain;
        let siteStatus = routeChildrenProps.siteStatus;

        // TODO: Add checking to see if site is running with HTTP or HTTPS. Right now HTTP is assumed
        //let possibleSecureHttpStatus = site.services.nginx.ports.HTTP;
        //let otherPossibleSecureHttpStatus = site.services.nginx.role;

        let siteUrl = "http://" + siteDomain;

        // Clear the existing broken links on screen if some have been rendered already
        if (this.state.resultsOnScreen) {
            this.clearBrokenLinks();
        }

        this.updateSiteState(siteStatus);

        if (String(siteStatus) !== "halted" && siteStatus != null) {
            this.checkLinks(siteUrl);
        }
    };

    checkLinks(siteURL) {
        let siteChecker = new SiteChecker(null, {
            link: (result, customData) => {
                if (result.broken) {
                    let brokenLinkScanResults = {
                        statusCode: String(result.http.response.statusCode),
                        linkURL: String(result.url.original),
                        linkText: String(result.html.text),
                        originURL: String(result.base.original)
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

                            let wpPostId = null;
                            if (findPostId) {
                                wpPostId = findPostId[2];
                            }

                            this.addBrokenLink(
                                customData["statusCode"],
                                customData["linkURL"],
                                customData["linkText"],
                                customData["originURL"],
                                wpPostId
                            );
                        }
                    });
                    singlePageChecker.enqueue(
                        brokenLinkScanResults["originURL"],
                        brokenLinkScanResults
                    );

                    this.updateBrokenLinksFound(true);
                }
            },
            end: (result, customData) => {
                // At last the first run is done, so we update the state
                this.updateFirstRunComplete(true);
            }
        });
        siteChecker.enqueue(siteURL);
    }

    render() {
        let message = "";
        if (this.state.siteStatus === "halted") {
            message = "Please start the site before running a link scan.";
        }
        else if (
            this.state.firstRunComplete &&
            !this.state.brokenLinksFound
        ) {
            message = "No broken links found.";
        }

        let startButtonText = "Start Scan";
        if (this.state.resultsOnScreen) {
            startButtonText = "Re-Run Scan";
        }

        return (
            <div style={{ flex: "1", overflowY: "auto" }}>
                <table class="brokenLinksTable">
                    <thead>
                        <tr>
                            <th>Status</th>
                            <th>Origin URL</th>
                            <th>Link URL</th>
                            <th>Link Text</th>
                            <th>Post ID</th>
                        </tr>
                    </thead>
                    <tbody>
                        {this.state.brokenLinks.map(item => (
                            <tr key={item["linkURL"]}>
                                <td>{item["statusCode"]}</td>
                                <td> <a href={item["originURL"]}>{item["originURL"]}</a> </td>
                                <td> <a href={item["linkURL"]}>{item["linkURL"]}</a> </td>
                                <td>{item["linkText"]}</td>
                                <td>{item["wpPostId"]}</td>
                            </tr>
                        ))}

                    </tbody>
                </table>

                <p>{message}</p>

                <a href="javascript:void(0);" onClick={this.startScan} style={{ marginTop: 15, marginLeft: 2, display: 'block' }}>
                    {startButtonText}
                </a>
            </div>
        );
    }
}
