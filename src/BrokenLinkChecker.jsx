import React, { Component, Fragment } from 'react';
import { ipcRenderer } from 'electron';
const { SiteChecker, HtmlUrlChecker } = require('broken-link-checker');

export default class BrokenLinkChecker extends Component {

    constructor(props) {

        super(props);

        this.state = {
            brokenLinks: [],
        };

        this.checkLinks = this.checkLinks.bind(this);
    }

    componentDidMount() { }

    addBrokenLink(statusCode, linkURL, linkText, originURL, wpPostId) {
        let newBrokenLink = {
            "statusCode": statusCode,
            "linkURL": linkURL,
            "linkText": linkText,
            "originURL": originURL,
            "wpPostId": wpPostId
        };

        this.setState(prevState => ({
            brokenLinks: [...prevState.brokenLinks, newBrokenLink]
        }, this.syncBrokenLinksToSite));
    }

    componentDidUpdate(previousProps) {
        console.log(this.props);
    }

    syncBrokenLinksToSite() {
        ipcRenderer.send('store-broken-links', this.props.site.id, this.state.brokenLinks);
    }

    // TODO get access to 'site' so that I can pull down the broken links and confirm that they are being saved properly
    // fetchBrokenLinks() {

    // 	const notes = this.props.site.notes;

    // 	if (!notes) {
    // 		return [];
    // 	}

    // 	for (const [noteIndex, note] of notes.entries()) {
    // 		if (note.date instanceof Date || !note.date) {
    // 			continue;
    // 		}

    // 		notes[noteIndex].date = new Date(note.date);
    // 	}

    // 	return notes;
    // }

    startScan = () => {
        let routeChildrenProps = this.props.routeChildrenProps.routeChildrenProps;
        let site = routeChildrenProps.site;
        let siteDomain = site.domain;
        let siteStatus = routeChildrenProps.siteStatus;

        // TODO: Add checking to see if site is running with HTTP or HTTPS. Right now HTTP is assumed
        //let possibleSecureHttpStatus = site.services.nginx.ports.HTTP;
        //let otherPossibleSecureHttpStatus = site.services.nginx.role;

        let siteUrl = 'http://' + siteDomain;

        this.checkLinks(siteUrl);
    }

    checkLinks(siteURL) {
        let siteChecker = new SiteChecker(null, {
            link: (result, customData) => {
                if (result.broken) {

                    let brokenLinkScanResults = {
                        "statusCode": String(result.http.response.statusCode),
                        "linkURL": String(result.url.original),
                        "linkText": String(result.html.text),
                        "originURL": String(result.base.original)
                    }

                    let singlePageChecker = new HtmlUrlChecker(null, {
                        html: (tree, robots, response, pageUrl, customData) => {
                            // TODO: Make this code continue to drill down until an exact match for the 'body' tag is found, just in case a custom template has modified the usual page structure
                            let stringOfBodyClasses = tree.childNodes[1].childNodes[2].attrMap.class;

                            // TODO: Also make note of special classes like .home
                            let findPostId = stringOfBodyClasses.match(/(^|\s)postid-(\d+)(\s|$)/);

                            let wpPostId = null;
                            if (findPostId) {
                                wpPostId = findPostId[2];
                            }

                            this.addBrokenLink(customData["statusCode"], customData["linkURL"], customData["linkText"], customData["originURL"], wpPostId);
                        }
                    });
                    singlePageChecker.enqueue(brokenLinkScanResults["originURL"], brokenLinkScanResults);
                }
            }
        });
        siteChecker.enqueue(siteURL);
    }

    render() {

        return (
            <div style={{ flex: '1', overflowY: 'auto' }}>
                <h2>Behold the links:</h2>
                <ul>
                    {this.state.brokenLinks.map(item => (
                        <li key={item["linkURL"]}>{item["linkURL"]}</li>
                    ))}
                </ul>
                <p onClick={this.startScan}>
                    Start Scan
                </p>
            </div>
        )
    }

}